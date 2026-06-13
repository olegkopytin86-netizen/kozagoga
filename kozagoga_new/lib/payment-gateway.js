// PaymentGateway — абстракция платёжного шлюза
// Все адаптеры должны реализовать этот интерфейс

export default class PaymentGateway {
  constructor(config) {
    this.code = config.code || 'unknown'
  }

  /**
   * Создание платежа
   * @param {object} req - { order_id, amount, currency, description, user, return_url, fail_url }
   * @returns {{ redirect_url: string, transaction_id: string, status: string }}
   */
  async createPayment(req) {
    throw new Error(`[${this.code}] createPayment() не реализован`)
  }

  /**
   * Обработка webhook от платёжного шлюза
   * @param {object} req - тело запроса (express req)
   * @returns {{ transaction_id: string, status: string, metadata: object }}
   */
  async processWebhook(req) {
    throw new Error(`[${this.code}] processWebhook() не реализован`)
  }

  /**
   * Возврат платежа
   * @param {string} transactionId
   * @param {number} amount
   * @returns {{ status: string, transaction_id: string }}
   */
  async refundPayment(transactionId, amount) {
    throw new Error(`[${this.code}] refundPayment() не реализован`)
  }

  /**
   * Получение статуса заказа в платёжном шлюзе
   * @param {string} transactionId - ID заказа в системе шлюза
   * @returns {{ status: string, raw_status: number, amount: number, currency: string }}
   */
  async getOrderStatus(transactionId) {
    throw new Error(`[${this.code}] getOrderStatus() не реализован`)
  }

  /**
   * Отмена необработанного платежа (reverse/hold cancel)
   * @param {string} transactionId
   * @returns {{ success: boolean }}
   */
  async reversePayment(transactionId) {
    throw new Error(`[${this.code}] reversePayment() не реализован`)
  }
}
