import { describe, it, expect } from 'vitest'

describe('ProviderLogger', () => {
  it('должен логировать запрос с полными данными', async () => {
    const { default: ProviderLogger } = await import('../lib/providers/provider-logger.js')
    const logger = new ProviderLogger('test-provider')

    const entry = logger.log({
      operation: 'validate',
      method: 'POST',
      url: 'https://api.test.com/Process',
      requestHeaders: { 'Content-Type': 'application/json', Authorization: 'Bearer secret123' },
      requestBody: { requisite: '996555333', amount: 150 },
      status: 200,
      responseHeaders: { 'content-type': 'application/json' },
      responseBody: { result: 'exist', possible: true },
      durationMs: 1243,
      error: null,
    })

    expect(entry.provider_code).toBe('test-provider')
    expect(entry.operation).toBe('validate')
    expect(entry.url).toBe('https://api.test.com/Process')
    expect(entry.duration_ms).toBe(1243)
    expect(entry.request_headers.Authorization).toBe('***')
    expect(entry.response_body.result).toBe('exist')
    expect(entry.error).toBeNull()
  })

  it('должен логировать ошибку', async () => {
    const { default: ProviderLogger } = await import('../lib/providers/provider-logger.js')
    const logger = new ProviderLogger('test-provider')

    const entry = logger.logError({
      operation: 'pay',
      method: 'POST',
      url: 'https://api.test.com/Process',
      requestBody: { amount: 150 },
      durationMs: 5000,
      error: 'Connection timeout',
    })

    expect(entry.error).toBe('Connection timeout')
    expect(entry.response_status).toBe(0)
    expect(entry.status).toBeUndefined()
  })

  it('должен возвращать последний лог', async () => {
    const { default: ProviderLogger } = await import('../lib/providers/provider-logger.js')
    const logger = new ProviderLogger('test')

    logger.log({ operation: 'op1', url: 'url1', durationMs: 100, requestBody: {}, status: 200, responseBody: {} })
    logger.log({ operation: 'op2', url: 'url2', durationMs: 200, requestBody: {}, status: 200, responseBody: {} })

    const last = logger.getLast()
    expect(last.operation).toBe('op2')
    expect(last.url).toBe('url2')
  })

  it('должен возвращать все логи', async () => {
    const { default: ProviderLogger } = await import('../lib/providers/provider-logger.js')
    const logger = new ProviderLogger('test')

    logger.log({ operation: 'a', url: 'u1', durationMs: 1, requestBody: {}, status: 200, responseBody: {} })
    logger.log({ operation: 'b', url: 'u2', durationMs: 2, requestBody: {}, status: 200, responseBody: {} })

    const all = logger.getAll()
    expect(all).toHaveLength(2)
  })

  it('должен очищать лог', async () => {
    const { default: ProviderLogger } = await import('../lib/providers/provider-logger.js')
    const logger = new ProviderLogger('test')

    logger.log({ operation: 'a', url: 'u1', durationMs: 1, requestBody: {}, status: 200, responseBody: {} })
    logger.clear()
    expect(logger.getAll()).toHaveLength(0)
  })

  it('должен обрезать тело больше 50KB', async () => {
    const { default: ProviderLogger } = await import('../lib/providers/provider-logger.js')
    const logger = new ProviderLogger('test')

    const bigBody = { data: 'x'.repeat(60000) }
    const entry = logger.log({
      operation: 'big',
      url: 'url',
      durationMs: 1,
      requestBody: bigBody,
      status: 200,
      responseBody: { ok: true },
    })

    expect(entry.request_body.length).toBeLessThanOrEqual(51250)
  })
})
