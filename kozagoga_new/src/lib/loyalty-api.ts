// Loyalty API client
import { API_BASE, headers } from './api'

export interface LoyaltyInfo {
  level: {
    id: string
    code: string
    name: string
    cashback_rate: number
    discount_percent: number
    free_delivery: boolean
    priority_support: boolean
    badge_icon: string | null
    color_hex: string | null
    min_spent: number
  }
  next_level: {
    name: string
    min_spent: number
    cashback_rate: number
  } | null
  total_spent: number
  progress: number
  spent_to_next: number
  active_from: string | null
}

export async function getLoyaltyInfo(): Promise<LoyaltyInfo> {
  const res = await fetch(`${API_BASE}/api/profile/loyalty`, { headers: headers() })
  if (!res.ok) throw new Error('Failed to fetch loyalty info')
  return res.json()
}
