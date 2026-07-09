// ─── ProviderHttpClient — HTTP-клиент с circuit breaker и retry ─
// Использует встроенный fetch (Node 18+)
// ───────────────────────────────────────────────────────────────

import { ProviderError } from './ResponseParser.js'

export class ProviderHttpClient {
  constructor(providerConfig) {
    this.providerConfig = providerConfig
    this.circuitState = 'closed'     // 'closed' | 'open' | 'half-open'
    this.failureCount = 0
    this.lastFailureTime = 0
  }

  async request({ method, url, headers, body, timeout, idempotencyKey }) {
    // Circuit breaker check
    if (this.circuitState === 'open') {
      const cooldown = this.providerConfig.circuit_breaker?.cooldown_ms || 30000
      if (Date.now() - this.lastFailureTime < cooldown) {
        throw new ProviderError(
          'CIRCUIT_OPEN',
          `Provider ${this.providerConfig.provider_code} is circuit-broken`,
          undefined,
          false,
          0
        )
      }
      this.circuitState = 'half-open'
    }

    const controller = new AbortController()
    const timeoutId = timeout
      ? setTimeout(() => controller.abort(), timeout)
      : null

    const startTime = Date.now()
    try {
      const requestHeaders = {
        'Content-Type': 'application/json',
        ...(this.providerConfig.default_headers || {}),
        ...(headers || {}),
      }

      const fetchOptions = {
        method: method.toUpperCase(),
        headers: requestHeaders,
        signal: controller.signal,
      }

      if (body && method.toUpperCase() !== 'GET') {
        fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body)
      }

      const response = await fetch(url, fetchOptions)

      if (timeoutId) clearTimeout(timeoutId)

      let responseData
      const contentType = response.headers.get('content-type') || ''
      if (contentType.includes('application/json')) {
        responseData = await response.json()
      } else {
        responseData = await response.text()
      }

      this.failureCount = 0
      this.circuitState = 'closed'

      return {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseData,
        durationMs: Date.now() - startTime,
      }
    } catch (error) {
      if (timeoutId) clearTimeout(timeoutId)
      this.failureCount++
      this.lastFailureTime = Date.now()

      const threshold = this.providerConfig.circuit_breaker?.failure_threshold || 5
      if (this.failureCount >= threshold) {
        this.circuitState = 'open'
      }

      throw this._normalizeError(error, Date.now() - startTime)
    }
  }

  _normalizeError(error, durationMs) {
    if (error instanceof ProviderError) return error

    if (error.name === 'AbortError') {
      return new ProviderError('TIMEOUT', 'Request timed out', undefined, true, durationMs)
    }
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return new ProviderError('CONNECTION_ERROR', `Network error: ${error.message}`, undefined, true, durationMs)
    }
    return new ProviderError('UNKNOWN', error.message, undefined, false, durationMs)
  }

  getCircuitState() {
    return { circuitState: this.circuitState, failureCount: this.failureCount }
  }
}
