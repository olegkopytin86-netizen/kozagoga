// ============================================
// Admin API Client
// CSRF-защищённые запросы к /api/admin/*
// ============================================

const API_BASE = typeof window !== 'undefined'
  ? (window.__KOZAGOGA_API_URL__ || '')
  : ''

/**
 * Читает CSRF-токен из cookie
 */
function getCsrfToken(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)admin_csrf=([^;]*)/)
  return match ? match[1] : null
}

/**
 * Admin API client with CSRF protection
 */
export const adminApi = {
  // ─── Auth ───────────────────────────────────────────

  async login(email: string, password: string) {
    const res = await fetch(`${API_BASE}/api/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    })
    return res.json()
  },

  async logout() {
    const res = await fetch(`${API_BASE}/api/admin/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })
    return res.json()
  },

  async me() {
    const res = await fetch(`${API_BASE}/api/admin/auth/me`, {
      credentials: 'include',
    })
    if (!res.ok) return null
    return res.json()
  },

  // ─── Generic CRUD helpers ───────────────────────────

  async get<T = any>(path: string, params?: Record<string, string>): Promise<T> {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    const res = await fetch(`${API_BASE}/api/admin${path}${qs}`, {
      credentials: 'include',
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText }))
      throw new Error(body.error || `HTTP ${res.status}`)
    }
    return res.json()
  },

  async post<T = any>(path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${API_BASE}/api/admin${path}`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': getCsrfToken() || '',
      },
      body: body ? JSON.stringify(body) : undefined,
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: res.statusText }))
      throw new Error(data.error || `HTTP ${res.status}`)
    }
    return res.json()
  },

  async put<T = any>(path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${API_BASE}/api/admin${path}`, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': getCsrfToken() || '',
      },
      body: body ? JSON.stringify(body) : undefined,
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: res.statusText }))
      throw new Error(data.error || `HTTP ${res.status}`)
    }
    return res.json()
  },

  async patch<T = any>(path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${API_BASE}/api/admin${path}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': getCsrfToken() || '',
      },
      body: body ? JSON.stringify(body) : undefined,
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: res.statusText }))
      throw new Error(data.error || `HTTP ${res.status}`)
    }
    return res.json()
  },

  async delete<T = any>(path: string): Promise<T> {
    const res = await fetch(`${API_BASE}/api/admin${path}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': getCsrfToken() || '',
      },
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: res.statusText }))
      throw new Error(data.error || `HTTP ${res.status}`)
    }
    return res.json()
  },
}

// ─── Admin-specific API methods ───────────────────────

export const adminAuth = {
  login: (email: string, password: string) => adminApi.post('/auth/login', { email, password }),
  logout: () => adminApi.post('/auth/logout'),
  me: () => adminApi.get('/auth/me'),
}

export const adminCategories = {
  list: (params?: Record<string, string>) => adminApi.get('/categories', params),
  get: (id: string) => adminApi.get(`/categories/${id}`),
  create: (data: any) => adminApi.post('/categories', data),
  update: (id: string, data: any) => adminApi.put(`/categories/${id}`, data),
  delete: (id: string) => adminApi.delete(`/categories/${id}`),
  reorder: (items: { id: string; sort_order: number }[]) => adminApi.put('/categories/order', { items }),
}

export const adminProducts = {
  list: (params?: Record<string, string>) => adminApi.get('/products', params),
  get: (id: string) => adminApi.get(`/products/${id}`),
  create: (data: any) => adminApi.post('/products', data),
  update: (id: string, data: any) => adminApi.put(`/products/${id}`, data),
  delete: (id: string) => adminApi.delete(`/products/${id}`),
  batchToggle: (ids: string[], is_active: boolean) => adminApi.post('/products/batch-toggle', { ids, is_active }),
  // Fields
  getFields: (productId: string) => adminApi.get(`/products/${productId}/fields`),
  addField: (productId: string, data: any) => adminApi.post(`/products/${productId}/fields`, data),
  updateField: (productId: string, fieldId: string, data: any) => adminApi.put(`/products/${productId}/fields/${fieldId}`, data),
  deleteField: (productId: string, fieldId: string) => adminApi.delete(`/products/${productId}/fields/${fieldId}`),
  reorderFields: (productId: string, items: { id: string; sort_order: number }[]) => adminApi.put(`/products/${productId}/fields/order`, { items }),
}

export const adminTransactions = {
  list: (params?: Record<string, string>) => adminApi.get('/transactions', params),
  get: (id: string) => adminApi.get(`/transactions/${id}`),
  cancel: (id: string) => adminApi.post(`/transactions/${id}/cancel`),
  refund: (id: string, amount?: number) => adminApi.post(`/transactions/${id}/refund`, { amount }),
  forceComplete: (id: string) => adminApi.post(`/transactions/${id}/force-complete`),
  exportCsv: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return `${API_BASE}/api/admin/transactions/export${qs}`
  },
  stats: (params?: Record<string, string>) => adminApi.get('/transactions/stats', params),
}

export const adminConfig = {
  get: () => adminApi.get('/config'),
  getRaw: () => adminApi.get('/config/raw'),
  saveRaw: (content: string) => adminApi.put('/config/raw', { content }),
  reload: () => adminApi.post('/config/reload'),
  getSection: (section: string) => adminApi.get(`/config/${section}`),
}

export const adminLogs = {
  list: (params?: Record<string, string>) => adminApi.get('/logs', params),
  adminList: (params?: Record<string, string>) => adminApi.get('/logs/admin', params),
  get: (id: number) => adminApi.get(`/logs/${id}`),
  stats: (params?: Record<string, string>) => adminApi.get('/logs/stats', params),
}

export const adminUsers = {
  list: () => adminApi.get('/users'),
  create: (data: { email: string; password: string; role?: string }) => adminApi.post('/users', data),
  update: (id: string, data: { role?: string; is_blocked?: boolean }) => adminApi.patch(`/users/${id}`, data),
  delete: (id: string) => adminApi.delete(`/users/${id}`),
  me: () => adminApi.get('/users/me'),
  changePassword: (current_password: string, new_password: string) => adminApi.patch('/users/me', { current_password, new_password }),
  logs: (params?: Record<string, string>) => adminApi.get('/users/logs', params),
}
