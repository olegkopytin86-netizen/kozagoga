// ─── Admin Coupons Routes ────────────────────────────────
// CRUD промокодов + массовая генерация
// (SRS Модуль 8)
// ─────────────────────────────────────────────────────────

import { Router } from 'express'
import { getPool } from '../lib/pool.js'

const pool = getPool()

export default function createCouponAdminRouter() {
  const router = Router()

  // Admin auth
  router.use((req, res, next) => {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Недостаточно прав' })
    next()
  })

  /** GET /api/admin/promotions/coupons — список промокодов */
  router.get('/coupons', async (req, res) => {
    try {
      const { rows } = await pool.query(
        'SELECT * FROM coupons ORDER BY created_at DESC LIMIT 100'
      )
      res.json(rows)
    } catch (err) {
      console.error('[coupons] list error:', err)
      res.status(500).json({ error: 'Ошибка списка промокодов' })
    }
  })

  /** GET /api/admin/promotions/coupons/:id — детали */
  router.get('/coupons/:id', async (req, res) => {
    try {
      const { rows } = await pool.query('SELECT * FROM coupons WHERE id = $1', [req.params.id])
      if (rows.length === 0) return res.status(404).json({ error: 'Не найден' })
      res.json(rows[0])
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  /** POST /api/admin/promotions/coupons — создать */
  router.post('/coupons', async (req, res) => {
    try {
      const { code, type, value, min_order_amount, max_discount, max_uses, max_uses_per_user, valid_from, valid_to, products, users } = req.body
      if (!code || !type || value === undefined) {
        return res.status(400).json({ error: 'code, type, value обязательны' })
      }
      const { rows } = await pool.query(
        `INSERT INTO coupons (code, type, value, min_order_amount, max_discount, max_uses, max_uses_per_user, valid_from, valid_to, products, users, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
        [code, type, value, min_order_amount || 0, max_discount || null, max_uses || 1, max_uses_per_user || 1, valid_from || null, valid_to || null, products || null, users || null, req.user.id]
      )
      res.status(201).json(rows[0])
    } catch (err) {
      console.error('[coupons] create error:', err)
      res.status(500).json({ error: err.message })
    }
  })

  /** PUT /api/admin/promotions/coupons/:id — обновить */
  router.put('/coupons/:id', async (req, res) => {
    try {
      const fields = ['code', 'type', 'value', 'min_order_amount', 'max_discount', 'max_uses', 'max_uses_per_user', 'is_active', 'valid_from', 'valid_to', 'products', 'users']
      const updates = []
      const params = []
      let idx = 1

      for (const f of fields) {
        if (req.body[f] !== undefined) {
          updates.push(`${f} = $${idx++}`)
          params.push(req.body[f])
        }
      }
      if (updates.length === 0) return res.status(400).json({ error: 'Нет полей для обновления' })

      params.push(req.params.id)
      const { rows } = await pool.query(
        `UPDATE coupons SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
        params
      )
      if (rows.length === 0) return res.status(404).json({ error: 'Не найден' })
      res.json(rows[0])
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  /** DELETE /api/admin/promotions/coupons/:id — удалить */
  router.delete('/coupons/:id', async (req, res) => {
    try {
      const { rowCount } = await pool.query('DELETE FROM coupons WHERE id = $1', [req.params.id])
      if (rowCount === 0) return res.status(404).json({ error: 'Не найден' })
      res.json({ deleted: true })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  /** GET /api/admin/promotions/coupons/:id/stats — статистика использования */
  router.get('/coupons/:id/stats', async (req, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT
          COUNT(*) AS total_uses,
          COALESCE(SUM(discount_amount), 0) AS total_discount,
          COUNT(DISTINCT user_id) AS unique_users
         FROM coupon_uses WHERE coupon_id = $1`,
        [req.params.id]
      )
      const { rows: recent } = await pool.query(
        `SELECT cu.*, u.email AS user_email
         FROM coupon_uses cu JOIN users u ON u.id = cu.user_id
         WHERE cu.coupon_id = $1 ORDER BY cu.created_at DESC LIMIT 20`,
        [req.params.id]
      )
      res.json({ ...rows[0], recent })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  /** POST /api/admin/promotions/bulk-generate — массовая генерация */
  router.post('/bulk-generate', async (req, res) => {
    try {
      const { type, value, count = 10, prefix = 'PROMO', valid_days = 30, min_order_amount = 0, max_uses = 1 } = req.body
      if (!type || value === undefined) {
        return res.status(400).json({ error: 'type, value обязательны' })
      }

      const generated = []
      const valid_to = new Date(Date.now() + valid_days * 86400000).toISOString()

      for (let i = 0; i < count; i++) {
        const code = `${prefix}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
        try {
          await pool.query(
            `INSERT INTO coupons (code, type, value, min_order_amount, max_uses, valid_to, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [code, type, value, min_order_amount, max_uses, valid_to, req.user.id]
          )
          generated.push(code)
        } catch {
          // duplicate — skip
        }
      }

      res.json({ generated: generated.length, codes: generated })
    } catch (err) {
      console.error('[coupons] bulk error:', err)
      res.status(500).json({ error: err.message })
    }
  })

  return router
}
