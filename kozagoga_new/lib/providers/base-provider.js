// BaseProvider — Абстрактный класс для всех провайдеров услуг
// Все реализации должны наследовать этот класс и переопределять методы.

export default class BaseProvider {
  constructor(config) {
    this.code = config.code
    this.label = config.label_ru || config.code
    this.enabled = config.enabled !== false
    this.token = null
    this.tokenExpires = null
  }

  /**
   * Авторизация провайдера. Вызывается при старте и при 401.
   * Должен установить this.token и this.tokenExpires
   */
  async auth() {
    throw new Error(`[${this.code}] auth() не реализован`)
  }

  /**
   * Проверка, действителен ли токен
   */
  isTokenValid() {
    if (!this.token) return false
    if (!this.tokenExpires) return false
    // Обновляем за 5 минут до истечения
    return Date.now() < new Date(this.tokenExpires).getTime() - 300000
  }

  /**
   * Гарантирует валидный токен. Вызывает auth(), если нужно.
   */
  async ensureAuth() {
    if (!this.isTokenValid()) {
      console.log(`[${this.code}] Токен истёк или отсутствует, переавторизация...`)
      await this.auth()
    }
    return this.token
  }

  /**
   * Получить список сервисов провайдера
   * @returns {Array<{id: string, name: string, image: string, min_amount: number, max_amount: number, fields: Array}>}
   */
  async getServices() {
    throw new Error(`[${this.code}] getServices() не реализован`)
  }

  /**
   * Валидация реквизита
   * @param {object} req - { requisite, params, bearer }
   * @returns {{ result: string, details: string, possible: boolean, commissions: string }}
   */
  async validate(req) {
    throw new Error(`[${this.code}] validate() не реализован`)
  }

  /**
   * Отправка платежа провайдеру
   * @param {object} req - { bearer, account, amount, currency, info, exclude_commission }
   * @returns {{ package_id: string }}
   */
  async pay(req) {
    throw new Error(`[${this.code}] pay() не реализован`)
  }

  /**
   * Проверка статуса транзакции
   * @param {string} packageId
   * @returns {{ provider_status: string, transaction_state: string, description: string }}
   */
  async status(packageId) {
    throw new Error(`[${this.code}] status() не реализован`)
  }

  /**
   * Отмена транзакции
   * @param {string} packageId
   */
  async cancel(packageId) {
    throw new Error(`[${this.code}] cancel() не реализован`)
  }

  /**
   * Предрасчёт комиссий
   * @param {object} req - { bearer, amount, exclude_commission }
   * @returns {{ total_amount: string, commissions: object }}
   */
  async precheck(req) {
    throw new Error(`[${this.code}] precheck() не реализован`)
  }

  /**
   * Получение справочника (Dictionary)
   * @param {string} code
   */
  async getDictionary(code) {
    throw new Error(`[${this.code}] getDictionary() не реализован`)
  }

  /**
   * Нормализует статус провайдера в единый provider_status
   * Должен быть переопределён для каждого провайдера
   */
  normalizeStatus(providerStatus) {
    return providerStatus
  }
}
