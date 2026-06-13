// ProviderLogger — расширенное логирование всех запросов к провайдерам
// Фиксирует: URL, метод, заголовки (без токенов), тело запроса,
// статус ответа, заголовки ответа, тело ответа, длительность, ошибки

export default class ProviderLogger {
  constructor(providerCode) {
    this.providerCode = providerCode
    this.logs = []
  }

  /**
   * Санитизация заголовков — убираем токены и пароли
   */
  _sanitizeHeaders(headers) {
    const sanitized = { ...headers }
    const sensitive = ['authorization', 'cookie', 'set-cookie', 'x-api-key']
    for (const key of Object.keys(sanitized)) {
      if (sensitive.includes(key.toLowerCase())) {
        sanitized[key] = '***'
      }
    }
    return sanitized
  }

  /**
   * Обрезает тело до разумного размера (50KB)
   */
  _truncateBody(body) {
    if (!body) return body
    const str = typeof body === 'string' ? body : JSON.stringify(body)
    if (str.length > 51200) return str.slice(0, 51200) + '...[truncated]'
    return body
  }

  /**
   * Логирует запрос к провайдеру
   * @param {object} params
   * @param {string} params.method - HTTP метод
   * @param {string} params.url - полный URL запроса
   * @param {object} params.requestHeaders - заголовки запроса
   * @param {any} params.requestBody - тело запроса
   * @param {number} params.status - HTTP статус ответа
   * @param {object} params.responseHeaders - заголовки ответа
   * @param {any} params.responseBody - тело ответа (или ошибка)
   * @param {number} params.durationMs - длительность в мс
   * @param {string} params.operation - операция (validate, pay, status...)
   * @param {string|null} params.error - текст ошибки, если была
   * @returns {object} запись лога
   */
  log(params) {
    const entry = {
      provider_code: this.providerCode,
      operation: params.operation || 'unknown',
      method: params.method || 'POST',
      url: params.url || '',
      request_headers: this._sanitizeHeaders(params.requestHeaders || {}),
      request_body: this._truncateBody(params.requestBody),
      response_status: params.status || 0,
      response_headers: this._sanitizeHeaders(params.responseHeaders || {}),
      response_body: this._truncateBody(params.responseBody),
      duration_ms: params.durationMs || 0,
      error: params.error || null,
      timestamp: new Date().toISOString(),
    }

    this.logs.push(entry)

    // Вывод в консоль для оперативного мониторинга
    const statusIcon = entry.response_status >= 200 && entry.response_status < 300 ? '✅' : '❌'
    const duration = entry.duration_ms > 1000
      ? `${(entry.duration_ms / 1000).toFixed(2)}s`
      : `${entry.duration_ms}ms`
    console.log(
      `[${this.providerCode}] ${statusIcon} ${entry.operation} ` +
      `${entry.method} ${entry.url} → ${entry.response_status} (${duration})` +
      (entry.error ? ` ERROR: ${entry.error}` : '')
    )

    return entry
  }

  /**
   * Логирует ошибку без ответа (таймаут, сетевые ошибки)
   */
  logError(params) {
    return this.log({
      ...params,
      status: params.status || 0,
      responseBody: params.responseBody || null,
      error: params.error || 'Network error',
    })
  }

  /**
   * Возвращает все записи лога
   */
  getAll() {
    return [...this.logs]
  }

  /**
   * Очищает лог
   */
  clear() {
    this.logs = []
  }

  /**
   * Возвращает последнюю запись
   */
  getLast() {
    return this.logs[this.logs.length - 1] || null
  }
}
