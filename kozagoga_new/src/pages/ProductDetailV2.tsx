/**
 * ProductDetailV2 — страница продукта DGoods (как igromir)
 * Сетка регионов → выбор номинала → оплата
 */

import { useState, useEffect, useMemo } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Star, Shield, Loader2, CheckCircle, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { getFlagUrl, getFlagEmoji, REGION_NAME } from '@/lib/flags'
import { createOrder, processPayment } from '@/lib/api'
import { formatMoney, formatNominal } from '@/lib/format'
import { initiateSberPay, checkSberPayStep } from '@/lib/sberpay'
import QrDisplay from '@/components/payment/QrDisplay'
import type { ProductDTO, ProductVariant } from '@/types/product'

type PaymentMethod = 'sberpay' | 'sbp'

/** Hero-изображения для DGoods продуктов (как на главной) */
const HERO_IMAGES: Record<string, string> = {
  // Новые DGoods slug
  'steam-gift-card': '/images/products/gamestore-steam.webp',
  'playstation-network-card': '/images/products/gamestore-playstation.webp',
  'xbox-live-gift-card': '/images/products/gamestore-xbox-v3.webp',
  'roblox-gift-card': '/images/products/mts-roblox.png',
  'roblox-payment-card': '/images/products/mts-roblox.png',
  'app-store-itunes-gift-card': '/images/products/gamestore-apple-v2.webp',
  'nintendo-eshop-card': '/images/products/gamestore-nintendo.webp',
  'nintendo-switch-online-membership': '/images/products/gamestore-nintendo.webp',
  'blizzard-gift-card': '/images/products/gamestore-battlenet.webp',
  'world-of-warcraft-time-card': '/images/products/gamestore-battlenet.webp',
  'apex-legends-coins': '/images/products/mts-apex.png',
  'netflix-digital-code': '/images/products/gamestore-netflix.webp',
  'stalcraft-items': '',
  'a-way-out': '',
  'battlefield-6': '',
  'playstation-wallet-pln': '/images/products/gamestore-playstation.webp',
  // Старые id (для маппинга с главной)
  'playstation-network': '/images/products/gamestore-playstation.webp',
  'sony-playstation-card': '/images/products/gamestore-playstation.webp',
  'xbox-live': '/images/products/gamestore-xbox-v3.webp',
  'appstore-itunes': '/images/products/gamestore-apple-v2.webp',
  'roblox-card-pay': '/images/products/mts-roblox.png',
  'nintendo-eshop': '/images/products/gamestore-nintendo.webp',
  'nintendo-online': '/images/products/gamestore-nintendo.webp',
  'netflix-digital': '/images/products/gamestore-netflix.webp',
  'world-of-warcraft-time': '/images/products/gamestore-battlenet.webp',
  'apex-legends': '/images/products/mts-apex.png',
  'apex-legends-xbox': '/images/products/mts-apex.png',
  'stalcraft': '',
}

