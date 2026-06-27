// ─── Support Tickets Routes ──────────────────────────────
// Система поддержки: тикеты, сообщения, админ-очередь
// (SRS Модуль 11)
// ─────────────────────────────────────────────────────────

import { Router } from 'express'
import { getPool } from '../lib/pool.js'

const pool = getPool()

export default function createSupportRouter() {
  const router = Router()

  // ─── Customer endpoints ─────────────────────────────

  /** POST /api/support/tickets — создать тикет */
  router.post('/tickets', async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Требуется авторизация' })
      const { category, subject, description, order_id } = req.body
      if (!category || !subject) return res.status(400).json({ error: 'category, subject обязательны' })

      const { rows } = await pool.query(
        `INSERT INTO support_tickets (user_id, order_id, category, subject, description, status)
         VALUES ($1, $2, $3, $4, $5, 'open') RETURNING *`,
        [req.user.id, order_id || null, category, subject, description || null]
      )
      res.status(201).json(rows[0])
    } catch (err) {
      console.error('[support] create error:', err)
      res.status(500).json({ error: 'Ошибка создания тикета' })
    }
  })

  /** GET /api/support/tickets — мои тикеты */
  router.get('/tickets', async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Требуется авторизация' })
      const { rows } = await pool.query(
        `SELECT id, category, subject, status, priority, created_at, updated_at,
                (SELECT COUNT(*) FROM support_messages WHERE ticket_id = t.id AND sender_type != 'operator') AS messages
         FROM support_tickets t
         WHERE user_id = $1
         ORDER BY updated_at DESC LIMIT 50`,
        [req.user.id]
      )
      res.json(rows)
    } catch (err) {
      console.error('[support] list error:', err)
      res.status(500).json({ error: 'Ошибка получения тикетов' })
    }
  })

  /** GET /api/support/tickets/:id — детали тикета с сообщениями */
  router.get('/tickets/:id', async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Требуется авторизация' })

      const { rows: tickets } = await pool.query(
        `SELECT * FROM support_tickets WHERE id = $1 AND (user_id = $2 OR $3 = 'admin')`,
        [req.params.id, req.user.id, req.user.role]
      )
      if (tickets.length === 0) return res.status(404).json({ error: 'Тикет не найден' })

      const { rows: messages } = await pool.query(
        `SELECT * FROM support_messages WHERE ticket_id = $1
         AND (is_internal = false OR sender_type = 'customer' OR $2 = 'admin')
         ORDER BY created_at ASC`,
        [req.params.id, req.user.role]
      )

      res.json({ ...tickets[0], messages })
    } catch (err) {
      console.error('[support] detail error:', err)
      res.status(500).json({ error: 'Ошибка получения тикета' })
    }
  })

  /** POST /api/support/tickets/:id/messages — отправить сообщение */
  router.post('/tickets/:id/messages', async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Требуется авторизация' })
      const { message } = req.body
      if (!message) return res.status(400).json({ error: 'message обязателен' })

      const { rows } = await pool.query(
        `INSERT INTO support_messages (ticket_id, sender_id, sender_type, message)
         VALUES ($1, $2, 'customer', $3) RETURNING *`,
        [req.params.id, req.user.id, message]
      )
      res.status(201).json(rows[0])
    } catch (err) {
      console.error('[support] message error:', err)
      res.status(500).json({ error: 'Ошибка отправки сообщения' })
    }
  })

  /** POST /api/support/tickets/:id/close — закрыть тикет */
  router.post('/tickets/:id/close', async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Требуется авторизация' })
      const { rowCount } = await pool.query(
        `UPDATE support_tickets SET status = 'closed', closed_at = NOW()
         WHERE id = $1 AND user_id = $2`,
        [req.params.id, req.user.id]
      )
      if (rowCount === 0) return res.status(404).json({ error: 'Тикет не найден' })
      res.json({ closed: true })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  /** POST /api/support/tickets/:id/rate — оценить */
  router.post('/tickets/:id/rate', async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Требуется авторизация' })
      const { rating } = req.body
      if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'rating от 1 до 5' })
      const { rowCount } = await pool.query(
        'UPDATE support_tickets SET rating = $1 WHERE id = $2 AND user_id = $3',
        [rating, req.params.id, req.user.id]
      )
      if (rowCount === 0) return res.status(404).json({ error: 'Тикет не найден' })
      res.json({ rated: true })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  // ─── Admin endpoints ───────────────────────────────

  /** GET /api/admin/support/tickets — очередь тикетов */
  router.get('/admin/support/tickets', async (req, res) => {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Недостаточно прав' })
    const { status, priority, limit = '50', offset = '0' } = req.query
    const conditions = []
    const params = []
    let idx = 1

    if (status) { conditions.push(`t.status = $${idx++}`); params.push(status) }
    if (priority) { conditions.push(`t.priority = $${idx++}`); params.push(priority) }

    const where = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : ''

    const { rows } = await pool.query(
      `SELECT t.*, u.email AS user_email,
              (SELECT COUNT(*) FROM support_messages WHERE ticket_id = t.id) AS msg_count
       FROM support_tickets t
       JOIN users u ON u.id = t.user_id
       ${where}
       ORDER BY
         CASE t.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END,
         t.updated_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, parseInt(limit), parseInt(offset)]
    )
    res.json(rows)
  })

  /** POST /api/admin/support/tickets/:id/assign — назначить оператора */
  router.post('/admin/support/tickets/:id/assign', async (req, res) => {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Недостаточно прав' })
    const { rows } = await pool.query(
      `UPDATE support_tickets SET assigned_to = $1, status = 'in_progress'
       WHERE id = $2 RETURNING *`,
      [req.body.assigned_to || req.user.id, req.params.id]
    )
    res.json(rows[0] || { error: 'Не найден' })
  })

  /** PATCH /api/admin/support/tickets/:id/status — сменить статус */
  router.patch('/admin/support/tickets/:id/status', async (req, res) => {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Недостаточно прав' })
    const { status } = req.body
    if (!status) return res.status(400).json({ error: 'status обязателен' })
    const { rows } = await pool.query(
      `UPDATE support_tickets SET status = $1 WHERE id = $2 RETURNING *`,
      [status, req.params.id]
    )
    res.json(rows[0] || { error: 'Не найден' })
  })

  /** POST /api/admin/support/tickets/:id/messages — ответ оператора */
  router.post('/admin/support/tickets/:id/messages', async (req, res) => {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Недостаточно прав' })
    const { message, is_internal } = req.body
    if (!message) return res.status(400).json({ error: 'message обязателен' })
    const { rows } = await pool.query(
      `INSERT INTO support_messages (ticket_id, sender_id, sender_type, message, is_internal)
       VALUES ($1, $2, 'operator', $3, $4) RETURNING *`,
      [req.params.id, req.user.id, message, is_internal || false]
    )
    res.status(201).json(rows[0])
  })

  /** GET /api/admin/support/stats — статистика */
  router.get('/admin/support/stats', async (req, res) => {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Недостаточно прав' })
    const { rows } = await pool.query(
      `SELECT
        COUNT(*) FILTER (WHERE status = 'open') AS open,
        COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress,
        COUNT(*) FILTER (WHERE status = 'resolved') AS resolved,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') AS last_24h,
        ROUND(AVG(EXTRACT(EPOCH FROM (closed_at - created_at))/3600) FILTER (WHERE closed_at IS NOT NULL))::INT AS avg_resolution_hours
       FROM support_tickets`
    )
    res.json(rows[0])
  })

  return router
}
