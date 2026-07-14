/**
 * SberPay — нативная интеграция сценариев mWeb2app
 * Спецификация: аулгоритм перебора диплинков для iOS
 *
 * iOS: 6 фиксированных deep link схем (строго в порядке документации)
 * Android: 1 deep link + фолбек на лендинг
 *
 * После каждой попытки — clearMessage (редирект на свою же страницу
 * с обновлённым query-параметром sberpay_step) для автоматического
 * скрытия алерта Safari об ошибке, если ссылку не удалось открыть.
 */

// ─── Deep link схемы для iOS (строгий порядок из документации SberPay) ───
export const SBERPAY_IOS_SCHEMES = [
  'onlineios-app://sbolpay/invoicing/v2',
  'startonline://sbolpay/invoicing/v2',
  'onlineappmobile://sbolpay/invoicing/v2',
  'budgetonline-ios://sbolpay/invoicing/v2',
  'btripsexpenses://sbolpay/invoicing/v2',
  'ios-app-smartonline://sbolpay/invoicing/v2',
] as const

// ─── Лендинг Сбера (фолбек, когда ни один диплинк не сработал) ───
export const SBERPAY_LANDING = 'https://www.sberbank.ru/ru/person/payments/online_sberpay'

// ─── Ключи sessionStorage ───
const SS_KEY_BANK_ID = 'sberpay_bankInvoiceId'
const SS_KEY_ORDER_NUM = 'sberpay_orderNumber'

// ─── Имя query-параметра для шага ───
const STEP_PARAM = 'sberpay_step'

/**
 * Извлечь bankInvoiceId и orderNumber из первого deep link,
 * полученного от API платежного шлюза.
 * Если deepLink пустой — возвращает null.
 */
function parseParamsFromDeepLink(deepLink: string): { bankInvoiceId: string; orderNumber: string } | null {
  try {
    const url = new URL(deepLink)
    const bankInvoiceId = url.searchParams.get('bankInvoiceId')
    const orderNumber = url.searchParams.get('orderNumber')
    if (bankInvoiceId && orderNumber) {
      return { bankInvoiceId, orderNumber }
    }
    return null
  } catch {
    return null
  }
}

/**
 * Построить полный deep link для заданной схемы с параметрами.
 */
function buildDeepLink(scheme: string, bankInvoiceId: string, orderNumber: string): string {
  return `${scheme}?bankInvoiceId=${encodeURIComponent(bankInvoiceId)}&orderNumber=${encodeURIComponent(orderNumber)}`
}

/**
 * Начать перебор диплинков SberPay.
 * Вызывается из обработчика клика после получения payment от API.
 *
 * @param deepLinksFromApi — массив deep_links из ответа API (нужен для bankInvoiceId / orderNumber)
 */
export function initiateSberPay(deepLinksFromApi: string[]): void {
  // Извлекаем bankInvoiceId и orderNumber из первого deep link API
  const firstLink = deepLinksFromApi?.[0]
  if (!firstLink) {
    // Нет данных — сразу фолбек
    window.location.href = SBERPAY_LANDING
    return
  }

  const params = parseParamsFromDeepLink(firstLink)
  if (!params) {
    window.location.href = SBERPAY_LANDING
    return
  }

  // Сохраняем в sessionStorage (переживает редиректы в рамках вкладки)
  sessionStorage.setItem(SS_KEY_BANK_ID, params.bankInvoiceId)
  sessionStorage.setItem(SS_KEY_ORDER_NUM, params.orderNumber)

  // Определяем платформу
  const ua = navigator.userAgent
  const isIOS = /iPhone|iPad|iPod/i.test(ua)
  const isAndroid = /Android/i.test(ua)

  if (isIOS) {
    // iOS: стартуем перебор с шага 0
    startIOSSequence(params.bankInvoiceId, params.orderNumber, 0)
  } else if (isAndroid) {
    // Android: одна попытка + фолбек
    startAndroidSequence(params.bankInvoiceId, params.orderNumber)
  } else {
    // Desktop / неизвестная платформа: QR или сразу фолбек
    window.location.href = SBERPAY_LANDING
  }
}

