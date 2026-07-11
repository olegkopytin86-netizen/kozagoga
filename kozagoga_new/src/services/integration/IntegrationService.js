// ─── IntegrationService — оркестрация доставки цифрового товара ─
// Вызывается после успешной оплаты (из webhook).
// FR-DELIVERY-02: единая точка входа для доставки.
// FR-DELIVERY-06: row-level lock + idempotency.
// ───────────────────────────────────────────────────────────────

import { getPool } from '../../lib/pool.js'
import { executeProviderRequest } from './ProviderMapper.js'
import { updateOrderStatus } from '../order/OrderService.js'
import { getProvider } from '../../../lib/providers/index.js'

/**
 * Обрабатывает оплаченный заказ: доставка услуги через провайдера.
 *
 * Маршрутизация (FR-DELIVERY-02):
 * - Кастомный класс (HyperionProvider) → его метод pay()
 * - Иначе → ProviderMapper + ProviderHttpClient (шаблон из БД)
 *
 * @param {string} orderId
 * @param {object} [options]
 * @param {object} [options.pollingService] - экземпляр PollingService (запускает polling после pay)
 * @param {object} [options.alertService] - экземпляр AlertService (алерт при ошибке)
 * @returns {Promise<{transaction_id: string|null, provider_code: string|null}>}
 */
export async function processOrder(orderId, options = {}) {
  const pool = getPool()
  const { pollingService, alertService } = options
  let providerTransactionId = null
  let client

  // FR-DELIVERY-06, Уровень 2: транзакция + FOR UPDATE (row-level lock)
  // Без транзакции блокировка не удерживается до UPDATE.
  try {
    client = await pool.connect()
    await client.query('BEGIN')

    // Блокируем строку заказа — исключаем race condition
    const { rows: orders } = await client.query(
      'SELECT * FROM orders WHERE id = $1 FOR UPDATE',
      [orderId]
    )

    if (orders.length === 0) {
      await client.query('ROLLBACK')
      throw new Error(`Order ${orderId} not found`)
    }

    const order = orders[0]

    // Idempotency: проверяем, не запущена ли уже доставка
    if (order.provider_transaction_id) {
      await client.query('COMMIT')
      console.log(`[IntegrationService] Already delivered: order=${orderId} tx=${order.provider_transaction_id}`)
      return { transaction_id: order.provider_transaction_id, provider_code: null }
    }

    // Защита: обрабатываем только оплаченные заказы
    if (order.status !== 'paid' && order.payment_status !== 'paid') {
      await client.query('COMMIT')
      console.log(`[IntegrationService] Skipping order=${orderId} (status=${order.status}, payment=${order.payment_status})`)
      return null
    }

    // Меняем статус на processing в той же транзакции
    await updateOrderStatus(orderId, 'processing', client)

    const { rows: items } = await client.query(
      'SELECT * FROM order_items WHERE order_id = $1',
      [orderId]
    )

    for (const item of items) {
      try {
        const providerCode = item.provider_code
        const hasCustomClass = _hasCustomProvider(providerCode)

        if (hasCustomClass) {
          // Путь 1: Кастомный класс провайдера (Hyperion)
          const packageId = await _processWithCustomProvider(
            client, item, order, providerCode, pollingService, alertService
          )
          if (packageId && !providerTransactionId) {
            providerTransactionId = packageId
          }
        } else {
          // Путь 2: ProviderMapper + ProviderHttpClient
          await _processWithProviderMapper(client, item, order, pool)
        }

        // Обновляем статус item
        await client.query(
          `UPDATE order_items SET delivery_status = 'delivered', delivered_at = NOW()
           WHERE id = $1`,
          [item.id]
        )

      } catch (err) {
        console.error(`[IntegrationService] Error processing item ${item.id}:`, err)
        await client.query(
          `UPDATE order_items SET delivery_status = 'failed', error_message = $1 WHERE id = $2`,
          [err.message, item.id]
        )
      }
    }

    // Финальный статус заказа
    const { rows: updated } = await client.query(
      'SELECT delivery_status FROM order_items WHERE order_id = $1',
      [orderId]
    )

    const isAllDelivered = updated.every(r => r.delivery_status === 'delivered')
    const isAnyFailed = updated.some(r => r.delivery_status === 'failed')

    if (isAllDelivered) {
      await updateOrderStatus(orderId, 'completed', client)
    } else if (isAnyFailed) {
      if (updated.some(r => r.delivery_status === 'delivered')) {
        await updateOrderStatus(orderId, 'partially_refunded', client, 'Частичная доставка — частичный рефанд')
      } else {
        await updateOrderStatus(orderId, 'failed', client, 'Все позиции не доставлены')
      }
    }

    await client.query('COMMIT')

    const providerItem = items.find(i => i.provider_code)
    return {
      transaction_id: providerTransactionId,
      provider_code: providerItem?.provider_code || null,
    }

  } catch (err) {
    if (client) {
      try { await client.query('ROLLBACK') } catch (_) {}
    }
    console.error(`[IntegrationService] Transaction failed for order ${orderId}:`, err)

    // FR-DELIVERY-07, Уровень 1: ошибка ДО polling — алерт без auto-refund
    if (alertService) {
      await alertService.createAlert('provider_delivery_failed', {
        order_id: orderId,
        message: `Delivery failed: ${err.message}`,
        priority: 'high',
      }).catch(aErr => console.error('[IntegrationService] Alert error:', aErr.message))
    }

    throw err
  } finally {
    if (client) client.release()
  }
}

