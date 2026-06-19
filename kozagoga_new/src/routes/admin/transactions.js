// ============================================
// Admin Transactions
// Просмотр операций + отмена/возврат/force-complete
// ============================================

import { Router } from 'express'

export default function createAdminTransactionsRouter(pool, audit) {
  const router = Router()

  // ─── GET /api/admin/transactions — список ──────────
  router.get('/', async (req, res) => {
    try {
      const {
        date_from, date_to,
        provider_status, order_status,
        provider_code, gateway_code,
        amount_min, amount_max,
        currency,
        search,
        page = '1', limit = '50',
      } = req.query

      const pageNum = Math.max(1, parseInt(page))
      const limitNum = Math.min(100, Math.max(1, parseInt(limit)))
      const offset = (pageNum - 1) * limitNum

      // Основной запрос — из orders + payments + transactions
      let query = `
        SELECT
          o.id as order_id,
          o.status as order_status,
          o.total,
          o.payment_status,
          o.payment_method,
          o.created_at,
          o.user_id,
          u.email as user_email,
          t.id as transaction_id,
          t.provider_code,
          t.provider_status,
          t.provider_transaction_id,
          t.gateway_tx_id,
          t.gateway_code,
          t.amount,
          t.currency,
          t.commission,
          t.refund_amount,
          t.cancelled_by,
          t.cancelled_at,
          t.refunded_by,
          t.refunded_at
        FROM orders o
        LEFT JOIN users u ON u.id = o.user_id
        LEFT JOIN transactions t ON t.order_id = o.id
      `

      const countQuery = `
        SELECT COUNT(*)
        FROM orders o
        LEFT JOIN transactions t ON t.order_id = o.id
      `

      const params = []
      const conditions = []
      let idx = 1

      if (date_from) {
        conditions.push(`o.created_at >= $${idx++}`)
        params.push(date_from)
      }
      if (date_to) {
        conditions.push(`o.created_at <= $${idx++}`)
        params.push(date_to)
      }
      if (provider_status) {
        const statuses = provider_status.split(',')
        const placeholders = statuses.map(() => `$${idx++}`).join(',')
        conditions.push(`t.provider_status IN (${placeholders})`)
        params.push(...statuses)
      }
      if (order_status) {
        const statuses = order_status.split(',')
        const placeholders = statuses.map(() => `$${idx++}`).join(',')
        conditions.push(`o.status IN (${placeholders})`)
        params.push(...statuses)
      }
      if (provider_code) {
        conditions.push(`t.provider_code = $${idx++}`)
        params.push(provider_code)
      }
      if (gateway_code) {
        conditions.push(`t.gateway_code = $${idx++}`)
        params.push(gateway_code)
      }
      if (amount_min) {
        conditions.push(`o.total >= $${idx++}`)
        params.push(parseFloat(amount_min))
      }
      if (amount_max) {
        conditions.push(`o.total <= $${idx++}`)
        params.push(parseFloat(amount_max))
      }
      if (currency) {
        conditions.push(`t.currency = $${idx++}`)
        params.push(currency)
      }

      // Smart search
      if (search) {
        const searchStr = search.trim()
        // UUID with dashes → gateway_tx_id
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-/.test(searchStr)) {
          conditions.push(`t.gateway_tx_id = $${idx++}`)
          params.push(searchStr)
        }
        // UUID without dashes or digits → local_transaction_id or provider_tx_id
        else if (/^[0-9a-f]{32}$/i.test(searchStr) || /^\d+$/.test(searchStr)) {
          conditions.push(`(t.local_transaction_id::text = $${idx} OR t.provider_transaction_id = $${idx})`)
          params.push(searchStr)
          idx++
        }
        // Fallback: order_id prefix match
        else {
          conditions.push(`(o.id::text ILIKE $${idx} OR u.email ILIKE $${idx} OR t.provider_transaction_id ILIKE $${idx})`)
          params.push(`%${searchStr}%`)
          idx++
        }
      }

      const where = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : ''

      const countResult = await pool.query(countQuery + where, params)
      const total = parseInt(countResult.rows[0].count)

      query += where
      query += ' ORDER BY o.created_at DESC'
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
      console.error('[admin-transactions] List error:', err)
      res.status(500).json({ error: 'Ошибка получения операций' })
    }
  })

  // ─── GET /api/admin/transactions/:id — детали ──────
  router.get('/:id', async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT
          o.*,
          u.email as user_email,
          t.*,
          t.id as transaction_id,
          al.actions as admin_actions
        FROM orders o
        LEFT JOIN users u ON u.id = o.user_id
        LEFT JOIN transactions t ON t.order_id = o.id
        LEFT JOIN LATERAL (
          SELECT json_agg(json_build_object(
            'action', al.action,
            'admin_id', al.admin_id,
            'details', al.details,
            'created_at', al.created_at
          ) ORDER BY al.created_at DESC) as actions
          FROM admin_logs al
          WHERE al.entity_id = o.id::text AND al.entity_type IN ('order', 'transaction')
        ) al ON true
        WHERE o.id = $1 OR t.id = $1`,
        [req.params.id]
      )

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Операция не найдена' })
      }

      res.json(result.rows[0])
    } catch (err) {
      console.error('[admin-transactions] Get error:', err)
      res.status(500).json({ error: 'Ошибка получения операции' })
    }
  })

  // ─── POST /api/admin/transactions/:id/cancel ───────
  router.post('/:id/cancel', async (req, res) => {
    try {
      const orderId = req.params.id

      const order = await pool.query('SELECT * FROM orders WHERE id = $1', [orderId])
      if (order.rows.length === 0) {
        return res.status(404).json({ error: 'Заказ не найден' })
      }

      const o = order.rows[0]
      if (['completed', 'cancelled'].includes(o.status)) {
        return res.status(400).json({ error: `Нельзя отменить заказ со статусом "${o.status}"` })
      }

      // Cancel order
      await pool.query(
        'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2',
        ['cancelled', orderId]
      )

      // Update transaction if exists
      await pool.query(
        `UPDATE transactions SET
          provider_status = 'CANCELLED',
          order_status = 'cancelled',
          cancelled_by = $1,
          cancelled_at = NOW()
         WHERE order_id = $2`,
        [req.admin.id, orderId]
      )

      await audit.log(req, 'order.cancel', { entity_id: orderId })

      res.json({ ok: true, status: 'cancelled' })
    } catch (err) {
      console.error('[admin-transactions] Cancel error:', err)
      res.status(500).json({ error: 'Ошибка отмены заказа' })
    }
  })

  // ─── POST /api/admin/transactions/:id/refund ───────
  router.post('/:id/refund', async (req, res) => {
    try {
      const { amount } = req.body
      const orderId = req.params.id

      const order = await pool.query('SELECT * FROM orders WHERE id = $1', [orderId])
      if (order.rows.length === 0) {
        return res.status(404).json({ error: 'Заказ не найден' })
      }

      const o = order.rows[0]
      if (!['paid', 'completed'].includes(o.status)) {
        return res.status(400).json({ error: `Нельзя вернуть заказ со статусом "${o.status}"` })
      }

      const refundAmount = amount ? parseFloat(amount) : o.total

      // Update order
      await pool.query(
        'UPDATE orders SET payment_status = $1, updated_at = NOW() WHERE id = $2',
        ['refunded', orderId]
      )

      // Update transaction
      await pool.query(
        `UPDATE transactions SET
          refund_amount = COALESCE(refund_amount, 0) + $1,
          refunded_by = $2,
          refunded_at = NOW()
         WHERE order_id = $3`,
        [refundAmount, req.admin.id, orderId]
      )

      // Refund on provider if needed (stub — Phase 2)
      // TODO: call provider API to refund

      await audit.log(req, 'order.refund', {
        entity_id: orderId,
        amount: refundAmount,
      })

      res.json({ ok: true, refund_amount: refundAmount })
    } catch (err) {
      console.error('[admin-transactions] Refund error:', err)
      res.status(500).json({ error: 'Ошибка возврата' })
    }
  })

  // ─── POST /api/admin/transactions/:id/force-complete ─
  router.post('/:id/force-complete', async (req, res) => {
    try {
      const orderId = req.params.id

      const order = await pool.query('SELECT * FROM orders WHERE id = $1', [orderId])
      if (order.rows.length === 0) {
        return res.status(404).json({ error: 'Заказ не найден' })
      }

      const o = order.rows[0]
      if (o.status === 'completed') {
        return res.status(400).json({ error: 'Заказ уже завершён' })
      }

      await pool.query(
        'UPDATE orders SET status = $1, payment_status = $2, updated_at = NOW() WHERE id = $3',
        ['completed', 'paid', orderId]
      )

      await pool.query(
        `UPDATE transactions SET
          provider_status = 'COMPLETE',
          order_status = 'completed',
          force_completed_by = $1,
          force_completed_at = NOW()
         WHERE order_id = $2`,
        [req.admin.id, orderId]
      )

      await audit.log(req, 'order.force_complete', {
        entity_id: orderId,
        previous_status: o.status,
      })

      res.json({ ok: true, status: 'completed' })
    } catch (err) {
      console.error('[admin-transactions] Force complete error:', err)
      res.status(500).json({ error: 'Ошибка принудительного завершения' })
    }
  })

  // ─── GET /api/admin/transactions/export — CSV-экспорт
  router.get('/export', async (req, res) => {
    try {
      // Копируем фильтры из списка
      const { date_from, date_to, provider_status, order_status, provider_code } = req.query

      let query = `
        SELECT
          o.id as order_id,
          o.status as order_status,
          o.total,
          o.payment_status,
          o.payment_method,
          o.created_at,
          u.email as user_email,
          t.provider_code,
          t.provider_status,
          t.provider_transaction_id,
          t.gateway_tx_id,
          t.gateway_code,
          t.amount,
          t.currency,
          t.commission,
          t.refund_amount
        FROM orders o
        LEFT JOIN users u ON u.id = o.user_id
        LEFT JOIN transactions t ON t.order_id = o.id
      `
      const params = []
      const conditions = []
      let idx = 1

      if (date_from) { conditions.push(`o.created_at >= $${idx++}`); params.push(date_from) }
      if (date_to) { conditions.push(`o.created_at <= $${idx++}`); params.push(date_to) }
      if (provider_status) {
        const statuses = provider_status.split(',')
        const placeholders = statuses.map(() => `$${idx++}`).join(',')
        conditions.push(`t.provider_status IN (${placeholders})`)
        params.push(...statuses)
      }
      if (order_status) {
        const statuses = order_status.split(',')
        const placeholders = statuses.map(() => `$${idx++}`).join(',')
        conditions.push(`o.status IN (${placeholders})`)
        params.push(...statuses)
      }
      if (provider_code) { conditions.push(`t.provider_code = $${idx++}`); params.push(provider_code) }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ')
      }
      query += ' ORDER BY o.created_at DESC LIMIT 10000'

      const result = await pool.query(query, params)

      // Build CSV
      const headers = [
        'order_id', 'status', 'total', 'payment_status', 'payment_method',
        'created_at', 'user_email', 'provider', 'provider_status',
        'provider_tx_id', 'gateway_tx_id', 'gateway', 'amount', 'currency',
        'commission', 'refund_amount',
      ]

      // UTF-8 BOM for Excel русской локали
      const BOM = '\uFEFF'
      const csvRows = [headers.join(',')]

      for (const row of result.rows) {
        csvRows.push(headers.map(h => {
          const val = row[h] ?? ''
          const str = String(val).replace(/"/g, '""')
          return /[,"\n]/.test(str) ? `"${str}"` : str
        }).join(','))
      }

      res.setHeader('Content-Type', 'text/csv; charset=utf-8')
      res.setHeader('Content-Disposition', `attachment; filename="transactions-${new Date().toISOString().slice(0, 10)}.csv"`)
      res.send(BOM + csvRows.join('\n'))
    } catch (err) {
      console.error('[admin-transactions] Export error:', err)
      res.status(500).json({ error: 'Ошибка экспорта' })
    }
  })

  // ─── GET /api/admin/transactions/stats — статистика ─
  router.get('/stats', async (req, res) => {
    try {
      const { date_from, date_to, period = 'day' } = req.query

      const params = []
      let idx = 1
      const conditions = []

      if (date_from) { conditions.push(`o.created_at >= $${idx++}`); params.push(date_from) }
      if (date_to) { conditions.push(`o.created_at <= $${idx++}`); params.push(date_to) }

      const where = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : ''

      // Total counts
      const totals = await pool.query(`
        SELECT
          COUNT(*) as total_orders,
          COUNT(*) FILTER (WHERE o.status IN ('paid', 'completed')) as successful,
          COUNT(*) FILTER (WHERE o.status = 'cancelled') as cancelled,
          COUNT(*) FILTER (WHERE o.status = 'pending') as pending,
          COUNT(*) FILTER (WHERE o.payment_status = 'refunded') as refunded,
          COALESCE(SUM(o.total) FILTER (WHERE o.status IN ('paid', 'completed')), 0) as revenue
        FROM orders o
        ${where}
      `, params)

      // By day/period
      const dateTrunc = period === 'hour' ? "date_trunc('hour', o.created_at)"
        : period === 'week' ? "date_trunc('week', o.created_at)"
        : "date_trunc('day', o.created_at)"

      const byPeriod = await pool.query(`
        SELECT
          ${dateTrunc} as date,
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE o.status IN ('paid', 'completed')) as successful,
          COUNT(*) FILTER (WHERE o.status = 'cancelled') as failed,
          COALESCE(SUM(o.total) FILTER (WHERE o.status IN ('paid', 'completed')), 0) as revenue
        FROM orders o
        ${where}
        GROUP BY 1
        ORDER BY 1 ASC
        LIMIT 365
      `, params)

      // By provider
      const byProvider = await pool.query(`
        SELECT
          COALESCE(t.provider_code, 'unknown') as provider,
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE t.provider_status = 'COMPLETE') as completed,
          COUNT(*) FILTER (WHERE t.provider_status = 'FAILURE') as failed
        FROM orders o
        LEFT JOIN transactions t ON t.order_id = o.id
        ${where}
        GROUP BY t.provider_code
        ORDER BY total DESC
      `, params)

      res.json({
        totals: totals.rows[0],
        by_period: byPeriod.rows,
        by_provider: byProvider.rows,
      })
    } catch (err) {
      console.error('[admin-transactions] Stats error:', err)
      res.status(500).json({ error: 'Ошибка получения статистики' })
    }
  })

  return router
}
