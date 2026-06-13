// Provider Factory — загружает и кэширует провайдеров
// Использует конфигурацию для создания экземпляров провайдеров

import { getActiveProviders } from '../config-loader.js'
import HyperionProvider from './hyperion-provider.js'
import MockProvider from './mock-provider.js'

// Реестр классов провайдеров
const PROVIDER_CLASSES = {
  hyperion: HyperionProvider,
  mock: MockProvider
}

const instances = new Map()

/**
 * Инициализирует всех активных провайдеров
 * Вызывается при старте сервера
 */
export async function initProviders() {
  const activeProviders = getActiveProviders()

  for (const cfg of activeProviders) {
    const ProviderClass = PROVIDER_CLASSES[cfg.code]
    if (!ProviderClass) {
      console.warn(`[providers] Неизвестный провайдер: ${cfg.code}, пропускаю`)
      continue
    }

    try {
      const provider = new ProviderClass(cfg)
      await provider.auth()
      instances.set(cfg.code, provider)
      console.log(`[providers] ${cfg.code} инициализирован`)
    } catch (err) {
      console.error(`[providers] Ошибка инициализации ${cfg.code}:`, err.message)
    }
  }
}

/**
 * Возвращает провайдера по коду
 * @param {string} code — код провайдера (hyperion, paybox, ...)
 * @returns {BaseProvider}
 */
export function getProvider(code) {
  if (!code) {
    throw new Error('provider_code не указан')
  }
  const provider = instances.get(code)
  if (!provider) {
    throw new Error(`Провайдер "${code}" не найден или не инициализирован`)
  }
  return provider
}

/**
 * Возвращает список всех активных провайдеров
 */
export function listProviders() {
  return Array.from(instances.values()).filter(p => p.enabled)
}

/**
 * Проверяет, зарегистрирован ли провайдер с таким кодом
 */
export function hasProvider(code) {
  return instances.has(code)
}
