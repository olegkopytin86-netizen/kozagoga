import { describe, it, expect, beforeAll } from 'vitest'

describe('config-loader', () => {
  let config

  beforeAll(async () => {
    // Clear require cache
    const mod = await import('../lib/config-loader.js')
    config = mod
  })

  it('должен загрузить конфигурацию из YAML', () => {
    const cfg = config.getConfig()
    expect(cfg).toBeDefined()
    expect(cfg.providers).toBeDefined()
    expect(cfg.polling).toBeDefined()
    expect(cfg.payment_gateways).toBeDefined()
    expect(cfg.cache).toBeDefined()
    expect(cfg.retry).toBeDefined()
    expect(cfg.rate_limits).toBeDefined()
  })

  it('должен вернуть активных провайдеров', () => {
    const active = config.getActiveProviders()
    expect(Array.isArray(active)).toBe(true)
    // Хотя бы один активный провайдер (hyperion или mock)
    expect(active.length).toBeGreaterThan(0)
  })

  it('должен вернуть маппинг платёжных шлюзов', () => {
    const mapping = config.getPaymentGatewayMapping()
    expect(mapping).toBeDefined()
    expect(mapping.card).toBeDefined()
    expect(mapping.sbp).toBeDefined()
    expect(mapping.wallet).toBe('wallet')
  })

  it('должен вернуть polling конфиг', () => {
    const poll = config.getPollingConfig()
    expect(poll.active_interval_sec).toBeGreaterThan(0)
    expect(poll.active_max_attempts).toBeGreaterThan(0)
    expect(poll.background_max_hours).toBeGreaterThan(0)
  })

  it('должен вернуть retry политику', () => {
    const retry = config.getRetryConfig()
    expect(retry.max_attempts).toBeGreaterThan(0)
    expect(['exponential', 'fixed']).toContain(retry.backoff_strategy)
  })

  it('должен вернуть rate limits', () => {
    const limits = config.getRateLimits()
    expect(limits.validate).toBeGreaterThan(0)
    expect(limits.orders).toBeGreaterThan(0)
    expect(limits.payments).toBeGreaterThan(0)
  })

  it('должен вернуть cache конфиг', () => {
    const cache = config.getCacheConfig()
    expect(cache.service_list_ttl_sec).toBeGreaterThan(0)
  })
})
