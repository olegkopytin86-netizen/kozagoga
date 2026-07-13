// ─── Products API Routes (SRS v2) ────────────────────────
// GET /api/products — список товаров с variants, фильтрацией, пагинацией
// GET /api/products/:slug — детали товара с variants
// (SRS CAT-1.4, CAT-1.5)
// ─────────────────────────────────────────────────────────

import { Router } from 'express'
import { getPool, getReadPool } from '../lib/pool.js'

// In-memory cache
const cache = { data: null, time: 0 }
const CACHE_TTL = 120_000

export default function createProductsRouter() {
  const router = Router()
  const pool = getPool()
  const readPool = getReadPool()

  // Debug: check if this router is being hit
  router.use((req, res, next) => {
    console.log('[products-router] HIT:', req.method, req.originalUrl)
    next()
  })

  // ─── GET /api/products — список товаров ─────────────
  router.get('/', async (req, res) => {
    try {
      const { category, featured, search, type, page = '1', limit = '50', sort } = req.query

      const pageNum = Math.max(1, parseInt(page))
      const limitNum = Math.min(50, Math.max(1, parseInt(limit)))
      const offset = (pageNum - 1) * limitNum

      // Кэш для дефолтного запроса
      const isDefault = !category && !featured && !search && !type && !sort && page === '1' && limit === '50'
      if (isDefault && cache.data && Date.now() - cache.time < CACHE_TTL) {
        return res.json(cache.data)
      }

      const params = []
      const conditions = ['p.is_active = true']
      let idx = 1

      if (category) {
        conditions.push(`(c.slug = $${idx} OR c.id::text = $${idx} OR cp.slug = $${idx} OR cp.id::text = $${idx})`)
        params.push(category)
        idx++
      }
      if (featured === 'true') {
        conditions.push('p.is_featured = true')
      }
      if (type) {
        conditions.push(`p.product_type = $${idx}`)
        params.push(type)
        idx++
      }
      if (search) {
        conditions.push(`(
          p.search_vector @@ plainto_tsquery('russian', $${idx})
          OR p.name ILIKE $${idx+1}
        )`)
        params.push(search, `%${search}%`)
        idx += 2
      }
      // DGoods filters
      if (req.query.region) {
        conditions.push(`pv_dg.region = $${idx}`)
        params.push(req.query.region)
        idx++
      }
      if (req.query.publisher) {
        conditions.push(`p.publisher = $${idx}`)
        params.push(req.query.publisher)
        idx++
      }
      if (req.query.min_price) {
        conditions.push(`pv_dg.price >= $${idx}`)
        params.push(parseFloat(req.query.min_price))
        idx++
      }
      if (req.query.max_price) {
        conditions.push(`pv_dg.price <= $${idx}`)
        params.push(parseFloat(req.query.max_price))
        idx++
      }

      const where = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : ''

      // Count
      const countResult = await readPool.query(
        `SELECT COUNT(*) FROM products p LEFT JOIN categories c ON c.id = p.category_id${where}`,
        params
      )
      const total = parseInt(countResult.rows[0].count)

      // Sort
      const orderSQL = sort === 'price_asc' ? 'ORDER BY p.price_min ASC NULLS LAST'
        : sort === 'price_desc' ? 'ORDER BY p.price_max DESC NULLS LAST'
        : sort === 'rating' ? 'ORDER BY p.rating DESC NULLS LAST'
        : sort === 'popular' ? 'ORDER BY p.review_count DESC NULLS LAST'
        : sort === 'newest' ? 'ORDER BY p.created_at DESC'
        : 'ORDER BY p.sort_order ASC, p.created_at DESC'

      // Products with DGoods variants (region/denomination) or old-style variants
      const result = await readPool.query(
        `SELECT
          p.id, p.name, p.slug, p.short_description,
          p.price_min, p.price_max, p.currency,
          p.image, p.images->>0 AS image_url,
          p.delivery_time, p.region, p.rating, p.review_count,
          p.is_featured, p.seller_name, p.seller_verified,
          p.product_type, p.delivery_type,
          p.publisher,
          c.name AS category_name, c.slug AS category_slug,
          cp.name AS parent_category_name, cp.slug AS parent_category_slug,
          -- min/avg цены из DGoods вариаций
          MIN(pv_dg.price) FILTER (WHERE pv_dg.is_active) AS min_variant_price,
          MAX(pv_dg.price) FILTER (WHERE pv_dg.is_active) AS max_variant_price,
          -- номинал (denomination)
          MIN(pv_dg.denomination) FILTER (WHERE pv_dg.is_active) AS min_denomination,
          MAX(pv_dg.denomination) FILTER (WHERE pv_dg.is_active) AS max_denomination,
          -- валюта номинала (берём первую активную)
          (SELECT pv2.denom_currency FROM product_variants pv2 WHERE pv2.product_id = p.id AND pv2.is_active = true LIMIT 1) AS denom_currency,
          -- количество активных вариаций
          COUNT(pv_dg.id) FILTER (WHERE pv_dg.is_active) AS active_variants,
          -- DGoods вариации (только активные)
          COALESCE(
            jsonb_agg(
              jsonb_build_object(
                'id', pv_dg.id,
                'region', pv_dg.region,
                'denomination', pv_dg.denomination,
                'denom_currency', pv_dg.denom_currency,
                'price', pv_dg.price,
                'old_price', pv_dg.old_price,
                'is_active', pv_dg.is_active,
                'in_stock', pv_dg.stock > 0
              )
              ORDER BY pv_dg.region, pv_dg.denomination
            ) FILTER (WHERE pv_dg.id IS NOT NULL AND pv_dg.is_active),
            '[]'::jsonb
          ) AS variants
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        LEFT JOIN categories cp ON cp.id = c.parent_id
        LEFT JOIN product_variants pv_dg ON pv_dg.product_id = p.id
        ${where}
        GROUP BY p.id, c.name, c.slug, cp.name, cp.slug
        ${orderSQL}
        LIMIT $${idx++} OFFSET $${idx++}`,
        [...params, limitNum, offset]
      )

      // Добавляем pricing блок для каждого товара
      const items = result.rows.map(row => {
        const activeVariants = parseInt(row.active_variants || '0')
        const minPrice = row.min_variant_price ? parseFloat(row.min_variant_price) : null
        const maxPrice = row.max_variant_price ? parseFloat(row.max_variant_price) : null
        const minDenom = row.min_denomination ? parseFloat(row.min_denomination) : null
        const maxDenom = row.max_denomination ? parseFloat(row.max_denomination) : null
        
        const item = { ...row }
        
        // Для DGoods продуктов строим pricing
        if (row.publisher && activeVariants > 0) {
          item.pricing = {
            type: 'fixed',
            nominal: minDenom,
            nominalCurrency: row.denom_currency || 'RUB',
            price: minPrice,
            priceCurrency: 'RUB',
            minNominal: activeVariants > 1 ? minDenom : null,
            maxNominal: activeVariants > 1 ? maxDenom : null,
            minPrice: activeVariants > 1 ? minPrice : null,
            maxPrice: activeVariants > 1 ? maxPrice : null,
          }
        }
        
        return item
      })

      const data = {
        items,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          total_pages: Math.ceil(total / limitNum),
        },
      }

      if (isDefault) {
        cache.data = data
        cache.time = Date.now()
      }

      res.json(data)
    } catch (err) {
      console.error('GET /api/products error:', err)
      res.status(500).json({ error: 'Ошибка получения товаров' })
    }
  })

  // ─── GET /api/products/autocomplete — автодополнение ──
  // Должен быть до /:slug чтобы избежать конфликта
  router.get('/autocomplete', async (req, res) => {
    try {
      const q = req.query.q
      if (!q || q.length < 2) return res.json([])

      const { rows } = await readPool.query(
        `SELECT name, slug, images->>0 AS image_url, price_min, price_max,
                similarity(name, $1) AS sim
         FROM products
         WHERE is_active = true
           AND (name % $1 OR name ILIKE $1 || '%')
         ORDER BY sim DESC
         LIMIT 8`,
        [q]
      )
      res.json(rows)
    } catch (err) {
      console.error('GET /api/products/autocomplete error:', err)
      res.status(500).json({ error: 'Ошибка автодополнения' })
    }
  })

  // ─── GET /api/products/:slug — детали товара ────────
  router.get('/:slug', async (req, res) => {
    try {
      const { slug } = req.params
      const result = await readPool.query(
        `SELECT p.*, c.name AS category_name, c.slug AS category_slug,
                cp.name AS parent_category_name, cp.slug AS parent_category_slug
         FROM products p
         LEFT JOIN categories c ON c.id = p.category_id
         LEFT JOIN categories cp ON cp.id = c.parent_id
         WHERE (p.slug = $1 OR p.id::text = $1) AND p.is_active = true
         LIMIT 1`,
        [slug]
      )

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Товар не найден' })
      }

      const product = result.rows[0]

      // Get DGoods variants (с регионом и номиналом)
      const { rows: variants } = await readPool.query(
        `SELECT id, product_id, region, denomination, denom_currency,
                price, old_price, cost_price, is_active, stock > 0 AS in_stock,
                external_data
         FROM product_variants
         WHERE product_id = $1
         ORDER BY region, denomination`,
        [product.id]
      )
      
      // Если это DGoods продукт — свои метаданные
      if (product.provider_code === 'dgoods') {
        // Группируем вариации по регионам
        const regions = [...new Set(variants.filter(v => v.is_active).map(v => v.region))]
        product.delivery_info = { type: 'digital_code', description: 'Код придёт на email после оплаты' }
        product.available_regions = regions
      }

      product.variants = variants
      
      // Pricing для DGoods
      const activeVariants = variants.filter(v => v.is_active)
      if (activeVariants.length > 0) {
        const prices = activeVariants.map(v => parseFloat(v.price)).filter(p => !isNaN(p))
        const denoms = activeVariants.map(v => parseFloat(v.denomination)).filter(d => !isNaN(d))
        const minPrice = Math.min(...prices)
        const maxPrice = Math.max(...prices)
        const minDenom = Math.min(...denoms)
        const maxDenom = Math.max(...denoms)
        
        product.pricing = {
          type: 'fixed',
          nominal: minDenom,
          nominalCurrency: activeVariants[0].denom_currency || 'RUB',
          price: minPrice,
          priceCurrency: 'RUB',
          minNominal: activeVariants.length > 1 ? minDenom : null,
          maxNominal: activeVariants.length > 1 ? maxDenom : null,
          minPrice: activeVariants.length > 1 ? minPrice : null,
          maxPrice: activeVariants.length > 1 ? maxPrice : null,
        }
      }
      
      product.min_price = activeVariants.length > 0 ? Math.min(...activeVariants.map(v => parseFloat(v.price))) : null
      product.max_price = activeVariants.length > 0 ? Math.max(...activeVariants.map(v => parseFloat(v.price))) : null

      // Get related products (same category)
      if (product.category_id) {
        const { rows: related } = await readPool.query(
          `SELECT id, name, slug, images->>0 AS image_url, price_min, price_max, rating
           FROM products
           WHERE category_id = $1 AND id != $2 AND is_active = true
           ORDER BY rating DESC NULLS LAST
           LIMIT 6`,
          [product.category_id, product.id]
        )
        product.related_products = related
      }

      res.json(product)
    } catch (err) {
      console.error('GET /api/products/:slug error:', err)
      res.status(500).json({ error: 'Ошибка получения товара' })
    }
  })

  // ─── POST /api/products — создать товар (admin) ──────────
  router.post('/', async (req, res) => {
    try {
      if (!req.user || !['admin', 'superadmin'].includes(req.user.role)) {
        return res.status(403).json({ error: 'FORBIDDEN' })
      }
      const { name, slug, description, price, image_url, category_id, is_active, product_type } = req.body
      if (!name || !slug || price === undefined) {
        return res.status(400).json({ error: 'name, slug, price обязательны' })
      }
      const { rows } = await pool.query(
        `INSERT INTO products (name, slug, description, price, image_url, category_id, is_active, product_type)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [name, slug, description || '', parseFloat(price), image_url || null, category_id || null, is_active !== false, product_type || 'digital']
      )
      res.status(201).json(rows[0])
    } catch (err) {
      if (err.code === '23505') return res.status(409).json({ error: 'DUPLICATE_SLUG' })
      console.error('POST /api/products error:', err)
      res.status(500).json({ error: err.message })
    }
  })

  // ─── PATCH /api/products/:id — обновить товар (admin) ─────
  router.patch('/:id', async (req, res) => {
    try {
      if (!req.user || !['admin', 'superadmin'].includes(req.user.role)) {
        return res.status(403).json({ error: 'FORBIDDEN' })
      }
      const fields = ['name', 'slug', 'description', 'price', 'old_price', 'image_url', 'category_id', 'is_active', 'product_type', 'rating', 'stock', 'delivery_type']
      const updates = []
      const values = []
      let idx = 1
      for (const f of fields) {
        if (req.body[f] !== undefined) {
          updates.push(`${f} = $${idx}`)
          values.push(f === 'price' || f === 'old_price' ? parseFloat(req.body[f]) : req.body[f])
          idx++
        }
      }
      if (updates.length === 0) return res.status(400).json({ error: 'NO_FIELDS' })
      values.push(req.params.id)
      const { rows } = await pool.query(
        `UPDATE products SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
        values
      )
      res.json(rows[0] || { error: 'NOT_FOUND' })
    } catch (err) {
      console.error('PATCH /api/products error:', err)
      res.status(500).json({ error: err.message })
    }
  })

  // ─── DELETE /api/products/:id — удалить товар (admin) ─────
  router.delete('/:id', async (req, res) => {
    try {
      if (!req.user || !['admin', 'superadmin'].includes(req.user.role)) {
        return res.status(403).json({ error: 'FORBIDDEN' })
      }
      await pool.query('DELETE FROM products WHERE id = $1', [req.params.id])
      res.json({ deleted: true })
    } catch (err) {
      console.error('DELETE /api/products error:', err)
      res.status(500).json({ error: err.message })
    }
  })

  return router
}
