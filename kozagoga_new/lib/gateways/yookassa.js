// YooKassa Gateway — адаптер для ЮKassa (карты, СБП, ЮMoney)
// Реализует интерфейс PaymentGateway

import PaymentGateway from '../payment-gateway.js'

export default class YooKassaGateway extends PaymentGateway {
  constructor(config) {
    super(config)
    this.shopId = process.env.YOOKASSA_SHOP_ID
    this.secretKey = process.env.YOOKASSA_SECRET_KEY
    this.returnUrl = process.env.YOOKASSA_RETURN_URL || 'http://localhost:5173/orders'
  }

  _getAuth() {
    if (!this.shopId || !this.secretKey) {
      throw new Error('[yookassa] YOOKASSA_SHOP_ID и YOOKASSA_SECRET_KEY должны быть в .env')
    }
    return 'Basic ' + Buffer.from(`${this.shopId}:${this.secretKey}`).toString('base64')
  }

  async createPayment({ order_id, amount, currency, description, user, payment_method_data, return_url }) {
    const body = {
      amount: {
        value: String(amount),
        currency: currency || 'RUB'
      },
      description: description || `Заказ #${order_id}`,
      metadata: {
        order_id
      },
      confirmation: {
        type: 'redirect',
        return_url: return_url || this.returnUrl
      },
      capture: true
    }

    // Если указан конкретный метод — передаём
    if (payment_method_data) {
      body.payment_method_data = payment_method_data
    }

    const response = await fetch('https://api.yookassa.ru/v3/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this._getAuth(),
        'Idempotence-Key': `${order_id}-${Date.now()}`
      },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(`[yookassa] createPayment error: ${err.description || response.statusText}`)
    }

    const data = await response.json()

    return {
      redirect_url: data.confirmation?.confirmation_url || null,
      transaction_id: data.id,
      status: data.status
    }
  }

  async processWebhook(req) {
    const event = req.body
    if (!event || !event.object) {
      throw new Error('[yookassa] Invalid webhook payload')
    }

    // HMAC-проверка подписи: ЮKassa подписывает тело запроса через Content-Signature
    // Формат заголовка: sha256=hex-encoded-HMAC-SHA256(body, secretKey)
    try {
      if (this.secretKey && req.headers?.['content-signature']) {
        const crypto = await import('crypto')
        const rawBody = req.rawBody || JSON.stringify(event)
        const expectedSig = crypto
          .createHmac('sha256', this.secretKey)
          .update(rawBody)
          .digest('hex')

        const signature = req.headers['content-signature'].replace(/^sha256=/i, '')

        if (expectedSig.length !== signature.length ||
            !crypto.timingSafeEqual(Buffer.from(expectedSig), Buffer.from(signature))) {
          console.warn('[yookassa] ⚠️ HMAC-подпись не совпадает — возможна подделка webhook')
        }
      }
    } catch (err) {
      console.error('[yookassa] Ошибка проверки HMAC:', err.message)
    }

    const notificationType = event.type
    if (!notificationType || !['payment.waiting_for_capture', 'payment.succeeded', 'payment.canceled'].includes(notificationType)) {
      console.warn('[yookassa] Неизвестный тип уведомления:', notificationType)
    }

    const payment = event.object

    return {
      transaction_id: payment.id,
      status: payment.status,
      metadata: payment.metadata || {}
    }
  }

  async refundPayment(transactionId, amount) {
    // Сначала получаем платеж, чтобы узнать сумму
    const getResponse = await fetch(`https://api.yookassa.ru/v3/payments/${transactionId}`, {
      headers: {
        'Authorization': this._getAuth()
      }
    })

    if (!getResponse.ok) {
      throw new Error(`[yookassa] Payment ${transactionId} not found`)
    }

    const payment = await getResponse.json()

    const body = {
      payment_id: transactionId,
      amount: {
        value: String(amount || payment.amount.value),
        currency: payment.amount.currency
      }
    }

    const response = await fetch('https://api.yookassa.ru/v3/refunds', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this._getAuth(),
        'Idempotence-Key': `refund-${transactionId}-${Date.now()}`
      },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(`[yookassa] refund error: ${err.description || response.statusText}`)
    }

    const data = await response.json()
    return { status: data.status, transaction_id: data.id }
  }
}
