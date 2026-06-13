import { describe, it, expect } from 'vitest'

describe('SberbankGateway', () => {
  it('должен конвертировать рубли в копейки и обратно', async () => {
    const { default: SberbankGateway } = await import('../lib/gateways/sberbank.js')
    const gw = new SberbankGateway({ code: 'sberbank' })

    // Проверяем через вызов _toKop и _fromKop
    expect(gw._toKop(155.50)).toBe(15550)
    expect(gw._toKop(100)).toBe(10000)
    expect(gw._toKop(0.01)).toBe(1)

    expect(gw._fromKop(15550)).toBe('155.50')
    expect(gw._fromKop(10000)).toBe('100.00')
    expect(gw._fromKop(1)).toBe('0.01')
  })

  it('должен выбросить ошибку для createPayment без .env', async () => {
    const { default: SberbankGateway } = await import('../lib/gateways/sberbank.js')

    // Убедимся что .env переменные не установлены
    const oldLogin = process.env.SBER_LOGIN
    const oldPass = process.env.SBER_PASSWORD
    delete process.env.SBER_LOGIN
    delete process.env.SBER_PASSWORD

    const gw = new SberbankGateway({ code: 'sberbank' })

    try {
      await expect(gw.createPayment({
        order_id: 'test-1',
        amount: 150,
        currency: 'RUB',
      })).rejects.toThrow()
    } finally {
      if (oldLogin) process.env.SBER_LOGIN = oldLogin
      if (oldPass) process.env.SBER_PASSWORD = oldPass
    }
  })

  it('должен выбросить ошибку для getOrderStatus без .env', async () => {
    const { default: SberbankGateway } = await import('../lib/gateways/sberbank.js')
    const gw = new SberbankGateway({ code: 'sberbank' })

    await expect(gw.getOrderStatus('test-id')).rejects.toThrow()
  })

  it('должен выбросить ошибку для refund без .env', async () => {
    const { default: SberbankGateway } = await import('../lib/gateways/sberbank.js')
    const gw = new SberbankGateway({ code: 'sberbank' })
    delete process.env.SBER_LOGIN; delete process.env.SBER_PASSWORD

    await expect(gw.refundPayment('test-id', 150)).rejects.toThrow()
  })

  it('должен выбросить ошибку для webhook с пустым телом', async () => {
    const { default: SberbankGateway } = await import('../lib/gateways/sberbank.js')
    const gw = new SberbankGateway({ code: 'sberbank' })

    const emptyBody = { body: { } }
    await expect(gw.processWebhook(emptyBody)).rejects.toThrow(new RegExp('mdOrder'))
  })
})

describe('WalletGateway', () => {
  it('должен выбросить ошибку createPayment без user', async () => {
    const { default: WalletGateway } = await import('../lib/gateways/wallet.js')
    const mockPool = { connect: async () => ({ query: async () => {}, release: () => {} }) }
    const gw = new WalletGateway({ code: 'wallet' }, mockPool)

    await expect(gw.createPayment({
      order_id: 'test-1',
      amount: 150,
      user: null,
    })).rejects.toThrow(/Авторизация/)
  })

  it('должен выбросить ошибку processWebhook', async () => {
    const { default: WalletGateway } = await import('../lib/gateways/wallet.js')
    const mockPool = { connect: async () => ({ query: async () => {}, release: () => {} }) }
    const gw = new WalletGateway({ code: 'wallet' }, mockPool)

    await expect(gw.processWebhook({})).rejects.toThrow(/webhook/)
  })
})

describe('YooKassaGateway', () => {
  it('должен выбросить ошибку createPayment без .env', async () => {
    const { default: YooKassaGateway } = await import('../lib/gateways/yookassa.js')
    const gw = new YooKassaGateway({ code: 'yookassa' })

    await expect(gw.createPayment({
      order_id: 'test-1',
      amount: 150,
    })).rejects.toThrow(/YOOKASSA/)
  })
})

describe('PaymentGateway (base)', () => {
  it('должен выбросить ошибки для всех нереализованных методов', async () => {
    const { default: PaymentGateway } = await import('../lib/payment-gateway.js')
    const gw = new PaymentGateway({ code: 'test' })

    await expect(gw.createPayment({})).rejects.toThrow(/createPayment/)
    await expect(gw.processWebhook({})).rejects.toThrow(/processWebhook/)
    await expect(gw.refundPayment('id')).rejects.toThrow(/refundPayment/)
    await expect(gw.getOrderStatus('id')).rejects.toThrow(/getOrderStatus/)
    await expect(gw.reversePayment('id')).rejects.toThrow(/reversePayment/)
  })
})
