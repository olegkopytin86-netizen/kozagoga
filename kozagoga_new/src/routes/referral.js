// ─── Referral Routes ─────────────────────────────────────
// Реферальная программа: код, статистика, бонусы
// (SRS Модуль 9)
// ─────────────────────────────────────────────────────────

import { Router } from 'express'
import { getPool } from '../lib/pool.js'

const pool = getPool()

export default function createReferralRouter() {
  const router = Router()

  /** GET /api/profile/referral — код + статистика */
  router.get('/profile/referral', async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Требуется авторизация' })

      // Получаем или создаём реферальный код
      let { rows: codes } = await pool.query(
        'SELECT * FROM referral_codes WHERE user_id = $1',
        [req.user.id]
      )

      if (codes.length === 0) {
        const { rows: users } = await pool.query(
          'SELECT email FROM users WHERE id = $1',
          [req.user.id]
        )
        const name = (users[0]?.email || 'USER').split('@')[0].toUpperCase()

        const { rows: newCodes } = await pool.query(
          `INSERT INTO referral_codes (user_id, code)
           VALUES ($1, upper(substr($2, 1, 4)) || '-' || upper(substr(md5(random()::text), 1, 6)))
           RETURNING *`,
          [req.user.id, name]
        )
        codes = newCodes
      }

      const code = codes[0]

      // Статистика приглашённых
      const { rows: invites } = await pool.query(
        `SELECT r.id, r.status, r.created_at, r.reward_amount, r.reward_given,
                u.email AS referred_email
         FROM referrals r
         JOIN users u ON u.id = r.referred_id
         WHERE r.referrer_id = $1
         ORDER BY r.created_at DESC
         LIMIT 50`,
        [req.user.id]
      )

      res.json({
        code: code.code,
        referral_count: code.referral_count,
        total_earned: code.total_earned,
        referral_link: `${req.protocol}://${req.get('host')}/ref/${code.code}`,
        invites,
      })
    } catch (err) {
      console.error('[referral] GET error:', err)
      res.status(500).json({ error: 'Ошибка получения реферальной информации' })
    }
  })

  /** GET /api/referral/:code — публичная информация о коде (для landing) */
  router.get('/referral/:code', async (req, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT rc.code, rc.referral_count
         FROM referral_codes rc
         JOIN users u ON u.id = rc.user_id
         WHERE rc.code = $1
         LIMIT 1`,
        [req.params.code]
      )

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Код не найден' })
      }

      res.json({ valid: true, code: rows[0].code, referrals: rows[0].referral_count })
    } catch (err) {
      console.error('[referral] GET code error:', err)
      res.status(500).json({ error: 'Ошибка проверки кода' })
    }
  })

  /** GET /api/admin/referrals — статистика (админ) */
  router.get('/admin/referrals', async (req, res) => {
    try {
      if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Недостаточно прав' })

      const { rows } = await pool.query(
        `SELECT
          COUNT(*) AS total_referrals,
          COUNT(*) FILTER (WHERE status = 'rewarded') AS rewarded,
          COALESCE(SUM(reward_amount), 0) AS total_paid
         FROM referrals`
      )

      res.json(rows[0])
    } catch (err) {
      console.error('[referral] admin stats error:', err)
      res.status(500).json({ error: 'Ошибка статистики' })
    }
  })

  return router
}
