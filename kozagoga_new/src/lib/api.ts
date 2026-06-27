// API Helper — единый клиент для работы с бэкендом
// Использует токен из AuthContext

// API_BASE — используем относительный путь (nginx проксирует /api/ на backend)
// Для переопределения: window.__KOZAGOGA_API_URL__ = 'https://api.example.com'
export const API_BASE = typeof window !== 'undefined'
  ? (window.__KOZAGOGA_API_URL__ || '')
  : ''

function getToken(): string | null {
  try {
    return localStorage.getItem('kozagogo_token')
  } catch {
    return null
  }
}

export function headers(extra: Record<string, string> = {}): Record<string, string> {
  const h: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extra,
  }
  const token = getToken()
  if (token) h['Authorization'] = `Bearer ${token}`
  return h
}

export async function handleResponse<T>(res: Response): Promise<T> {
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
  return handleResponse<{ redirect_url: string | null; deep_links?: string[]; transaction_id: string; status: string }>(res)
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

// ═══════════════════════════════════════════════════════════
// @lork/sdk — совместимая замена
// Полная замена db.from().select().eq()...
// ═══════════════════════════════════════════════════════════

class QueryBuilder {
  private table: string
  private fields: string = '*'
  private params: Record<string, string> = {}
  private orderField: string = ''
  private orderDir: string = ''
  private limitVal: string = ''
  private isSingle: boolean = false

  constructor(table: string) {
    this.table = table
  }

  select(fields: string) {
    this.fields = fields
    this.params['select'] = fields
    return this
  }

  eq(key: string, value: string | number | boolean) {
    this.params[`eq_${key}`] = String(value)
    return this
  }

  neq(key: string, value: string | number) {
    this.params[`neq_${key}`] = String(value)
    return this
  }

  gt(key: string, value: string | number) {
    this.params[`gt_${key}`] = String(value)
    return this
  }

  gte(key: string, value: string | number) {
    this.params[`gte_${key}`] = String(value)
    return this
  }

  lt(key: string, value: string | number) {
    this.params[`lt_${key}`] = String(value)
    return this
  }

  lte(key: string, value: string | number) {
    this.params[`lte_${key}`] = String(value)
    return this
  }

  ilike(key: string, value: string) {
    this.params[`ilike_${key}`] = value
    return this
  }

  order(key: string, opts?: { ascending?: boolean }) {
    this.orderField = key
    this.orderDir = opts?.ascending === false ? 'desc' : 'asc'
    this.params['order'] = `${key}.${this.orderDir}`
    return this
  }

  limit(n: number) {
    this.limitVal = String(n)
    this.params['limit'] = String(n)
    return this
  }

  upsert(data: Record<string, any>, options?: { onConflict?: string }) {
    // POST-запрос для upsert через REST API
    this.params['_upsert'] = 'true'
    if (options?.onConflict) {
      this.params['_on_conflict'] = options.onConflict
    }
    // Сохраняем данные и выполняем
    this._upsertData = data
    return this
  }

  single() {
    this.isSingle = true
    this.params['limit'] = '1'
    return this
  }

  async then(resolve: (value: any) => any, reject?: (reason: any) => any) {
    try {
      const result = await this.execute()
      resolve(result)
    } catch (err) {
      if (reject) reject(err)
    }
  }

  private _upsertData: Record<string, any> | null = null

  async execute<T = any>(): Promise<{ data: T[] | null; error: string | null; count: number }> {
    try {
      // Upsert mode — делаем POST с данными
      if (this.params['_upsert'] && this._upsertData) {
        const onConflict = this.params['_on_conflict']
        delete this.params['_upsert']
        delete this.params['_on_conflict']

        const url = `${API_BASE}/api/rest/v1/${this.table}`
        const body = {
          data: this._upsertData,
          onConflict: onConflict || undefined
        }
        const res = await fetch(url, {
          method: 'PUT',
          headers: headers(),
          body: JSON.stringify(body)
        })

        if (!res.ok) {
          const body = await res.json().catch(() => ({ error: res.statusText }))
          return { data: null, error: body.error || `HTTP ${res.status}`, count: 0 }
        }

        const row = await res.json()
        return { data: [row], error: null, count: 1 }
      }

      const qs = new URLSearchParams(this.params).toString()
      const url = `${API_BASE}/api/rest/v1/${this.table}${qs ? '?' + qs : ''}`
      const res = await fetch(url, { headers: headers() })

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }))
        return { data: null, error: body.error || `HTTP ${res.status}`, count: 0 }
      }

      const rows = await res.json()

      if (this.isSingle) {
        return { data: (rows[0] || null) as any, error: null, count: rows.length }
      }

      return { data: rows, error: null, count: rows.length }
    } catch (err: any) {
      return { data: null, error: err.message || 'Network error', count: 0 }
    }
  }
}

/**
 * Полная замена @lork/sdk — совместимый API
 * Использование: db.from("products").select("*").eq("slug", "foo").single()
 */
export const db = {
  from(table: string) {
    return new QueryBuilder(table)
  },
}

// Добавляем тип в window для API_BASE
declare global {
  interface Window {
    __KOZAGOGA_API_URL__?: string
  }
}
