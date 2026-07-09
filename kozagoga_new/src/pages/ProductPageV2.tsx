// ─── ProductPage v2 — поддержка услуг, регионов, динамических полей
// Использует /api/v1/products/:slug и OrderForm
// ───────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Loader2, ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CifraProductCard } from '@/components/CifraMallCard'
import OrderForm from '@/components/v2/OrderForm'

export default function ProductPageV2() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const API_BASE = window.__KOZAGOGA_API_URL__ || ''

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        const res = await fetch(`${API_BASE}/api/v1/products/${slug}`)
        if (!res.ok) throw new Error('Product not found')
        const data = await res.json()
        setProduct(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    })()
  }, [slug])

  const handleOrderCreated = useCallback((order) => {
    if (order.payment?.redirect_url) {
      window.location.href = order.payment.redirect_url
    } else {
      navigate(`/orders/${order.order_id}`)
    }
  }, [navigate])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#08080C] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#7850FF]" />
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-[#08080C] flex flex-col items-center justify-center gap-4 text-gray-400">
        <span className="text-6xl">😕</span>
        <p className="text-lg">{error || 'Товар не найден'}</p>
        <Button variant="outline" onClick={() => navigate('/catalog')}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Вернуться в каталог
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#08080C]">
      <div className="max-w-[800px] mx-auto px-4 sm:px-6 py-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-white transition-colors mb-6"
        >
          <ChevronLeft className="h-4 w-4" />
          Назад
        </button>

        <div className="bg-gradient-to-br from-[#0D0D12] via-[#1A1A24] to-[#0A0A0F] rounded-[32px] p-8 sm:p-10 border border-[rgba(255,255,255,0.06)] mb-8">
          <div className="flex items-start gap-6">
            {product.image && (
              <img
                src={product.image}
                alt={product.name}
                className="w-24 h-24 sm:w-32 sm:h-32 object-contain shrink-0"
              />
            )}
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">{product.name}</h1>
              {product.short_description && (
                <p className="text-sm text-gray-400">{product.short_description}</p>
              )}
              {product.description && (
                <p className="text-sm text-gray-500 mt-2">{product.description}</p>
              )}
            </div>
          </div>
        </div>

        <OrderForm
          product={product}
          onOrderCreated={handleOrderCreated}
        />
      </div>
    </div>
  )
}
