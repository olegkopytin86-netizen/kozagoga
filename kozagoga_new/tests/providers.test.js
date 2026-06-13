import { describe, it, expect, beforeAll } from 'vitest'

describe('BaseProvider', () => {
  it('должен выбросить ошибку при вызове нереализованных методов', async () => {
    const { default: BaseProvider } = await import('../lib/providers/base-provider.js')
    const p = new BaseProvider({ code: 'test', enabled: true })

    await expect(p.auth()).rejects.toThrow(/auth/)
    await expect(p.getServices()).rejects.toThrow(/getServices/)
    await expect(p.validate({})).rejects.toThrow(/validate/)
    await expect(p.pay({})).rejects.toThrow(/pay/)
    await expect(p.status('id')).rejects.toThrow(/status/)
    await expect(p.cancel('id')).rejects.toThrow(/cancel/)
    await expect(p.precheck({})).rejects.toThrow(/precheck/)
    await expect(p.getDictionary('code')).rejects.toThrow(/getDictionary/)
  })

  it('должен управлять токеном', async () => {
    const { default: BaseProvider } = await import('../lib/providers/base-provider.js')
    const p = new BaseProvider({ code: 'test', enabled: true })

    expect(p.isTokenValid()).toBe(false)
    p.token = 'abc'
    p.tokenExpires = new Date(Date.now() + 3600000).toISOString()
    expect(p.isTokenValid()).toBe(true)

    // Просроченный токен
    p.tokenExpires = new Date(Date.now() - 3600000).toISOString()
    expect(p.isTokenValid()).toBe(false)
  })

  it('должен нормализовать статус по умолчанию', async () => {
    const { default: BaseProvider } = await import('../lib/providers/base-provider.js')
    const p = new BaseProvider({ code: 'test', enabled: true })
    expect(p.normalizeStatus('COMPLETE')).toBe('COMPLETE')
    expect(p.normalizeStatus('unknown_status')).toBe('unknown_status')
  })
})

describe('MockProvider', () => {
  let provider

  beforeAll(async () => {
    const { default: MockProvider } = await import('../lib/providers/mock-provider.js')
    provider = new MockProvider({ code: 'mock', enabled: true })
  })

  it('должен авторизоваться без ошибок', async () => {
    await provider.auth()
    expect(provider.token).toBeTruthy()
    expect(provider.isTokenValid()).toBe(true)
  })

  it('должен вернуть список сервисов', async () => {
    const services = await provider.getServices()
    expect(Array.isArray(services)).toBe(true)
    expect(services.length).toBeGreaterThan(0)

    const svc = services[0]
    expect(svc.id_service).toBeDefined()
    expect(svc.name_ru).toBeDefined()
    expect(svc.min_payment_amount).toBeGreaterThan(0)
    expect(svc.parameters).toBeDefined()
    expect(svc.parameters.length).toBeGreaterThan(0)
  })

  it('должен подтвердить существующий реквизит', async () => {
    const result = await provider.validate({
      requisite: '996555333333',
      params: { phone_num: '996555333333' },
      bearer: '1039',
    })
    expect(result.result).toBe('exist')
    expect(result.possible).toBe(true)
    expect(result.details).toBe('Абонент найден')
  })

  it('должен отклонить несуществующий реквизит', async () => {
    const result = await provider.validate({
      requisite: '111',
      params: {},
      bearer: '1039',
    })
    expect(result.result).toBe('absent')
    expect(result.possible).toBe(false)
  })

  it('должен выполнить платёж и вернуть package_id', async () => {
    const result = await provider.pay({
      bearer: '1039',
      account: '996555333333',
      amount: 150,
      currency: 'KGS',
    })
    expect(result.package_id).toBeDefined()
    expect(result.package_id).toContain('mock-pkg-')
  })

  it('должен вернуть статус COMPLETE', async () => {
    const result = await provider.status('mock-pkg-test')
    expect(result.provider_status).toBe('COMPLETE')
  })

  it('должен выполнить cancel', async () => {
    const result = await provider.cancel('mock-pkg-test')
    expect(result.result).toBe(true)
  })

  it('должен рассчитать комиссию', async () => {
    const result = await provider.precheck({ bearer: '1039', amount: '150.00' })
    expect(result.total_amount).toBeDefined()
    expect(result.supplier_amount).toBe('150.00')
    expect(result.commissions.total).toBeDefined()
    expect(parseFloat(result.commissions.total)).toBeGreaterThan(0)
  })
})

describe('HyperionProvider', () => {
  let provider

  beforeAll(async () => {
    const { default: HyperionProvider } = await import('../lib/providers/hyperion-provider.js')
    provider = new HyperionProvider({ code: 'hyperion', enabled: true })
  })

  it('должен выбросить ошибку без credentials', async () => {
    // Без HYPERION_LOGIN/HYPERION_PASSWORD должна быть ошибка
    await expect(provider.auth()).rejects.toThrow(/LOGIN.*PASSWORD/)
  })

  it('должен нормализовать статусы Hyperion', () => {
    expect(provider.normalizeStatus('COMPLETE')).toBe('COMPLETE')
    expect(provider.normalizeStatus('FAILURE')).toBe('FAILURE')
    expect(provider.normalizeStatus('UNKNOWN')).toBe('UNKNOWN')
    expect(provider.normalizeStatus('CUSTOM_STATUS')).toBe('UNKNOWN')
  })
})
