// ─── Admin API v2 — CRUD услуг, регионов, полей, провайдеров ─
// Все эндпоинты требуют JWT + role = admin | superadmin
// ───────────────────────────────────────────────────────────────

import { Router } from 'express'
import { getPool } from '../lib/pool.js'

export default function createAdminV2Router() {
  const router = Router()
  const pool = getPool()

  // ─── Middleware: admin/superadmin only ──────────────────
  router.use((req, res, next) => {
    if (!req.user || !['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Только для администраторов' })
    }
    next()
  })

  // ═══════════════════════════════════════════════════════
  // SERVICES
  // ═══════════════════════════════════════════════════════

  // GET /api/admin/products/:productId/services
  router.get('/products/:productId/services', async (req, res) => {
    try {
      const { productId } = req.params
      const { rows: services } = await pool.query(
        'SELECT * FROM product_services WHERE product_id = $1 ORDER BY sort_order',
        [productId]
      )
      res.json(services)
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  // POST /api/admin/products/:productId/services
  router.post('/products/:productId/services', async (req, res) => {
    try {
      const { productId } = req.params
      const { name, slug, description, image_url, billing_interval, billing_count, sort_order } = req.body
      const { rows } = await pool.query(
        `INSERT INTO product_services (product_id, name, slug, description, image_url, billing_interval, billing_count, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [productId, name, slug, description, image_url, billing_interval || null, billing_count || 1, sort_order || 0]
      )
      res.status(201).json(rows[0])
    } catch (err) {
      if (err.code === '23505') return res.status(409).json({ error: 'DUPLICATE_SLUG', message: 'Услуга с таким slug уже существует' })
      res.status(500).json({ error: err.message })
    }
  })

  // PATCH /api/admin/services/:serviceId
  router.patch('/services/:serviceId', async (req, res) => {
    try {
      const { serviceId } = req.params
      const fields = ['name', 'slug', 'description', 'image_url', 'is_active', 'billing_interval', 'billing_count', 'sort_order']
      const updates = []
      const values = []
      let idx = 1

      for (const field of fields) {
        if (req.body[field] !== undefined) {
          updates.push(`${field} = $${idx}`)
          values.push(req.body[field])
          idx++
        }
      }

      if (updates.length === 0) return res.status(400).json({ error: 'NO_FIELDS' })

      values.push(serviceId)
      const { rows } = await pool.query(
        `UPDATE product_services SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
        values
      )
      res.json(rows[0])
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  // DELETE /api/admin/services/:serviceId
  router.delete('/services/:serviceId', async (req, res) => {
    try {
      await pool.query('DELETE FROM product_services WHERE id = $1', [req.params.serviceId])
      res.json({ deleted: true })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  // ═══════════════════════════════════════════════════════
  // REGIONS
  // ═══════════════════════════════════════════════════════

  // GET /api/admin/services/:serviceId/regions
  router.get('/services/:serviceId/regions', async (req, res) => {
    try {
      const { rows } = await pool.query(
        'SELECT * FROM service_regions WHERE service_id = $1 ORDER BY sort_order',
        [req.params.serviceId]
      )
      res.json(rows)
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  // POST /api/admin/services/:serviceId/regions
  router.post('/services/:serviceId/regions', async (req, res) => {
    try {
      const { serviceId } = req.params
      const {
        region_code, region_name, base_price, currency, old_price,
        price_multiplier, min_amount, max_amount, fixed_amounts,
        region_flag_url, instruction, requires_phone, sort_order,
      } = req.body

      const { rows } = await pool.query(
        `INSERT INTO service_regions (service_id, region_code, region_name, base_price, currency, old_price,
          price_multiplier, min_amount, max_amount, fixed_amounts, region_flag_url, instruction, requires_phone, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
        [serviceId, region_code, region_name, base_price, currency || 'RUB', old_price || null,
         price_multiplier || 1.0, min_amount || null, max_amount || null, fixed_amounts || null,
         region_flag_url || null, instruction || null, requires_phone || false, sort_order || 0]
      )
      res.status(201).json(rows[0])
    } catch (err) {
      if (err.code === '23505') return res.status(409).json({ error: 'DUPLICATE_REGION' })
      res.status(500).json({ error: err.message })
    }
  })

  // PATCH /api/admin/regions/:regionId
  router.patch('/regions/:regionId', async (req, res) => {
    try {
      const fields = ['region_code', 'region_name', 'base_price', 'currency', 'old_price',
        'price_multiplier', 'is_active', 'min_amount', 'max_amount', 'fixed_amounts',
        'region_flag_url', 'instruction', 'requires_phone', 'sort_order']
      const updates = []
      const values = []
      let idx = 1

      for (const field of fields) {
        if (req.body[field] !== undefined) {
          updates.push(`${field} = $${idx}`)
          values.push(req.body[field])
          idx++
        }
      }

      if (updates.length === 0) return res.status(400).json({ error: 'NO_FIELDS' })
      values.push(req.params.regionId)

      const { rows } = await pool.query(
        `UPDATE service_regions SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
        values
      )
      res.json(rows[0])
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  // DELETE /api/admin/regions/:regionId
  router.delete('/regions/:regionId', async (req, res) => {
    try {
      await pool.query('DELETE FROM service_regions WHERE id = $1', [req.params.regionId])
      res.json({ deleted: true })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  // ═══════════════════════════════════════════════════════
  // INPUT FIELDS
  // ═══════════════════════════════════════════════════════

  // GET /api/admin/services/:serviceId/fields
  router.get('/services/:serviceId/fields', async (req, res) => {
    try {
      const { rows } = await pool.query(
        'SELECT * FROM service_input_fields WHERE service_id = $1 ORDER BY sort_order',
        [req.params.serviceId]
      )
      res.json(rows)
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  // POST /api/admin/services/:serviceId/fields
  router.post('/services/:serviceId/fields', async (req, res) => {
    try {
      const { serviceId } = req.params
      const { field_key, field_label, field_type, validation_regex, validation_error,
        placeholder, is_required, max_length, sort_order, options } = req.body

      const { rows } = await pool.query(
        `INSERT INTO service_input_fields (service_id, field_key, field_label, field_type,
          validation_regex, validation_error, placeholder, is_required, max_length, sort_order, options)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
        [serviceId, field_key, field_label, field_type, validation_regex || null,
         validation_error || null, placeholder || null, is_required !== false, max_length || 255,
         sort_order || 0, options || null]
      )
      res.status(201).json(rows[0])
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  // PATCH /api/admin/fields/:fieldId
  router.patch('/fields/:fieldId', async (req, res) => {
    try {
      const fields = ['field_key', 'field_label', 'field_type', 'validation_regex',
        'validation_error', 'placeholder', 'is_required', 'max_length', 'sort_order', 'options']
      const updates = []
      const values = []
      let idx = 1

      for (const field of fields) {
        if (req.body[field] !== undefined) {
          updates.push(`${field} = $${idx}`)
          values.push(req.body[field])
          idx++
        }
      }

      if (updates.length === 0) return res.status(400).json({ error: 'NO_FIELDS' })
      values.push(req.params.fieldId)

      const { rows } = await pool.query(
        `UPDATE service_input_fields SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
        values
      )
      res.json(rows[0])
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  // DELETE /api/admin/fields/:fieldId
  router.delete('/fields/:fieldId', async (req, res) => {
    try {
      await pool.query('DELETE FROM service_input_fields WHERE id = $1', [req.params.fieldId])
      res.json({ deleted: true })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  // ═══════════════════════════════════════════════════════
  // SERVICE PROVIDERS (mapping)
  // ═══════════════════════════════════════════════════════

  // GET /api/admin/services/:serviceId/providers
  router.get('/services/:serviceId/providers', async (req, res) => {
    try {
      const { rows } = await pool.query(
        'SELECT * FROM service_providers WHERE service_id = $1',
        [req.params.serviceId]
      )
      res.json(rows)
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  // POST /api/admin/services/:serviceId/providers
  router.post('/services/:serviceId/providers', async (req, res) => {
    try {
      const { serviceId } = req.params
      const { provider_code, endpoint, http_method, body_template, headers_override,
        timeout_ms, retry_count, retry_delay_ms, response_mapping } = req.body

      const { rows } = await pool.query(
        `INSERT INTO service_providers (service_id, provider_code, endpoint, http_method,
          body_template, headers_override, timeout_ms, retry_count, retry_delay_ms, response_mapping)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
        [serviceId, provider_code, endpoint, http_method || 'POST',
         JSON.stringify(body_template), headers_override ? JSON.stringify(headers_override) : null,
         timeout_ms || 15000, retry_count || 3, retry_delay_ms || 1000,
         response_mapping ? JSON.stringify(response_mapping) : null]
      )
      res.status(201).json(rows[0])
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  // PATCH /api/admin/providers/:providerId
  router.patch('/providers/:providerId', async (req, res) => {
    try {
      const fields = ['provider_code', 'endpoint', 'http_method', 'body_template',
        'headers_override', 'timeout_ms', 'retry_count', 'retry_delay_ms', 'response_mapping', 'is_active']
      const updates = []
      const values = []
      let idx = 1

      for (const field of fields) {
        if (req.body[field] !== undefined) {
          const val = field === 'body_template' || field === 'headers_override' || field === 'response_mapping'
            ? JSON.stringify(req.body[field])
            : req.body[field]
          updates.push(`${field} = $${idx}`)
          values.push(val)
          idx++
        }
      }

      if (updates.length === 0) return res.status(400).json({ error: 'NO_FIELDS' })
      values.push(req.params.providerId)

      const { rows } = await pool.query(
        `UPDATE service_providers SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
        values
      )
      res.json(rows[0])
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  // DELETE /api/admin/providers/:providerId
  router.delete('/providers/:providerId', async (req, res) => {
    try {
      await pool.query('DELETE FROM service_providers WHERE id = $1', [req.params.providerId])
      res.json({ deleted: true })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  // ═══════════════════════════════════════════════════════
  // PROVIDER CONFIGS
  // ═══════════════════════════════════════════════════════

  // GET /api/admin/provider-configs
  router.get('/provider-configs', async (req, res) => {
    try {
      const { rows } = await pool.query('SELECT * FROM provider_configs ORDER BY provider_name')
      // Не возвращаем auth_credentials в списке (только маскированный статус)
      const safe = rows.map(r => ({
        ...r,
        auth_configured: !!r.auth_credentials,
        auth_credentials: undefined,
      }))
      res.json(safe)
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  // POST /api/admin/provider-configs
  router.post('/provider-configs', async (req, res) => {
    try {
      const { provider_code, provider_name, base_url, auth_type, auth_credentials,
        default_headers, default_timeout_ms, rate_limit_rps, circuit_breaker,
        health_check_url, health_check_interval_ms } = req.body

      const { rows } = await pool.query(
        `INSERT INTO provider_configs (provider_code, provider_name, base_url, auth_type,
          auth_credentials, default_headers, default_timeout_ms, rate_limit_rps,
          circuit_breaker, health_check_url, health_check_interval_ms)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
        [provider_code, provider_name, base_url, auth_type || 'api_key',
         auth_credentials ? JSON.stringify(auth_credentials) : null,
         default_headers ? JSON.stringify(default_headers) : null,
         default_timeout_ms || 15000, rate_limit_rps || 10,
         circuit_breaker ? JSON.stringify(circuit_breaker) : null,
         health_check_url || null, health_check_interval_ms || 60000]
      )
      res.status(201).json(rows[0])
    } catch (err) {
      if (err.code === '23505') return res.status(409).json({ error: 'DUPLICATE_PROVIDER_CODE' })
      res.status(500).json({ error: err.message })
    }
  })

  // PATCH /api/admin/provider-configs/:code
  router.patch('/provider-configs/:code', async (req, res) => {
    try {
      const fields = ['provider_name', 'base_url', 'auth_type', 'auth_credentials',
        'default_headers', 'default_timeout_ms', 'rate_limit_rps', 'circuit_breaker',
        'health_check_url', 'health_check_interval_ms', 'is_active']
      const updates = []
      const values = []
      let idx = 1

      for (const field of fields) {
        if (req.body[field] !== undefined) {
          const val = ['auth_credentials', 'default_headers', 'circuit_breaker'].includes(field)
            ? JSON.stringify(req.body[field])
            : req.body[field]
          updates.push(`${field} = $${idx}`)
          values.push(val)
          idx++
        }
      }

      if (updates.length === 0) return res.status(400).json({ error: 'NO_FIELDS' })
      values.push(req.params.code)

      const { rows } = await pool.query(
        `UPDATE provider_configs SET ${updates.join(', ')} WHERE provider_code = $${idx} RETURNING *`,
        values
      )
      res.json(rows[0])
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  // DELETE /api/admin/provider-configs/:code
  router.delete('/provider-configs/:code', async (req, res) => {
    try {
      await pool.query('DELETE FROM provider_configs WHERE provider_code = $1', [req.params.code])
      res.json({ deleted: true })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  return router
}
