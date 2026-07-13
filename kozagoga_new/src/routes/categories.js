// ─── Categories API Routes (SRS v2) ──────────────────────
// GET /api/categories — дерево категорий с количеством товаров
// (SRS CAT-1.7)
// ─────────────────────────────────────────────────────────

import { Router } from 'express'
import { getPool, getReadPool } from '../lib/pool.js'

const cache = { data: null, time: 0 }
const CACHE_TTL = 300_000 // 5 min

export default function createCategoriesRouter() {
  const router = Router()
  const pool = getPool()
  const readPool = getReadPool()

  router.get('/', async (req, res) => {
    try {
      if (cache.data && Date.now() - cache.time < CACHE_TTL) {
        return res.json(cache.data)
      }

      // Дерево категорий с поддержкой parent_id (DGoods иерархия)
      const { rows } = await readPool.query(
        `SELECT c.id, c.name, c.slug, c.description, c.icon, c.sort_order,
                c.parent_id,
                (SELECT COUNT(*) FROM products WHERE category_id = c.id AND is_active = true) AS product_count
         FROM categories c
         WHERE c.is_active = true
         ORDER BY c.sort_order ASC, c.name ASC`
      )
      
      // Строим дерево: группируем дочерние под родительскими
      const parentMap = {}
      const childrenMap = {}
      for (const cat of rows) {
        if (!cat.parent_id) {
          parentMap[cat.id] = { ...cat, children: [] }
        } else {
          if (!childrenMap[cat.parent_id]) childrenMap[cat.parent_id] = []
          childrenMap[cat.parent_id].push({ ...cat, children: [] })
        }
      }
      // Собираем результат: родители с вложенными детьми
      const tree = []
      for (const [pid, parent] of Object.entries(parentMap)) {
        parent.children = childrenMap[pid] || []
        tree.push(parent)
      }
      // Плоские категории (без parent_id) тоже добавляем
      for (const cat of rows) {
        if (!cat.parent_id && !parentMap[cat.id]) {
          tree.push({ ...cat, children: childrenMap[cat.id] || [] })
        }
      }

      cache.data = tree
      cache.time = Date.now()
      res.json(tree)
    } catch (err) {
      console.error('GET /api/categories error:', err)
      res.status(500).json({ error: 'Ошибка получения категорий' })
    }
  })

  // ─── POST /api/categories — создать категорию (admin) ────
  router.post('/', async (req, res) => {
    try {
      if (!req.user || !['admin', 'superadmin'].includes(req.user.role)) {
        return res.status(403).json({ error: 'FORBIDDEN' })
      }
      const { name, slug, description, icon, sort_order } = req.body
      if (!name || !slug) return res.status(400).json({ error: 'name, slug обязательны' })
      const { rows } = await pool.query(
        'INSERT INTO categories (name, slug, description, icon, sort_order) VALUES ($1,$2,$3,$4,$5) RETURNING *',
        [name, slug, description || null, icon || null, sort_order || 0]
      )
      res.status(201).json(rows[0])
    } catch (err) {
      if (err.code === '23505') return res.status(409).json({ error: 'DUPLICATE_SLUG' })
      console.error('POST /api/categories error:', err)
      res.status(500).json({ error: err.message })
    }
  })

  // ─── PATCH /api/categories/:id — обновить категорию (admin) ─
  router.patch('/:id', async (req, res) => {
    try {
      if (!req.user || !['admin', 'superadmin'].includes(req.user.role)) {
        return res.status(403).json({ error: 'FORBIDDEN' })
      }
      const fields = ['name', 'slug', 'description', 'icon', 'sort_order', 'is_active']
      const updates = []
      const values = []
      let idx = 1
      for (const f of fields) {
        if (req.body[f] !== undefined) {
          updates.push(`${f} = $${idx}`)
          values.push(req.body[f])
          idx++
        }
      }
      if (updates.length === 0) return res.status(400).json({ error: 'NO_FIELDS' })
      values.push(req.params.id)
      const { rows } = await pool.query(
        `UPDATE categories SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
        values
      )
      if (cache.data) cache.data = null // сброс кэша
      res.json(rows[0] || { error: 'NOT_FOUND' })
    } catch (err) {
      console.error('PATCH /api/categories error:', err)
      res.status(500).json({ error: err.message })
    }
  })

  // ─── DELETE /api/categories/:id — удалить категорию (admin) ─
  router.delete('/:id', async (req, res) => {
    try {
      if (!req.user || !['admin', 'superadmin'].includes(req.user.role)) {
        return res.status(403).json({ error: 'FORBIDDEN' })
      }
      await pool.query('DELETE FROM categories WHERE id = $1', [req.params.id])
      if (cache.data) cache.data = null
      res.json({ deleted: true })
    } catch (err) {
      console.error('DELETE /api/categories error:', err)
      res.status(500).json({ error: err.message })
    }
  })

  return router
}
