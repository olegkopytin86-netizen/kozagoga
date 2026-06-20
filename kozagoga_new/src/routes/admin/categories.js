// ============================================
// Admin Categories CRUD
// Иерархическое дерево категорий
// ============================================

import { Router } from 'express'
import {
  isValidSlug, isValidName, isValidDescription,
  sanitizeTextField,
} from '../../lib/validation.js'

const MAX_DEPTH = 3

export default function createAdminCategoriesRouter(pool, audit) {
  const router = Router()

  // Helper: проверка глубины вложенности
  async function getCategoryDepth(categoryId) {
    let depth = 0
    let currentId = categoryId
    const visited = new Set()

    while (currentId) {
      if (visited.has(currentId)) return depth
      visited.add(currentId)

      const result = await pool.query(
        'SELECT parent_id FROM categories WHERE id = $1',
        [currentId]
      )
      if (result.rows.length === 0) break
      if (!result.rows[0].parent_id) break

      depth++
      currentId = result.rows[0].parent_id
    }
    return depth
  }

  // Helper: построение дерева
  function buildTree(categories, parentId = null) {
    return categories
      .filter(c => c.parent_id === parentId)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .map(c => ({
        ...c,
        children: buildTree(categories, c.id),
      }))
  }

  // GET /api/admin/categories — дерево категорий
  router.get('/', async (req, res) => {
    try {
      const flat = req.query.flat === 'true'
      const includeInactive = req.query.include_inactive === 'true'

      let query = 'SELECT * FROM categories'
      const params = []
      const conditions = []

      if (!includeInactive) {
        conditions.push('is_active = true')
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ')
      }

      query += ' ORDER BY sort_order ASC, name ASC'

      const result = await pool.query(query)

      if (flat) {
        return res.json(result.rows)
      }

      res.json(buildTree(result.rows))
    } catch (err) {
      console.error('[admin-categories] List error:', err)
      res.status(500).json({ error: 'Ошибка получения категорий' })
    }
  })

  // GET /api/admin/categories/:id — детали категории
  router.get('/:id', async (req, res) => {
    try {
      const result = await pool.query(
        'SELECT c.*, (SELECT COUNT(*) FROM categories WHERE parent_id = c.id) as child_count FROM categories c WHERE c.id = $1',
        [req.params.id]
      )
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Категория не найдена' })
      }
      res.json(result.rows[0])
    } catch (err) {
      console.error('[admin-categories] Get error:', err)
      res.status(500).json({ error: 'Ошибка получения категории' })
    }
  })

  // POST /api/admin/categories — создать
  router.post('/', async (req, res) => {
    try {
      let { name, slug, description, parent_id, image_url, icon, sort_order, is_active } = req.body

      // Санитизация
      name = sanitizeTextField(name || '', 255)
      slug = (slug || '').trim().toLowerCase()
      description = sanitizeTextField(description || '', 1000)
      image_url = (image_url || '').trim().slice(0, 500)
      icon = (icon || '').trim().slice(0, 50)

      if (!name) {
        return res.status(400).json({ error: 'Название обязательно' })
      }
      if (!slug) {
        return res.status(400).json({ error: 'Slug обязателен' })
      }
      if (!isValidSlug(slug)) {
        return res.status(400).json({ error: 'Slug содержит недопустимые символы (только латиница, цифры, дефис, подчёркивание)' })
      }

      // Проверка глубины
      if (parent_id) {
        const parentDepth = await getCategoryDepth(parent_id)
        if (parentDepth + 1 > MAX_DEPTH) {
          return res.status(400).json({
            error: `Максимальная вложенность: ${MAX_DEPTH} уровня`,
          })
        }
      }

      // Проверка уникальности slug
      const slugCheck = await pool.query('SELECT id FROM categories WHERE slug = $1', [slug])
      if (slugCheck.rows.length > 0) {
        return res.status(409).json({ error: 'Категория с таким slug уже существует' })
      }

      const result = await pool.query(
        `INSERT INTO categories (name, slug, description, parent_id, image_url, icon, sort_order, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [name, slug, description || null, parent_id || null, image_url || null, icon || null, sort_order || 0, is_active !== false]
      )

      const category = result.rows[0]

      await audit.log(req, 'category.create', { entity_id: category.id, name })

      res.status(201).json(category)
    } catch (err) {
      console.error('[admin-categories] Create error:', err)
      res.status(500).json({ error: 'Ошибка создания категории' })
    }
  })

  // PUT /api/admin/categories/:id — обновить
  router.put('/:id', async (req, res) => {
    try {
      let { name, slug, description, parent_id, image_url, icon, sort_order, is_active } = req.body

      const existing = await pool.query('SELECT * FROM categories WHERE id = $1', [req.params.id])
      if (existing.rows.length === 0) {
        return res.status(404).json({ error: 'Категория не найдена' })
      }

      // Санитизация
      const cleanName = name !== undefined ? sanitizeTextField(name, 255) : undefined
      const cleanSlug = slug !== undefined ? (slug || '').trim().toLowerCase() : undefined
      const cleanDesc = description !== undefined ? sanitizeTextField(description || '', 1000) : undefined
      const cleanImage = image_url !== undefined ? (image_url || '').trim().slice(0, 500) : undefined
      const cleanIcon = icon !== undefined ? (icon || '').trim().slice(0, 50) : undefined

      if (cleanName !== undefined && !cleanName) {
        return res.status(400).json({ error: 'Название не может быть пустым' })
      }
      if (cleanSlug !== undefined && !isValidSlug(cleanSlug)) {
        return res.status(400).json({ error: 'Slug содержит недопустимые символы' })
      }

      // Проверка глубины при смене parent
      if (parent_id !== undefined && parent_id !== existing.rows[0].parent_id) {
        if (parent_id) {
          const parentDepth = await getCategoryDepth(parent_id)
          if (parentDepth + 1 > MAX_DEPTH) {
            return res.status(400).json({
              error: `Максимальная вложенность: ${MAX_DEPTH} уровня`,
            })
          }
          // Нельзя сделать категорию родителем самой себя
          if (parent_id === req.params.id) {
            return res.status(400).json({ error: 'Категория не может быть родителем самой себя' })
          }
        }
      }

      // Проверка slug при смене
      if (cleanSlug && cleanSlug !== existing.rows[0].slug) {
        const slugCheck = await pool.query('SELECT id FROM categories WHERE slug = $1 AND id != $2', [cleanSlug, req.params.id])
        if (slugCheck.rows.length > 0) {
          return res.status(409).json({ error: 'Категория с таким slug уже существует' })
        }
      }

      const result = await pool.query(
        `UPDATE categories SET
          name = COALESCE($1, name),
          slug = COALESCE($2, slug),
          description = COALESCE($3, description),
          parent_id = $4,
          image_url = COALESCE($5, image_url),
          icon = COALESCE($6, icon),
          sort_order = COALESCE($7, sort_order),
          is_active = COALESCE($8, is_active),
          updated_at = NOW()
         WHERE id = $9
         RETURNING *`,
        [
          cleanName || null,
          cleanSlug || null,
          cleanDesc !== undefined ? cleanDesc : null,
          parent_id !== undefined ? parent_id : existing.rows[0].parent_id,
          cleanImage !== undefined ? cleanImage : null,
          cleanIcon !== undefined ? cleanIcon : null,
          sort_order !== undefined ? sort_order : null,
          is_active !== undefined ? is_active : null,
          req.params.id,
        ]
      )

      await audit.log(req, 'category.update', {
        entity_id: req.params.id,
        changes: { name: cleanName, slug: cleanSlug, parent_id, is_active },
      })

      res.json(result.rows[0])
    } catch (err) {
      console.error('[admin-categories] Update error:', err)
      res.status(500).json({ error: 'Ошибка обновления категории' })
    }
  })

  // DELETE /api/admin/categories/:id — удалить
  router.delete('/:id', async (req, res) => {
    try {
      const existing = await pool.query('SELECT * FROM categories WHERE id = $1', [req.params.id])
      if (existing.rows.length === 0) {
        return res.status(404).json({ error: 'Категория не найдена' })
      }

      // Проверка дочерних категорий
      const children = await pool.query(
        'SELECT COUNT(*) as count FROM categories WHERE parent_id = $1',
        [req.params.id]
      )
      if (parseInt(children.rows[0].count) > 0) {
        return res.status(400).json({
          error: 'Нельзя удалить категорию с подкатегориями. Сначала удалите или переместите их.',
        })
      }

      // Переносим товары в null-категорию
      await pool.query(
        'UPDATE products SET category_id = NULL WHERE category_id = $1',
        [req.params.id]
      )

      // Удаляем
      await pool.query('DELETE FROM categories WHERE id = $1', [req.params.id])

      await audit.log(req, 'category.delete', {
        entity_id: req.params.id,
        name: existing.rows[0].name,
      })

      res.json({ ok: true })
    } catch (err) {
      console.error('[admin-categories] Delete error:', err)
      res.status(500).json({ error: 'Ошибка удаления категории' })
    }
  })

  // PUT /api/admin/categories/order — массовое изменение порядка
  router.put('/order', async (req, res) => {
    try {
      const { items } = req.body

      if (!Array.isArray(items)) {
        return res.status(400).json({ error: 'items — обязательный массив { id, sort_order }' })
      }

      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        for (const item of items) {
          await client.query(
            'UPDATE categories SET sort_order = $1 WHERE id = $2',
            [item.sort_order, item.id]
          )
        }
        await client.query('COMMIT')
      } catch {
        await client.query('ROLLBACK')
        throw err
      } finally {
        client.release()
      }

      await audit.log(req, 'category.reorder', { item_count: items.length })

      res.json({ ok: true })
    } catch (err) {
      console.error('[admin-categories] Reorder error:', err)
      res.status(500).json({ error: 'Ошибка изменения порядка' })
    }
  })

  return router
}
