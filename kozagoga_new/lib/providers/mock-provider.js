// MockProvider — заглушка для демо/разработки без реального API
// Возвращает реалистичные данные, имитирующие Hyperion

import BaseProvider from './base-provider.js'

const MOCK_SERVICES = [
  {
    id_service: 1039,
    name_ru: 'Beeline Кыргызстан',
    name_kg: 'Beeline Кыргызстан',
    max_payment_amount: 10000,
    min_payment_amount: 5,
    image: 'beeline.png',
    parameters: [
      { system_name: 'phone_num', name_ru: 'Номер телефона', min_length: 12, max_length: 12, keyboard: 'Digital', display_order: 1, is_main_requisite: true, mask_valid: '^996\\d{9}$', is_required: true, type: 'Default' },
    ]
  },
  {
    id_service: 1055,
    name_ru: 'MegaCom Кыргызстан',
    name_kg: 'MegaCom Кыргызстан',
    max_payment_amount: 10000,
    min_payment_amount: 10,
    image: 'megacom.png',
    parameters: [
      { system_name: 'phone_num', name_ru: 'Номер телефона', min_length: 12, max_length: 12, keyboard: 'Digital', display_order: 1, is_main_requisite: true, mask_valid: '^996\\d{9}$', is_required: true, type: 'Default' },
    ]
  },
  {
    id_service: 1077,
    name_ru: 'Северэлектро (Кыргызстан)',
    name_kg: 'Севэрэлектр',
    max_payment_amount: 5000,
    min_payment_amount: 10,
    image: 'severelectro.png',
    parameters: [
      { system_name: 'account_num', name_ru: 'Номер лицевого счёта', min_length: 8, max_length: 20, keyboard: 'Digital', display_order: 1, is_main_requisite: true, mask_valid: '^\\d{8,20}$', is_required: true, type: 'Default' },
    ]
  }
]

export default class MockProvider extends BaseProvider {
  constructor(config) {
    super(config)
    this.token = 'mock-token-123'
    this.tokenExpires = new Date(Date.now() + 86400000).toISOString()
  }

  async auth() {
    // Всегда успешно
    this.token = 'mock-token-123'
    this.tokenExpires = new Date(Date.now() + 86400000).toISOString()
  }

  async getServices() {
    return MOCK_SERVICES
  }

  async validate({ requisite, params, bearer }) {
    // Simulate validation - accept any 12-digit number starting with 996
    const isValid = /^996\d{9}$/.test(requisite) || /^\d{8,20}$/.test(requisite)
    return {
      result: isValid ? 'exist' : 'absent',
      details: isValid ? 'Абонент найден' : 'Абонент не найден',
      possible: isValid,
      commissions: ''
    }
  }

  async pay({ bearer, account, amount, currency }) {
    return { package_id: `mock-pkg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` }
  }

  async status(packageId) {
    return { provider_status: 'COMPLETE', transaction_state: 'PAYMENT', description: null }
  }

  async cancel(packageId) {
    return { result: true }
  }

  async precheck({ bearer, amount }) {
    const commission = parseFloat(amount) * 0.033
    return {
      total_amount: (parseFloat(amount) + commission).toFixed(2),
      supplier_amount: amount,
      commissions: {
        total: commission.toFixed(2),
        dealer: (commission * 0.6).toFixed(2),
        payment_system: (commission * 0.4).toFixed(2)
      }
    }
  }

  async getDictionary(code) {
    return []
  }
}
