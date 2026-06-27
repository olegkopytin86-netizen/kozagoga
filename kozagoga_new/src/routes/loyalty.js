// ─── Loyalty Routes ──────────────────────────────────────
// Программа лояльности: уровень, прогресс, бенефиты
// (SRS Модуль 10)
// ─────────────────────────────────────────────────────────

import { Router } from 'express'
import { getPool } from '../lib/pool.js'

const pool = getPool()

export default function createLoyaltyRouter() {
  const router = Router()

  /** GET /api/profile/loyalty — текущий уровень + прогресс */
  router.get('/profile/loyalty', async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Требуется авторизация' })

      const { rows: levels } = await pool.query(
        'SELECT * FROM loyalty_levels ORDER BY sort_order'
      )

      const { rows: userLoyalty } = await pool.query(
        'SELECT * FROM user_loyalty WHERE user_id = $1',
        [req.user.id]
      )

      // Вычисляем spent из заказов
      const { rows: spentRows } = await pool.query(
        "SELECT COALESCE(SUM(total), 0) AS total_spent FROM orders WHERE user_id = $1 AND status = 'completed'",
        [req.user.id]
      )
      const totalSpent = parseFloat(spentRows[0]?.total_spent || 0)

      let currentLevel = levels[0]
      let nextLevel = null
      let progress = 1.0

      for (let i = levels.length - 1; i >= 0; i--) {
        if (totalSpent >= parseFloat(levels[i].min_spent)) {
          currentLevel = levels[i]
          nextLevel = levels[i + 1] || null
          break
        }
      }

      if (nextLevel) {
        const currentMin = parseFloat(currentLevel.min_spent)
        const nextMin = parseFloat(nextLevel.min_spent)
        progress = Math.min(1, (totalSpent - currentMin) / (nextMin - currentMin))
      }

      res.json({
        level: currentLevel,
        next_level: nextLevel,
        total_spent: totalSpent,
        progress: Math.round(progress * 100) / 100,
        spent_to_next: nextLevel ? Math.max(0, parseFloat(nextLevel.min_spent) - totalSpent) : 0,
        active_from: userLoyalty[0]?.level_changed_at || null,
      })
    } catch (err) {
      console.error('[loyalty] GET error:', err)
      res.status(500).json({ error: 'Ошибка получения информации о лояльности' })
    }
  })

  /** GET /api/admin/loyalty/levels — управление уровнями */
  router.get('/admin/loyalty/levels', async (req, res) => {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Недостаточно прав' })
    const { rows } = await pool.query('SELECT * FROM loyalty_levels ORDER BY sort_order')
    res.json(rows)
  })

  router.put('/admin/loyalty/levels/:id', async (req, res) => {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Недостаточно прав' })
    const allowed = ['name', 'min_spent', 'cashback_rate', 'discount_percent', 'free_delivery', 'priority_support', 'early_access', 'badge_icon', 'color_hex']
    const updates = []
    const params = []
    let idx = 1
    for (const f of allowed) {
      if (req.body[f] !== undefined) {
        updates.push(`${f} = $${idx++}`)
        params.push(req.body[f])
      }
    }
    if (updates.length === 0) return res.status(400).json({ error: 'Нет полей' })
    params.push(req.params.id)
    const { rows } = await pool.query(`UPDATE loyalty_levels SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`, params)
    res.json(rows[0] || { error: 'Не найден' })
  })

  return router
}
