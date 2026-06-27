// Support ticket API client
import { API_BASE, headers } from './api'

export interface Ticket {
  id: string
  category: string
  subject: string
  description?: string
  status: string
  priority: string
  created_at: string
  updated_at: string
  messages?: number
}

export interface TicketMessage {
  id: string
  sender_id: string | null
  sender_type: 'customer' | 'operator' | 'system'
  message: string
  created_at: string
  is_internal: boolean
}

export async function createTicket(data: { category: string; subject: string; description?: string; order_id?: string }): Promise<Ticket> {
  const res = await fetch(`${API_BASE}/api/support/tickets`, {
    method: 'POST', headers: headers(), body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error((await res.json()).error || 'Ошибка')
  return res.json()
}

export async function getTickets(): Promise<Ticket[]> {
  const res = await fetch(`${API_BASE}/api/support/tickets`, { headers: headers() })
  if (!res.ok) throw new Error('Failed to fetch tickets')
  return res.json()
}

export async function getTicketDetail(id: string): Promise<Ticket & { messages: TicketMessage[] }> {
  const res = await fetch(`${API_BASE}/api/support/tickets/${id}`, { headers: headers() })
  if (!res.ok) throw new Error('Failed to fetch ticket')
  return res.json()
}

export async function sendMessage(ticketId: string, message: string): Promise<TicketMessage> {
  const res = await fetch(`${API_BASE}/api/support/tickets/${ticketId}/messages`, {
    method: 'POST', headers: headers(), body: JSON.stringify({ message }),
  })
  if (!res.ok) throw new Error((await res.json()).error || 'Ошибка')
  return res.json()
}

export async function closeTicket(id: string): Promise<void> {
  await fetch(`${API_BASE}/api/support/tickets/${id}/close`, { method: 'POST', headers: headers() })
}

export async function rateTicket(id: string, rating: number): Promise<void> {
  await fetch(`${API_BASE}/api/support/tickets/${id}/rate`, {
    method: 'POST', headers: headers(), body: JSON.stringify({ rating }),
  })
}
