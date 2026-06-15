// HyperionProvider — реализация BaseProvider для Hyperion (Кыргызстан)
// API: POST /api/webhub/Login → token, POST /api/webhub/Process → все операции

import BaseProvider from './base-provider.js'
import ProviderLogger from './provider-logger.js'

const OP_SERVICE_LIST = 'service_list_by_dealer'
const OP_REQUISITE_ENQUIRY = 'requisite_enquiry'
const OP_PAYMENT = 'payment'
const OP_STATUS = 'status_enquiry'
const OP_PRECHECK = 'precheck'

export default class HyperionProvider extends BaseProvider {
  constructor(config) {
    super(config)
    this.baseUrl = process.env.HYPERION_BASE_URL || 'https://hyperion-api.example.com'
    this.login = process.env.HYPERION_LOGIN
    this.password = process.env.HYPERION_PASSWORD
    this.dealer = process.env.HYPERION_DEALER || 'PAO2TEST'
    this.defaultCurrency = process.env.HYPERION_CURRENCY || 'KGS'
    this.logger = new ProviderLogger('hyperion')
  }

  /**
   * Возвращает собранные логи для сохранения в БД
   */
  getLogs() {
    return this.logger.getAll()
  }

  async auth() {
    if (!this.login || !this.password) {
      throw new Error('[hyperion] HYPERION_LOGIN и HYPERION_PASSWORD должны быть в .env')
    }

    const url = `${this.baseUrl}/Login`
    const body = JSON.stringify({ login: this.login, password: this.password })
    const start = Date.now()

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      })

      const duration = Date.now() - start
      const responseBody = await response.text()

      this.logger.log({
        operation: 'auth',
        method: 'POST',
        url,
        requestHeaders: { 'Content-Type': 'application/json' },
        requestBody: { login: this.login, password: '***' },
        status: response.status,
        responseHeaders: Object.fromEntries(response.headers.entries()),
        responseBody: response.status === 200 ? JSON.parse(responseBody) : responseBody,
        durationMs: duration,
        error: response.ok ? null : `HTTP ${response.status}`,
      })

      if (!response.ok) {
        throw new Error(`[hyperion] Auth failed: ${response.status} ${response.statusText}`)
      }

      const data = JSON.parse(responseBody)
      this.token = data.token
      this.tokenExpires = data.expires
      console.log(`[hyperion] Авторизация успешна, токен до ${this.tokenExpires}`)
    } catch (err) {
      if (!err.message.startsWith('[hyperion]')) {
        this.logger.logError({
          operation: 'auth',
          method: 'POST',
          url,
          requestBody: { login: this.login, password: '***' },
          durationMs: Date.now() - start,
          error: err.message,
        })
      }
      throw err
    }
  }

  async _request(operation, payload = {}) {
    await this.ensureAuth()

    const requestBody = {
      id: crypto.randomUUID(),
      date_created: new Date().toISOString().replace('Z', '').replace('T', ' '),
      dealer: this.dealer,
      type: 'Customer_Service',
      operation,
      ...payload
    }

    const url = `${this.baseUrl}/Process`
    const requestHeaders = {
      'Content-Type': 'application/json',
      'Authorization': '***',
    }

    const start = Date.now()

    const doFetch = async (token) => {
      return fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      })
    }

    try {
      let response = await doFetch(this.token)
      let duration = Date.now() - start

      // Переавторизация при 401
      if (response.status === 401) {
        console.log('[hyperion] Получен 401, переавторизация...')
        this.token = null
        await this.ensureAuth()
        requestBody.date_created = new Date().toISOString().replace('Z', '').replace('T', ' ')
        response = await doFetch(this.token)
        duration = Date.now() - start
      }

      const responseBody = await response.text()
      let parsedBody
      try { parsedBody = JSON.parse(responseBody) } catch { parsedBody = responseBody }

      this.logger.log({
        operation,
        method: 'POST',
        url,
        requestHeaders,
        requestBody,
        status: response.status,
        responseHeaders: Object.fromEntries(response.headers.entries()),
        responseBody: parsedBody,
        durationMs: duration,
        error: response.ok ? null : `HTTP ${response.status}`,
      })

      if (!response.ok) {
        const errData = typeof parsedBody === 'object' ? parsedBody : {}
        throw new Error(
          `[hyperion] ${operation} error: ${errData.status || response.status} — ${errData.details || response.statusText}`
        )
      }

      return parsedBody
    } catch (err) {
      if (!err.message.startsWith('[hyperion]')) {
        this.logger.logError({
          operation,
          method: 'POST',
          url,
          requestHeaders,
          requestBody,
          durationMs: Date.now() - start,
          error: err.message,
        })
      }
      throw err
    }
  }

  async getServices() {
    const data = await this._request(OP_SERVICE_LIST)
    if (data.status !== 'ok' || !data.service_list) return []

    return data.service_list.map(s => ({
      id: String(s.id_service),
      name_ru: s.name_ru,
      name_kg: s.name_kg || s.name_ru,
      image: s.image || null,
      min_amount: s.min_payment_amount,
      max_amount: s.max_payment_amount,
      fields: (s.parameters || []).map(p => ({
        key: p.system_name,
        label: p.name_ru,
        type: p.type || 'Default',
        required: p.is_required !== false,
        min_length: p.min_length,
        max_length: p.max_length,
        keyboard: p.keyboard === 'Digital' ? 'numeric' : 'text',
        mask: p.mask_valid || null,
        is_main_requisite: p.is_main_requisite || false,
        display_order: p.display_order || 0
      })).sort((a, b) => a.display_order - b.display_order)
    }))
  }

  async validate(req) {
    const info = {}

    if (req.params) {
      if (req.fields) {
        // Если передана схема полей — фильтруем только неосновные
        for (const field of req.fields) {
          if (!field.is_main_requisite && req.params[field.key]) {
            info[field.key] = req.params[field.key]
          }
        }
      } else {
        // Если схема не передана — передаём все params как доп.инфо
        for (const [key, value] of Object.entries(req.params)) {
          info[key] = value
        }
      }
    }

    const payload = {
      bearer: req.bearer || req.serviceId,
      requisite: req.requisite,
      info: Object.keys(info).length > 0 ? [info] : []
    }

    const data = await this._request(OP_REQUISITE_ENQUIRY, payload)

    return {
      result: data.result || 'error',
      details: data.details || '',
      possible: data.payment_possible === 'True' || data.payment_possible === true,
      commissions: data.commissions || ''
    }
  }

  async pay(req) {
    const payload = {
      exclude_commission: req.exclude_commission !== false,
      payload: {
        date_created: new Date().toISOString().replace('Z', '').replace('T', ' '),
        bearer: req.bearer,
        account: req.account,
        amount: String(req.amount),
        currency: req.currency || this.defaultCurrency,
        info: req.info || []
      }
    }

    const data = await this._request(OP_PAYMENT, payload)
    return { package_id: data.package_id }
  }

  async status(packageId) {
    const data = await this._request(OP_STATUS, { package_id: packageId })
    return {
      provider_status: this.normalizeStatus(data.transaction_status || 'UNKNOWN'),
      transaction_state: data.transaction_state || '',
      description: data.description || ''
    }
  }

  async cancel(packageId) {
    const data = await this._request('cancellation', { package_id: packageId })
    return { result: data.status === 'ok' }
  }

  async precheck(req) {
    const payload = {
      bearer: req.bearer,
      exclude_commission: req.exclude_commission !== false,
      amount: String(req.amount)
    }

    const data = await this._request(OP_PRECHECK, payload)
    if (data.status !== 'ok' || !data.calculations) {
      throw new Error(`[hyperion] precheck error: ${data.status}`)
    }

    const calc = data.calculations
    return {
      total_amount: calc.payment_amount || '0',
      supplier_amount: calc.supplier_amount || '0',
      commissions: {
        total: calc.total_u_commission_amount || '0',
        dealer: calc.dealer_u_commission_amount || '0',
        payment_system: calc.ps_u_commission_amount || '0'
      }
    }
  }

  async getDictionary(code) {
    const data = await this._request('dictionary', { dictionary_code: code })
    return data.dictionary || []
  }

  normalizeStatus(status) {
    const map = {
      'COMPLETE': 'COMPLETE',
      'FAILURE': 'FAILURE',
      'CANCELLED': 'CANCELLED',
      'INPROGRESS': 'INPROGRESS',
      'PENDING': 'PENDING',
      'UNEXPECTED_ERROR': 'UNEXPECTED_ERROR',
      'REBOOKED': 'REBOOKED',
      'UNKNOWN': 'UNKNOWN',
      'WAITS_FOR_REQUEUE': 'WAITS_FOR_REQUEUE',
      'SENT_TO_QUEUE': 'SENT_TO_QUEUE'
    }
    return map[status] || 'UNKNOWN'
  }
}
