// ============================================
// Валидация и санитизация
// Единый модуль для всех admin- и user-эндпоинтов
// ============================================

/**
 * Экранирует HTML-спецсимволы, предотвращая XSS
 */
export function sanitizeHtml(str) {
  if (typeof str !== 'string') return str
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

/**
 * Удаляет потенциально опасные HTML-теги и атрибуты из строки
 * Позволяет обычный текст, вырезает <script>, onclick, onerror, javascript: и т.д.
 */
export function stripDangerousTags(str) {
  if (typeof str !== 'string') return str
  return str
    // Удаляем <script>...</script>
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Удаляем on* атрибуты
    .replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    // Удаляем javascript: протокол
    .replace(/javascript\s*:/gi, '')
    // Удаляем data: протокол (кроме безопасных)
    .replace(/data\s*:\s*(?:text\/html|text\/javascript|application\/)/gi, '')
    // Удаляем <iframe>, <embed>, <object>, <style>
    .replace(/<\/?(?:iframe|embed|object|style|form|input|textarea|select|option|button|link|meta|base)\b[^>]*>/gi, '')
}

/**
 * Валидация slug: только латиница, цифры, дефисы, подчёркивания
 */
export function isValidSlug(slug) {
  if (typeof slug !== 'string') return false
  return /^[a-z0-9][a-z0-9_-]*$/i.test(slug) && slug.length <= 200 && !slug.includes('--') && !slug.includes('..')
}

/**
 * Валидация email
 */
export function isValidEmail(email) {
  if (typeof email !== 'string') return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254
}

/**
 * Нормализует slug (lowercase, заменяет пробелы и спецсимволы)
 */
export function normalizeSlug(slug) {
  if (typeof slug !== 'string') return ''
  return slug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9а-яё\s_-]/g, '')
    .replace(/[\s]+/g, '-')
    .replace(/[а-яё]/g, c => {
      // Транслитерация кириллицы
      const map = {
        'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'e','ж':'zh','з':'z',
        'и':'i','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r',
        'с':'s','т':'t','у':'u','ф':'f','х':'kh','ц':'ts','ч':'ch','ш':'sh','щ':'shch',
        'ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya',
      }
      return map[c] || c
    })
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Валидация цены: 0 < price <= MAX_PRICE
 */
export function isValidPrice(price) {
  if (price === undefined || price === null) return false
  const num = Number(price)
  return !isNaN(num) && isFinite(num) && num >= 0 && num <= 999999.99 && /^\d+(\.\d{1,2})?$/.test(String(num))
}

/**
 * Валидация имени: не пустое, разумная длина
 */
export function isValidName(name) {
  if (typeof name !== 'string') return false
  return name.trim().length > 0 && name.trim().length <= 255
}

/**
 * Валидация описания: разумная длина
 */
export function isValidDescription(desc) {
  if (typeof desc !== 'string') return false
  return desc.length <= 10000
}

/**
 * Безопасное округление цены до 2 знаков (защита от bigint overflow)
 */
export function sanitizePrice(price) {
  if (price === undefined || price === null) return null
  const num = Number(price)
  if (!isFinite(num) || isNaN(num)) return null
  // PostgreSQL NUMERIC(10,2) выдерживает до 99,999,999.99
  if (num < 0) return 0
  if (num > 99999999.99) return 99999999.99
  // Округляем до 2 знаков как число, не строку
  return Math.round(num * 100) / 100
}

/**
 * Санитизация строки для БД (безопасная длина)
 */
export function truncateStr(str, maxLength = 255) {
  if (typeof str !== 'string') return str
  return str.slice(0, maxLength)
}

/**
 * Убирает серверные пути из сообщений об ошибках
 */
export function sanitizeErrorMessage(msg) {
  if (typeof msg !== 'string') return 'Внутренняя ошибка сервера'
  // Убираем пути вида /root/..., /home/..., /var/...
  return msg
    .replace(/(\/[a-zA-Z0-9_/. -]+)+/g, '')
    .replace(/\s+/g, ' ')
    .trim() || 'Внутренняя ошибка сервера'
}

/**
 * Комплексная санитизация текстового поля (XSS-safe)
 */
export function sanitizeTextField(value, maxLength = 255) {
  if (typeof value !== 'string') return value
  let cleaned = truncateStr(value, maxLength)
  cleaned = stripDangerousTags(cleaned)
  cleaned = sanitizeHtml(cleaned)
  return cleaned
}

export default {
  sanitizeHtml,
  stripDangerousTags,
  isValidSlug,
  isValidEmail,
  normalizeSlug,
  isValidPrice,
  isValidName,
  isValidDescription,
  sanitizePrice,
  truncateStr,
  sanitizeErrorMessage,
  sanitizeTextField,
}
