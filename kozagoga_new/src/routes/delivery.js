// ─── Digital Delivery Routes ─────────────────────────────
// Выдача ключей, reveal, email, admin key-pool management
// (SRS Модуль 2)
// ─────────────────────────────────────────────────────────

import { Router } from 'express'
import multer from 'multer'
import { getPool } from '../lib/pool.js'
import { revealKey, getDeliveriesByOrder, uploadKeys, getKeyPoolStats } from '../services/key-pool-service.js'

const pool = getPool()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })

export default function createDeliveryRouter() {
  const router = Router()

  // ─── Customer endpoints ─────────────────────────────

  /** GET /api/deliveries/:orderId — полученные товары по заказу */
  router.get('/:orderId', async (req, res) => {
    try {
      const userId = req.user?.id
      if (!userId) return res.status(401).json({ error: 'Требуется авторизация' })

      const items = await getDeliveriesByOrder(req.params.orderId, userId)
      res.json(items)
    } catch (err) {
      console.error('[delivery] GET error:', err)
      res.status(500).json({ error: 'Ошибка получения товаров' })
    }
  })

  /** POST /api/deliveries/:orderItemId/reveal — показать ключ */
  router.post('/:orderItemId/reveal', async (req, res) => {
    try {
      const userId = req.user?.id
      if (!userId) return res.status(401).json({ error: 'Требуется авторизация' })

      const key = await revealKey(req.params.orderItemId, userId)
      if (!key) {
        return res.status(404).json({ error: 'Ключ не найден' })
      }
      res.json({ value: key })
    } catch (err) {
      if (err.message && err.message.includes('Превышен лимит')) {
        return res.status(400).json({ error: err.message })
      }
      console.error('[delivery] reveal error:', err)
      res.status(500).json({ error: 'Ошибка показа ключа' })
    }
  })

  // ─── Admin endpoints ────────────────────────────────

  /** GET /api/admin/key-pool/stats — статистика */
  router.get('/admin/key-pool/stats', async (req, res) => {
    try {
      if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Недостаточно прав' })
      const stats = await getKeyPoolStats(req.query.product_id)
      res.json(stats)
    } catch (err) {
      console.error('[admin] key-pool stats error:', err)
      res.status(500).json({ error: 'Ошибка статистики' })
    }
  })

  /** GET /api/admin/key-pool — список ключей */
  router.get('/admin/key-pool', async (req, res) => {
    try {
      if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Недостаточно прав' })

      const { product_id, is_sold, limit = '50', offset = '0' } = req.query
      const params = []
      const conditions = []

      if (product_id) {
        conditions.push(`kp.product_id = $${params.length + 1}`)
        params.push(product_id)
      }
      if (is_sold !== undefined && is_sold !== '') {
        conditions.push(`kp.is_sold = $${params.length + 1}`)
        params.push(is_sold === 'true')
      }

      const where = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : ''
      const limitNum = parseInt(limit)
      const offsetNum = parseInt(offset)

      const { rows } = await pool.query(
        `SELECT kp.id, kp.product_id, kp.batch_id, kp.type, kp.is_sold, kp.sold_at,
                kp.expires_at, kp.supplier, kp.cost_price, kp.created_at,
                p.name AS product_name,
                SUBSTRING(kp.value_hash, 1, 12) AS hash_prefix
         FROM key_pool kp
         JOIN products p ON p.id = kp.product_id
         ${where}
         ORDER BY kp.created_at DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limitNum, offsetNum]
      )
      res.json(rows)
    } catch (err) {
      console.error('[admin] key-pool list error:', err)
      res.status(500).json({ error: 'Ошибка списка ключей' })
    }
  })

  /** POST /api/admin/key-pool/upload — загрузка ключей */
  router.post('/admin/key-pool/upload', upload.single('file'), async (req, res) => {
    try {
      if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Недостаточно прав' })

      const { product_id } = req.body
      if (!product_id) return res.status(400).json({ error: 'product_id обязателен' })

      const { rows: products } = await pool.query(
        'SELECT id, name FROM products WHERE id = $1',
        [product_id]
      )
      if (products.length === 0) return res.status(404).json({ error: 'Товар не найден' })

      let csvContent = ''
      if (req.file) {
        csvContent = req.file.buffer.toString('utf-8')
      } else if (req.body.csv) {
        csvContent = req.body.csv
      } else {
        return res.status(400).json({ error: 'CSV файл или поле csv обязательны' })
      }

      const lines = csvContent.trim().split('\n')
      const keys = []
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',').map(s => s.trim())
        if (!parts[0]) continue
        keys.push({
          value: parts[0],
          type: parts[1] || 'key',
          meta: parts[2] ? JSON.parse(parts[2]) : null,
          expiresAt: parts[3] || null,
          costPrice: parts[4] ? parseFloat(parts[4]) : null,
          supplier: parts[5] || null,
        })
      }

      const result = await uploadKeys(product_id, keys)
      res.json({
        product_id,
        product_name: products[0].name,
        keys_parsed: keys.length,
        ...result,
      })
    } catch (err) {
      console.error('[admin] key-pool upload error:', err)
      res.status(500).json({ error: 'Ошибка загрузки ключей: ' + (err.message || err) })
    }
  })

  /** DELETE /api/admin/key-pool/:id — удалить ключ */
  router.delete('/admin/key-pool/:id', async (req, res) => {
    try {
      if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Недостаточно прав' })
      const { rowCount } = await pool.query('DELETE FROM key_pool WHERE id = $1', [req.params.id])
      if (rowCount === 0) return res.status(404).json({ error: 'Ключ не найден' })
      res.json({ deleted: true })
    } catch (err) {
      console.error('[admin] key-pool delete error:', err)
      res.status(500).json({ error: 'Ошибка удаления ключа' })
    }
  })

  return router
}
