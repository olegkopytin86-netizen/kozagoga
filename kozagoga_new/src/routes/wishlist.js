// ─── Wishlist Routes ─────────────────────────────────────
// Избранное: CRUD + уведомления о скидках
// (SRS Модуль 6)
// ─────────────────────────────────────────────────────────

import { Router } from 'express'
import { getPool } from '../lib/pool.js'

const pool = getPool()

export default function createWishlistRouter() {
  const router = Router()

  // Все эндпоинты требуют авторизации
  router.use((req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Требуется авторизация' })
    next()
  })

  /** GET /api/wishlist — список избранного */
  router.get('/', async (req, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT wi.id, wi.product_id, wi.variant_id, wi.notify_on_sale, wi.notify_reminder, wi.created_at,
                p.name, p.slug, p.price, p.price_min, p.price_max, p.images->>0 AS image_url,
                p.rating, p.old_price
         FROM wishlist_items wi
         JOIN products p ON p.id = wi.product_id
         WHERE wi.user_id = $1
         ORDER BY wi.created_at DESC`,
        [req.user.id]
      )
      res.json(rows)
    } catch (err) {
      console.error('[wishlist] GET error:', err)
      res.status(500).json({ error: 'Ошибка получения избранного' })
    }
  })

  /** POST /api/wishlist — добавить в избранное */
  router.post('/', async (req, res) => {
    try {
      const { product_id, variant_id } = req.body
      if (!product_id) return res.status(400).json({ error: 'product_id обязателен' })

      const { rows } = await pool.query(
        `INSERT INTO wishlist_items (user_id, product_id, variant_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, product_id, variant_id) DO NOTHING
         RETURNING *`,
        [req.user.id, product_id, variant_id || null]
      )
      res.status(201).json(rows[0] || { exists: true })
    } catch (err) {
      console.error('[wishlist] POST error:', err)
      res.status(500).json({ error: 'Ошибка добавления в избранное' })
    }
  })

  /** DELETE /api/wishlist/:id — удалить из избранного */
  router.delete('/:id', async (req, res) => {
    try {
      const { rowCount } = await pool.query(
        'DELETE FROM wishlist_items WHERE id = $1 AND user_id = $2',
        [req.params.id, req.user.id]
      )
      if (rowCount === 0) return res.status(404).json({ error: 'Не найдено' })
      res.json({ deleted: true })
    } catch (err) {
      console.error('[wishlist] DELETE error:', err)
      res.status(500).json({ error: 'Ошибка удаления' })
    }
  })

  /** PATCH /api/wishlist/:id — обновить настройки уведомлений */
  router.patch('/:id', async (req, res) => {
    try {
      const { notify_on_sale, notify_reminder } = req.body
      const updates = []
      const params = [req.params.id, req.user.id]
      let idx = 3

      if (notify_on_sale !== undefined) {
        updates.push(`notify_on_sale = $${idx++}`)
        params.push(notify_on_sale)
      }
      if (notify_reminder !== undefined) {
        updates.push(`notify_reminder = $${idx++}`)
        params.push(notify_reminder)
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'Нет полей для обновления' })
      }

      const { rows } = await pool.query(
        `UPDATE wishlist_items SET ${updates.join(', ')} WHERE id = $1 AND user_id = $2 RETURNING *`,
        params
      )
      if (rows.length === 0) return res.status(404).json({ error: 'Не найдено' })
      res.json(rows[0])
    } catch (err) {
      console.error('[wishlist] PATCH error:', err)
      res.status(500).json({ error: 'Ошибка обновления' })
    }
  })

  return router
}
