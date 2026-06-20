// ============================================
// Admin Logs
// Просмотр system_logs + admin_logs с фильтрацией
// ============================================

import { Router } from 'express'

export default function createAdminLogsRouter(pool) {
  const router = Router()

  // ─── GET /api/admin/logs — системные логи ──────────
  router.get('/', async (req, res) => {
    try {
      const {
        level, component, search,
        date_from, date_to,
        user_id,
        page = '1', limit = '50',
      } = req.query

      const pageNum = Math.max(1, parseInt(page))
      const limitNum = Math.min(200, Math.max(1, parseInt(limit)))
      const offset = (pageNum - 1) * limitNum

      let query = `
        SELECT sl.*, u.email as user_email
        FROM system_logs sl
        LEFT JOIN users u ON u.id = sl.user_id
      `
      const countQuery = 'SELECT COUNT(*) FROM system_logs sl'
      const params = []
      const conditions = []
      let idx = 1

      if (level) {
        // Support multiple levels: error,warn
        const levels = level.split(',').map(s => s.trim()).filter(Boolean)
        const placeholders = levels.map(() => `$${idx++}`).join(',')
        conditions.push(`sl.level IN (${placeholders})`)
        params.push(...levels)
      }

      if (component) {
        conditions.push(`sl.component ILIKE $${idx++}`)
        params.push(`%${component}%`)
      }

      if (user_id) {
        conditions.push(`sl.user_id = $${idx++}`)
        params.push(user_id)
      }

      if (date_from) {
        conditions.push(`sl.created_at >= $${idx++}`)
        params.push(date_from)
      }

      if (date_to) {
        conditions.push(`sl.created_at <= $${idx++}`)
        params.push(date_to)
      }

      if (search) {
        conditions.push(`(sl.message ILIKE $${idx} OR sl.component ILIKE $${idx} OR sl.request_id ILIKE $${idx})`)
        params.push(`%${search}%`)
        idx++
      }

      const where = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : ''

      // Count
      const countResult = await pool.query(countQuery + where, params)
      const total = parseInt(countResult.rows[0].count)

      query += where
      query += ' ORDER BY sl.created_at DESC'
      query += ` LIMIT $${idx++} OFFSET $${idx++}`
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
      console.error('[admin-logs] List error:', err)
      res.status(500).json({ error: 'Ошибка получения логов' })
    }
  })

  // ─── GET /api/admin/logs/admin — admin-логи (audit) ─
  router.get('/admin', async (req, res) => {
    try {
      const {
        admin_id, action, entity_type,
        date_from, date_to,
        page = '1', limit = '50',
      } = req.query

      const pageNum = Math.max(1, parseInt(page))
      const limitNum = Math.min(200, Math.max(1, parseInt(limit)))
      const offset = (pageNum - 1) * limitNum

      let query = `
        SELECT al.*, u.email as admin_email
        FROM admin_logs al
        LEFT JOIN users u ON u.id = al.admin_id
      `
      const countQuery = 'SELECT COUNT(*) FROM admin_logs al'
      const params = []
      const conditions = []
      let idx = 1

      if (admin_id) {
        conditions.push(`al.admin_id = $${idx++}`)
        params.push(admin_id)
      }

      if (action) {
        conditions.push(`al.action ILIKE $${idx++}`)
        params.push(`%${action}%`)
      }

      if (entity_type) {
        conditions.push(`al.entity_type = $${idx++}`)
        params.push(entity_type)
      }

      if (date_from) {
        conditions.push(`al.created_at >= $${idx++}`)
        params.push(date_from)
      }

      if (date_to) {
        conditions.push(`al.created_at <= $${idx++}`)
        params.push(date_to)
      }

      const where = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : ''

      const countResult = await pool.query(countQuery + where, params)
      const total = parseInt(countResult.rows[0].count)

      query += where
      query += ' ORDER BY al.created_at DESC'
      query += ` LIMIT $${idx++} OFFSET $${idx++}`
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
      console.error('[admin-logs] Admin logs error:', err)
      res.status(500).json({ error: 'Ошибка получения admin-логов' })
    }
  })

  // ─── GET /api/admin/logs/stats — статистика логов ──
  router.get('/stats', async (req, res) => {
    try {
      const { date_from, date_to } = req.query

      const params = []
      let idx = 1
      const conditions = []

      if (date_from) { conditions.push(`created_at >= $${idx++}`); params.push(date_from) }
      if (date_to) { conditions.push(`created_at <= $${idx++}`); params.push(date_to) }

      const where = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : ''

      // By level
      const byLevel = await pool.query(`
        SELECT level, COUNT(*) as count
        FROM system_logs
        ${where}
        GROUP BY level
        ORDER BY count DESC
      `, params)

      // By component (top 20)
      const byComponent = await pool.query(`
        SELECT component, COUNT(*) as count
        FROM system_logs
        ${where}
        GROUP BY component
        ORDER BY count DESC
        LIMIT 20
      `, params)

      // Totals
      const totals = await pool.query(`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE level = 'error') as errors,
          COUNT(*) FILTER (WHERE level = 'warn') as warnings,
          MIN(created_at) as oldest,
          MAX(created_at) as newest
        FROM system_logs
        ${where}
      `, params)

      res.json({
        totals: totals.rows[0],
        by_level: byLevel.rows,
        by_component: byComponent.rows,
      })
    } catch (err) {
      console.error('[admin-logs] Stats error:', err)
      res.status(500).json({ error: 'Ошибка получения статистики логов' })
    }
  })

  // ─── GET /api/admin/logs/:id — детальная запись ────
  router.get('/:id', async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT sl.*, u.email as user_email
         FROM system_logs sl
         LEFT JOIN users u ON u.id = sl.user_id
         WHERE sl.id = $1`,
        [isNaN(req.params.id) ? -1 : parseInt(req.params.id)]
      )

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Лог не найден' })
      }

      res.json(result.rows[0])
    } catch (err) {
      console.error('[admin-logs] Get error:', err)
      res.status(500).json({ error: 'Ошибка получения записи лога' })
    }
  })

  return router
}
