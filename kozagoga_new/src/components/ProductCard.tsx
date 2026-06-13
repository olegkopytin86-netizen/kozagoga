import { Link, useNavigate } from "react-router-dom"
import { Star, Clock, MapPin, Zap } from "lucide-react"
import { cn, formatPrice } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Product } from "@/types/database"

interface ProductCardProps {
  product: Product
  className?: string
}

export default function ProductCard({ product, className }: ProductCardProps) {
  const navigate = useNavigate()

  return (
    <Link
      to={`/product/${product.slug}`}
      className={cn(
        "group block overflow-hidden rounded-xl border bg-white transition-all hover:shadow-lg hover:border-primary/30",
        className
      )}
    >
      {/* Изображение */}
      <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
        <img
          src={`https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=400&q=80`}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={(e) => {
            const i = e.target as HTMLImageElement
            i.onerror = null
            i.src = `https://placehold.co/400x300/f5f5f0/78716c?text=${encodeURIComponent(product.name.substring(0, 20))}`
          }}
        />
        {product.is_featured && (
          <Badge className="absolute left-2 top-2 bg-primary text-primary-foreground">
            Хит
          </Badge>
        )}
        {product.old_price && product.old_price > product.price && (
          <Badge variant="secondary" className="absolute right-2 top-2 bg-black/70 text-white">
            -{Math.round((1 - product.price / product.old_price) * 100)}%
          </Badge>
        )}
      </div>

      {/* Информация */}
      <div className="p-4">
        <h3 className="mb-1 font-semibold line-clamp-1 group-hover:text-primary transition-colors">
          {product.name}
        </h3>

        {product.short_description && (
          <p className="mb-3 text-sm text-muted-foreground line-clamp-2">
            {product.short_description}
          </p>
        )}

        {/* Мета-информация */}
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {product.rating && (
            <span className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              {Number(product.rating || 0).toFixed(1)}
            </span>
          )}
          {product.delivery_time && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {product.delivery_time}
            </span>
          )}
          {product.region && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {product.region}
            </span>
          )}
        </div>

        {/* Цена и кнопка */}
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold">{formatPrice(product.price)}</span>
            {product.old_price && product.old_price > product.price && (
              <span className="text-xs text-muted-foreground line-through">
                {formatPrice(product.old_price)}
              </span>
            )}
          </div>
          <Button
            size="sm"
            className="gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.preventDefault()
              navigate(`/product/${product.slug}`)
            }}
          >
            <Zap className="h-3.5 w-3.5" />
            Купить
          </Button>
        </div>
      </div>
    </Link>
  )
}
