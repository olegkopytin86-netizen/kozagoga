// HyperionProvider — реализация BaseProvider для Hyperion (Кыргызстан)
// API: POST /api/webhub/Login → token, POST /api/webhub/Process → все операции

import BaseProvider from './base-provider.js'

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
  }

  async auth() {
    if (!this.login || !this.password) {
      throw new Error(`[hyperion] HYPERION_LOGIN и HYPERION_PASSWORD должны быть в .env`)
    }

    const response = await fetch(`${this.baseUrl}/Login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: this.login, password: this.password })
    })

    if (!response.ok) {
      throw new Error(`[hyperion] Auth failed: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    this.token = data.token
    this.tokenExpires = data.expires

    console.log(`[hyperion] Авторизация успешна, токен до ${this.tokenExpires}`)
  }

  async _request(operation, payload = {}) {
    await this.ensureAuth()

    const body = {
      id: crypto.randomUUID(),
      date_created: new Date().toISOString().replace('Z', '').replace('T', ' '),
      dealer: this.dealer,
      type: 'Customer_Service',
      operation,
      ...payload
    }

    const response = await fetch(`${this.baseUrl}/Process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      },
      body: JSON.stringify(body)
    })

    if (response.status === 401) {
      // Токен протух — пробуем переавторизоваться
      console.log('[hyperion] Получен 401, переавторизация...')
      this.token = null
      await this.ensureAuth()
      // Повторяем запрос
      body.date_created = new Date().toISOString().replace('Z', '').replace('T', ' ')
      const retryResponse = await fetch(`${this.baseUrl}/Process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify(body)
      })

      if (!retryResponse.ok) {
        const errData = await retryResponse.json().catch(() => ({}))
        throw new Error(`[hyperion] Request failed after reauth: ${errData.status || retryResponse.status}`)
      }

      return retryResponse.json()
    }

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}))
      // protocol_error
      throw new Error(`[hyperion] ${operation} error: ${errData.status || response.status} — ${errData.details || response.statusText}`)
    }

    return response.json()
  }

  async getServices() {
    const data = await this._request(OP_SERVICE_LIST)

    if (data.status !== 'ok' || !data.service_list) {
      return []
    }

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
    // Извлекаем все не-main поля в info
    if (req.params && req.fields) {
      for (const field of req.fields) {
        if (!field.is_main_requisite && req.params[field.key]) {
          info[field.key] = req.params[field.key]
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

    return {
      package_id: data.package_id
    }
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
    // Hyperion использует статус cancellation, но мы для простоты проверки
    // используем отдельный запрос
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
