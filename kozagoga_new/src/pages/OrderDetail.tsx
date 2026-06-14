import { useEffect, useState } from "react"
import { useParams, Link } from "react-router-dom"
import { ArrowLeft, Package, Clock, CreditCard, User, CheckCircle, XCircle, AlertCircle, Loader2, RefreshCw } from "lucide-react"
import { db } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/contexts/AuthContext"
import { formatPrice } from "@/lib/utils"
import { getOrderStatus } from "@/lib/api"
import type { Order, OrderItem } from "@/types/database"

const statusConfig: Record<string, { label: string; icon: typeof Package; color: string }> = {
  pending: { label: "Ожидает оплаты", icon: Clock, color: "text-amber-500" },
  paid: { label: "Оплачен", icon: CheckCircle, color: "text-emerald-500" },
  processing: { label: "В обработке", icon: Loader2, color: "text-blue-500" },
  completed: { label: "Выполнен", icon: CheckCircle, color: "text-emerald-500" },
  cancelled: { label: "Отменён", icon: XCircle, color: "text-red-500" },
  refunded: { label: "Возвращён", icon: AlertCircle, color: "text-gray-500" },
}

const providerStatusIcons: Record<string, { label: string; icon: typeof Package; color: string }> = {
  COMPLETE: { label: "Услуга оказана", icon: CheckCircle, color: "text-emerald-500" },
  FAILURE: { label: "Ошибка выполнения", icon: XCircle, color: "text-red-500" },
  CANCELLED: { label: "Отменена провайдером", icon: XCircle, color: "text-red-500" },
  INPROGRESS: { label: "Обрабатывается", icon: Loader2, color: "text-blue-500" },
  PENDING: { label: "Ожидает обработки", icon: Clock, color: "text-amber-500" },
  REBOOKED: { label: "Перепроведено", icon: RefreshCw, color: "text-emerald-500" },
  UNEXPECTED_ERROR: { label: "Неожиданная ошибка", icon: AlertCircle, color: "text-red-500" },
  UNKNOWN: { label: "Статус не определён", icon: AlertCircle, color: "text-gray-500" },
  WAITS_FOR_REQUEUE: { label: "В очереди", icon: Clock, color: "text-amber-500" },
  SENT_TO_QUEUE: { label: "Отправлено в очередь", icon: Package, color: "text-amber-500" },
}

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [order, setOrder] = useState<Order | null>(null)
  const [items, setItems] = useState<OrderItem[]>([])
  const [loading, setLoading] = useState(true)
  const [providerStatus, setProviderStatus] = useState<string | null>(null)
  const [providerDesc, setProviderDesc] = useState("")

  const fetchOrder = async () => {
    if (!id) return
    setLoading(true)

    try {
      const { data: orderData } = await db.from("orders").select("*").eq("id", id).single()
      const { data: itemsData } = await db.from("order_items").select("*").eq("order_id", id)

      if (orderData) setOrder(orderData)
      if (itemsData) setItems(itemsData)

      // Если есть provider_transaction_id — проверяем статус
      if (orderData?.provider_transaction_id) {
        try {
          const statusData = await getOrderStatus(
            orderData.provider_transaction_id,
            undefined
          )
          setProviderStatus(statusData.provider_status)
          setProviderDesc(statusData.description || "")
        } catch {
          // Статус может быть недоступен
        }
      }
    } catch (err) {
      console.error("Order fetch error:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrder()
  }, [id])

  // Авто-обновление статуса для processing-заказов
  useEffect(() => {
    if (order?.status === "processing" && order?.provider_transaction_id) {
      const interval = setInterval(async () => {
        try {
          const statusData = await getOrderStatus(
            order.provider_transaction_id!
          )
          setProviderStatus(statusData.provider_status)
          setProviderDesc(statusData.description || "")
        } catch {
          // ignore
        }
        // Обновляем и сам заказ
        try {
          const { data: orderData } = await db.from("orders").select("*").eq("id", id!).single()
          if (orderData) setOrder(orderData)
        } catch {
          // ignore
        }
      }, 10000) // каждые 10 секунд

      return () => clearInterval(interval)
    }
  }, [order?.status, order?.provider_transaction_id, id])

  const getProviderIcon = () => {
    if (!providerStatus) return null
    const cfg = providerStatusIcons[providerStatus] || providerStatusIcons.UNKNOWN
    return (
      <div className={`flex items-center gap-2 ${cfg.color}`}>
        <cfg.icon className={`w-5 h-5 ${providerStatus === "INPROGRESS" || providerStatus === "PENDING" ? "animate-spin" : ""}`} />
        <span className="text-sm font-medium">{cfg.label}</span>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-60 w-full" />
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold">Заказ не найден</h2>
          <Link to="/orders">
            <Button variant="outline" className="mt-4">
              Вернуться к заказам
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const StatusIcon = statusConfig[order.status || "pending"]?.icon || Package
  const statusColor = statusConfig[order.status || "pending"]?.color || "text-gray-500"
  const statusLabel = statusConfig[order.status || "pending"]?.label || order.status

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <Link to="/orders" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4" />
          Назад к заказам
        </Link>

        <div className="mb-6">
          <h1 className="text-2xl font-bold">Заказ #{order.id.slice(0, 8)}</h1>
          <p className="text-sm text-muted-foreground">
            Создан {new Date(order.created_at).toLocaleString("ru-RU")}
          </p>
        </div>

        {/* Статус заказа */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <StatusIcon className={`w-8 h-8 ${statusColor} ${order.status === "processing" ? "animate-spin" : ""}`} />
                <div>
                  <p className={`text-lg font-semibold ${statusColor}`}>{statusLabel}</p>
                  <p className="text-sm text-muted-foreground">
                    {order.payment_status === "paid" ? "Оплачено" :
                     order.payment_status === "refunded" ? "Возвращено" :
                     order.payment_status === "failed" ? "Ошибка оплаты" :
                     "Ожидает оплаты"}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{formatPrice(order.total)}</p>
                <p className="text-xs text-muted-foreground">
                  {order.payment_method === "card" ? "Банковская карта" :
                   order.payment_method === "sbp" ? "СБП" :
                   order.payment_method === "wallet" ? "Кошелёк" :
                   order.payment_method === "sberpay" ? "СберПэй" :
                   order.payment_method || "—"}
                </p>
              </div>
            </div>

            {/* Provider status */}
            {order.provider_transaction_id && (
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  {getProviderIcon() || (
                    <div className="flex items-center gap-2 text-blue-500">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span className="text-sm font-medium">Проверка статуса...</span>
                    </div>
                  )}
                  <Badge variant="outline" className="text-xs font-mono">
                    ID: {order.provider_transaction_id?.slice(0, 12) || '—'}...
                  </Badge>
                </div>
                {providerDesc && (
                  <p className="text-xs text-muted-foreground mt-1">{providerDesc}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Товары */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Товары в заказе</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-2">
                  <div className="flex-1">
                    <p className="font-medium">{item.product_name}</p>
                    {item.provider_code && (
                      <p className="text-xs text-muted-foreground">
                        Провайдер: {item.provider_code} · ID услуги: {item.provider_service_id || "—"}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatPrice(item.price)} × {item.quantity}</p>
                    <p className="text-sm text-muted-foreground">
                      = {formatPrice(parseFloat(String(item.price)) * item.quantity)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <Separator className="my-4" />

            <div className="flex justify-between text-lg font-bold">
              <span>Итого</span>
              <span>{formatPrice(order.total)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Provider status */}
        {order.provider_status && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="w-4 h-4" />
                Статус доставки услуги
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {(() => {
                    const cfg = providerStatusIcons[order.provider_status || ""]
                    if (!cfg) return <Badge>{order.provider_status}</Badge>
                    const Icon = cfg.icon
                    return (
                      <>
                        <Icon className={`w-5 h-5 ${cfg.color}`} />
                        <span className={`text-sm font-medium ${cfg.color}`}>{cfg.label}</span>
                      </>
                    )
                  })()}
                </div>
                <Badge variant="secondary" className="font-mono text-xs">
                  {order.provider_status}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
