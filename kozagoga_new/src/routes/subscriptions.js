// ─── Subscription Routes ─────────────────────────────────
// (SRS Модуль 5)
// ─────────────────────────────────────────────────────────

import { Router } from 'express'
import { getPool } from '../lib/pool.js'
import {
  createSubscription, cancelSubscription, pauseSubscription,
  resumeSubscription, getUserSubscriptions, getSubscriptionHistory
} from '../services/subscription-service.js'

const pool = getPool()

export default function createSubscriptionRouter() {
  const router = Router()

  // Auth required for all
  router.use((req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Требуется авторизация' })
    next()
  })

  /** GET /api/subscriptions — список подписок */
  router.get('/', async (req, res) => {
    try {
      const subs = await getUserSubscriptions(req.user.id)
      res.json(subs)
    } catch (err) {
      console.error('[subs] GET error:', err)
      res.status(500).json({ error: 'Ошибка получения подписок' })
    }
  })

  /** POST /api/subscriptions — создать подписку */
  router.post('/', async (req, res) => {
    try {
      const { product_id, variant_id, billing_interval, billing_count, trial_days } = req.body
      if (!product_id) return res.status(400).json({ error: 'product_id обязателен' })

      // Получаем цену
      let price, currency
      if (variant_id) {
        const { rows } = await pool.query('SELECT price, currency FROM product_variants WHERE id = $1', [variant_id])
        if (rows.length === 0) return res.status(404).json({ error: 'Вариант не найден' })
        price = rows[0].price; currency = rows[0].currency
      } else {
        const { rows } = await pool.query('SELECT price, currency FROM products WHERE id = $1', [product_id])
        if (rows.length === 0) return res.status(404).json({ error: 'Товар не найден' })
        price = rows[0].price; currency = rows[0].currency
      }

      const sub = await createSubscription(req.user.id, product_id, variant_id || null, {
        price, currency: currency || 'RUB',
        billingInterval: billing_interval || 'month',
        billingCount: billing_count || 1,
        trialDays: trial_days || 0,
      })
      res.status(201).json(sub)
    } catch (err) {
      console.error('[subs] POST error:', err)
      res.status(500).json({ error: err.message })
    }
  })

  /** GET /api/subscriptions/:id — детали */
  router.get('/:id', async (req, res) => {
    try {
      const subs = await getUserSubscriptions(req.user.id)
      const sub = subs.find(s => s.id === req.params.id)
      if (!sub) return res.status(404).json({ error: 'Подписка не найдена' })
      res.json(sub)
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  /** POST /api/subscriptions/:id/cancel */
  router.post('/:id/cancel', async (req, res) => {
    try {
      const sub = await cancelSubscription(req.params.id, req.user.id)
      if (!sub) return res.status(404).json({ error: 'Подписка не найдена' })
      res.json({ message: `Подписка отменена. Услуга действует до ${sub.current_period_end}`, sub })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  /** POST /api/subscriptions/:id/pause */
  router.post('/:id/pause', async (req, res) => {
    try {
      const sub = await pauseSubscription(req.params.id, req.user.id)
      if (!sub) return res.status(404).json({ error: 'Подписка не найдена' })
      res.json(sub)
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  /** POST /api/subscriptions/:id/resume */
  router.post('/:id/resume', async (req, res) => {
    try {
      const sub = await resumeSubscription(req.params.id, req.user.id)
      if (!sub) return res.status(404).json({ error: 'Подписка не найдена' })
      res.json(sub)
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  /** POST /api/subscriptions/:id/toggle-auto-renew */
  router.post('/:id/toggle-auto-renew', async (req, res) => {
    try {
      const { auto_renew } = req.body
      const { rows } = await pool.query(
        `UPDATE subscriptions SET auto_renew = $1 WHERE id = $2 AND user_id = $3 RETURNING *`,
        [auto_renew, req.params.id, req.user.id]
      )
      if (rows.length === 0) return res.status(404).json({ error: 'Подписка не найдена' })
      res.json(rows[0])
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  /** GET /api/subscriptions/:id/history */
  router.get('/:id/history', async (req, res) => {
    try {
      const history = await getSubscriptionHistory(req.params.id, req.user.id)
      res.json(history)
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  return router
}
