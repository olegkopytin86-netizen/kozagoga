// ─── Key Pool Service ────────────────────────────────────
// Управление пулом ключей: загрузка, резервирование, выдача
// (SRS Модуль 2 — Digital Delivery)
// ─────────────────────────────────────────────────────────

import crypto from 'node:crypto'
import { getPool } from '../lib/pool.js'

const pool = getPool()
const ALGORITHM = 'aes-256-gcm'

function getEncryptionKey() {
  const key = process.env.KEY_ENCRYPTION_KEY
  if (!key || key.length < 32) {
    throw new Error('KEY_ENCRYPTION_KEY must be set and at least 32 chars')
  }
  return crypto.createHash('sha256').update(key).digest()
}

function encryptValue(value) {
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  let encrypted = cipher.update(value, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return { encrypted, iv: iv.toString('hex'), tag: cipher.getAuthTag().toString('hex') }
}

function decryptValue(encrypted, ivHex, tagHex) {
  const key = getEncryptionKey()
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'))
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

/**
 * Загрузить ключи в пул (batch insert)
 */
export async function uploadKeys(productId, keys, batchSize = 500) {
  let uploaded = 0
  let duplicates = 0
  let errors = 0

  for (let i = 0; i < keys.length; i += batchSize) {
    const batch = keys.slice(i, i + batchSize)

    for (const key of batch) {
      try {
        const hash = sha256(key.value)
        const { encrypted, iv, tag } = encryptValue(key.value)

        const storedValue = `${encrypted}:${iv}:${tag}`

        const { rows: existing } = await pool.query(
          'SELECT id FROM key_pool WHERE value_hash = $1',
          [hash]
        )
        if (existing.length > 0) {
          duplicates++
          continue
        }

        await pool.query(
          `INSERT INTO key_pool (product_id, value, value_hash, type, meta, expires_at, cost_price, supplier)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            productId,
            storedValue,
            hash,
            key.type || 'key',
            key.meta ? JSON.stringify(key.meta) : null,
            key.expiresAt || null,
            key.costPrice || null,
            key.supplier || null,
          ]
        )
        uploaded++
      } catch (err) {
        errors++
        console.error('[key-pool] Upload error:', err.message)
      }
    }
  }

  return { uploaded, duplicates, errors }
}

/**
 * Резервировать ключ для заказа (FOR UPDATE SKIP LOCKED)
 */
export async function reserveKey(productId, variantId, orderItemId, orderId) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const { rows } = await client.query(
      `SELECT id, value FROM key_pool
       WHERE product_id = $1
         AND (variant_id = $2 OR ($2 IS NULL AND variant_id IS NULL))
         AND is_sold = false
         AND (expires_at IS NULL OR expires_at > NOW())
       ORDER BY created_at ASC
       LIMIT 1
       FOR UPDATE SKIP LOCKED`,
      [productId, variantId]
    )

    if (rows.length === 0) {
      await client.query('ROLLBACK')
      return null
    }

    const keyRec = rows[0]
    const parts = keyRec.value.split(':')
    const decrypted = decryptValue(parts[0], parts[1], parts[2])

    await client.query(
      `UPDATE key_pool SET is_sold = true, sold_at = NOW(), order_item_id = $1 WHERE id = $2`,
      [orderItemId, keyRec.id]
    )

    await client.query(
      `INSERT INTO digital_deliveries (order_id, order_item_id, product_id, variant_id, key_pool_id, type, value_encrypted, delivery_method)
       VALUES ($1, $2, $3, $4, $5, 'key', $6, 'screen')`,
      [orderId, orderItemId, productId, variantId, keyRec.id, keyRec.value]
    )

    await client.query(
      `UPDATE products SET stock = CASE WHEN stock > 0 THEN stock - 1 ELSE stock END
       WHERE id = $1 AND stock >= 0`,
      [productId]
    )

    await client.query('COMMIT')
    return { id: keyRec.id, value: decrypted, type: 'key' }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

/**
 * Показать ключ (reveal)
 */
export async function revealKey(orderItemId, userId) {
  const { rows } = await pool.query(
    `SELECT dd.* FROM digital_deliveries dd
     JOIN order_items oi ON oi.id = dd.order_item_id
     JOIN orders o ON o.id = dd.order_id
     WHERE dd.order_item_id = $1 AND o.user_id = $2
     LIMIT 1`,
    [orderItemId, userId]
  )

  if (rows.length === 0) return null

  const delivery = rows[0]

  if (delivery.reveal_count >= delivery.max_reveals) {
    throw new Error('Превышен лимит показов ключа')
  }

  const parts = delivery.value_encrypted.split(':')
  const decrypted = decryptValue(parts[0], parts[1], parts[2])

  await pool.query(
    `UPDATE digital_deliveries SET is_revealed = true, revealed_at = NOW(), reveal_count = reveal_count + 1
     WHERE id = $1`,
    [delivery.id]
  )

  return decrypted
}

/**
 * Получить список выданных товаров по заказу
 */
export async function getDeliveriesByOrder(orderId, userId) {
  const { rows } = await pool.query(
    `SELECT dd.id, dd.order_item_id, dd.type, dd.is_revealed, dd.reveal_count, dd.max_reveals,
            dd.delivery_method, dd.created_at, dd.auto_activated,
            p.name AS product_name, p.slug,
            pv.name AS variant_name
     FROM digital_deliveries dd
     JOIN order_items oi ON oi.id = dd.order_item_id
     JOIN orders o ON o.id = dd.order_id
     JOIN products p ON p.id = dd.product_id
     LEFT JOIN product_variants pv ON pv.id = dd.variant_id
     WHERE dd.order_id = $1 AND o.user_id = $2
     ORDER BY dd.created_at`,
    [orderId, userId]
  )
  return rows
}

/**
 * Статистика key pool
 */
export async function getKeyPoolStats(productId) {
  let query = `
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE is_sold = false) AS available,
      COUNT(*) FILTER (WHERE is_sold = true) AS sold,
      COUNT(*) FILTER (WHERE is_sold = false AND expires_at < NOW()) AS expired
    FROM key_pool
  `
  const params = []
  if (productId) {
    query += ' WHERE product_id = $1'
    params.push(productId)
  }
  const { rows } = await pool.query(query, params)
  return rows[0]
}
