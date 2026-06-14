import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { ShoppingCart, ArrowLeft, Trash2, Minus, Plus, Zap, ShoppingBag, CreditCard, Wallet as WalletIcon, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatPrice } from "@/lib/utils"
import { useCart } from "@/contexts/CartContext"
import { useAuth } from "@/contexts/AuthContext"
import { createOrder, processPayment } from "@/lib/api"
import SberPayButton from "@/components/payment/SberPayButton"

type PaymentMethod = "card" | "sbp" | "sberpay" | "wallet"

export default function Checkout() {
  const { items, removeItem, updateQuantity, clearCart, subtotal, itemCount } = useCart()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [promoCode, setPromoCode] = useState("")
  const [promoDiscount, setPromoDiscount] = useState(0)
  const [promoError, setPromoError] = useState("")
  const [email, setEmail] = useState(user?.email || "")
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card")
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState("")
  const [isSuccess, setIsSuccess] = useState(false)
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null)

  const applyPromo = () => {
    setPromoError("")
    const code = promoCode.trim().toUpperCase()
    if (code === "KOZAGOGA10") {
      setPromoDiscount(10)
    } else if (code === "KOZAGOGA20") {
      setPromoDiscount(20)
    } else {
      setPromoError("Неверный промокод")
      setPromoDiscount(0)
    }
  }

  const discount = subtotal * (promoDiscount / 100)
  const total = subtotal - discount

  const handlePayment = async () => {
    setError("")
    setIsProcessing(true)

    try {
      // 1. Создаём заказ
      const orderItems = items.map(i => ({
        product_id: i.productId,
        quantity: i.quantity,
      }))

      const order = await createOrder(orderItems, paymentMethod)
      setCreatedOrderId(order.id)

      // 2. Процессинг платежа
      const payment = await processPayment(order.id, paymentMethod)

      if (payment.redirect_url) {
        // Для СберПэй — перебор диплинков перед редиректом
        if (payment.deep_links && payment.deep_links.length > 0) {
          const fallbackUrl = payment.redirect_url

          // Определяем платформу
          const ua = navigator.userAgent
          const isIOS = /iPhone|iPad|iPod/i.test(ua)

          if (isIOS) {
            // iOS: пробуем Universal Link → App Store → fallback
            let linkIndex = 0
            const tryLink = () => {
              if (linkIndex >= payment.deep_links!.length) {
                // Все диплинки перебраны — редирект на веб
                window.location.href = fallbackUrl
                return
              }

              const timeout = setTimeout(() => {
                // Следующий диплинк
                linkIndex++
                tryLink()
              }, 2000)

              const handleVis = () => {
                if (document.hidden) {
                  clearTimeout(timeout)
                  document.removeEventListener('visibilitychange', handleVis)
                }
              }
              document.addEventListener('visibilitychange', handleVis)

              window.location.href = payment.deep_links![linkIndex]
            }
            tryLink()
          } else if (/Android/i.test(ua)) {
            // Android: пробуем Intent → Web fallback
            const timeout = setTimeout(() => {
              window.location.href = fallbackUrl
            }, 2500)

            const handleVisibility = () => {
              if (document.hidden) {
                clearTimeout(timeout)
                document.removeEventListener('visibilitychange', handleVisibility)
              }
            }
            document.addEventListener('visibilitychange', handleVisibility)

            window.location.href = payment.deep_links[0]
          } else {
            // Десктоп — сразу веб
            window.location.href = fallbackUrl
          }
        } else {
          // Обычный редирект (карты, СБП)
          window.location.href = payment.redirect_url
        }
        return
      }

      // Без редиректа (wallet) — сразу успех
      setIsSuccess(true)
      clearCart()
    } catch (err: any) {
      setError(err.message || "Ошибка оплаты. Попробуйте снова.")
    } finally {
      setIsProcessing(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-2xl px-4 py-20 sm:px-6 lg:px-8">
          <Card>
            <CardContent className="flex flex-col items-center p-12 text-center">
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
                <svg className="h-10 w-10 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="mb-2 text-2xl font-bold">Заказ оплачен!</h2>
              <p className="mb-6 text-muted-foreground">
                Товары будут отправлены на {email || "указанный email"} в течение нескольких минут.
              </p>
              <div className="flex gap-4">
                <Button onClick={() => navigate("/orders")}>
                  Мои заказы
                </Button>
                <Button variant="outline" onClick={() => navigate("/catalog")}>
                  Продолжить покупки
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Link to="/catalog" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4" />
          Продолжить покупки
        </Link>

        <h1 className="mb-8 text-3xl font-bold">
          <ShoppingCart className="mr-3 inline-block h-8 w-8 text-primary" />
          Оформление заказа
        </h1>

        {items.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center py-16 text-center">
              <ShoppingBag className="mb-4 h-16 w-16 text-muted-foreground" />
              <h2 className="mb-2 text-xl font-semibold">Корзина пуста</h2>
              <p className="mb-6 text-muted-foreground">
                Добавьте товары в корзину, чтобы оформить заказ
              </p>
              <Button onClick={() => navigate("/catalog")}>
                Перейти в каталог
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Товары */}
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardContent className="p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Товары ({itemCount})</h2>
                    <Button variant="ghost" size="sm" className="text-red-500" onClick={clearCart}>
                      <Trash2 className="mr-1 h-4 w-4" />
                      Очистить
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {items.map((item) => (
                      <div key={item.id} className="flex items-center gap-4 rounded-lg border p-3">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-16 w-16 rounded-lg object-cover bg-secondary shrink-0"
                          onError={(e) => {
                            const i = e.target as HTMLImageElement
                            i.onerror = null
                            i.src = "https://placehold.co/64x64/f5f5f0/78716c?text=?"
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <Link to={`/product/${item.slug}`} className="font-medium truncate block hover:text-primary transition-colors">
                            {item.name}
                          </Link>
                          <p className="text-sm text-muted-foreground">
                            {formatPrice(item.price)} за шт.
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center rounded-lg border">
                            <button
                              className="flex h-8 w-8 items-center justify-center text-sm hover:bg-secondary transition-colors"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="flex h-8 w-10 items-center justify-center border-x text-sm font-medium">
                              {item.quantity}
                            </span>
                            <button
                              className="flex h-8 w-8 items-center justify-center text-sm hover:bg-secondary transition-colors"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                          <div className="w-20 text-right font-medium">
                            {formatPrice(item.price * item.quantity)}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-red-500"
                            onClick={() => removeItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Email для доставки */}
              <Card>
                <CardContent className="p-4">
                  <h2 className="mb-4 text-lg font-semibold">Куда отправить товар</h2>
                  <div className="space-y-2">
                    <Label htmlFor="delivery-email">Email для получения товара</Label>
                    <Input
                      id="delivery-email"
                      type="email"
                      placeholder="ivan@example.ru"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      На этот email придёт цифровой товар после оплаты
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Способ оплаты */}
              <Card>
                <CardContent className="p-4">
                  <h2 className="mb-4 text-lg font-semibold">Способ оплаты</h2>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {/* СберПэй */}
                    <SberPayButton
                      selected={paymentMethod === "sberpay"}
                      onClick={() => setPaymentMethod("sberpay")}
                    />
                    {/* СБП */}
                    <button
                      onClick={() => setPaymentMethod("sbp")}
                      className={`rounded-xl border p-4 text-left transition-all ${
                        paymentMethod === "sbp"
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "hover:border-primary/30"
                      }`}
                    >
                      <div className="mb-1 text-2xl">📱</div>
                      <div className="text-sm font-medium">СБП</div>
                      <div className="text-xs text-muted-foreground">Система быстрых платежей</div>
                    </button>
                    {/* Банковская карта */}
                    <button
                      onClick={() => setPaymentMethod("card")}
                      className={`rounded-xl border p-4 text-left transition-all ${
                        paymentMethod === "card"
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "hover:border-primary/30"
                      }`}
                    >
                      <div className="mb-1 text-2xl">💳</div>
                      <div className="text-sm font-medium">Банковская карта</div>
                      <div className="text-xs text-muted-foreground">Visa, Mastercard, Мир</div>
                    </button>
                  </div>
                </CardContent>
              </Card>


            </div>

            {/* Итого */}
            <div>
              <Card className="sticky top-24">
                <CardContent className="p-6">
                  <h3 className="mb-4 text-lg font-semibold">Итого</h3>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Товары ({itemCount})</span>
                      <span>{formatPrice(subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Доставка</span>
                      <span className="text-emerald-600">Бесплатно</span>
                    </div>
                    {promoDiscount > 0 && (
                      <div className="flex justify-between text-emerald-600">
                        <span>Скидка {promoDiscount}%</span>
                        <span>-{formatPrice(discount)}</span>
                      </div>
                    )}
                  </div>

                  <Separator className="my-4" />

                  {/* Промокод */}
                  <div className="mb-4">
                    <Label htmlFor="promo" className="mb-1.5 block text-sm text-muted-foreground">
                      Промокод
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="promo"
                        placeholder="Введите код"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && applyPromo()}
                      />
                      <Button variant="outline" size="sm" onClick={applyPromo}>
                        Применить
                      </Button>
                    </div>
                    {promoError && <p className="mt-1 text-xs text-red-500">{promoError}</p>}
                    {promoDiscount > 0 && <p className="mt-1 text-xs text-emerald-600">Промокод применён!</p>}
                  </div>

                  <Separator className="mb-4" />

                  <div className="mb-6 flex items-center justify-between">
                    <span className="text-lg font-bold">К оплате</span>
                    <span className="text-2xl font-bold text-primary">{formatPrice(total)}</span>
                  </div>

                  {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                      {error}
                    </div>
                  )}

                  {paymentMethod === "sberpay" ? (
                    <button
                      onClick={handlePayment}
                      disabled={isProcessing}
                      style={{ backgroundColor: '#21A038' }}
                      className="flex w-full items-center justify-center gap-3 rounded-full py-4 text-lg font-bold text-white shadow-md transition-all hover:brightness-110 hover:shadow-lg active:brightness-90 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:shadow-none"
                    >
                      {isProcessing ? (
                        <>
                          <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4 31.4" strokeLinecap="round" />
                          </svg>
                          Обработка...
                        </>
                      ) : (
                        <>
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/25">
                            <span className="text-xs font-bold text-white">С</span>
                          </div>
                          <span className="text-lg font-bold tracking-wide">Pay</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <Button
                      size="lg"
                      className="w-full gap-2"
                      onClick={handlePayment}
                      disabled={isProcessing || !email}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Обработка...
                        </>
                      ) : (
                        <>
                          <Zap className="h-5 w-5" />
                          Оплатить {formatPrice(total)}
                        </>
                      )}
                    </Button>
                  )}

                  <p className="mt-3 text-center text-xs text-muted-foreground">
                    Нажимая «Оплатить», вы соглашаетесь с условиями использования
                  </p>

                  <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <CreditCard className="h-3.5 w-3.5" />
                    Безопасный платёж через защищённый канал
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
