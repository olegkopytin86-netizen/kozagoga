// ─── Gifts Routes ────────────────────────────────────────
// Система подарков: отправка, получение, claim
// (SRS Модуль 7)
// ─────────────────────────────────────────────────────────

import { Router } from 'express'
import { getPool } from '../lib/pool.js'
import crypto from 'node:crypto'

const pool = getPool()

function generateClaimCode() {
  return 'GIFT-' + crypto.randomBytes(4).toString('hex').toUpperCase()
}

export default function createGiftsRouter() {
  const router = Router()

  /** GET /api/gifts/sent — отправленные подарки */
  router.get('/sent', async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Требуется авторизация' })
      const { rows } = await pool.query(
        `SELECT g.*, p.name AS product_name, p.slug
         FROM gifts g
         JOIN order_items oi ON oi.id = g.order_item_id
         JOIN products p ON p.id = oi.product_id
         WHERE g.from_user_id = $1
         ORDER BY g.created_at DESC LIMIT 50`,
        [req.user.id]
      )
      res.json(rows)
    } catch (err) {
      console.error('[gifts] sent error:', err)
      res.status(500).json({ error: 'Ошибка получения подарков' })
    }
  })

  /** GET /api/gifts/received — полученные подарки */
  router.get('/received', async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Требуется авторизация' })
      const { rows } = await pool.query(
        `SELECT g.id, g.message, g.status, g.claimed_at, g.created_at,
                p.name AS product_name, p.slug,
                u.email AS from_email
         FROM gifts g
         JOIN users u ON u.id = g.from_user_id
         JOIN order_items oi ON oi.id = g.order_item_id
         JOIN products p ON p.id = oi.product_id
         WHERE g.to_recipient = $1 OR g.claimed_by = $2
         ORDER BY g.created_at DESC LIMIT 50`,
        [req.user.email, req.user.id]
      )
      res.json(rows)
    } catch (err) {
      console.error('[gifts] received error:', err)
      res.status(500).json({ error: 'Ошибка получения подарков' })
    }
  })

  /** GET /api/gifts/:code — информация о подарке по коду (публичный) */
  router.get('/:code', async (req, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT g.status, g.message, g.recipient_name, g.created_at, g.expires_at,
                p.name AS product_name, p.slug, p.images->>0 AS image_url
         FROM gifts g
         JOIN order_items oi ON oi.id = g.order_item_id
         JOIN products p ON p.id = oi.product_id
         WHERE g.claim_code = $1
         LIMIT 1`,
        [req.params.code]
      )
      if (rows.length === 0) return res.status(404).json({ error: 'Подарок не найден' })
      res.json(rows[0])
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  /** POST /api/gifts/:code/claim — активировать подарок */
  router.post('/:code/claim', async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Требуется авторизация' })

      const { rows } = await pool.query(
        `SELECT g.*, oi.product_id, oi.variant_id
         FROM gifts g
         JOIN order_items oi ON oi.id = g.order_item_id
         WHERE g.claim_code = $1 AND g.status = 'sent'
         LIMIT 1`,
        [req.params.code]
      )

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Подарок не найден или уже активирован' })
      }

      const gift = rows[0]

      // Создаём digital_delivery для получателя
      await pool.query(
        `UPDATE gifts SET status = 'claimed', claimed_by = $1, claimed_at = NOW()
         WHERE id = $2`,
        [req.user.id, gift.id]
      )

      // Если есть ключ в original order_item — копируем получателю
      const { rows: deliveries } = await pool.query(
        `SELECT * FROM digital_deliveries WHERE order_item_id = $1`,
        [gift.order_item_id]
      )
      if (deliveries.length > 0) {
        for (const d of deliveries) {
          await pool.query(
            `INSERT INTO digital_deliveries (order_id, order_item_id, product_id, variant_id, key_pool_id, type, value_encrypted, delivery_method)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'profile')`,
            [gift.order_id, gift.order_item_id, gift.product_id, gift.variant_id, d.key_pool_id, d.type, d.value_encrypted]
          )
        }
      }

      res.json({ message: 'Подарок активирован!', status: 'claimed' })
    } catch (err) {
      console.error('[gifts] claim error:', err)
      res.status(500).json({ error: err.message })
    }
  })

  return router
}
