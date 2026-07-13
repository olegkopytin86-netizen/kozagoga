/**
 * Флаги регионов — локальные WebP-изображения с сервера
 */

/** Маппинг кода региона → имя файла (без расширения) */
const FLAG_FILE_MAP: Record<string, string> = {
  TR: 'tr', US: 'us', USA: 'us', PL: 'pl', BR: 'br',
  CA: 'ca', GB: 'gb', CN: 'cn', IN: 'in', NO: 'no',
  EU: 'eu', AE: 'ae', AR: 'ar', 'RU+CIS': 'ru',
}

/** Возвращает URL локального изображения флага или null */
export function getFlagUrl(region: string): string | null {
  const file = FLAG_FILE_MAP[region]
  if (!file) return null
  return `/images/flags/${file}.webp`
}

/** Эмодзи-флаг для регионов без локального файла */
export function getFlagEmoji(region: string): string | null {
  if (region === 'WW') return '🌍'
  return null
}

/** Название региона */
export const REGION_NAME: Record<string, string> = {
  TR: 'Турция', US: 'США', USA: 'США', PL: 'Польша', BR: 'Бразилия',
  CA: 'Канада', GB: 'Великобритания', CN: 'Китай', IN: 'Индия',
  NO: 'Норвегия', EU: 'Европа', AE: 'ОАЭ', AR: 'Аргентина',
  'RU+CIS': 'Россия', WW: 'Мир',
}
