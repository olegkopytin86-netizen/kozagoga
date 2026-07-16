import { useState, useEffect } from "react"
import { Link, useParams, useNavigate } from "react-router-dom"
import { ChevronLeft, Star, Building2, Smartphone, CreditCard, Shield, Loader2, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { popularProducts } from "@/data/products"
import { createOrder, processPayment } from "@/lib/api"
import { initiateSberPay, checkSberPayStep } from "@/lib/sberpay"

type PaymentMethod = "sberpay" | "sbp" | "card"

export default function ProductDetail() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const product = popularProducts.find((p) => p.id === slug)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState("")
  const [isSuccess, setIsSuccess] = useState(false)

  // Проверка шага sberpay при загрузке страницы (перебор диплинков)
  useEffect(() => {
    checkSberPayStep()
  }, [])

  const handleSberPayDeeplinks = (deepLinks: string[], onFail: () => void) => {
    if (!deepLinks || deepLinks.length === 0) {
      onFail()
      return
    }

    const ua = navigator.userAgent
    const isIOS = /iPhone|iPad|iPod/i.test(ua)
    const isAndroid = /Android/i.test(ua)

    if (isIOS) {
      // iOS: 6 фиксированных deep link схем (строгий порядок из документации)
      // Параметры банковского счёта извлекаются из deep_links ответа API
      initiateSberPay(deepLinks)
    } else if (isAndroid) {
      // Android: дефолтная попытка + фолбек
      initiateSberPay(deepLinks)
    } else {
      // Desktop: приложение Сбера недоступно
      onFail()
    }
  }

  const handlePayment = async (method: PaymentMethod) => {
    if (!product) return
    setError("")
    setIsProcessing(true)
    setPaymentMethod(method)

    try {
      // Создаём заказ с одним товаром
      const order = await createOrder(
        [{ product_id: product.id, quantity: 1 }],
        method
      )

      // Процессинг платежа
      const payment = await processPayment(order.id, method)

      if (payment.redirect_url) {
        if (method === "sberpay" && payment.deep_links?.length > 0) {
          handleSberPayDeeplinks(payment.deep_links, () => {
            setError('Не удалось найти приложение, попробуйте оплатить другим способом')
            setIsProcessing(false)
          })
          return
        }
        // Обычный редирект (карты, СБП)
        window.location.href = payment.redirect_url
        return
      }

      // Успех без редиректа
      setIsSuccess(true)
      setIsProcessing(false)
    } catch (err: any) {
      setError(err.message || "Ошибка оплаты. Попробуйте снова.")
      setIsProcessing(false)
    }
  }

  if (!product) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <h2 className="text-2xl font-bold">Товар не найден</h2>
        <Link to="/" className="text-primary hover:underline">Вернуться на главную</Link>
      </div>
    )
  }

  if (isSuccess) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center p-12 text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle className="h-10 w-10 text-emerald-600" />
            </div>
            <h2 className="mb-2 text-2xl font-bold">Заказ оплачен!</h2>
            <p className="mb-6 text-muted-foreground">
              Товар будет отправлен на ваш email в течение нескольких минут.
            </p>
            <div className="flex gap-4">
              <Button onClick={() => navigate("/orders")}>Мои заказы</Button>
              <Button variant="outline" onClick={() => navigate("/")}>На главную</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 min-h-screen">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Назад */}
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1 text-sm text-gray-400 transition-colors hover:text-white"
        >
          <ChevronLeft className="h-4 w-4" />
          Назад к товарам
        </Link>

        {/* Карточка товара */}
        <div className="overflow-hidden rounded-2xl bg-transparent shadow-2xl">
          {/* Header */}
          <div className="relative flex flex-col items-center bg-gradient-to-br from-gray-800 to-gray-900 px-6 pb-6 pt-12">
            <img
              src={product.image}
              alt={product.name}
              className="h-24 w-24 object-contain"
            />
            {product.badge && (
              <div className="mt-4">
                <Badge className="bg-gradient-to-r from-primary to-purple-600 text-white shadow-lg text-sm px-4 py-1">
                  {product.badge}
                </Badge>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-6">
            <span className="text-xs font-medium text-primary uppercase tracking-wider">
              {product.category}
            </span>
            <h1 className="mt-1 text-2xl font-bold">{product.name}</h1>

            {product.rating && (
              <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                <span>{product.rating}</span>
                {product.sales && (
                  <span>· {product.sales.toLocaleString("ru-RU")} продаж</span>
                )}
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
            <div className="mt-8 space-y-3">
              <p className="text-sm font-medium text-muted-foreground">Выберите способ оплаты:</p>

              <Button
                size="lg"
                className="w-full block overflow-hidden rounded-lg border-none bg-transparent p-0 m-0 hover:bg-transparent h-auto"
                disabled={isProcessing}
                onClick={() => handlePayment("sberpay")}
              >
                {isProcessing && paymentMethod === "sberpay" ? (
                  <Loader2 className="h-5 w-5 animate-spin mx-auto my-6" />
                ) : (
                  <img
                    src="/assets/sberpay_gradient_a2657e8d.png"
                    alt="SberPay"
                    className="block w-full h-auto"
                  />
                )}
              </Button>

              <Button
                size="lg"
                className="w-full block overflow-hidden rounded-lg border-none bg-transparent p-0 m-0 hover:bg-transparent h-auto shadow-none"
                disabled={isProcessing}
                onClick={() => handlePayment("sbp")}
              >
                <img
                  src="/assets/sbp_button.png"
                  alt="СБП"
                  className="block w-full h-auto"
                />
              </Button>

              <Button
                size="lg"
                className="w-full gap-3 bg-gray-900 text-white hover:bg-gray-800 shadow-lg text-base h-14 dark:bg-white dark:text-black dark:hover:bg-gray-100"
                disabled={isProcessing}
                onClick={() => handlePayment("card")}
              >
                {isProcessing && paymentMethod === "card" ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <CreditCard className="h-6 w-6" />
                )}
                <span className="flex flex-col items-start leading-tight">
                  <span>Банковская карта</span>
                  <span className="text-[11px] opacity-75">Visa, Mastercard, МИР</span>
                </span>
              </Button>
            </div>

            {/* Error */}
            {error && (
              <div className="mt-4 p-4 bg-red-900/30 border border-red-500/30 rounded-xl text-sm text-red-300">
                {error}
              </div>
            )}

            {/* Security */}
            <div className="mt-8 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Shield className="h-4 w-4" />
              Безопасный платёж · Мгновенная доставка · 100% гарантия
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
