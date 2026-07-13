/**
 * Типы для продуктов CifraMall — DGoods Digital Goods
 */

export interface ProductVariant {
  id: string
  region: string
  denomination: number
  denom_currency: string
  price: number
  old_price?: number | null
  cost_price?: number | null
  is_active: boolean
  in_stock: boolean
  stock?: number
  external_data?: any
}

export interface ProductPricing {
  type: 'fixed' | 'custom'
  nominal: number | null
  nominalCurrency: string
  price: number | null
  priceCurrency: string
  minNominal: number | null
  maxNominal: number | null
  minPrice: number | null
  maxPrice: number | null
}

export interface ProductDTO {
  id: string
  name: string
  slug: string
  short_description?: string
  description?: string
  publisher?: string
  category_name?: string
  category_slug?: string
  parent_category_name?: string
  parent_category_slug?: string
  image?: string
  image_url?: string
  price_min?: string
  price_max?: string
  currency?: string
  rating?: string
  review_count?: number
  is_featured?: boolean
  seller_name?: string
  seller_verified?: boolean
  product_type?: string
  delivery_type?: string
  delivery_time?: string
  region?: string
  tags?: string[]
  features?: Record<string, any>
  pricing?: ProductPricing
  variants?: ProductVariant[]
  active_variants?: string
  min_variant_price?: string
  max_variant_price?: string
  min_denomination?: string
  max_denomination?: string
  denom_currency?: string
  delivery_info?: {
    type: string
    description: string
  }
  available_regions?: string[]
  related_products?: any[]
  created_at?: string
}

export interface ProductsResponse {
  items: ProductDTO[]
  pagination: {
    page: number
    limit: number
    total: number
    total_pages: number
  }
}
