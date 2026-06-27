// ─── Bundles Routes ──────────────────────────────────────
// Комплекты товаров (ручное создание в админке)
// (SRS Модуль 12 — RCM-12.3)
// ─────────────────────────────────────────────────────────

import { Router } from 'express'
import { getPool } from '../lib/pool.js'

const pool = getPool()
const readPool = pool // используем общий пул для простоты

export default function createBundlesRouter() {
  const router = Router()

  // ─── Публичные ──────────────────────────────────────

  /** GET /api/bundles — активные комплекты */
  router.get('/', async (req, res) => {
    try {
      const { rows } = await readPool.query(
        `SELECT id, name, slug, description, image_url, total_price, discount_percent, is_active
         FROM bundles
         WHERE is_active = true
           AND (valid_from IS NULL OR valid_from <= NOW())
           AND (valid_to IS NULL OR valid_to >= NOW())
         ORDER BY created_at DESC`
      )
      res.json(rows)
    } catch (err) {
      console.error('[bundles] GET error:', err)
      res.status(500).json({ error: 'Ошибка получения комплектов' })
    }
  })

  /** GET /api/bundles/:slug — детали комплекта с товарами */
  router.get('/:slug', async (req, res) => {
    try {
      const { rows: bundles } = await readPool.query(
        `SELECT * FROM bundles WHERE slug = $1 AND is_active = true LIMIT 1`,
        [req.params.slug]
      )
      if (bundles.length === 0) return res.status(404).json({ error: 'Комплект не найден' })

      const { rows: items } = await readPool.query(
        `SELECT bi.id, bi.product_id, bi.variant_id, bi.quantity, bi.sort_order,
                p.name, p.slug, p.price, p.images->>0 AS image_url,
                pv.name AS variant_name, pv.price AS variant_price
         FROM bundle_items bi
         JOIN products p ON p.id = bi.product_id
         LEFT JOIN product_variants pv ON pv.id = bi.variant_id
         WHERE bi.bundle_id = $1
         ORDER BY bi.sort_order`,
        [bundles[0].id]
      )

      res.json({ ...bundles[0], items })
    } catch (err) {
      console.error('[bundles] GET detail error:', err)
      res.status(500).json({ error: 'Ошибка получения комплекта' })
    }
  })

  // ─── Admin ──────────────────────────────────────────

  /** CRUD admin */
  router.get('/admin/bundles', async (req, res) => {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Недостаточно прав' })
    const { rows } = await pool.query('SELECT * FROM bundles ORDER BY created_at DESC')
    res.json(rows)
  })

  router.post('/admin/bundles', async (req, res) => {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Недостаточно прав' })
    const { name, slug, description, image_url, total_price, discount_percent, valid_from, valid_to } = req.body
    if (!name) return res.status(400).json({ error: 'name обязателен' })
    const { rows } = await pool.query(
      `INSERT INTO bundles (name, slug, description, image_url, total_price, discount_percent, valid_from, valid_to)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [name, slug || name.toLowerCase().replace(/\s+/g, '-'), description || null, image_url || null, total_price || null, discount_percent || null, valid_from || null, valid_to || null]
    )
    res.status(201).json(rows[0])
  })

  router.put('/admin/bundles/:id', async (req, res) => {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Недостаточно прав' })
    const allowed = ['name', 'slug', 'description', 'image_url', 'total_price', 'discount_percent', 'is_active', 'valid_from', 'valid_to']
    const updates = []
    const params = []
    let idx = 1
    for (const f of allowed) {
      if (req.body[f] !== undefined) {
        updates.push(`${f} = $${idx++}`)
        params.push(req.body[f])
      }
    }
    if (updates.length === 0) return res.status(400).json({ error: 'Нет полей' })
    params.push(req.params.id)
    const { rows } = await pool.query(`UPDATE bundles SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`, params)
    if (rows.length === 0) return res.status(404).json({ error: 'Не найден' })
    res.json(rows[0])
  })

  router.delete('/admin/bundles/:id', async (req, res) => {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Недостаточно прав' })
    const { rowCount } = await pool.query('DELETE FROM bundles WHERE id = $1', [req.params.id])
    if (rowCount === 0) return res.status(404).json({ error: 'Не найден' })
    res.json({ deleted: true })
  })

  /** POST /admin/bundles/:id/items — добавить товар в комплект */
  router.post('/admin/bundles/:id/items', async (req, res) => {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Недостаточно прав' })
    const { product_id, variant_id, quantity } = req.body
    if (!product_id) return res.status(400).json({ error: 'product_id обязателен' })
    const { rows } = await pool.query(
      `INSERT INTO bundle_items (bundle_id, product_id, variant_id, quantity) VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.params.id, product_id, variant_id || null, quantity || 1]
    )
    res.status(201).json(rows[0])
  })

  router.delete('/admin/bundles/:id/items/:itemId', async (req, res) => {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Недостаточно прав' })
    await pool.query('DELETE FROM bundle_items WHERE id = $1 AND bundle_id = $2', [req.params.itemId, req.params.id])
    res.json({ deleted: true })
  })

  return router
}
