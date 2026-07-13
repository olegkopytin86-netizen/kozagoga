/**
 * Хук для получения продуктов из API.
 * Используется на главной и в каталоге.
 */
import { useState, useEffect } from 'react'
import type { ProductDTO, ProductsResponse } from '@/types/product'

const API_BASE = '/api'

interface UseProductsResult {
  products: ProductDTO[]
  loading: boolean
  error: string | null
}

export function useProducts(params?: Record<string, string>): UseProductsResult {
  const [products, setProducts] = useState<ProductDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    const query = params
      ? '?' + new URLSearchParams(params).toString()
      : ''

    fetch(`${API_BASE}/products${query}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data: ProductsResponse) => {
        if (!cancelled) {
          setProducts(data.items || [])
          setLoading(false)
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(err.message)
          setLoading(false)
        }
      })

    return () => { cancelled = true }
  }, [JSON.stringify(params)])

  return { products, loading, error }
}
