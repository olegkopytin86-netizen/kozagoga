/**
 * Форматирование денежных сумм.
 * Использует Intl.NumberFormat для правильного отображения валют.
 */
export function formatMoney(value: number | string | null | undefined, currency: string = 'RUB'): string {
  if (value === null || value === undefined || value === '') return ''
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num) || num < 0) return ''
  try {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    }).format(num)
  } catch {
    return `${num} ${currency}`
  }
}

/**
 * Форматирование номинала (без валютного знака, только число + код валюты).
 * Пример: "1 000 CNY"
 */
export function formatNominal(value: number | string | null | undefined, currency: string = 'RUB'): string {
  if (value === null || value === undefined || value === '') return ''
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num) || num < 0) return ''
  try {
    const formatted = new Intl.NumberFormat('ru-RU', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    }).format(num)
    return `${formatted} ${currency}`
  } catch {
    return `${num} ${currency}`
  }
}
