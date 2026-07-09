// ─── ResponseParser — парсинг ответов внешних провайдеров ─────
// JSONPath / dot-нотация
// ───────────────────────────────────────────────────────────────

export class ProviderError extends Error {
  constructor(code, message, httpStatus, retryable = false, durationMs = 0) {
    super(message)
    this.name = 'ProviderError'
    this.code = code
    this.httpStatus = httpStatus
    this.retryable = retryable
    this.durationMs = durationMs
  }
}

/**
 * Извлекает значение из объекта по JSONPath или dot-нотации.
 * @example extractByJsonPath({ data: { voucher: { code: "ABC" } } }, "$.data.voucher.code") → "ABC"
 */
export function extractByJsonPath(obj, path) {
  if (!path) return undefined
  // Убираем "$." если есть
  const cleanPath = path.replace(/^\$\.?/, '')
  return cleanPath
    .split('.')
    .reduce((acc, key) => (acc != null ? acc[key] : undefined), obj)
}

/**
 * Разбирает ответ провайдера по mapping-конфигу.
 */
export function parseProviderResponse(responseBody, mapping) {
  if (!mapping) {
    return { is_success: true, external_id: null, result_value: null, raw_body: responseBody }
  }

  const { success_path, success_value, external_id_path, result_path } = mapping

  const isSuccess = success_path
    ? String(extractByJsonPath(responseBody, success_path)) === String(success_value)
    : true

  const externalId = extractByJsonPath(responseBody, external_id_path)
  const resultValue = extractByJsonPath(responseBody, result_path)

  return {
    is_success: isSuccess,
    external_id: externalId !== undefined ? String(externalId) : null,
    result_value: resultValue !== undefined ? String(resultValue) : null,
    raw_body: responseBody,
  }
}

/**
 * Экранирование user input перед отправкой поставщику.
 */
export function sanitizeUserInput(value, fieldType) {
  let sanitized = String(value || '').trim()
  // XSS prevention
  sanitized = sanitized.replace(/<[^>]*>/g, '')
  // Control characters
  sanitized = sanitized.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '')
  // Type-specific
  if (fieldType === 'email') sanitized = sanitized.toLowerCase()
  if (fieldType === 'tel') sanitized = sanitized.replace(/[^+0-9\-\s()]/g, '')
  return sanitized
}

/**
 * Маскирование sensitive данных в логах.
 */
export function maskSensitiveData(data, fields = ['password', 'token', 'api_key', 'secret']) {
  if (typeof data === 'string') {
    if (data.length > 6) return data.slice(0, 3) + '***' + data.slice(-3)
    return '***'
  }
  if (typeof data === 'object' && data !== null) {
    const masked = Array.isArray(data) ? [...data] : { ...data }
    for (const key of Object.keys(masked)) {
      if (fields.includes(key)) {
        masked[key] = maskSensitiveData(masked[key], fields)
      } else if (typeof masked[key] === 'object' && masked[key] !== null) {
        masked[key] = maskSensitiveData(masked[key], fields)
      }
    }
    return masked
  }
  return data
}
