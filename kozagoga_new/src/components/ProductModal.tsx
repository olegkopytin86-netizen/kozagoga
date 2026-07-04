import { X, Star, ShoppingCart, CreditCard, Building2, Smartphone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { GameProduct } from "@/data/products"

interface ProductModalProps {
  product: GameProduct
  onClose: () => void
}

export default function ProductModal({ product, onClose }: ProductModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
        <div className="overflow-hidden rounded-2xl bg-card shadow-2xl">
          {/* Header image */}
          <div className="relative flex aspect-[3/2] items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
            <img
              src={product.image}
              alt={product.name}
              className="h-28 w-28 object-contain"
            />
            {product.badge && (
              <div className="absolute left-4 top-4">
                <Badge className="bg-gradient-to-r from-primary to-purple-600 text-white shadow-lg text-sm px-3 py-1">
                  {product.badge}
                </Badge>
              </div>
            )}
            <button
              onClick={onClose}
              className="absolute right-4 top-4 rounded-full bg-black/40 p-2 text-white transition-colors hover:bg-black/60"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6">
            <span className="text-xs font-medium text-primary uppercase tracking-wider">{product.category}</span>
            <h2 className="mt-1 text-2xl font-bold">{product.name}</h2>

            {product.rating && (
              <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                <span>{product.rating}</span>
                {product.sales && <span>· {product.sales.toLocaleString("ru-RU")} продаж</span>}
              </div>
            )}

            <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
              {product.description}
            </p>

            {/* Price */}
            <div className="mt-6 flex items-baseline gap-2">
              <span className="text-4xl font-bold">{product.price.toLocaleString("ru-RU")}</span>
              <span className="text-lg text-muted-foreground">₽</span>
            </div>

            {/* Payment methods */}
            <div className="mt-6 space-y-3">
              <p className="text-sm font-medium text-muted-foreground">Способ оплаты:</p>

              <Button size="lg" className="w-full gap-3 bg-green-600 text-white hover:bg-green-700 shadow-lg">
                <Building2 className="h-5 w-5" />
                Оплатить по SberPay
              </Button>

              <Button size="lg" className="w-full gap-3 bg-blue-600 text-white hover:bg-blue-700 shadow-lg">
                <Smartphone className="h-5 w-5" />
                Оплатить по СБП
              </Button>

              <Button size="lg" className="w-full gap-3 bg-gray-900 text-white hover:bg-gray-800 shadow-lg dark:bg-white dark:text-black dark:hover:bg-gray-100">
                <CreditCard className="h-5 w-5" />
                Оплатить картой
              </Button>
            </div>

            <p className="mt-4 text-center text-xs text-muted-foreground">
              🔒 Безопасный платёж. Мгновенная доставка после оплаты.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
