// SberbankGateway — адаптер для Сбербанка (платёжный шлюз РФ)
// API v2: register.do, getOrderStatusExtended.do, reverse.do, refund.do
//
// Аутентификация: Basic Auth (Authorization: Basic base64(login:password))
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
  '5':  { message: 'Платёжный шлюз временно недоступен. Попробуйте другой способ оплаты.', action: 'error_client' },
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

// Реестр известных IP Сбербанка для проверки webhook
// Полный список: https://developer.sberbank.ru/doc/ip-whitelist
const SBERBANK_IPS = [
  '194.54.15.0/24',
  '194.54.14.0/24',
]

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
   * Basic Auth заголовок
   */
  _basicAuth() {
    if (!this.login || !this.password) {
      throw new Error('[sberbank] SBER_LOGIN и SBER_PASSWORD должны быть в .env')
    }
    return 'Basic ' + Buffer.from(`${this.login}:${this.password}`).toString('base64')
  }

  /**
   * Выполняет POST-запрос к API Сбера с Basic Auth
   * Использует application/x-www-form-urlencoded для register.do и application/json для v2
   */
  async _apiCall(method, params = {}) {
    const url = `${this.baseUrl}/${method}`
    const isV2 = method.startsWith('v2/')

    const headers = {
      'Authorization': this._basicAuth(),
    }

    let body
    if (isV2) {
      // V2 API — JSON
      headers['Content-Type'] = 'application/json'
      body = JSON.stringify(params)
    } else {
      // V1 API — form-urlencoded
      headers['Content-Type'] = 'application/x-www-form-urlencoded'
      body = new URLSearchParams(params).toString()
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
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

    // Демо-режим: имитация успешного платежа без вызова API Сбера
    if (process.env.SBER_DEMO_MODE === 'true') {
      console.log(`[sberbank] 🧪 ДЕМО: создание платежа ${orderNumber} на сумму ${amount}`)
      await new Promise(r => setTimeout(r, 1500)) // имитация задержки
      return {
        redirect_url: return_url || this.returnUrl,
        deep_links: [
          // iOS — универсальная ссылка (Universal Link), открывает приложение если установлено
          `sberbank://payment?order=${orderNumber}&amount=${this._toKop(amount)}`,
          // iOS — fallback на App Store если приложение не установлено
          `https://apps.apple.com/ru/app/%D1%81%D0%B1%D0%B5%D1%80%D0%B1%D0%B0%D0%BD%D0%BA-%D0%BE%D0%BD%D0%BB%D0%B0%D0%B9%D0%BD/id492224193`,
        ],
        transaction_id: `demo-${order_id}`,
        status: 'pending',
      }
    }

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

    // Для двухстадийных платежей
    if (this.twoStage) {
      params.sessionAction = '1' // PREAUTH
    }

    const { data, errorCode } = await this._apiCall('register.do', params)

    // Логируем ответ Сбера для отладки
    console.log(`[sberbank] register.do → errorCode=${errorCode}`, JSON.stringify(data).slice(0, 200))

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
      deep_links: [
        `sberbank://payment?order=${orderNumber}&amount=${params.amount}`,
        `https://apps.apple.com/ru/app/%D1%81%D0%B1%D0%B5%D1%80%D0%B1%D0%B0%D0%BD%D0%BA-%D0%BE%D0%BD%D0%BB%D0%B0%D0%B9%D0%BD/id492224193`,
      ],
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
    const clientIp = req.ip || req.connection?.remoteAddress
    if (clientIp && !SBERBANK_IPS.some(range => ipInRange(clientIp, range))) {
      console.warn(`[sberbank] webhook от неожиданного IP: ${clientIp}`)
      // Не блокируем, только предупреждаем в тестовом режиме
    }

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

// ─── Утилита проверки IP в диапазоне ────────────────────
function ipInRange(ip, range) {
  if (!ip || !range) return false

  const parts = range.split('/')
  if (parts.length !== 2) return ip === range

  const [rangeIp, bits] = parts
  const mask = ~(2 ** (32 - parseInt(bits)) - 1)

  const ipNum = ipToNum(ip)
  const rangeNum = ipToNum(rangeIp)

  return (ipNum & mask) === (rangeNum & mask)
}

function ipToNum(ip) {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0
}
