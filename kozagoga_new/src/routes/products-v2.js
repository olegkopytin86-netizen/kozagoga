// ─── Products v2 API — услуги, регионы, поля ввода ──────────
// GET /api/v1/products/:slug — детали продукта с услугами
// ─────────────────────────────────────────────────────────────

import { Router } from 'express'
import { getPool } from '../lib/pool.js'

export default function createProductsV2Router() {
  const router = Router()
  const pool = getPool()

  router.get('/:slug', async (req, res) => {
    try {
      const { slug } = req.params

      // 1. Получить продукт
      const { rows: products } = await pool.query(
        'SELECT * FROM products WHERE slug = $1 AND is_active = true LIMIT 1',
        [slug]
      )
      if (products.length === 0) {
        return res.status(404).json({ error: 'NOT_FOUND', message: 'Товар не найден' })
      }
      const product = products[0]

      // 2. Получить услуги с регионами и полями ввода
      const { rows: services } = await pool.query(
        'SELECT * FROM product_services WHERE product_id = $1 AND is_active = true ORDER BY sort_order',
        [product.id]
      )

      const resultServices = []
      for (const service of services) {
        const { rows: regions } = await pool.query(
          'SELECT * FROM service_regions WHERE service_id = $1 AND is_active = true ORDER BY sort_order',
          [service.id]
        )
        const { rows: inputFields } = await pool.query(
          'SELECT * FROM service_input_fields WHERE service_id = $1 ORDER BY sort_order',
          [service.id]
        )

        resultServices.push({
          id: service.id,
          name: service.name,
          slug: service.slug,
          description: service.description,
          image_url: service.image_url,
          billing_interval: service.billing_interval,
          billing_count: service.billing_count,
          regions: regions.map(r => ({
            id: r.id,
            code: r.region_code,
            name: r.region_name,
            currency: r.currency,
            flag_url: r.region_flag_url,
            min_amount: r.min_amount,
            max_amount: r.max_amount,
            fixed_amounts: r.fixed_amounts,
            instruction: r.instruction,
            requires_phone: r.requires_phone,
          })),
          input_fields: inputFields.map(f => ({
            key: f.field_key,
            label: f.field_label,
            type: f.field_type,
            placeholder: f.placeholder,
            validation_regex: f.validation_regex,
            validation_error: f.validation_error,
            is_required: f.is_required,
            max_length: f.max_length,
            options: f.options,
          })),
        })
      }

      res.json({
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        short_description: product.short_description,
        image: product.image,
        images: product.images,
        delivery_type: product.delivery_type,
        services: resultServices,
      })
    } catch (err) {
      console.error('[products-v2] Error:', err)
      res.status(500).json({ error: 'SERVER_ERROR', message: 'Внутренняя ошибка сервера' })
    }
  })

  return router
}
