// SberbankGateway — адаптер для Сбербанка (платёжный шлюз РФ)
// API: register.do, getOrderStatusExtended.do, reverse.do, refund.do
// Реализует интерфейс PaymentGateway
//
// Все суммы — в КОПЕЙКАХ для запросов к Сберу.
// response.amount — в копейках, конвертируем в рубли.

import PaymentGateway from '../payment-gateway.js'

// ─── Маппинг errorCode → действие (по BRD 2.7.7) ────────
const ERROR_MAP = {
  '0':  { message: null,                          action: 'proceed' },
  '1':  { message: 'Платёж уже создан',           action: 'return_existing' },
  '2':  { message: 'Платёж не найден',            action: 'error_client' },
  '3':  { message: 'Операция недоступна',         action: 'error_client' },
  '4':  { message: 'Ошибка аутентификации шлюза', action: 'alert_admin' },
  '5':  { message: 'Недостаточно прав',           action: 'alert_admin' },
  '6':  { message: 'Некорректные данные',         action: 'error_client' },
  '7':  { message: 'Системная ошибка',            action: 'retry_3x_or_alert' },
  '8':  { message: 'Заказ уже оплачен',           action: 'proceed_existing' },
  '9':  { message: 'Операция уже выполнена',      action: 'proceed_ignore' },
}

// Коды orderStatus Сбера → payment_status
const ORDER_STATUS_MAP = {
  0: 'pending',     // зарегистрирован, не оплачен
  1: 'pending',     // hold (деньги заблокированы)
  2: 'paid',        // оплачен ✓
  3: 'failed',      // отменён
  4: 'refunded',    // возврат
  5: 'pending',     // ACS авторизация
  6: 'failed',      // отказ авторизации
}

export default class SberbankGateway extends PaymentGateway {
  constructor(config) {
    super(config)
    this.login = process.env.SBER_LOGIN
    this.password = process.env.SBER_PASSWORD
    this.baseUrl = process.env.SBER_BASE_URL || 'https://ecomtest.sberbank.ru/ecomm/gw/partner/api/v1'
    this.returnUrl = process.env.SBER_RETURN_URL || 'http://localhost:5173/orders'
    this.failUrl = process.env.SBER_FAIL_URL || 'http://localhost:5173/checkout'
    this.notificationUrl = process.env.SBER_NOTIFICATION_URL || 'http://localhost:3001/api/payments/webhook/sberbank'
    this.twoStage = process.env.SBER_TWO_STAGE === 'true'
    this.sessionTimeout = parseInt(process.env.SBER_SESSION_TIMEOUT || '1200')
  }

  /**
   * Конвертирует рубли → копейки (×100)
   */
  _toKop(amount) {
    return Math.round(parseFloat(amount) * 100)
  }

  /**
   * Конвертирует копейки → рубли (÷100)
   */
  _fromKop(kop) {
    return (parseFloat(kop) / 100).toFixed(2)
  }

