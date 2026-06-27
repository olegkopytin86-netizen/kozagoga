// Referral API client
import { API_BASE, headers } from './api'

export interface ReferralInfo {
  code: string
  referral_count: number
  total_earned: number
  referral_link: string
  invites: {
    id: string
    status: string
    created_at: string
    reward_amount: number | null
    reward_given: boolean
    referred_email: string
  }[]
}

export async function getReferralInfo(): Promise<ReferralInfo> {
  const res = await fetch(`${API_BASE}/api/profile/referral`, { headers: headers() })
  if (!res.ok) throw new Error('Failed to fetch referral info')
  return res.json()
}
