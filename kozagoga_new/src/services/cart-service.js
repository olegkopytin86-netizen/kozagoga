// ─── Cart Service ─────────────────────────────────────────
// Бизнес-логика корзины: создание, добавление, удаление, merge
// (SRS Модуль 3 — Корзина и Чекаут)
// ─────────────────────────────────────────────────────────

import { getPool } from '../lib/pool.js'

const pool = getPool()

/**
 * Получить или создать активную корзину пользователя
 */
export async function getOrCreateCart(userId = null, sessionId = null) {
  if (!userId && !sessionId) {
    throw new Error('userId or sessionId required')
  }

  // Ищем активную корзину
  let query, params
  if (userId) {
    query = `SELECT * FROM carts WHERE user_id = $1 AND status = 'active' LIMIT 1`
    params = [userId]
  } else {
    query = `SELECT * FROM carts WHERE session_id = $1 AND status = 'active' LIMIT 1`
    params = [sessionId]
  }

  let { rows } = await pool.query(query, params)

  if (rows.length > 0) {
    return rows[0]
  }

  // Создаём новую
  const insertData = userId
    ? { user_id: userId, status: 'active', currency: 'RUB' }
    : { session_id: sessionId, status: 'active', currency: 'RUB' }

  const keys = Object.keys(insertData)
  const values = Object.values(insertData)
  const placeholders = keys.map((_, i) => `$${i + 1}`)

  const result = await pool.query(
    `INSERT INTO carts (${keys.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
    values
  )

  return result.rows[0]
}

/**
 * Добавить товар в корзину
 */
export async function addCartItem(cartId, productId, { variantId = null, quantity = 1, giftTo = null, giftMessage = null } = {}) {
  // Проверяем, есть ли уже такой товар в корзине
  const { rows: existing } = await pool.query(
    `SELECT * FROM cart_items WHERE cart_id = $1 AND product_id = $2 AND (variant_id IS NULL AND $3::uuid IS NULL OR variant_id = $3)`,
    [cartId, productId, variantId]
  )

  if (existing.length > 0) {
    // Увеличиваем количество
    const result = await pool.query(
      `UPDATE cart_items SET quantity = quantity + $1 WHERE id = $2 RETURNING *`,
      [quantity, existing[0].id]
    )
    return result.rows[0]
  }

  // Получаем цену товара
  let price, currency
  if (variantId) {
    const { rows } = await pool.query(
      `SELECT price, currency FROM product_variants WHERE id = $1 AND is_active = true`,
      [variantId]
    )
    if (rows.length === 0) throw new Error('Variant not found or inactive')
    price = rows[0].price
    currency = rows[0].currency
  } else {
    const { rows } = await pool.query(
      `SELECT price, currency FROM products WHERE id = $1 AND is_active = true`,
      [productId]
    )
    if (rows.length === 0) throw new Error('Product not found or inactive')
    price = rows[0].price
    currency = rows[0].currency
  }

  const result = await pool.query(
    `INSERT INTO cart_items (cart_id, product_id, variant_id, quantity, price, currency, gift_to, gift_message)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [cartId, productId, variantId, quantity, price, currency, giftTo, giftMessage]
  )

  return result.rows[0]
}

/**
 * Обновить количество товара в корзине
 */
export async function updateCartItemQuantity(itemId, quantity) {
  if (quantity <= 0) {
    await pool.query('DELETE FROM cart_items WHERE id = $1', [itemId])
    return null
  }

  const result = await pool.query(
    'UPDATE cart_items SET quantity = $1 WHERE id = $2 RETURNING *',
    [quantity, itemId]
  )
  return result.rows[0] || null
}

/**
 * Удалить товар из корзины
 */
export async function removeCartItem(itemId) {
  const result = await pool.query(
    'DELETE FROM cart_items WHERE id = $1 RETURNING *',
    [itemId]
  )
  return result.rows[0] || null
}

/**
 * Получить полную корзину с товарами (с подтянутыми данными продуктов)
 */
