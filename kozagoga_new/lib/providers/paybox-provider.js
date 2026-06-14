// PayBox Provider — заглушка для конфигурации
// Провайдер отключён (enabled: false в integrations.yaml)
// Создан для совместимости конфигурации

import BaseProvider from './base-provider.js'

export default class PayBoxProvider extends BaseProvider {
  constructor(config) {
    super(config)
    this.name = 'paybox'
  }

  async auth() {
    throw new Error('[paybox] Провайдер отключён в конфигурации')
  }

  async getServices() {
    throw new Error('[paybox] Провайдер отключён')
  }

  async validate(serviceId, requisite, params) {
    throw new Error('[paybox] Провайдер отключён')
  }

  async pay(serviceId, requisite, amount, orderId, params) {
    throw new Error('[paybox] Провайдер отключён')
  }

  async status(packageId) {
    throw new Error('[paybox] Провайдер отключён')
  }

  async cancel(packageId) {
    throw new Error('[paybox] Провайдер отключён')
  }

  async precheck(serviceId, amount, params) {
    throw new Error('[paybox] Провайдер отключён')
  }
}
