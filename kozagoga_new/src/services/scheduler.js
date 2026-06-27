// ─── Scheduler — CRON задачи ─────────────────────────────
// Автопродление подписок, напоминания
// (SRS SUB-5.1, SUB-5.2, SUB-5.3)
// ─────────────────────────────────────────────────────────

import cron from 'node-cron'
import { getPool } from '../lib/pool.js'
import { renewSubscription } from '../services/subscription-service.js'

const pool = getPool()

let initialized = false

export function initScheduler() {
  if (initialized) return
  initialized = true

  // Каждый час — автопродление подписок
  cron.schedule('0 * * * *', async () => {
    console.log('[scheduler] Checking subscriptions for renewal...')
    try {
      const { rows } = await pool.query(
        `SELECT id FROM subscriptions
         WHERE status = 'active' AND auto_renew = true
           AND next_renewal_at <= NOW()
         LIMIT 50`
      )

      for (const row of rows) {
        try {
          await renewSubscription(row.id)
          console.log(`[scheduler] Renewed subscription ${row.id}`)
        } catch (err) {
          console.error(`[scheduler] Renewal failed for ${row.id}:`, err.message)
          // Increment failed attempts
          await pool.query(
            `UPDATE subscriptions SET failed_attempts = failed_attempts + 1
             WHERE id = $1`,
            [row.id]
          )
        }
      }

      if (rows.length > 0) {
        console.log(`[scheduler] Renewed ${rows.length} subscriptions`)
      }
    } catch (err) {
      console.error('[scheduler] Error:', err)
    }
  })

  // Каждый день в 10:00 — напоминания
  cron.schedule('0 10 * * *', async () => {
    console.log('[scheduler] Sending renewal reminders...')
    try {
      // За 3 дня до окончания
      const { rows } = await pool.query(
        `SELECT s.*, u.email, p.name AS product_name
         FROM subscriptions s
         JOIN users u ON u.id = s.user_id
         JOIN products p ON p.id = s.product_id
         WHERE s.status = 'active'
           AND s.next_renewal_at BETWEEN NOW() AND NOW() + INTERVAL '3 days'`
      )

      for (const sub of rows) {
        console.log(`[scheduler] Reminder for ${sub.email}: ${sub.product_name} renews at ${sub.next_renewal_at}`)
        // Здесь можно добавить отправку email
      }
    } catch (err) {
      console.error('[scheduler] Reminder error:', err)
    }
  })

  console.log('[scheduler] Initialized')
}
