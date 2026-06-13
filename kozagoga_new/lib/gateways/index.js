// Payment Gateway Factory
// Загружает шлюзы из конфига, поддерживает fallback chain

import { getConfig } from '../config-loader.js'
import SberbankGateway from './sberbank.js'
import YooKassaGateway from './yookassa.js'
import WalletGateway from './wallet.js'

/**
 * Реестр классов шлюзов.
 * При добавлении нового — зарегистрировать здесь.
 */
const GATEWAY_CLASSES = {
  sberbank: SberbankGateway,
  yookassa: YooKassaGateway,
  wallet: WalletGateway,
}

/**
 * Инициализирует все зарегистрированные шлюзы
 * @param {object} pool - pg pool (для wallet)
 */
export function initGateways(pool) {
  const instances = {}

  for (const [code, Cls] of Object.entries(GATEWAY_CLASSES)) {
    try {
      if (code === 'wallet') {
        instances[code] = new Cls({ code }, pool)
      } else {
        instances[code] = new Cls({ code })
      }
    } catch (err) {
      console.error(`[gateways] Ошибка инициализации ${code}:`, err.message)
    }
  }

  return instances
}

/**
 * Разрешает метод оплаты → шлюз, с учётом primary/fallback из конфига
 *
 * Формат конфига:
 *   payment_gateways:
 *     card:
 *       primary: sberbank
 *       fallback: yookassa
 *     sbp: sberbank   # упрощённая запись
 *
 * @param {string} paymentMethod - card | sbp | wallet | yoomoney
 * @param {object} gateways - map code → instance
 * @returns {{ gateway: object, code: string }}
 */
export function resolveGateway(paymentMethod, gateways) {
  const cfg = getConfig()
  const mapping = cfg.payment_gateways || {}

  const entry = mapping[paymentMethod]

  if (!entry) {
    throw new Error(`Неизвестный метод оплаты: ${paymentMethod}`)
  }

  // Упрощённая запись: строка
  if (typeof entry === 'string') {
    const gateway = gateways[entry]
    if (!gateway) throw new Error(`Шлюз ${entry} не инициализирован`)
    return { gateway, code: entry }
  }

  // Расширенная запись: { primary, fallback }
  const primaryCode = entry.primary || entry
  const fallbackCode = entry.fallback

  // Пробуем primary
  let gateway = gateways[primaryCode]
  if (gateway) {
    return { gateway, code: primaryCode }
  }

  // Fallback
  if (fallbackCode) {
    gateway = gateways[fallbackCode]
    if (gateway) {
      console.warn(`[gateways] ${primaryCode} недоступен, fallback на ${fallbackCode}`)
      return { gateway, code: fallbackCode }
    }
  }

  throw new Error(`Шлюзы для ${paymentMethod} не доступны (primary=${primaryCode}, fallback=${fallbackCode})`)
}