  /**
   * Выполняет POST-запрос к API Сбера (application/x-www-form-urlencoded)
   */
  async _apiCall(method, params) {
    const url = `${this.baseUrl}/${method}`

    const body = new URLSearchParams({
      userName: this.login,
      password: this.password,
      ...params,
    }).toString()

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    })

    if (!response.ok) {
      throw new Error(`[sberbank] HTTP ${response.status} при вызове ${method}`)
    }

    const data = await response.json()
    const errorCode = String(data.errorCode || '0')

    return { data, errorCode }
  }

  /**
   * Обрабатывает errorCode по таблице из BRD 2.7.7
   */
  _handleError(errorCode, method, context = {}) {
    const rule = ERROR_MAP[errorCode] || { message: 'Неизвестная ошибка', action: 'error_client' }

    switch (rule.action) {
      case 'proceed':
        return null // нет ошибки
      case 'return_existing':
        return { existing: true, message: rule.message }
      case 'proceed_existing':
        return { duplicate: true }
      case 'proceed_ignore':
        return { ignored: true }
      case 'error_client':
        console.error(`[sberbank] ${method}: ${rule.message}`, context)
        throw new Error(rule.message)
      case 'alert_admin':
        console.error(`[sberbank] ALERT ADMIN: ${method}: ${rule.message}`, context)
        throw new Error('Внутренняя ошибка. Попробуйте позже.')
      case 'retry_3x_or_alert':
        throw new Error('Сервис временно недоступен. Попробуйте позже.')
      default:
        throw new Error('Неизвестная ошибка')
    }
  }

  // ─── createPayment: register.do ─────────────────────────
  async createPayment({ order_id, amount, currency, description, user, return_url, fail_url, payment_way }) {
    const orderNumber = `order-${order_id}`.slice(0, 32) // макс 32 символа

    const params = {
      orderNumber,
      amount: String(this._toKop(amount)),
      currency: '643', // RUB
      returnUrl: return_url || this.returnUrl,
      failUrl: fail_url || this.failUrl,
      description: description || `Заказ #${order_id}`,
      pageView: payment_way === 'sberpay' ? 'MOBILE' : 'DESKTOP',
      sessionTimeoutSecs: String(this.sessionTimeout),
    }

    // Для СберПэй добавляем jsonParams с приоритетом этого способа оплаты
    if (payment_way === 'sberpay') {
      params.jsonParams = JSON.stringify({
        paymentWay: 'SberPay'
      })
    }

    const { data, errorCode } = await this._apiCall('register.do', params)
    const err = this._handleError(errorCode, 'register.do', { orderNumber })

    // Если заказ уже существует — возвращаем что есть
    if (err?.existing) {
      return {
        redirect_url: data.formUrl || null,
        transaction_id: data.orderId,
        status: 'pending',
      }
    }

    return {
      redirect_url: data.formUrl,
      transaction_id: data.orderId,
      status: 'pending',
    }
  }

  // ─── getOrderStatus: getOrderStatusExtended.do ──────────
  async getOrderStatus(transactionId) {
    const { data, errorCode } = await this._apiCall('getOrderStatusExtended.do', {
      orderId: transactionId,
      language: 'ru',
    })

    const err = this._handleError(errorCode, 'getOrderStatusExtended.do', { transactionId })
    if (err && !err.existing) {
      return { status: 'failed', raw_status: 6 }
    }

    const rawStatus = data.orderStatus !== undefined ? parseInt(data.orderStatus) : 0
    const amount = data.amount ? this._fromKop(data.amount) : '0'

    return {
      status: ORDER_STATUS_MAP[rawStatus] || 'pending',
      raw_status: rawStatus,
      amount: parseFloat(amount),
      currency: data.currency || '643',
      orderNumber: data.orderNumber || '',
    }
  }

  // ─── processWebhook: notification от Сбера ──────────────
  async processWebhook(req) {
    // Сбер шлёт form-urlencoded: mdOrder, operation, status
    const body = req.body || {}
    const mdOrder = body.mdOrder || body.orderId
    const operation = body.operation || ''
    const status = body.status // 0 = успех, 1 = отказ

    if (!mdOrder) {
      throw new Error('[sberbank] webhook: mdOrder обязателен')
    }

    // Проверяем IP отправителя (Сбер должен быть в белом списке)
    // В production: проверять req.ip через список разрешённых IP Сбера

    // Верифицируем через getOrderStatusExtended (серверная проверка, не доверяем коллбэку)
    const orderStatus = await this.getOrderStatus(mdOrder)

    return {
      transaction_id: mdOrder,
      status: orderStatus.status,
      raw_status: orderStatus.raw_status,
      metadata: { operation, notification_status: status },
    }
  }

  // ─── refundPayment: refund.do ───────────────────────────
  async refundPayment(transactionId, amount) {
    const params = {
      orderId: transactionId,
    }

    // Сумма опциональна: если не указана — полный возврат
    if (amount !== undefined && amount !== null) {
      params.amount = String(this._toKop(amount))
    }

    const { data, errorCode } = await this._apiCall('refund.do', params)
    const err = this._handleError(errorCode, 'refund.do', { transactionId, amount })

    if (err?.ignored) {
      return { status: 'succeeded', transaction_id: transactionId }
    }

    return {
      status: 'succeeded',
      transaction_id: data.orderId || transactionId,
      amount: data.amount ? parseFloat(this._fromKop(data.amount)) : null,
    }
  }

  // ─── reversePayment: reverse.do ─────────────────────────
  async reversePayment(transactionId) {
    const { data, errorCode } = await this._apiCall('reverse.do', {
      orderId: transactionId,
    })

    const err = this._handleError(errorCode, 'reverse.do', { transactionId })

    if (err?.ignored) {
      return { success: true }
    }

    return { success: data.errorCode === '0' }
  }
}
