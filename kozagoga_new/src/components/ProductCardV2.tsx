/**
 * ProductCardV2 — карточка продукта для данных из API (DGoods)
 * Показывает регионы с ценами, номинал и стоимость
 */

import { Link } from 'react-router-dom'
import type { ProductDTO } from '@/types/product'
import { formatMoney, formatNominal } from '@/lib/format'
import { getFlagUrl, getFlagEmoji, REGION_NAME } from '@/lib/flags'
import { Skeleton } from '@/components/ui/skeleton'

interface ProductCardV2Props {
  product: ProductDTO
}

/** Маппинг изображений для DGoods по slug */
const PRODUCT_IMAGES: Record<string, string> = {
  'steam-gift-card': '/images/products/steam.svg',
  'playstation-network-card': '/images/products/playstation.svg',
  'xbox-live-gift-card': '/images/products/xbox.svg',
  'roblox-gift-card': '/images/products/roblox.svg',
  'roblox-payment-card': '/images/products/roblox.svg',
  'app-store-itunes-gift-card': '/images/products/apple-gift.svg',
  'nintendo-eshop-card': '/images/products/nintendo.svg',
  'nintendo-switch-online-membership': '/images/products/nintendo.svg',
  'blizzard-gift-card': '/images/products/battlenet.svg',
  'world-of-warcraft-time-card': '/images/products/battlenet.svg',
  'apex-legends-coins': '/images/products/apex.svg',
  'battlefield-6': '/images/products/gamestore-battlenet.webp',
  'a-way-out': '/vite.svg',
  'stalcraft-items': '/images/products/stalcraft.png',
  'playstation-wallet-pln': '/images/products/playstation.svg',
  'netflix-digital-code': '/images/products/netflix.png',
}

export default function ProductCardV2({ product }: ProductCardV2Props) {
  const pricing = product.pricing
  const hasMultiple = pricing && pricing.minNominal !== null
  const hasOffers = pricing && pricing.price !== null

  // Группируем активные вариации по регионам
  const regions: { region: string; price: number; denom: number; currency: string }[] = []
  const seen = new Set<string>()
  if (product.variants) {
    for (const v of product.variants) {
      if (!v.is_active || !v.price || parseFloat(v.price) <= 0) continue
      if (!seen.has(v.region)) {
        seen.add(v.region)
        regions.push({
          region: v.region,
          price: parseFloat(v.price),
          denom: parseFloat(v.denomination),
          currency: v.denom_currency,
        })
      }
    }
  }

  const imageUrl = product.image_url || product.image || PRODUCT_IMAGES[product.slug]
  const bgStyle = imageUrl
    ? { backgroundImage: `url(${imageUrl})` }
    : { background: 'radial-gradient(ellipse 180% 70% at 50% 10%, rgba(0,148,255,0.40) 0%, transparent 65%), radial-gradient(ellipse 120% 80% at 50% 80%, rgba(79,70,229,0.35) 0%, transparent 60%), linear-gradient(145deg, #060B1A 0%, #0F1B3D 30%, #081326 65%, #060B1A 100%)' }

  return (
    <Link
      to={`/product/${product.slug}`}
      className="gamestore-card group"
      style={{ aspectRatio: '150 / 225' }}
    >
      <div className="gamestore-card-bg" style={bgStyle} />
      {imageUrl && <div className="gamestore-card-gradient" style={{ backgroundImage: `url(${imageUrl})` }} />}

      <div className="gamestore-card-content">
        {/* Название */}
        {product.publisher && (
          <div className="gamestore-card-icon-title">
            <span className="gamestore-card-title">{product.publisher}</span>
          </div>
        )}
        <span className="gamestore-card-desc">{product.short_description || product.name}</span>

        {/* Регионы — только флаг + страна */}
        {regions.length > 0 && (
          <div className="mt-auto pt-1.5">
            <div className="flex flex-wrap gap-x-1.5 gap-y-0.5">
              {regions.slice(0, 4).map(({ region }) => (
                <span
                  key={region}
                  className="text-[9px] font-medium text-white/70"
                >
                  {getFlagUrl(region)
                    ? <img src={getFlagUrl(region)!} alt={region} className="inline-block w-3.5 h-2.5 rounded-sm mr-0.5" />
                    : (getFlagEmoji(region) || '🌍') + ' '
                  } {REGION_NAME[region] || region}
                </span>
              ))}
              {regions.length > 4 && (
                <span className="text-[9px] text-white/40">
                  +{regions.length - 4}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Второй ряд — номинал + цена */}
        {hasOffers ? (
          <div className="mt-0.5 space-y-0.5">
            <p className="text-[10px] text-white/50 font-medium leading-tight truncate">
              {hasMultiple
                ? `от ${formatNominal(pricing!.minNominal, pricing!.nominalCurrency)}`
                : `${formatNominal(pricing!.nominal, pricing!.nominalCurrency)}`
              }
            </p>
            <p className="text-xs font-bold text-white leading-tight truncate">
              {hasMultiple
                ? `от ${formatMoney(pricing!.price, pricing!.priceCurrency)}`
                : formatMoney(pricing!.price, pricing!.priceCurrency)
              }
            </p>
          </div>
        ) : (
          <div className="mt-0.5">
            <p className="text-[10px] text-white/40 font-medium">Временно недоступно</p>
          </div>
        )}
      </div>
    </Link>
  )
}

export function ProductCardSkeleton() {
  return (
    <div className="gamestore-card overflow-hidden" style={{ aspectRatio: '150 / 225' }}>
      <div className="h-full w-full bg-[#0F1B3D]/50 p-3 flex flex-col">
        <Skeleton className="h-4 w-3/4 bg-white/10 rounded" />
        <div className="mt-auto space-y-1">
          <div className="flex gap-1">
            <Skeleton className="h-4 w-14 bg-white/10 rounded" />
            <Skeleton className="h-4 w-14 bg-white/10 rounded" />
          </div>
          <Skeleton className="h-3 w-1/2 bg-white/10 rounded" />
          <Skeleton className="h-4 w-2/3 bg-white/15 rounded" />
        </div>
      </div>
    </div>
  )
}
