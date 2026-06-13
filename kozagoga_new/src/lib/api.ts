// API Helper — единый клиент для работы с бэкендом
// Использует токен из AuthContext

// API_BASE — используем относительный путь (nginx проксирует /api/ на backend)
// Для переопределения: window.__KOZAGOGA_API_URL__ = 'https://api.example.com'
const API_BASE = typeof window !== 'undefined'
  ? (window.__KOZAGOGA_API_URL__ || '')
  : ''

function getToken(): string | null {
  try {
    return localStorage.getItem('kozagogo_token')
  } catch {
    return null
  }
}

function headers(extra: Record<string, string> = {}): Record<string, string> {
  const h: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extra,
  }
  const token = getToken()
  if (token) h['Authorization'] = `Bearer ${token}`
  return h
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(body.error || `HTTP ${res.status}`)
  }
  return res.json()
}

// ─── Orders ────────────────────────────────────────────
export async function createOrder(items: { product_id: string; quantity: number }[], payment_method?: string) {
  const res = await fetch(`${API_BASE}/api/orders`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ items, payment_method }),
  })
  return handleResponse<{ id: string; status: string; total: number; payment_status: string }>(res)
}

export async function processPayment(order_id: string, payment_method: string) {
  const res = await fetch(`${API_BASE}/api/payments/process`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ order_id, payment_method }),
  })
  return handleResponse<{ redirect_url: string | null; transaction_id: string; status: string }>(res)
}

export async function getOrderStatus(transaction_id: string, provider_code?: string) {
  const res = await fetch(`${API_BASE}/api/status`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ transaction_id, provider_code }),
  })
  return handleResponse<{ provider_status: string; description: string }>(res)
}

// ─── Wallet ────────────────────────────────────────────
export async function getWalletBalance() {
  const res = await fetch(`${API_BASE}/api/wallet/balance`, {
    headers: headers(),
  })
  return handleResponse<{ balance: number; updated_at: string }>(res)
}

export async function walletCredit(amount: number, description?: string) {
  const res = await fetch(`${API_BASE}/api/wallet/credit`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ amount, description }),
  })
  return handleResponse<{ balance: number; transaction: WalletTransaction }>(res)
}

export async function getWalletTransactions(limit = 50, offset = 0) {
  const res = await fetch(`${API_BASE}/api/wallet/transactions?limit=${limit}&offset=${offset}`, {
    headers: headers(),
  })
  return handleResponse<WalletTransaction[]>(res)
}

// ─── Services ──────────────────────────────────────────
export async function getServices() {
  const res = await fetch(`${API_BASE}/api/services`)
  return handleResponse<ServiceItem[]>(res)
}

export async function validateRequisite(product_id: string, requisite: string, params?: Record<string, string>) {
  const res = await fetch(`${API_BASE}/api/validate`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ product_id, requisite, params }),
  })
  return handleResponse<{ result: string; details: string; possible: boolean }>(res)
}

// ─── Types ─────────────────────────────────────────────
export interface WalletTransaction {
  id: string
  user_id: string
  order_id: string | null
  type: 'credit' | 'debit' | 'refund'
  amount: string
  balance_before: string
  balance_after: string
  description: string | null
  created_at: string
}

export interface ServiceField {
  key: string
  label: string
  type: string
  required: boolean
  min_length?: number
  max_length?: number
  keyboard?: 'numeric' | 'text'
  mask?: string
  is_main_requisite: boolean
  display_order: number
}

export interface ServiceItem {
  id: string
  name_ru: string
  image: string | null
  min_amount: number
  max_amount: number
  fields: ServiceField[]
  provider_code: string
}

// ─── REST helper ───────────────────────────────────────
export async function restGet<T = any>(table: string, params?: Record<string, string>) {
  const qs = params ? '?' + new URLSearchParams(params).toString() : ''
  const res = await fetch(`${API_BASE}/api/rest/v1/${table}${qs}`, {
    headers: headers(),
  })
  return handleResponse<T[]>(res)
}

// Добавляем тип в window для API_BASE
declare global {
  interface Window {
    __KOZAGOGA_API_URL__?: string
  }
}
