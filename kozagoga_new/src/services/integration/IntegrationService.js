// ─── IntegrationService — оркестрация доставки цифрового товара ─
// Вызывается после успешной оплаты (из webhook или синхронно для MVP)
// ───────────────────────────────────────────────────────────────

import { getPool } from '../../lib/pool.js'
import { executeProviderRequest } from './ProviderMapper.js'
import { updateOrderStatus } from '../order/OrderService.js'

/**
 * Обрабатывает оплаченный заказ: вызывает провайдеров для каждой позиции.
 * MVP: синхронно. При росте >1000 заказов/день — вынести в очередь (Bull/RabbitMQ).
 */
export async function processOrder(orderId) {
  const pool = getPool()
  const { rows: orders } = await pool.query('SELECT * FROM orders WHERE id = $1', [orderId])
  if (orders.length === 0) throw new Error(`Order ${orderId} not found`)
  const order = orders[0]

  // Защита: обрабатываем только оплаченные заказы
  if (order.status !== 'paid' && order.payment_status !== 'paid') {
    console.log(`[IntegrationService] Order ${orderId}: skipping (status=${order.status}, payment=${order.payment_status})`)
    return
  }

  await updateOrderStatus(orderId, 'processing', pool)

  const { rows: items } = await pool.query('SELECT * FROM order_items WHERE order_id = $1', [orderId])

  for (const item of items) {
    try {
      // Получаем данные услуги и региона
      const { rows: services } = await pool.query('SELECT * FROM product_services WHERE id = $1', [item.service_id])
      if (services.length === 0) {
        await _failItem(pool, item, 'NO_SERVICE', 'Service not found')
        continue
      }

      const { rows: regions } = await pool.query('SELECT * FROM service_regions WHERE id = $1', [item.region_id])

      // Получаем inputs
      const { rows: inputs } = await pool.query('SELECT * FROM order_item_inputs WHERE order_item_id = $1', [item.id])

      // Выполняем запрос к провайдеру
      const result = await executeProviderRequest(item, inputs, services[0], regions[0], pool)

      if (result.success) {
        await pool.query(
          `UPDATE order_items SET
            delivery_status = 'delivered',
            external_id = $1,
            external_response = $2,
            result_value = $3,
            delivered_at = NOW()
          WHERE id = $4`,
          [result.external_id, result.raw_response ? JSON.stringify(result.raw_response) : null, result.result_value, item.id]
        )

        // Сохраняем в digital_deliveries (если есть результат)
        if (result.result_value) {
          await pool.query(
            `INSERT INTO digital_deliveries (order_id, order_item_id, product_id, type, value_encrypted, delivery_method)
             VALUES ($1, $2, $3, 'code', $4, 'screen')
             ON CONFLICT DO NOTHING`,
            [orderId, item.id, item.product_id, result.result_value]
          )
        }
      } else {
        await _failItem(pool, item, result.error, result.errorMessage)
      }
    } catch (err) {
      console.error(`[IntegrationService] Error processing item ${item.id}:`, err)
      await _failItem(pool, item, 'INTEGRATION_ERROR', err.message)
    }
  }

  // Финальный статус заказа
  const { rows: updated } = await pool.query('SELECT delivery_status FROM order_items WHERE order_id = $1', [orderId])
  const allDelivered = updated.every(r => r.delivery_status === 'delivered')
  const anyFailed = updated.some(r => r.delivery_status === 'failed')

  if (allDelivered) {
    await updateOrderStatus(orderId, 'completed', pool)
  } else if (anyFailed) {
    if (updated.some(r => r.delivery_status === 'delivered')) {
      await updateOrderStatus(orderId, 'partially_refunded', pool, 'Частичная доставка — частичный рефанд')
    } else {
      await updateOrderStatus(orderId, 'failed', pool, 'Все позиции не доставлены')
    }
  }
}

async function _failItem(pool, item, code, message) {
  await pool.query(
    `UPDATE order_items SET delivery_status = 'failed', error_message = $1 WHERE id = $2`,
    [message, item.id]
  )
  await pool.query(
    `INSERT INTO transactions (order_id, order_item_id, status, error, provider_status, operation)
     VALUES ($1, $2, 'error', $3, 'error', 'delivery_failed')`,
    [item.order_id, item.id, `${code}: ${message}`]
  )
}
