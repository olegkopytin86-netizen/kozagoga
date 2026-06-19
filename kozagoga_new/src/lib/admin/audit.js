// ============================================
// Admin Audit Logger
// Автоматическая запись действий админа в admin_logs
// ============================================
// Использование:
//   import { audit } from './lib/admin/audit.js'
//   app.use(audit(pool))
//   Или вручную: await audit.log(req, 'category.create', { category_id: id })
// ============================================

/**
 * Создаёт middleware для аудита админских действий
 * @param {import('pg').Pool} pool
 */
export function createAuditMiddleware(pool) {
  /**
   * Логирует действие админа
   * @param {object} req - Express request
   * @param {string} action - тип действия (entity.action)
   * @param {object} details - детали (JSON-сериализуемые)
   */
  async function log(req, action, details = {}) {
    try {
      const adminId = req.admin?.id
      if (!adminId) return

      // Извлекаем entity_type и entity_id из action или details
      const [entityType = null, entityAction = null] = action.split('.')
      const entityId = details?.entity_id || details?.id || null

      await pool.query(
        `INSERT INTO admin_logs (admin_id, action, entity_type, entity_id, details, ip)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          adminId,
          action,
          entityType || null,
          entityId ? String(entityId) : null,
          JSON.stringify(details),
          req.ip || req.headers['x-forwarded-for'] || null,
        ]
      )
    } catch (err) {
      // Не должны ронять запрос из-за ошибки логирования
      console.error('[admin-audit] Ошибка записи лога:', err.message)
    }
  }

  // Express middleware — автоматически логирует все admin-запросы
  const middleware = (req, res, next) => {
    // Сохраняем оригинальный json для перехвата ответов
    const originalJson = res.json.bind(res)
    res.json = function (body) {
      // Не логируем GET-запросы и ошибки аутентификации
      if (req.method !== 'GET' && req.admin && res.statusCode < 400) {
        const action = deriveAction(req)
        if (action) {
          const details = {
            method: req.method,
            path: req.path,
            params: req.params,
            query: req.query,
            body: sanitizeBody(req.body),
            response_status: res.statusCode,
          }
          log(req, action, details).catch(() => {})
        }
      }
      return originalJson(body)
    }
    next()
  }

  middleware.log = log
  return middleware
}

/**
 * Определяет тип действия на основе HTTP-метода и пути
 */
function deriveAction(req) {
  const path = req.path.replace(/^\/api\/admin\//, '')
  const method = req.method

  // Определяем сущность из пути
  const entityMatch = path.match(/^([a-z-]+)/)
  if (!entityMatch) return null
  const entity = entityMatch[1]

  const actions = {
    POST:   'create',
    PUT:    'update',
    PATCH:  'update',
    DELETE: 'delete',
  }

  return `${entity}.${actions[method] || method.toLowerCase()}`
}

/**
 * Очищает тело запроса от чувствительных данных перед логированием
 */
function sanitizeBody(body) {
  if (!body || typeof body !== 'object') return body
  const sanitized = { ...body }
  const sensitiveFields = ['password', 'password_hash', 'token', 'secret', 'key', 'authorization']
  for (const field of sensitiveFields) {
    if (field in sanitized) sanitized[field] = '***'
  }
  return sanitized
}

export default { createAuditMiddleware }
