// ─── Subscription Service ────────────────────────────────
// Подписки: создание, управление, автопродление
// (SRS Модуль 5)
// ─────────────────────────────────────────────────────────

import { getPool } from '../lib/pool.js'

const pool = getPool()

function calcPeriodEnd(start, interval, count = 1) {
  const d = new Date(start)
  switch (interval) {
    case 'month': d.setMonth(d.getMonth() + count); break
    case 'quarter': d.setMonth(d.getMonth() + count * 3); break
    case 'year': d.setFullYear(d.getFullYear() + count); break
  }
  return d
}

/**
 * Создать подписку
 */
export async function createSubscription(userId, productId, variantId, { price, currency, billingInterval, billingCount = 1, trialDays = 0 }) {
  const now = new Date()
  const periodStart = trialDays > 0 ? new Date(now.getTime() + trialDays * 86400000) : now
  const periodEnd = calcPeriodEnd(periodStart, billingInterval, billingCount)

  const { rows } = await pool.query(
    `INSERT INTO subscriptions (user_id, product_id, variant_id, status,
       current_period_start, current_period_end, trial_end,
       price, currency, billing_interval, billing_count, next_renewal_at)
     VALUES ($1, $2, $3, 'active', $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [userId, productId, variantId,
     periodStart, periodEnd, trialDays > 0 ? new Date(now.getTime() + trialDays * 86400000) : null,
     price, currency, billingInterval, billingCount, periodEnd]
  )

  // Лог
  await pool.query(
    `INSERT INTO subscription_events (subscription_id, event_type, amount, currency)
     VALUES ($1, 'created', $2, $3)`,
    [rows[0].id, price, currency]
  )

  return rows[0]
}

/**
 * Отменить подписку
 */
export async function cancelSubscription(subId, userId, reason = 'user') {
  const { rows } = await pool.query(
    `UPDATE subscriptions SET status = 'cancelled', auto_renew = false,
     cancelled_at = NOW(), cancel_reason = $1
     WHERE id = $2 AND user_id = $3 RETURNING *`,
    [reason, subId, userId]
  )
  if (rows.length === 0) return null

  await pool.query(
    `INSERT INTO subscription_events (subscription_id, event_type)
     VALUES ($1, 'cancelled')`,
    [subId]
  )
  return rows[0]
}

/**
 * Приостановить подписку
 */
export async function pauseSubscription(subId, userId) {
  const { rows } = await pool.query(
    `UPDATE subscriptions SET status = 'paused'
     WHERE id = $1 AND user_id = $2 AND status = 'active' RETURNING *`,
    [subId, userId]
  )
  if (rows.length === 0) return null
  return rows[0]
}

/**
 * Возобновить подписку
 */
export async function resumeSubscription(subId, userId) {
  const { rows } = await pool.query(
    `UPDATE subscriptions SET status = 'active'
     WHERE id = $1 AND user_id = $2 AND status = 'paused' RETURNING *`,
    [subId, userId]
  )
  if (rows.length === 0) return null
  return rows[0]
}

/**
 * Автопродление (CRON)
 */
export async function renewSubscription(subId) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const { rows } = await client.query(
      `SELECT * FROM subscriptions WHERE id = $1 FOR UPDATE`,
      [subId]
    )
    if (rows.length === 0) { await client.query('ROLLBACK'); return null }

    const sub = rows[0]
    if (sub.status !== 'active' || !sub.auto_renew) {
      await client.query('ROLLBACK'); return null
    }

    const newEnd = calcPeriodEnd(sub.current_period_end, sub.billing_interval, sub.billing_count)

    await client.query(
      `UPDATE subscriptions SET
        current_period_start = current_period_end,
        current_period_end = $1,
        next_renewal_at = $1,
        renewal_count = renewal_count + 1,
        last_renewal_at = NOW(),
        failed_attempts = 0
       WHERE id = $2`,
      [newEnd, subId]
    )

    await client.query(
      `INSERT INTO subscription_events (subscription_id, event_type, amount, currency)
       VALUES ($1, 'renewed', $2, $3)`,
      [subId, sub.price, sub.currency]
    )

    await client.query('COMMIT')
    return { ...sub, current_period_end: newEnd }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

/**
 * Получить подписки пользователя
 */
export async function getUserSubscriptions(userId) {
  const { rows } = await pool.query(
    `SELECT s.*, p.name AS product_name, p.slug, p.images->>0 AS image_url,
            pv.name AS variant_name
     FROM subscriptions s
     JOIN products p ON p.id = s.product_id
     LEFT JOIN product_variants pv ON pv.id = s.variant_id
     WHERE s.user_id = $1
     ORDER BY s.created_at DESC`,
    [userId]
  )
  return rows
}

/**
 * История событий подписки
 */
export async function getSubscriptionHistory(subId, userId) {
  const { rows } = await pool.query(
    `SELECT * FROM subscription_events
     WHERE subscription_id = $1
     ORDER BY created_at DESC LIMIT 50`,
    [subId]
  )
  return rows
}
