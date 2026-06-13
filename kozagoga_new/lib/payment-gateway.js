// PaymentGateway — абстракция платёжного шлюза
// Все адаптеры должны реализовать этот интерфейс

export default class PaymentGateway {
  constructor(config) {
    this.code = config.code || 'unknown'
  }

  /**
   * Создание платежа
   * @param {object} req - { order_id, amount, currency, description, user, return_url }
   * @returns {{ redirect_url: string, transaction_id: string }}
   */
  async createPayment(req) {
    throw new Error(`[${this.code}] createPayment() не реализован`)
  }

  /**
   * Обработка webhook от платёжного шлюза
   * @param {object} req - тело запроса (express req)
   * @returns {{ transaction_id: string, status: string }}
   */
  async processWebhook(req) {
    throw new Error(`[${this.code}] processWebhook() не реализован`)
  }

  /**
   * Возврат платежа
   * @param {string} transactionId
   * @param {number} amount
   */
  async refundPayment(transactionId, amount) {
    throw new Error(`[${this.code}] refundPayment() не реализован`)
  }
}
