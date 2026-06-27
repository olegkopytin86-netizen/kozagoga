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
        conditions.push(`(c.slug = $${idx} OR c.id::text = $${idx})`)
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
        // PG FTS или fallback ILIKE
        conditions.push(`(
          p.search_vector @@ plainto_tsquery('russian', $${idx})
          OR p.name ILIKE $${idx+1}
        )`)
        params.push(search, `%${search}%`)
        idx += 2
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

      // Products with first variant price included
      const result = await readPool.query(
        `SELECT
          p.id, p.name, p.slug, p.short_description,
          p.price_min, p.price_max, p.currency,
          p.images->>0 AS image_url,
          p.delivery_time, p.region, p.rating, p.review_count,
          p.is_featured, p.seller_name, p.seller_verified,
          p.product_type, p.delivery_type,
          c.name AS category_name, c.slug AS category_slug,
          -- variants summary
          COALESCE(
            jsonb_agg(
              jsonb_build_object(
                'id', pv.id,
                'name', pv.name,
                'price', pv.price,
                'currency', pv.currency,
                'old_price', pv.old_price
              )
              ORDER BY pv.sort_order, pv.price
            ) FILTER (WHERE pv.id IS NOT NULL),
            '[]'::jsonb
          ) AS variants
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        LEFT JOIN product_variants pv ON pv.product_id = p.id AND pv.is_active = true
        ${where}
        GROUP BY p.id, c.name, c.slug
        ${orderSQL}
        LIMIT $${idx++} OFFSET $${idx++}`,
        [...params, limitNum, offset]
      )

      const data = {
        items: result.rows,
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
        `SELECT p.*, c.name AS category_name, c.slug AS category_slug
         FROM products p
         LEFT JOIN categories c ON c.id = p.category_id
         WHERE (p.slug = $1 OR p.id::text = $1) AND p.is_active = true
         LIMIT 1`,
        [slug]
      )

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Товар не найден' })
      }

      const product = result.rows[0]

      // Get variants
      const { rows: variants } = await readPool.query(
        `SELECT * FROM product_variants
         WHERE product_id = $1 AND is_active = true
         ORDER BY sort_order, price`,
        [product.id]
      )

      product.variants = variants

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

  return router
}