// ─── Кастомный провайдер (Hyperion) ──────────────────────
async function _processWithCustomProvider(client, item, order, providerCode, pollingService, alertService) {
  const provider = getProvider(providerCode)

  // Загружаем inputs для item
  const { rows: inputs } = await client.query(
    'SELECT * FROM order_item_inputs WHERE order_item_id = $1',
    [item.id]
  )

  // Формируем inputMap из полей ввода
  const inputMap = {}
  for (const inp of inputs) {
    inputMap[inp.field_key] = inp.value
  }

  // Ищем основной реквизит (is_main_requisite) или первый input
  const mainRequisite = inputs.find(i => i.field_key === 'requisite' || i.field_key === 'account')
  const account = mainRequisite?.value || inputs[0]?.value || ''

  // FR-DELIVERY-03: вызов провайдера
  // bearer = provider_service_id из товара
  // account = реквизит (введённый пользователем)
  const payResult = await provider.pay({
    bearer: item.provider_service_id || item.service_id,
    account,
    amount: item.total_price || item.price,
    currency: order.currency || 'KGS',
    exclude_commission: true,
    info: [inputMap],
  })

  const packageId = payResult.package_id

  // Сохраняем provider_transaction_id в той же транзакции
  await client.query(
    `UPDATE orders SET provider_transaction_id = $1, provider_status = 'INPROGRESS', updated_at = NOW()
     WHERE id = $2`,
    [packageId, order.id]
  )

  // Логируем в transactions
  await client.query(
    `INSERT INTO transactions (
      order_id, order_item_id, provider_code, provider_transaction_id,
      operation, amount, request_body, response_body, status
    ) VALUES ($1, $2, $3, $4, 'payment', $5, $6, $7, 'pending')`,
    [order.id, item.id, providerCode, packageId, item.total_price || item.price,
     JSON.stringify(inputMap), JSON.stringify(payResult)]
  )

  // Запускаем polling (после COMMIT, т.к. polling использует pool напрямую)
  if (pollingService && packageId) {
    setImmediate(() => {
      pollingService.start(order.id, packageId, provider)
    })
  }

  return packageId
}

// ─── ProviderMapper (для провайдеров без кастомного класса) ──
async function _processWithProviderMapper(client, item, order, pool) {
  const { rows: services } = await client.query(
    'SELECT * FROM product_services WHERE id = $1',
    [item.service_id]
  )
  if (services.length === 0) {
    throw new Error(`Service not found for item ${item.id}`)
  }

  const { rows: regions } = await client.query(
    'SELECT * FROM service_regions WHERE id = $1',
    [item.region_id]
  )

  const { rows: inputs } = await client.query(
    'SELECT * FROM order_item_inputs WHERE order_item_id = $1',
    [item.id]
  )

  const result = await executeProviderRequest(item, inputs, services[0], regions[0], pool)

  if (!result.success) {
    throw new Error(`${result.error}: ${result.errorMessage}`)
  }

  await client.query(
    `UPDATE order_items SET
      external_id = $1,
      external_response = $2,
      result_value = $3
    WHERE id = $4`,
    [result.external_id,
     result.raw_response ? JSON.stringify(result.raw_response) : null,
     result.result_value,
     item.id]
  )

  if (result.result_value) {
    await client.query(
      `INSERT INTO digital_deliveries (order_id, order_item_id, product_id, type, value_encrypted, delivery_method)
       VALUES ($1, $2, $3, 'code', $4, 'screen')
       ON CONFLICT DO NOTHING`,
      [order.id, item.id, item.product_id, result.result_value]
    )
  }
}

// ─── Проверка наличия кастомного класса провайдера ──────
function _hasCustomProvider(providerCode) {
  if (!providerCode) return false
  try {
    const provider = getProvider(providerCode)
    return !!provider
  } catch {
    return false
  }
}
