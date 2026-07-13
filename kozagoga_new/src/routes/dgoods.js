// ─── DGoods Digital Goods API Routes ────────────────────
// GET /api/products/featured — избранные товары (для главной)
// GET /api/products/publishers — список издателей
// GET /api/products/regions — список регионов
// GET /api/variants — поиск вариаций по региону
// ─────────────────────────────────────────────────────────

import { Router } from 'express'
import { getPool, getReadPool } from '../lib/pool.js'

export default function createDGoodsRouter() {
  const router = Router()
  const pool = getPool()
  const readPool = getReadPool()

  // ─── GET /api/dgoods/featured — избранные (случайные, для главной) ──
  router.get('/dgoods/featured', async (req, res) => {
    try {
      const limit = Math.min(20, Math.max(1, parseInt(req.query.limit || '8')))

      const { rows } = await readPool.query(
        `SELECT p.id, p.name, p.slug, p.publisher, p.short_description,
                p.image, p.images->>0 AS image_url,
                c.name AS category_name, c.slug AS category_slug,
                MIN(pv.price) AS min_price,
                MIN(pv.denomination) AS min_denomination
         FROM products p
         LEFT JOIN categories c ON c.id = p.category_id
         LEFT JOIN product_variants pv ON pv.product_id = p.id AND pv.is_active = true
         WHERE p.is_active = true
           AND (pv.id IS NOT NULL)
         GROUP BY p.id, c.name, c.slug
         ORDER BY RANDOM()
         LIMIT $1`,
        [limit]
      )

      res.json({ data: rows })
    } catch (err) {
      console.error('GET /api/products/featured error:', err)
      res.status(500).json({ error: 'Ошибка получения избранных товаров' })
    }
  })

  // ─── GET /api/dgoods/publishers — список издателей ──
  router.get('/dgoods/publishers', async (req, res) => {
    try {
      const { rows } = await readPool.query(
        `SELECT p.publisher AS name,
                lower(regexp_replace(p.publisher, '[^a-zA-Z0-9]', '-', 'g')) AS slug,
                COUNT(DISTINCT p.id) AS count,
                jsonb_agg(DISTINCT pv.region) FILTER (WHERE pv.region IS NOT NULL AND pv.region != '') AS regions
         FROM products p
         JOIN product_variants pv ON pv.product_id = p.id
         WHERE p.is_active = true
           AND p.publisher IS NOT NULL
           AND p.publisher != ''
         GROUP BY p.publisher
         ORDER BY count DESC`
      )

      res.json({ data: rows })
    } catch (err) {
      console.error('GET /api/products/publishers error:', err)
      res.status(500).json({ error: 'Ошибка получения издателей' })
    }
  })

  // ─── GET /api/dgoods/regions — список регионов ──
  router.get('/dgoods/regions', async (req, res) => {
    try {
      const REGION_NAME = {
        'TR': 'Турция', 'US': 'США', 'USA': 'США', 'PL': 'Польша',
        'BR': 'Бразилия', 'CA': 'Канада', 'GB': 'Великобритания',
        'CN': 'Китай', 'IN': 'Индия', 'NO': 'Норвегия', 'EU': 'Европа',
        'AE': 'ОАЭ', 'AR': 'Аргентина', 'RU+CIS': 'Россия и СНГ',
        'WW': 'Весь мир'
      }
      const REGION_FLAG = {
        'TR': '🇹🇷', 'US': '🇺🇸', 'USA': '🇺🇸', 'PL': '🇵🇱',
        'BR': '🇧🇷', 'CA': '🇨🇦', 'GB': '🇬🇧', 'CN': '🇨🇳',
        'IN': '🇮🇳', 'NO': '🇳🇴', 'EU': '🇪🇺', 'AE': '🇦🇪',
        'AR': '🇦🇷', 'RU+CIS': '🇷🇺', 'WW': '🌍'
      }

      const { rows } = await readPool.query(
        `SELECT pv.region AS code,
                COUNT(DISTINCT pv.id) AS count,
                COUNT(DISTINCT pv.product_id) AS product_count
         FROM product_variants pv
         JOIN products p ON p.id = pv.product_id AND p.is_active = true
         WHERE pv.region IS NOT NULL AND pv.region != ''
         GROUP BY pv.region
         ORDER BY count DESC`
      )

      const data = rows.map(r => ({
        code: r.code,
        name: REGION_NAME[r.code] || r.code,
        flag: REGION_FLAG[r.code] || '🌍',
        count: parseInt(r.count),
        product_count: parseInt(r.product_count),
      }))

      res.json({ data })
    } catch (err) {
      console.error('GET /api/products/regions error:', err)
      res.status(500).json({ error: 'Ошибка получения регионов' })
    }
  })

  // ─── GET /api/variants — поиск вариаций по региону ──
  router.get('/variants', async (req, res) => {
    try {
      const { region, active_only = 'true', sort = 'price_asc' } = req.query

      const conditions = []
      const params = []
      let idx = 1

      if (region) {
        conditions.push(`pv.region = $${idx}`)
        params.push(region.toUpperCase())
        idx++
      }
      if (active_only === 'true') {
        conditions.push('pv.is_active = true')
      }

      const where = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : ''

      const orderSQL = sort === 'price_asc' ? 'ORDER BY pv.price ASC'
        : sort === 'price_desc' ? 'ORDER BY pv.price DESC'
        : sort === 'denomination' ? 'ORDER BY pv.denomination ASC'
        : 'ORDER BY pv.price ASC'

      const { rows } = await readPool.query(
        `SELECT pv.id AS variant_id,
                p.slug AS product_slug, p.name AS product_name, p.publisher,
                pv.region, pv.denomination, pv.denom_currency,
                pv.price, pv.old_price, pv.is_active,
                pv.stock > 0 AS in_stock
         FROM product_variants pv
         JOIN products p ON p.id = pv.product_id AND p.is_active = true
         ${where}
         ${orderSQL}
         LIMIT 500`,
        params
      )

      res.json({ data: rows })
    } catch (err) {
      console.error('GET /api/variants error:', err)
      res.status(500).json({ error: 'Ошибка получения вариаций' })
    }
  })

  return router
}
