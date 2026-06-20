// ============================================
// Admin Products CRUD
// Товары/услуги + динамические поля (product_fields)
// ============================================

import { Router } from 'express'
import {
  isValidSlug, isValidPrice, sanitizePrice,
  sanitizeTextField, sanitizeErrorMessage,
} from '../../lib/validation.js'

export default function createAdminProductsRouter(pool, audit) {
  const router = Router()

  // GET /api/admin/products — список товаров
  router.get('/', async (req, res) => {
    try {
      const {
        category_id, product_type, provider_code,
        is_active, search, provider_service_id,
        page = '1', limit = '50',
      } = req.query

      const pageNum = Math.max(1, parseInt(page))
      const limitNum = Math.min(100, Math.max(1, parseInt(limit)))
      const offset = (pageNum - 1) * limitNum

      let query = 'SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON c.id = p.category_id'
      const countQuery = 'SELECT COUNT(*) FROM products p'
      const params = []
      const conditions = []
      let paramIdx = 1

      if (category_id) {
        conditions.push(`p.category_id = $${paramIdx++}`)
        params.push(category_id)
      }
      if (product_type) {
        conditions.push(`p.product_type = $${paramIdx++}`)
        params.push(product_type)
      }
      if (provider_code) {
        conditions.push(`p.provider_code = $${paramIdx++}`)
        params.push(provider_code)
      }
      if (is_active !== undefined) {
        conditions.push(`p.is_active = $${paramIdx++}`)
        params.push(is_active === 'true')
      }
      if (provider_service_id) {
        conditions.push(`p.provider_service_id = $${paramIdx++}`)
        params.push(provider_service_id)
      }
      if (search) {
        conditions.push(`(p.name ILIKE $${paramIdx} OR p.slug ILIKE $${paramIdx})`)
        params.push(`%${search}%`)
        paramIdx++
      }

      const where = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : ''

      const countResult = await pool.query(countQuery + where, params)
      const total = parseInt(countResult.rows[0].count)

      query += where
      query += ' ORDER BY p.sort_order ASC, p.created_at DESC'
      query += ` LIMIT $${paramIdx++} OFFSET $${paramIdx++}`
      params.push(limitNum, offset)

      const result = await pool.query(query, params)

      res.json({
        items: result.rows,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          total_pages: Math.ceil(total / limitNum),
        },
      })
    } catch (err) {
      console.error('[admin-products] List error:', err)
      res.status(500).json({ error: 'Ошибка получения товаров' })
    }
  })

  // GET /api/admin/products/:id — детали
  router.get('/:id', async (req, res) => {
    try {
      const result = await pool.query(
        'SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE p.id = $1',
        [req.params.id]
      )
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Товар не найден' })
      }
      res.json(result.rows[0])
    } catch (err) {
      console.error('[admin-products] Get error:', err)
      res.status(500).json({ error: 'Ошибка получения товара' })
    }
  })

  // POST /api/admin/products — создать
  router.post('/', async (req, res) => {
    try {
      let {
        name, slug, description, short_description, image_url,
        product_type, category_id,
        provider_code, provider_service_id, provider_params,
        price, price_min, price_max, price_fixed,
        commission_percent,
        is_active, is_popular, is_featured,
        requires_precheck, exclude_commission,
        meta_title, meta_description,
        sort_order,
      } = req.body

      // Санитизация текстовых полей
      name = sanitizeTextField(name || '', 255)
      slug = (slug || '').trim().toLowerCase()
      description = sanitizeTextField(description || '', 10000)
      short_description = sanitizeTextField(short_description || '', 500)
      image_url = (image_url || '').trim().slice(0, 500)
      meta_title = (meta_title || '').trim().slice(0, 255)
      meta_description = (meta_description || '').trim().slice(0, 500)

      if (!name) {
        return res.status(400).json({ error: 'Название обязательно' })
      }
      if (!slug) {
        return res.status(400).json({ error: 'Slug обязателен' })
      }
      if (!isValidSlug(slug)) {
        return res.status(400).json({ error: 'Slug содержит недопустимые символы (только латиница, цифры, дефис, подчёркивание)' })
      }
      if (slug.length > 200) {
        return res.status(400).json({ error: 'Slug слишком длинный (макс. 200 символов)' })
      }

      // Валидация цены
      const cleanPrice = sanitizePrice(price)
      if (cleanPrice === null || cleanPrice < 0.01) {
        return res.status(400).json({ error: 'Цена должна быть больше 0' })
      }
      if (cleanPrice > 999999.99) {
        return res.status(400).json({ error: 'Цена не может превышать 999 999.99' })
      }

      // Валидация опциональных цен
      const cleanPriceMin = price_min !== undefined ? sanitizePrice(price_min) : null
      const cleanPriceMax = price_max !== undefined ? sanitizePrice(price_max) : null
      const cleanPriceFixed = price_fixed !== undefined ? sanitizePrice(price_fixed) : null

      // Проверка slug
      const slugCheck = await pool.query('SELECT id FROM products WHERE slug = $1', [slug])
      if (slugCheck.rows.length > 0) {
        return res.status(409).json({ error: 'Товар с таким slug уже существует' })
      }

      const result = await pool.query(
        `INSERT INTO products (
          name, slug, description, short_description, image_url,
          product_type, category_id,
          provider_code, provider_service_id, provider_params,
          price, price_min, price_max, price_fixed,
          commission_percent,
          is_active, is_popular, is_featured,
          requires_precheck, exclude_commission,
          meta_title, meta_description,
          sort_order
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
        RETURNING *`,
        [
          name, slug, description || '', short_description || null, image_url || null,
          product_type || 'digital', category_id || null,
          provider_code || null, provider_service_id || null,
          provider_params ? JSON.stringify(provider_params) : '[]',
          cleanPrice, cleanPriceMin, cleanPriceMax, cleanPriceFixed,
          Math.min(Math.max(Number(commission_percent) || 0, 0), 100),
          is_active !== false, is_popular || false, is_featured || false,
          requires_precheck !== false, exclude_commission || false,
          meta_title || null, meta_description || null,
          Math.min(Math.max(Number(sort_order) || 0, 0), 99999),
        ]
      )

      const product = result.rows[0]
      await audit.log(req, 'product.create', { entity_id: product.id, name })

      res.status(201).json(product)
    } catch (err) {
      console.error('[admin-products] Create error:', err)
      res.status(500).json({ error: 'Ошибка создания товара' })
    }
  })

  // PUT /api/admin/products/:id — обновить
  router.put('/:id', async (req, res) => {
    try {
      const existing = await pool.query('SELECT * FROM products WHERE id = $1', [req.params.id])
      if (existing.rows.length === 0) {
        return res.status(404).json({ error: 'Товар не найден' })
      }

      let {
        name, slug, description, short_description, image_url,
        product_type, category_id,
        provider_code, provider_service_id, provider_params,
        price, price_min, price_max, price_fixed,
        commission_percent,
        is_active, is_popular, is_featured,
        requires_precheck, exclude_commission,
        meta_title, meta_description,
        sort_order,
      } = req.body

      // Санитизация
      const cleanName = name !== undefined ? sanitizeTextField(name, 255) : undefined
      const cleanSlug = slug !== undefined ? (slug || '').trim().toLowerCase() : undefined
      const cleanDesc = description !== undefined ? sanitizeTextField(description || '', 10000) : undefined
      const cleanShortDesc = short_description !== undefined ? sanitizeTextField(short_description || '', 500) : undefined
      const cleanImage = image_url !== undefined ? (image_url || '').trim().slice(0, 500) : undefined
      const cleanMetaTitle = meta_title !== undefined ? (meta_title || '').trim().slice(0, 255) : undefined
      const cleanMetaDesc = meta_description !== undefined ? (meta_description || '').trim().slice(0, 500) : undefined

      // Валидация
      if (cleanName !== undefined && !cleanName) {
        return res.status(400).json({ error: 'Название не может быть пустым' })
      }
      if (cleanSlug !== undefined) {
        if (!isValidSlug(cleanSlug)) {
          return res.status(400).json({ error: 'Slug содержит недопустимые символы' })
        }
        if (cleanSlug !== existing.rows[0].slug) {
          const slugCheck = await pool.query('SELECT id FROM products WHERE slug = $1 AND id != $2', [cleanSlug, req.params.id])
          if (slugCheck.rows.length > 0) {
            return res.status(409).json({ error: 'Товар с таким slug уже существует' })
          }
        }
      }

      // Валидация цен
      const cleanPrice = price !== undefined ? sanitizePrice(price) : undefined
      const cleanPriceMin = price_min !== undefined ? sanitizePrice(price_min) : undefined
      const cleanPriceMax = price_max !== undefined ? sanitizePrice(price_max) : undefined
      const cleanPriceFixed = price_fixed !== undefined ? sanitizePrice(price_fixed) : undefined

      if (cleanPrice !== undefined && (cleanPrice === null || cleanPrice < 0.01)) {
        return res.status(400).json({ error: 'Цена должна быть больше 0' })
      }
      if (cleanPrice !== undefined && cleanPrice > 999999.99) {
        return res.status(400).json({ error: 'Цена не может превышать 999 999.99' })
      }

      const cleanCommission = commission_percent !== undefined
        ? Math.min(Math.max(Number(commission_percent) || 0, 0), 100)
        : undefined
      const cleanSortOrder = sort_order !== undefined
        ? Math.min(Math.max(Number(sort_order) || 0, 0), 99999)
        : undefined

      const result = await pool.query(
        `UPDATE products SET
          name = COALESCE($1, name),
          slug = COALESCE($2, slug),
          description = COALESCE($3, description),
          short_description = COALESCE($4, short_description),
          image_url = COALESCE($5, image_url),
          product_type = COALESCE($6, product_type),
          category_id = $7,
          provider_code = COALESCE($8, provider_code),
          provider_service_id = COALESCE($9, provider_service_id),
          provider_params = $10,
          price = COALESCE($11, price),
          price_min = $12,
          price_max = $13,
          price_fixed = $14,
          commission_percent = COALESCE($15, commission_percent),
          is_active = COALESCE($16, is_active),
          is_popular = COALESCE($17, is_popular),
          is_featured = COALESCE($18, is_featured),
          requires_precheck = COALESCE($19, requires_precheck),
          exclude_commission = COALESCE($20, exclude_commission),
          meta_title = COALESCE($21, meta_title),
          meta_description = COALESCE($22, meta_description),
          sort_order = COALESCE($23, sort_order),
          updated_at = NOW()
         WHERE id = $24
         RETURNING *`,
        [
          cleanName || null, cleanSlug || null,
          cleanDesc !== undefined ? cleanDesc : null,
          cleanShortDesc !== undefined ? cleanShortDesc : null,
          cleanImage !== undefined ? cleanImage : null,
          product_type || null,
          category_id !== undefined ? category_id : existing.rows[0].category_id,
          provider_code !== undefined ? provider_code : null,
          provider_service_id !== undefined ? provider_service_id : null,
          provider_params ? JSON.stringify(provider_params) : existing.rows[0].provider_params,
          cleanPrice !== undefined ? cleanPrice : null,
          cleanPriceMin !== undefined ? cleanPriceMin : null,
          cleanPriceMax !== undefined ? cleanPriceMax : null,
          cleanPriceFixed !== undefined ? cleanPriceFixed : null,
          cleanCommission !== undefined ? cleanCommission : null,
          is_active !== undefined ? is_active : null,
          is_popular !== undefined ? is_popular : null,
          is_featured !== undefined ? is_featured : null,
          requires_precheck !== undefined ? requires_precheck : null,
          exclude_commission !== undefined ? exclude_commission : null,
          cleanMetaTitle !== undefined ? cleanMetaTitle : null,
          cleanMetaDesc !== undefined ? cleanMetaDesc : null,
          cleanSortOrder !== undefined ? cleanSortOrder : null,
          req.params.id,
        ]
      )

      await audit.log(req, 'product.update', {
        entity_id: req.params.id,
        changes: { name: cleanName, slug: cleanSlug, is_active, product_type },
      })

      res.json(result.rows[0])
    } catch (err) {
      console.error('[admin-products] Update error:', err)
      res.status(500).json({ error: 'Ошибка обновления товара' })
    }
  })

  // DELETE /api/admin/products/:id — soft delete
  router.delete('/:id', async (req, res) => {
    try {
      const existing = await pool.query('SELECT * FROM products WHERE id = $1', [req.params.id])
      if (existing.rows.length === 0) {
        return res.status(404).json({ error: 'Товар не найден' })
      }

      await pool.query(
        'UPDATE products SET is_active = false, updated_at = NOW() WHERE id = $1',
        [req.params.id]
      )

      await audit.log(req, 'product.delete', {
        entity_id: req.params.id,
        name: existing.rows[0].name,
      })

      res.json({ ok: true })
    } catch (err) {
      console.error('[admin-products] Delete error:', err)
      res.status(500).json({ error: 'Ошибка удаления товара' })
    }
  })

  // POST /api/admin/products/batch-toggle
  router.post('/batch-toggle', async (req, res) => {
    try {
      const { ids, is_active } = req.body
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'ids — обязательный массив' })
      }
      if (ids.length > 100) {
        return res.status(400).json({ error: 'Максимум 100 товаров за раз' })
      }

      const placeholders = ids.map((_, i) => `$${i + 2}`).join(',')
      await pool.query(
        `UPDATE products SET is_active = $1, updated_at = NOW() WHERE id IN (${placeholders})`,
        [is_active !== false, ...ids]
      )

      await audit.log(req, 'product.batch_toggle', { ids, is_active })

      res.json({ ok: true, count: ids.length })
    } catch (err) {
      console.error('[admin-products] Batch toggle error:', err)
      res.status(500).json({ error: 'Ошибка массового переключения' })
    }
  })

  // ════════════════════════════════════════════════════════
  // Product Fields (динамические поля услуги)
  // ════════════════════════════════════════════════════════

  // GET /api/admin/products/:id/fields
  router.get('/:id/fields', async (req, res) => {
    try {
      const result = await pool.query(
        'SELECT * FROM product_fields WHERE product_id = $1 ORDER BY sort_order ASC',
        [req.params.id]
      )
      res.json(result.rows)
    } catch (err) {
      console.error('[admin-products] Fields list error:', err)
      res.status(500).json({ error: 'Ошибка получения полей' })
    }
  })

  // POST /api/admin/products/:id/fields
  router.post('/:id/fields', async (req, res) => {
    try {
      let { field_key, field_type, label, placeholder, regex,
            max_length, keyboard_type, is_required, is_readonly,
            dictionary_code, sort_order, default_value } = req.body

      // Санитизация
      field_key = (field_key || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 100)
      label = sanitizeTextField(label || '', 255)
      placeholder = sanitizeTextField(placeholder || '', 255)

      if (!field_key || !label) {
        return res.status(400).json({ error: 'field_key и label обязательны' })
      }

      const result = await pool.query(
        `INSERT INTO product_fields
          (product_id, field_key, field_type, label, placeholder, regex,
           max_length, keyboard_type, is_required, is_readonly,
           dictionary_code, sort_order, default_value)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         RETURNING *`,
        [
          req.params.id, field_key, field_type || 'text', label,
          placeholder || null, regex ? regex.slice(0, 500) : null,
          Math.min(Math.abs(Number(max_length) || 0), 1000) || null,
          keyboard_type || null,
          is_required !== false, is_readonly || false,
          dictionary_code || null, Math.min(Math.max(Number(sort_order) || 0, 0), 999), default_value ? String(default_value).slice(0, 255) : null,
        ]
      )

      res.status(201).json(result.rows[0])
    } catch (err) {
      console.error('[admin-products] Field create error:', err)
      res.status(500).json({ error: 'Ошибка создания поля' })
    }
  })

  // PUT /api/admin/products/:id/fields/:fieldId
  router.put('/:id/fields/:fieldId', async (req, res) => {
    try {
      let { field_key, field_type, label, placeholder, regex,
            max_length, keyboard_type, is_required, is_readonly,
            dictionary_code, sort_order, default_value } = req.body

      // Санитизация
      field_key = field_key !== undefined
        ? (field_key || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 100)
        : undefined
      label = label !== undefined ? sanitizeTextField(label, 255) : undefined
      placeholder = placeholder !== undefined ? sanitizeTextField(placeholder || '', 255) : undefined

      const result = await pool.query(
        `UPDATE product_fields SET
          field_key = COALESCE($1, field_key),
          field_type = COALESCE($2, field_type),
          label = COALESCE($3, label),
          placeholder = COALESCE($4, placeholder),
          regex = COALESCE($5, regex),
          max_length = COALESCE($6, max_length),
          keyboard_type = COALESCE($7, keyboard_type),
          is_required = COALESCE($8, is_required),
          is_readonly = COALESCE($9, is_readonly),
          dictionary_code = COALESCE($10, dictionary_code),
          sort_order = COALESCE($11, sort_order),
          default_value = COALESCE($12, default_value),
          updated_at = NOW()
         WHERE id = $13 AND product_id = $14
         RETURNING *`,
        [
          field_key || null, field_type || null, label || null,
          placeholder !== undefined ? placeholder : null,
          regex !== undefined ? regex?.slice(0, 500) : null,
          max_length !== undefined ? Math.min(Math.abs(Number(max_length) || 0), 1000) || null : null,
          keyboard_type !== undefined ? keyboard_type : null,
          is_required !== undefined ? is_required : null,
          is_readonly !== undefined ? is_readonly : null,
          dictionary_code !== undefined ? dictionary_code : null,
          sort_order !== undefined ? Math.min(Math.max(Number(sort_order) || 0, 0), 999) : null,
          default_value !== undefined ? String(default_value || '').slice(0, 255) : null,
          req.params.fieldId, req.params.id,
        ]
      )

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Поле не найдено' })
      }

      res.json(result.rows[0])
    } catch (err) {
      console.error('[admin-products] Field update error:', err)
      res.status(500).json({ error: 'Ошибка обновления поля' })
    }
  })

  // DELETE /api/admin/products/:id/fields/:fieldId
  router.delete('/:id/fields/:fieldId', async (req, res) => {
    try {
      const result = await pool.query(
        'DELETE FROM product_fields WHERE id = $1 AND product_id = $2 RETURNING id',
        [req.params.fieldId, req.params.id]
      )
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Поле не найдено' })
      }
      res.json({ ok: true })
    } catch (err) {
      console.error('[admin-products] Field delete error:', err)
      res.status(500).json({ error: 'Ошибка удаления поля' })
    }
  })

  // PUT /api/admin/products/:id/fields/order
  router.put('/:id/fields/order', async (req, res) => {
    try {
      const { items } = req.body
      if (!Array.isArray(items)) {
        return res.status(400).json({ error: 'items — массив { id, sort_order }' })
      }

      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        for (const item of items) {
          await client.query(
            'UPDATE product_fields SET sort_order = $1 WHERE id = $2 AND product_id = $3',
            [Math.min(Math.max(Number(item.sort_order) || 0, 0), 999), item.id, req.params.id]
          )
        }
        await client.query('COMMIT')
      } catch {
        await client.query('ROLLBACK')
        throw err
      } finally {
        client.release()
      }

      res.json({ ok: true })
    } catch (err) {
      console.error('[admin-products] Fields reorder error:', err)
      res.status(500).json({ error: 'Ошибка изменения порядка полей' })
    }
  })

  return router
}
