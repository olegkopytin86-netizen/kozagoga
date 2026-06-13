// Configuration Loader
// Загружает integrations.yaml, предоставляет единый доступ к конфигурации

import { readFileSync, watchFile } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import yaml from 'js-yaml'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CONFIG_PATH = join(__dirname, '..', 'config', 'integrations.yaml')

let config = null
let configVersion = 0

/**
 * Загружает или перезагружает конфигурацию из YAML-файла.
 */
export function loadConfig() {
  try {
    const raw = readFileSync(CONFIG_PATH, 'utf-8')
    config = yaml.load(raw)
    configVersion++
    console.log(`[config] Загружена версия ${configVersion}`)
    return config
  } catch (err) {
    console.error('[config] Ошибка загрузки:', err.message)
    if (!config) throw new Error('Конфигурация не загружена')
    return config
  }
}

/** Возвращает текущий конфиг */
export function getConfig() {
  if (!config) return loadConfig()
  return config
}

/** Массив активных провайдеров */
export function getActiveProviders() {
  const cfg = getConfig()
  return (cfg.providers?.active || []).filter(p => p.enabled !== false)
}

/** Маппинг payment_method → адаптер */
export function getPaymentGatewayMapping() {
  return getConfig().payment_gateways || {}
}

/** Параметры polling'а */
export function getPollingConfig() {
  const cfg = getConfig()
  return cfg.polling || { active_interval_sec: 5, active_max_attempts: 24, background_interval_hours: 1, background_max_hours: 24 }
}

/** Параметры кэша */
export function getCacheConfig() {
  return getConfig().cache || { service_list_ttl_sec: 3600, service_list_strategy: 'time_based' }
}

/** Retry-политика */
export function getRetryConfig() {
  return getConfig().retry || { max_attempts: 3, base_timeout_ms: 1000, backoff_strategy: 'exponential', backoff_multiplier: 2 }
}

/** Rate limits */
export function getRateLimits() {
  return getConfig().rate_limits || {}
}

/** Hot-reload */
export function enableHotReload() {
  watchFile(CONFIG_PATH, (curr, prev) => {
    if (curr.mtimeMs !== prev.mtimeMs) {
      console.log('[config] Файл изменён, перезагружаю...')
      loadConfig()
    }
  })
  console.log('[config] Hot-reload включён')
}

// Загружаем при импорте
loadConfig()
