// Cart API Client — общение с /api/cart/*
// Использует единый API_BASE и headers из api.ts
// ─────────────────────────────────────────────────────────

import { API_BASE, headers as apiHeaders, handleResponse } from './api'

// ─── Types ─────────────────────────────────────────────
export interface ServerCartItem {
  id: string
  cart_id: string
  product_id: string
  variant_id: string | null
  quantity: number
  item_price: string
  currency: string
  gift_to: string | null
  gift_message: string | null
  product_name: string
  slug: string
  image_url: string | null
  is_active: boolean
  delivery_type: string
  product_type: string
  variant_name: string | null
  sku: string | null
  stock: number
  available: boolean
  subtotal: number
}

export interface ServerCartResponse {
  id: string
  status: string
  currency: string
  subtotal: number
  discount_amount: number
  total: number
  coupon_id: string | null
  items: ServerCartItem[]
}

// ─── Session ID management ──────────────────────────
function getSessionId(): string {
  let sid = sessionStorage.getItem('cart_session_id')
  if (!sid) {
    sid = crypto.randomUUID?.() || Math.random().toString(36).substring(2, 15)
    sessionStorage.setItem('cart_session_id', sid)
  }
  return sid
}

function extraHeaders(): Record<string, string> {
  const token = localStorage.getItem('kozagogo_token')
  const h: Record<string, string> = {}
  if (!token) {
    h['x-session-id'] = getSessionId()
  }
  return h
}

// ─── API calls ──────────────────────────────────────

/** GET /api/cart — получить корзину */
export async function fetchCart(): Promise<ServerCartResponse> {
  const res = await fetch(`${API_BASE}/api/cart`, {
    headers: apiHeaders(extraHeaders()),
  })
  return handleResponse<ServerCartResponse>(res)
}

/** POST /api/cart/items — добавить товар */
export async function addToCartAPI(productId: string, quantity = 1, variantId?: string): Promise<any> {
  const body: Record<string, any> = { product_id: productId, quantity }
  if (variantId) body.variant_id = variantId

  const res = await fetch(`${API_BASE}/api/cart/items`, {
    method: 'POST',
    headers: apiHeaders(extraHeaders()),
    body: JSON.stringify(body),
  })
  return handleResponse<any>(res)
}

/** PATCH /api/cart/items/:id — изменить количество */
export async function updateCartItemAPI(itemId: string, quantity: number): Promise<any> {
  const res = await fetch(`${API_BASE}/api/cart/items/${itemId}`, {
    method: 'PATCH',
    headers: apiHeaders(extraHeaders()),
    body: JSON.stringify({ quantity }),
  })
  return handleResponse<any>(res)
}

/** DELETE /api/cart/items/:id — удалить товар */
export async function removeFromCartAPI(itemId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/cart/items/${itemId}`, {
    method: 'DELETE',
    headers: apiHeaders(extraHeaders()),
  })
  return handleResponse<any>(res)
}

/** DELETE /api/cart/clear — очистить корзину */
export async function clearCartAPI(): Promise<any> {
  const res = await fetch(`${API_BASE}/api/cart/clear`, {
    method: 'DELETE',
    headers: apiHeaders(extraHeaders()),
  })
  return handleResponse<any>(res)
}

/** POST /api/cart/coupon — применить промокод */
export async function applyCouponAPI(code: string): Promise<{ discount_amount: number; coupon_code: string }> {
  const res = await fetch(`${API_BASE}/api/cart/coupon`, {
    method: 'POST',
    headers: apiHeaders(),
    body: JSON.stringify({ code }),
  })
  return handleResponse<{ discount_amount: number; coupon_code: string }>(res)
}

/** DELETE /api/cart/coupon — удалить промокод */
export async function removeCouponAPI(): Promise<any> {
  const res = await fetch(`${API_BASE}/api/cart/coupon`, {
    method: 'DELETE',
    headers: apiHeaders(),
  })
  return handleResponse<any>(res)
}