export async function getFullCart(cartId) {
  const { rows: items } = await pool.query(`
    SELECT
      ci.id, ci.cart_id, ci.product_id, ci.variant_id, ci.quantity,
      ci.price AS item_price, ci.currency, ci.gift_to, ci.gift_message,
      p.name AS product_name, p.slug, p.images->>0 AS image_url,
      p.is_active, p.delivery_type, p.product_type,
      pv.name AS variant_name, pv.sku,
      COALESCE(pv.stock, p.stock) AS stock
    FROM cart_items ci
    JOIN products p ON p.id = ci.product_id
    LEFT JOIN product_variants pv ON pv.id = ci.variant_id
    WHERE ci.cart_id = $1
    ORDER BY ci.created_at ASC
  `, [cartId])

  const { rows: carts } = await pool.query(
    'SELECT * FROM carts WHERE id = $1',
    [cartId]
  )
  const cart = carts[0]

  // Проверяем доступность товаров
  const validatedItems = []
  for (const item of items) {
    const validStock = item.stock === -1 || item.stock >= item.quantity
    validatedItems.push({
      ...item,
      available: item.is_active && validStock,
      subtotal: parseFloat(item.item_price) * item.quantity,
    })
  }

  const subtotal = validatedItems.reduce((sum, i) => sum + i.subtotal, 0)
  const discount = parseFloat(cart.discount_amount || 0)
  const total = Math.max(0, subtotal - discount)

  return {
    id: cart.id,
    status: cart.status,
    currency: cart.currency,
    subtotal,
    discount_amount: discount,
    total,
    coupon_id: cart.coupon_id,
    items: validatedItems,
  }
}

/**
 * Слияние анонимной корзины с пользовательской при логине
 */
export async function mergeCarts(sessionId, userId) {
  const result = await pool.query('SELECT merge_carts($1, $2) AS cart_id', [sessionId, userId])
  return result.rows[0]?.cart_id || null
}

/**
 * Очистить корзину
 */
export async function clearCart(cartId) {
  await pool.query('DELETE FROM cart_items WHERE cart_id = $1', [cartId])
  await pool.query('UPDATE carts SET discount_amount = 0, coupon_id = NULL WHERE id = $1', [cartId])
}

/**
 * Применить промокод к корзине
 */
export async function applyCoupon(cartId, code, userId) {
  // Ищем купон
  const { rows: coupons } = await pool.query(`
    SELECT * FROM coupons
    WHERE code = $1 AND is_active = true
      AND (valid_from IS NULL OR valid_from <= NOW())
      AND (valid_to IS NULL OR valid_to >= NOW())
    LIMIT 1
  `, [code])

  if (coupons.length === 0) {
    throw new Error('Промокод не найден или истёк')
  }

  const coupon = coupons[0]

  // Проверка лимита использования
  if (coupon.max_uses > 0 && coupon.used_count >= coupon.max_uses) {
    throw new Error('Промокод больше недействителен (исчерпан лимит)')
  }

  // Проверка лимита на пользователя
  if (coupon.max_uses_per_user > 0) {
    const { rows: usage } = await pool.query(
      'SELECT COUNT(*) AS cnt FROM coupon_uses WHERE coupon_id = $1 AND user_id = $2',
      [coupon.id, userId]
    )
    if (parseInt(usage[0].cnt) >= coupon.max_uses_per_user) {
      throw new Error('Вы уже использовали этот промокод')
    }
  }

  // Получаем сумму корзины
  const { rows: cartRows } = await pool.query('SELECT total FROM carts WHERE id = $1', [cartId])
  const cartTotal = parseFloat(cartRows[0]?.total || 0)

  if (cartTotal < parseFloat(coupon.min_order_amount || 0)) {
    throw new Error(`Минимальная сумма заказа: ${coupon.min_order_amount} ${cartRows[0]?.currency || 'RUB'}`)
  }

  // Рассчитываем скидку
  let discountAmount
  if (coupon.type === 'fixed') {
    discountAmount = Math.min(parseFloat(coupon.value), cartTotal)
  } else if (coupon.type === 'percent') {
    discountAmount = cartTotal * parseFloat(coupon.value) / 100
    if (coupon.max_discount) {
      discountAmount = Math.min(discountAmount, parseFloat(coupon.max_discount))
    }
  } else {
    throw new Error('Неподдерживаемый тип промокода')
  }

  // Применяем
  await pool.query(
    'UPDATE carts SET coupon_id = $1, discount_amount = $2 WHERE id = $3',
    [coupon.id, discountAmount, cartId]
  )

  return { discount_amount: discountAmount, coupon_code: code }
}

/**
 * Удалить промокод из корзины
 */
export async function removeCoupon(cartId) {
  await pool.query(
    'UPDATE carts SET coupon_id = NULL, discount_amount = 0 WHERE id = $1',
    [cartId]
  )
}