/**
 * iOS: последовательный перебор 6 схем с 50ms интервалом
 * и clearMessage после каждой попытки.
 *
 * Каждый шаг:
 *   1. window.location.href = deepLink
 *   2. setTimeout(50ms)
 *   3. clearMessage = window.location.href = pathname?step=N+1
 *      (редирект на свою же страницу скрывает алерт Safari)
 */
function startIOSSequence(bankInvoiceId: string, orderNumber: string, startIndex: number): void {
  if (startIndex >= SBERPAY_IOS_SCHEMES.length) {
    // Все ссылки перебраны — приложение не найдено → фолбек
    window.location.href = SBERPAY_LANDING
    return
  }

  const link = buildDeepLink(SBERPAY_IOS_SCHEMES[startIndex], bankInvoiceId, orderNumber)
  const nextStep = startIndex + 1

  // 1. Открыть deep link
  window.location.href = link

  // 2. Через 50ms — clearMessage + редирект на следующий шаг
  setTimeout(() => {
    const currentPath = window.location.pathname
    window.location.href = `${currentPath}?${STEP_PARAM}=${nextStep}`
  }, 50)
}

/**
 * Android:
 *   1. setTimeout(openSberpay, 100)
 *   2. clearMessage
 *   3. setTimeout(openLandingpage, 800)
 */
function startAndroidSequence(bankInvoiceId: string, orderNumber: string): void {
  const link = buildDeepLink(SBERPAY_IOS_SCHEMES[0], bankInvoiceId, orderNumber)

  // Открыть deep link
  window.location.href = link

  // clearMessage через 100ms
  setTimeout(() => {
    const currentPath = window.location.pathname
    window.location.href = `${currentPath}`
  }, 100)

  // Фолбек на лендинг через 800ms (если ни один диплинк не сработал)
  setTimeout(() => {
    window.location.href = SBERPAY_LANDING
  }, 800)
}

/**
 * Продолжить прерванный перебор (при загрузке страницы с sberpay_step).
 * Должна вызываться в useEffect компонента на этапе инициализации.
 *
 * Возвращает true, если был активный шаг и обработка взята на себя.
 */
export function checkSberPayStep(): boolean {
  const params = new URLSearchParams(window.location.search)
  const stepStr = params.get(STEP_PARAM)

  if (stepStr === null) {
    return false
  }

  const step = parseInt(stepStr, 10)
  if (isNaN(step) || step < 0) {
    return false
  }

  const bankInvoiceId = sessionStorage.getItem(SS_KEY_BANK_ID)
  const orderNumber = sessionStorage.getItem(SS_KEY_ORDER_NUM)

  if (!bankInvoiceId || !orderNumber) {
    // Нет сохранённых параметров — ничего не делаем (чистим URL)
    cleanStepParam()
    return false
  }

  // Определяем платформу
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent)

  if (isIOS) {
    if (step >= SBERPAY_IOS_SCHEMES.length) {
      // Все шаги исчерпаны — фолбек
      cleanStepParam()
      sessionStorage.removeItem(SS_KEY_BANK_ID)
      sessionStorage.removeItem(SS_KEY_ORDER_NUM)
      window.location.href = SBERPAY_LANDING
      return true
    }

    // Запускаем следующий шаг
    setTimeout(() => {
      startIOSSequence(bankInvoiceId, orderNumber, step)
    }, 0)
    return true
  }

  // Не iOS — очищаем step, оставляем обработку иницииатору
  cleanStepParam()
  return false
}

/**
 * Удалить query-параметр sberpay_step из URL без перезагрузки страницы.
 */
function cleanStepParam(): void {
  const url = new URL(window.location.href)
  url.searchParams.delete(STEP_PARAM)
  window.history.replaceState({}, '', url.toString())
}

/**
 * Очистить все данные SberPay (при ошибке или отмене).
 */
export function cleanupSberPay(): void {
  cleanStepParam()
  sessionStorage.removeItem(SS_KEY_BANK_ID)
  sessionStorage.removeItem(SS_KEY_ORDER_NUM)
}