export default function ProductDetailV2() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()

  const [product, setProduct] = useState<ProductDTO | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null)
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [payError, setPayError] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)
  const [qrData, setQrData] = useState<{ payload: string; orderId: string } | null>(null)

  /** Маппинг старых id (из статического каталога) на новые DGoods slug */
  const SLUG_MAP: Record<string, string> = {
    'playstation-network': 'playstation-network-card',
    'sony-playstation-card': 'playstation-network-card',
    'xbox-live': 'xbox-live-gift-card',
    'appstore-itunes': 'app-store-itunes-gift-card',
    'roblox-card-pay': 'roblox-payment-card',
    'nintendo-eshop': 'nintendo-eshop-card',
    'nintendo-online': 'nintendo-switch-online-membership',
    'netflix-digital': 'netflix-digital-code',
    'world-of-warcraft-time': 'world-of-warcraft-time-card',
    'apex-legends': 'apex-legends-coins',
    'apex-legends-xbox': 'apex-legends-coins',
    'stalcraft': 'stalcraft-items',
  }

  // Проверка шага sberpay при загрузке страницы (перебор диплинков)
  useEffect(() => {
    checkSberPayStep()
  }, [])

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    // Маппинг старых id на новые slug
    const mappedSlug = SLUG_MAP[slug] || slug
    fetch(`/api/products/${mappedSlug}`)
      .then(res => { if (!res.ok) throw new Error('Товар не найден'); return res.json() })
      .then((data: ProductDTO) => {
        setProduct(data)
        const active = data.variants?.filter(v => v.is_active) || []
        if (active.length === 1) {
          setSelectedVariant(active[0])
          setSelectedRegion(active[0].region)
        }
        setLoading(false)
      })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [slug])

  // Группировка вариаций по регионам
  const regionsWithVariants = useMemo(() => {
    if (!product?.variants) return []
    const active = product.variants.filter(v => v.is_active)
    const groups: Record<string, ProductVariant[]> = {}
    for (const v of active) {
      if (!groups[v.region]) groups[v.region] = []
      groups[v.region].push(v)
    }
    return Object.entries(groups)
      .map(([region, variants]) => ({
        region,
        info: { flag: getFlagUrl(region) || getFlagEmoji(region) || '🌍', name: REGION_NAME[region] },
        variants,
        minPrice: Math.min(...variants.map(v => parseFloat(v.price))),
        maxPrice: Math.max(...variants.map(v => parseFloat(v.price))),
        currency: variants[0]?.denom_currency || '',
      }))
      .sort((a, b) => a.minPrice - b.minPrice)
  }, [product])

  // Вариации выбранного региона
  const regionVariants = useMemo(() => {
    if (!selectedRegion || !product?.variants) return []
    return product.variants
      .filter(v => v.region === selectedRegion && v.is_active)
      .sort((a, b) => parseFloat(a.denomination) - parseFloat(b.denomination))
  }, [selectedRegion, product])

  const handleSelectRegion = (region: string) => {
    setSelectedRegion(region)
    setSelectedVariant(null)
    setPayError('')
  }

  const handleSelectVariant = (v: ProductVariant) => {
    setSelectedVariant(v)
    setPayError('')
  }

  const handleSberPayDeeplinks = (deepLinks: string[], onFail: () => void) => {
    if (!deepLinks || deepLinks.length === 0) {
      onFail()
      return
    }

    const ua = navigator.userAgent
    const isDesktop = !/iPhone|iPad|iPod|Android/i.test(ua)

    if (isDesktop) {
      // Desktop: показываем QR-код (ссылка на форму оплаты Сбера)
      onFail()
      return
    }

    // iOS и Android: строгий перебор фиксированных схем из документации
    initiateSberPay(deepLinks)
  }

  const handlePayment = async (method: PaymentMethod) => {
    if (!product || !selectedVariant || !parseFloat(selectedVariant.price)) {
      setPayError('Товар временно недоступен')
      return
    }
    setPayError(''); setIsProcessing(true); setPaymentMethod(method)
    try {
      const order = await createOrder(
        [{ product_id: product.id, variant_id: selectedVariant.id, quantity: 1 }],
        method
      )
      const payment = await processPayment(order.id, method)
      if (payment.redirect_url) {
        // Для SberPay — перебор диплинков (мобайл) или QR (десктоп)
        if (method === 'sberpay' && payment.deep_links?.length > 0) {
          const ua = navigator.userAgent
          const isIOS = /iPhone|iPad|iPod/i.test(ua)
          const isAndroid = /Android/i.test(ua)

          if (isIOS || isAndroid) {
            // Мобильное устройство — перебор диплинков
            handleSberPayDeeplinks(payment.deep_links, () => {
              setPayError('Не удалось найти приложение СберПэй на вашем устройстве')
              setIsProcessing(false)
            })
          } else {
            // Десктоп — QR-код с формой оплаты Сбера
            setQrData({ payload: payment.redirect_url, orderId: order.id })
            setIsProcessing(false)
          }
          return
        }
        // Обычный редирект (СБП, карты)
        window.location.href = payment.redirect_url
        return
      }
      setIsSuccess(true)
      setIsProcessing(false)
    } catch (err: any) {
      setPayError(err.message || 'Ошибка оплаты')
      setIsProcessing(false)
    }
  }

  // Загрузка
  if (loading) return (
    <div className="bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 min-h-screen">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <Skeleton className="h-4 w-24 bg-white/10 mb-6" />
        <Skeleton className="h-8 w-64 bg-white/10 mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 bg-white/10 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  )

  if (error || !product) return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <h2 className="text-2xl font-bold">Товар не найден</h2>
      <Link to="/" className="text-primary hover:underline">На главную</Link>
    </div>
  )

  if (isSuccess) return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center p-12 text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle className="h-10 w-10 text-emerald-600" />
          </div>
          <h2 className="mb-2 text-2xl font-bold">Заказ оплачен!</h2>
          <p className="mb-6 text-muted-foreground">Код придёт на email.</p>
          <Button variant="outline" onClick={() => navigate('/')}>На главную</Button>
        </CardContent>
      </Card>
    </div>
  )

  return (
    <div className="bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 min-h-screen">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Назад */}
        <Link to="/" className="mb-6 inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white">
          <ChevronLeft className="h-4 w-4" /> Назад
        </Link>

        {/* ═══ Hero-изображение на заднем фоне (как на главной) ═══ */}
        <HeroImage slug={product.slug} name={product.name} />

        {/* Заголовок */}
        <div className="mb-6">
          <span className="text-xs font-medium text-primary uppercase tracking-wider">
            {product.category_name || 'Цифровые товары'}
          </span>
          {product.publisher && (
            <p className="mt-1 text-sm text-muted-foreground">
              Издатель: {product.publisher}
            </p>
          )}
          {product.rating && parseFloat(product.rating) > 0 && (
            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
              <span>{product.rating} · {product.review_count || 0} отзывов</span>
            </div>
          )}
        </div>

        {/* ═══ IGROMIR-STYLE: Сетка регионов ═══ */}
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          Выберите регион и номинал
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
          {regionsWithVariants.map(({ region, info, variants }) => {
            const isRegionSelected = selectedRegion === region
            const hasSingleDenom = variants.length === 1
            const singleVariant = hasSingleDenom ? variants[0] : null

            return (
              <button
                key={region}
                onClick={() => {
                  if (hasSingleDenom && singleVariant) {
                    // 1 номинал — сразу выбираем
                    setSelectedRegion(region)
                    setSelectedVariant(singleVariant)
                    setPayError('')
                  } else {
                    handleSelectRegion(region)
                  }
                }}
                className={`relative flex flex-col items-center rounded-xl border-2 p-4 text-center transition-all ${
                  isRegionSelected
                    ? 'border-primary bg-primary/10 ring-2 ring-primary/50'
                    : 'border-white/10 bg-white/5 hover:border-primary/50 hover:bg-white/10'
                }`}
              >
                {/* Флаг */}
                <span className="text-3xl mb-1">
                      {getFlagUrl(region)
                        ? <img src={getFlagUrl(region)!} alt={region} className="inline-block w-8 h-6 rounded-sm object-cover" />
                        : (getFlagEmoji(region) || '🌍')
                      }</span>
                {/* Название региона */}
                <span className="text-sm font-semibold text-white">{REGION_NAME[region] || region}</span>
              </button>
            )
          })}
        </div>

        {/* ═══ Сетка номиналов (если выбран регион с >1 вариантом) ═══ */}
        {selectedRegion && regionVariants.length > 1 && (
          <>
            <h3 className="text-base font-bold mb-3 text-white/80">
              {getFlagUrl(selectedRegion)
                ? <img src={getFlagUrl(selectedRegion)!} alt={selectedRegion} className="inline-block w-5 h-4 rounded-sm align-text-bottom mr-1" />
                : (getFlagEmoji(selectedRegion) || '🌍') + ' '
              } {REGION_NAME[selectedRegion] || selectedRegion}
              — выберите номинал:
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mb-8">
              {regionVariants.map(v => {
                const isSelected = selectedVariant?.id === v.id
                return (
                  <button
                    key={v.id}
                    onClick={() => handleSelectVariant(v)}
                    className={`relative flex flex-col items-center rounded-xl border-2 px-3 py-3 text-center transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/15 ring-2 ring-primary/50'
                        : 'border-white/10 bg-white/5 hover:border-primary/50 hover:bg-white/10'
                    }`}
                  >
                    <span className="text-sm font-semibold text-white">
                      {formatNominal(v.denomination, v.denom_currency)}
                    </span>
                    <span className="text-sm font-bold text-primary mt-0.5">
                      {formatMoney(v.price, 'RUB')}
                    </span>
                    {v.old_price && parseFloat(v.old_price) > parseFloat(v.price) && (
                      <span className="text-[10px] text-muted-foreground line-through mt-0.5">
                        {formatMoney(v.old_price, 'RUB')}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </>
        )}

        {/* ═══ Выбранный вариант — цена и оплата ═══ */}
        {selectedVariant && (
          <div className="bg-transparent rounded-2xl p-6 mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  {getFlagUrl(selectedVariant.region)
                    ? <img src={getFlagUrl(selectedVariant.region)!} alt={selectedVariant.region} className="inline-block w-4 h-3 rounded-sm align-text-top mr-1" />
                    : (getFlagEmoji(selectedVariant.region) || '🌍') + ' '
                  } {REGION_NAME[selectedVariant.region] || selectedVariant.region}
                </p>
                <p className="text-lg font-semibold mt-1">
                  Номинал: {formatNominal(selectedVariant.denomination, selectedVariant.denom_currency)}
                </p>
                <p className="text-3xl font-bold text-primary mt-1">
                  {formatMoney(selectedVariant.price, 'RUB')}
                </p>
              </div>

              <div className="space-y-2 w-full sm:w-64">
                <button
                  disabled={isProcessing}
                  onClick={() => handlePayment('sberpay')}
                  className="w-full block overflow-hidden rounded-lg border-none bg-transparent p-0 hover:opacity-90 transition-opacity"
                >
                  {isProcessing && paymentMethod === 'sberpay' ? (
                    <Loader2 className="h-5 w-5 animate-spin mx-auto my-6" />
                  ) : (
                    <img
                      src="/assets/sberpay_gradient_a2657e8d.png"
                      alt="SberPay"
                      className="w-full h-auto"
                    />
                  )}
                </button>

                <button
                  disabled={isProcessing}
                  onClick={() => handlePayment('sbp')}
                  className="w-full block overflow-hidden rounded-lg border-none bg-transparent p-0 hover:opacity-90 transition-opacity"
                >
                  {isProcessing && paymentMethod === 'sbp' ? (
                    <Loader2 className="h-5 w-5 animate-spin mx-auto my-6" />
                  ) : (
                    <img
                      src="/assets/sbp_button.png"
                      alt="СБП"
                      className="w-full h-auto"
                    />
                  )}
                </button>
              </div>
            </div>

            {payError && (
              <div className="mt-4 p-3 bg-red-900/30 border border-red-500/30 rounded-xl text-sm text-red-300">
                {payError}
              </div>
            )}

            {product.delivery_info && (
              <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                <Package className="h-3.5 w-3.5" />
                <span>{product.delivery_info.description}</span>
              </div>
            )}
          </div>
        )}

        {/* Безопасность */}
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pb-8">
          <Shield className="h-4 w-4" />
          Безопасный платёж · Мгновенная доставка · 100% гарантия
        </div>
      </div>

      {/* QR-оверлей для Sberpay на десктопе */}
      {qrData && (
        <QrDisplay
          payload={qrData.payload}
          orderId={qrData.orderId}
          title="Оплата через СберПэй"
          instruction="Отсканируйте QR-код камерой телефона или через приложение СберБанк"
          onCancel={() => setQrData(null)}
          onSuccess={() => {
            setQrData(null)
            setIsSuccess(true)
          }}
        />
      )}
    </div>
  )
}

/**
 * Hero-изображение продукта на заднем фоне
 * Адаптивное: мобильные — меньший размер, десктоп — полный
 */
function HeroImage({ slug, name }: { slug: string; name: string }) {
  const imgSrc = HERO_IMAGES[slug]
  if (!imgSrc) return null

  return (
    <div className="relative w-full overflow-hidden rounded-2xl mb-6">
      {/* Фоновое изображение — всегда 100% ширины, высота от ориентации */}
      <div
        className="w-full bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(${imgSrc})`,
          aspectRatio: '16 / 9',
        }}
      >
        {/* Градиент поверх изображения для читаемости текста */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.20) 0%, rgba(9,14,25,0.85) 85%, #090E19 100%)',
          }}
        />

        {/* Название продукта поверх изображения */}
        <div className="absolute bottom-4 left-4 right-4 z-10">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white drop-shadow-lg">
            {name}
          </h1>
        </div>
      </div>
    </div>
  )
}
