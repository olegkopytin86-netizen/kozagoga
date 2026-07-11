// ─── IdempotencyMiddleware — защита от дублей webhook ────
// FR-DELIVERY-06, уровень 1: idempotency_key на payments
// ─────────────────────────────────────────────────────────────

/**
 * Middleware для защиты webhook от повторной обработки.
 * Использует уникальный ключ из тела запроса + таблицу payments.idempotency_key.
 *
 * Использование:
 *   app.post('/api/payments/webhook/sberbank',
 *     createIdempotencyMiddleware({ keySource: (req) => `${req.body.mdOrder}_${req.body.operation}` }),
 *     handler)
 *
 * @param {object} options
 * @param {function} options.keySource — функция, возвращающая строку-ключ из req
 * @param {number} [options.statusCode=200] — HTTP статус при дубликате
 */
export default function createIdempotencyMiddleware(options = {}) {
  const { keySource, statusCode = 200 } = options

  if (typeof keySource !== 'function') {
    throw new Error('[IdempotencyMiddleware] keySource function is required')
  }

  return async (req, res, next) => {
    try {
      const idempotencyKey = keySource(req)

      if (!idempotencyKey) {
        // Если ключ не сформирован — пропускаем (старый формат запроса)
        return next()
      }

      // Проверяем, существует ли уже такой ключ
      const pool = req.app.locals?.pool || req.pool
      if (!pool) {
        console.warn('[IdempotencyMiddleware] pool not found in req, skipping')
        return next()
      }

      const { rows } = await pool.query(
        'SELECT id FROM payments WHERE idempotency_key = $1 LIMIT 1',
        [idempotencyKey]
      )

      if (rows.length > 0) {
        // Уже обработан — возвращаем success без повторной обработки
        console.log(`[IdempotencyMiddleware] Duplicate webhook key=${idempotencyKey}, skipping`)
        return res.status(statusCode).json({ received: true, duplicate: true })
      }

      // Сохраняем ключ в req для использования в обработчике
      req.idempotencyKey = idempotencyKey
      next()
    } catch (err) {
      console.error('[IdempotencyMiddleware] Error:', err.message)
      // При ошибке проверки — пропускаем, чтобы не блокировать webhook
      next()
    }
  }
}
