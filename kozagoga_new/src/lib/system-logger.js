// ============================================
// System Logger
// Запись структурированных логов в system_logs
// ============================================

/**
 * Создаёт логгер, привязанный к пулу соединений
 * @param {import('pg').Pool} pool
 */
export function createSystemLogger(pool) {
  /**
   * Запись системного лога
   */
  async function log(level, component, message, details = {}) {
    try {
      const { user_id, ip, request_id, duration_ms } = details
      await pool.query(
        `INSERT INTO system_logs (level, component, message, details, request_id, user_id, ip, duration_ms)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          level || 'info',
          component || 'system',
          typeof message === 'string' ? message.slice(0, 2000) : String(message).slice(0, 2000),
          JSON.stringify(details),
          request_id || null,
          user_id || null,
          ip || null,
          duration_ms || null,
        ]
      )
    } catch (err) {
      // Не роняем приложение из-за ошибки логирования
      console.error('[system-logger] Ошибка записи лога:', err.message)
    }
  }

  /**
   * Middleware Express — логирование входящих запросов
   */
  function middleware(req, res, next) {
    const start = Date.now()

    // Логируем ответ после завершения
    res.on('finish', () => {
      const duration = Date.now() - start

      // Логируем все запросы, сэмплинг для успешных быстрых
      // Пропускаем healthcheck (шум)
      const skipPaths = ['/api/health', '/favicon', '/assets/', '/src/']
      if (skipPaths.some(p => req.path.startsWith(p))) return

      // Для успешных быстрых запросов — сэмплинг 5%
      const isHealthy = res.statusCode < 400 && duration < 1000
      if (isHealthy && Math.random() > 0.05) return

      if (true) {
        const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info'
        log(
          level,
          'http',
          `${req.method} ${req.path} → ${res.statusCode} (${duration}ms)`,
          {
            method: req.method,
            path: req.path,
            status: res.statusCode,
            duration_ms: duration,
            user_id: req.user?.id || req.admin?.id || null,
            ip: req.ip || req.headers['x-forwarded-for'] || null,
            request_id: req.headers['x-request-id'] || null,
          }
        )
      }
    })

    next()
  }

  middleware.log = log
  return middleware
}

/**
 * Shortcuts для удобного логирования
 */
export function createLogger(pool) {
  const logger = createSystemLogger(pool)
  return {
    log: logger.log,
    middleware: logger.middleware,
    error: (component, message, details = {}) => logger.log('error', component, message, details),
    warn: (component, message, details = {}) => logger.log('warn', component, message, details),
    info: (component, message, details = {}) => logger.log('info', component, message, details),
    debug: (component, message, details = {}) => logger.log('debug', component, message, details),
  }
}

export default { createSystemLogger, createLogger }
