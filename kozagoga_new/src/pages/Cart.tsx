import { Link } from "react-router-dom"
import { ShoppingCart, ArrowLeft, Trash2, Minus, Plus, ShoppingBag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useCart } from "@/contexts/CartContext"

export default function Cart() {
  const { items, removeItem, updateQuantity, clearCart, subtotal, itemCount } = useCart()

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="rounded-lg border bg-white p-12 text-center">
            <ShoppingCart className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
            <h2 className="mb-2 text-2xl font-bold">Корзина пуста</h2>
            <p className="mb-8 text-muted-foreground">
              Добавьте товары из каталога, чтобы оформить заказ
            </p>
            <Link to="/catalog">
              <Button size="lg" className="gap-2">
                <ShoppingBag className="h-5 w-5" />
                Перейти в каталог
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          to="/catalog"
          className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Продолжить покупки
        </Link>

        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Корзина</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {itemCount} {itemCount === 1 ? "товар" : itemCount < 5 ? "товара" : "товаров"}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={clearCart} className="text-red-500 hover:text-red-600">
            <Trash2 className="mr-1 h-4 w-4" />
            Очистить
          </Button>
        </div>

        <div className="flex flex-col gap-8 lg:flex-row">
          {/* Список товаров */}
          <div className="flex-1 space-y-4">
            {items.map((item) => (
              <Card key={item.id}>
                <CardContent className="flex items-center gap-4 p-4 sm:gap-6 sm:p-6">
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-secondary">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        const i = e.target as HTMLImageElement
                        i.onerror = null
                        i.src = `https://placehold.co/160x160/f5f5f0/78716c?text=${encodeURIComponent(item.name.substring(0, 10))}`
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <Link
                      to={`/product/${item.slug}`}
                      className="font-semibold hover:text-primary transition-colors"
                    >
                      {item.name}
                    </Link>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatPrice(item.price)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="w-24 text-right">
                    <p className="font-semibold">{formatPrice(item.price * item.quantity)}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-red-500"
                    onClick={() => removeItem(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Итого */}
          <div className="w-full shrink-0 lg:w-80">
            <Card>
              <CardContent className="p-6">
                <h3 className="mb-4 text-lg font-semibold">Итого</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Товары ({itemCount})</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Доставка</span>
                    <span className="text-green-600">Бесплатно</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>К оплате</span>
                    <span className="text-primary">{formatPrice(subtotal)}</span>
                  </div>
                </div>
                <Link to="/checkout" className="mt-6 block">
                  <Button className="w-full gap-2" size="lg">
                    <ShoppingBag className="h-5 w-5" />
                    Оформить заказ
                  </Button>
                </Link>
                <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
                  <span className="mr-1">Принимаем к оплате:</span>
                  <span className="inline-flex items-center gap-1 rounded-md border bg-card px-2 py-0.5 font-medium">🏦 СберПэй</span>
                  <span className="inline-flex items-center gap-1 rounded-md border bg-card px-2 py-0.5 font-medium">📱 СБП</span>
                  <span className="inline-flex items-center gap-1 rounded-md border bg-card px-2 py-0.5 font-medium">💳 Visa, Mastercard, Мир</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
