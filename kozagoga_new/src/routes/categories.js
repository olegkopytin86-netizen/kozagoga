// ─── Categories API Routes (SRS v2) ──────────────────────
// GET /api/categories — дерево категорий с количеством товаров
// (SRS CAT-1.7)
// ─────────────────────────────────────────────────────────

import { Router } from 'express'
import { getReadPool } from '../lib/pool.js'

const cache = { data: null, time: 0 }
const CACHE_TTL = 300_000 // 5 min

export default function createCategoriesRouter() {
  const router = Router()
  const readPool = getReadPool()

  router.get('/', async (req, res) => {
    try {
      if (cache.data && Date.now() - cache.time < CACHE_TTL) {
        return res.json(cache.data)
      }

      const { rows } = await readPool.query(
        `SELECT id, name, slug, description, icon, sort_order,
                (SELECT COUNT(*) FROM products WHERE category_id = categories.id AND is_active = true) AS product_count
         FROM categories
         WHERE is_active = true
         ORDER BY sort_order ASC, name ASC`
      )

      cache.data = rows
      cache.time = Date.now()
      res.json(rows)
    } catch (err) {
      console.error('GET /api/categories error:', err)
      res.status(500).json({ error: 'Ошибка получения категорий' })
    }
  })

  return router
}
