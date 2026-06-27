// Wishlist API client
import { API_BASE, headers } from './api'

export interface WishlistItem {
  id: string
  product_id: string
  variant_id: string | null
  notify_on_sale: boolean
  notify_reminder: string | null
  created_at: string
  name: string
  slug: string
  price: string
  price_min: string | null
  price_max: string | null
  image_url: string | null
  rating: string | null
  old_price: string | null
}

export async function fetchWishlist(): Promise<WishlistItem[]> {
  const res = await fetch(`${API_BASE}/api/wishlist`, { headers: headers() })
  if (!res.ok) throw new Error('Failed to fetch wishlist')
  return res.json()
}

export async function addToWishlist(productId: string, variantId?: string): Promise<void> {
  await fetch(`${API_BASE}/api/wishlist`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ product_id: productId, variant_id: variantId || null }),
  })
}

export async function removeFromWishlist(id: string): Promise<void> {
  await fetch(`${API_BASE}/api/wishlist/${id}`, {
    method: 'DELETE',
    headers: headers(),
  })
}

export async function updateWishlistItem(id: string, data: { notify_on_sale?: boolean; notify_reminder?: string }): Promise<void> {
  await fetch(`${API_BASE}/api/wishlist/${id}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify(data),
  })
}
