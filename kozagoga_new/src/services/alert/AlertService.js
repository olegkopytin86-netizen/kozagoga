// ─── AlertService — система оповещений админов ────────────
// FR-DELIVERY-08: создание алертов, отправка в Telegram,
// сохранение в alerts, управление статусами.
// ─────────────────────────────────────────────────────────────

const ALERT_TYPES = [
  'provider_delivery_failed',
  'provider_payment_failed',
  'polling_timeout',
  'refund_failed',
] // автозакрытие

const PRIORITIES = ['high', 'critical']

export default class AlertService {
  /**
   * @param {object} pool - pg pool
   * @param {object} options
   * @param {string} [options.telegramBotToken] — токен бота для Telegram
   * @param {string|number} [options.telegramChatId] — ID чата админа
   */
  constructor(pool, options = {}) {
    this.pool = pool
    this.telegramBotToken = options.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN
    this.telegramChatId = options.telegramChatId || process.env.TELEGRAM_ADMIN_CHAT_ID
  }

  /**
   * Создаёт алерт и отправляет в активные каналы
   * @param {'provider_delivery_failed'|'provider_payment_failed'|'polling_timeout'|'refund_failed'} type
   * @param {object} payload
   * @param {number} payload.order_id
   * @param {string} [payload.transaction_id]
   * @param {string} [payload.provider_code]
   * @param {string} payload.message
   * @param {'high'|'critical'} [payload.priority='high']
   * @returns {Promise<object>} created alert row
   */
  async createAlert(type, payload) {
    if (!ALERT_TYPES.includes(type)) {
      throw new Error(`[AlertService] Неизвестный тип алерта: ${type}`)
    }

    const priority = PRIORITIES.includes(payload.priority) ? payload.priority : 'high'

    // Сохраняем в БД
    const { rows } = await this.pool.query(
      `INSERT INTO alerts (type, priority, order_id, transaction_id, provider_code, message, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'new')
       RETURNING *`,
      [
        type,
        priority,
        payload.order_id || null,
        payload.transaction_id || null,
        payload.provider_code || null,
        payload.message || '',
      ]
    )

    const alert = rows[0]

    // Отправка в Telegram (P0 канал)
    if (this.telegramBotToken && this.telegramChatId) {
      try {
        await this._sendTelegram(alert)
        await this.pool.query(
          `UPDATE alerts SET status = 'sent' WHERE id = $1`,
          [alert.id]
        )
        alert.status = 'sent'
      } catch (err) {
        console.error(`[AlertService] Telegram send failed for alert #${alert.id}:`, err.message)
      }
    }

    return alert
  }

  /**
   * Пометить алерт как resolved
   */
  async resolveAlert(alertId, resolvedBy = null) {
    const { rows } = await this.pool.query(
      `UPDATE alerts SET status = 'resolved', resolved_at = NOW(), resolved_by = $2
       WHERE id = $1 RETURNING *`,
      [alertId, resolvedBy]
    )
    return rows[0] || null
  }

  /**
   * Получить нерешённые алерты
   */
  async getPendingAlerts(priority = null) {
    const query = priority
      ? `SELECT * FROM alerts WHERE status IN ('new', 'sent') AND priority = $1 ORDER BY created_at DESC`
      : `SELECT * FROM alerts WHERE status IN ('new', 'sent') ORDER BY created_at DESC`

    const params = priority ? [priority] : []
    const { rows } = await this.pool.query(query, params)
    return rows
  }

  /**
   * Отправка в Telegram через бота
   */
  async _sendTelegram(alert) {
    if (!this.telegramBotToken || !this.telegramChatId) return

    const emojiMap = {
      provider_delivery_failed: '🔴',
      provider_payment_failed: '⚠️',
      polling_timeout: '🚨',
      refund_failed: '💥',
    }

    const emoji = emojiMap[alert.type] || '🔔'
    const priorityLabel = alert.priority === 'critical' ? '🔴 CRITICAL' : '🟡 HIGH'

    const text = [
      `${emoji} *${priorityLabel}* — ${alert.type}`,
      '',
      `ID: \`#${alert.id}\``,
      `Order: \`${alert.order_id || '—'}\``,
      alert.transaction_id ? `Transaction: \`${alert.transaction_id}\`` : null,
      alert.provider_code ? `Provider: \`${alert.provider_code}\`` : null,
      '',
      `Message: ${alert.message}`,
      `Created: ${alert.created_at}`,
    ]
      .filter(Boolean)
      .join('\n')

    const url = `https://api.telegram.org/bot${this.telegramBotToken}/sendMessage`

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: this.telegramChatId,
        text,
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
      }),
    })

    if (!response.ok) {
      const errBody = await response.text()
      throw new Error(`Telegram API error ${response.status}: ${errBody.slice(0, 200)}`)
    }
  }
}
