export type UserRole = "user" | "admin"

export interface AppUser {
  id: string
  email: string
  role: UserRole
  created_at: string
}

export interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  sort_order: number | null
  created_at: string
}

export interface Product {
  id: string
  name: string
  slug: string
  description: string
  short_description: string | null
  price: number
  old_price: number | null
  category_id: string | null
  category_slug?: string | null
  delivery_time: string | null
  region: string | null
  rating: number | null
  review_count: number | null
  stock: number | null
  is_active: boolean
  is_featured: boolean
  seller_name: string | null
  seller_verified: boolean
  features: string[] | null
  faq: { question: string; answer: string }[] | null
  tags: string[] | null
  created_at: string
  updated_at: string | null
}

export interface ProductImage {
  id: string
  product_id: string
  url: string
  alt: string | null
  sort_order: number | null
  created_at: string
}

export interface Order {
  id: string
  user_id: string
  status: string | null
  total: number
  payment_status: string | null
  payment_method: string | null
  created_at: string
  updated_at: string | null
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  product_name: string
  quantity: number
  price: number
  created_at: string
}

export interface Payment {
  id: string
  order_id: string
  amount: number
  method: string
  status: string
  created_at: string
}

export interface Review {
  id: string
  product_id: string
  user_id: string
  rating: number
  text: string | null
  created_at: string
}

export interface WalletBalance {
  id: string
  user_id: string
  balance: number
  updated_at: string
}

export interface AdminLog {
  id: string
  admin_id: string
  action: string
  details: string | null
  created_at: string
}
