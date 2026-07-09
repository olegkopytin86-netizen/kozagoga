// ─── OrderService — создание, статусы, получение заказа ───────
// ───────────────────────────────────────────────────────────────

import { validateOrderRequest } from './OrderValidator.js'
import { getPool } from '../../lib/pool.js'
import crypto from 'node:crypto'

/**
 * Рассчитывает цену для выбранной услуги + региона + amount.
 */
export async function calculatePrice(params, pool) {
  const { product_id, service_id, region_id, amount } = params

  // Проверка service
  const { rows: services } = await pool.query(
    'SELECT * FROM product_services WHERE id = $1 AND product_id = $2 AND is_active = true LIMIT 1',
    [service_id, product_id]
  )
  if (services.length === 0) {
    return { error: 'SERVICE_INACTIVE', message: 'Услуга недоступна' }
  }
  const service = services[0]

  // Проверка region
  const { rows: regions } = await pool.query(
    'SELECT * FROM service_regions WHERE id = $1 AND service_id = $2 AND is_active = true LIMIT 1',
    [region_id, service_id]
  )
  if (regions.length === 0) {
    return { error: 'REGION_INACTIVE', message: 'Регион недоступен' }
  }
  const region = regions[0]

  const parsedAmount = amount ? parseFloat(amount) : (region.fixed_amounts?.[0] || region.base_price)

  // Проверка fixed_amounts
  if (region.fixed_amounts && region.fixed_amounts.length > 0) {
    if (amount && !region.fixed_amounts.includes(parsedAmount)) {
      return {
        error: 'INVALID_FIXED_AMOUNT',
        message: `Доступные суммы: ${region.fixed_amounts.join(', ')} ${region.currency}`,
      }
    }
  } else {
    if (region.min_amount && parsedAmount < parseFloat(region.min_amount)) {
      return { error: 'AMOUNT_TOO_LOW', message: `Минимальная сумма: ${region.min_amount} ${region.currency}` }
    }
    if (region.max_amount && parsedAmount > parseFloat(region.max_amount)) {
      return { error: 'AMOUNT_TOO_HIGH', message: `Максимальная сумма: ${region.max_amount} ${region.currency}` }
    }
  }

  const multiplier = parseFloat(region.price_multiplier || 1)
  const finalPrice = parsedAmount * multiplier

  return {
    product_name: service.name,
    service_name: service.name,
    region: { code: region.region_code, name: region.region_name },
    amount: parsedAmount,
    base_price: parseFloat(region.base_price),
    price_multiplier: multiplier,
    final_price: finalPrice,
    currency: region.currency,
    discount: region.old_price ? parseFloat(region.base_price) - finalPrice : null,
    valid_until: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 минут
    error: null,
  }
}

/**
 * Создаёт заказ с услугами, регионами и динамическими полями.
 */
export async function createOrder(params, userId, pool) {
  // 1. Idempotency check
  if (params.idempotency_key) {
    const { rows: existing } = await pool.query(
      'SELECT id, status FROM orders WHERE idempotency_key = $1 LIMIT 1',
      [params.idempotency_key]
    )
    if (existing.length > 0) {
      return { conflict: true, order_id: existing[0].id, status: existing[0].status }
    }
  }

  // 2. Валидация
  const validation = await validateOrderRequest(params, pool)
  if (!validation.valid) {
    return { validationError: validation.errors }
  }

  const { items } = validation
  const totalAmount = items.reduce((sum, i) => sum + i.total_price, 0)
  const currency = items[0]?.currency || 'RUB'

  // 3. Создание в транзакции
  const result = await pool.query('BEGIN')
  try {
    // 3a. Создать заказ
    const idempKey = params.idempotency_key || crypto.randomUUID()
    const { rows: orders } = await pool.query(
      `INSERT INTO orders (
        user_id, status, total, currency, payment_status,
        user_email, idempotency_key, service_config_snapshot
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *`,
      [
        userId,
        'pending',
        totalAmount,
        currency,
        'pending',
        params.email || null,
        idempKey,
        JSON.stringify(items.map(i => i.snapshot)),
      ]
    )
    const order = orders[0]

    // 3b. Создать позиции заказа
    for (const item of items) {
      const { rows: orderItems } = await pool.query(
        `INSERT INTO order_items (
          order_id, product_id, product_name,
          service_id, service_name, region_id, region_name, region_code,
          quantity, price, unit_price, total_price,
          delivery_status, currency
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
        RETURNING id`,
        [
          order.id,
          item.product_id,
          item.product_name,
          item.service_id,
          item.service_name,
          item.region_id,
          item.region_name,
          item.region_code,
          item.quantity,
          item.unit_price,
          item.unit_price,
          item.total_price,
          'pending',
          item.currency,
        ]
      )
      const orderItemId = orderItems[0].id

      // 3c. Сохранить поля ввода
      for (const input of item.inputs) {
        const sha256 = crypto.createHash('sha256').update(input.value).digest('hex')
        await pool.query(
          `INSERT INTO order_item_inputs (
            order_item_id, field_key, field_label, field_type, value, value_sha256
          ) VALUES ($1,$2,$3,$4,$5,$6)`,
          [orderItemId, input.field_key, input.field_label, input.field_type, input.value, sha256]
        )
      }
    }

    // 3d. Запись в историю статусов
    await pool.query(
      `INSERT INTO order_status_history (order_id, to_status, changed_by)
       VALUES ($1, 'pending', 'system')`,
      [order.id]
    )

    await pool.query('COMMIT')

    return { order, items: validation.items }

  } catch (err) {
    await pool.query('ROLLBACK')
    throw err
  }
}

/**
 * Получает заказ со всеми связанными данными.
 */
export async function getOrderDetail(orderId, pool) {
  const { rows: orders } = await pool.query('SELECT * FROM orders WHERE id = $1', [orderId])
  if (orders.length === 0) return null
  const order = orders[0]

  const { rows: items } = await pool.query(
    `SELECT oi.*, json_agg(oii.*) as inputs
     FROM order_items oi
     LEFT JOIN order_item_inputs oii ON oii.order_item_id = oi.id
     WHERE oi.order_id = $1
     GROUP BY oi.id
     ORDER BY oi.created_at`,
    [orderId]
  )

  return { ...order, items }
}

/**
 * Обновляет статус заказа.
 */
export async function updateOrderStatus(orderId, newStatus, pool, reason) {
  // Сначала читаем старый статус, потом обновляем
  const { rows: before } = await pool.query(
    'SELECT status FROM orders WHERE id = $1', [orderId]
  )
  const oldStatus = before.length > 0 ? before[0].status : null

  const { rows: orders } = await pool.query(
    `UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [newStatus, orderId]
  )
  if (orders.length > 0) {
    await pool.query(
      `INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, reason)
       VALUES ($1, $2, $3, 'system', $4)`,
      [orderId, oldStatus, newStatus, reason || null]
    )
  }
  return orders[0]
}
