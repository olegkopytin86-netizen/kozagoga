import { useEffect, useState } from "react"
import { useParams, Link } from "react-router-dom"
import { ArrowLeft, Package, Clock, CreditCard, User, CheckCircle, XCircle, AlertCircle } from "lucide-react"
import { db } from "@lork/sdk"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/contexts/AuthContext"
import type { Order, OrderItem } from "@/types/database"

const statusConfig: Record<string, { label: string; icon: typeof Package; color: string }> = {
  pending: { label: "Ожидает оплаты", icon: Clock, color: "text-amber-500" },
  paid: { label: "Оплачен", icon: CheckCircle, color: "text-emerald-500" },
  processing: { label: "В обработке", icon: Package, color: "text-blue-500" },
  completed: { label: "Выполнен", icon: CheckCircle, color: "text-emerald-500" },
  cancelled: { label: "Отменён", icon: XCircle, color: "text-red-500" },
  refunded: { label: "Возвращён", icon: AlertCircle, color: "text-gray-500" },
}

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [order, setOrder] = useState<Order | null>(null)
  const [items, setItems] = useState<OrderItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchOrder = async () => {
      if (!id || !user) return
      const { data: orderData } = await db
        .from("orders")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single()
      if (orderData) {
        setOrder(orderData as Order)
        const { data: itemsData } = await db
          .from("order_items")
          .select("*")
          .eq("order_id", id)
        if (itemsData) setItems(itemsData as OrderItem[])
      }
      setLoading(false)
    }
    fetchOrder()
  }, [id, user])

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
          <Skeleton className="mb-6 h-5 w-32" />
          <Skeleton className="mb-4 h-8 w-48" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <Package className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
          <h2 className="mb-2 text-2xl font-bold">Заказ не найден</h2>
          <p className="mb-8 text-muted-foreground">Возможно, он был удалён или у вас нет доступа</p>
          <Link to="/orders">
            <Button>Мои заказы</Button>
          </Link>
        </div>
      </div>
    )
  }

  const statusInfo = statusConfig[order.status || "pending"] || statusConfig.pending
  const StatusIcon = statusInfo.icon

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          to="/orders"
          className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Назад к заказам
        </Link>

        {/* Статус */}
        <Card className="mb-6">
          <CardContent className="flex items-center gap-4 p-6">
            <div className={`flex h-14 w-14 items-center justify-center rounded-full bg-secondary ${statusInfo.color}`}>
              <StatusIcon className="h-7 w-7" />
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold">Заказ #{order.id.substring(0, 8)}</h1>
              <p className="text-sm text-muted-foreground">{formatDate(order.created_at)}</p>
            </div>
            <Badge variant={order.status === "completed" || order.status === "paid" ? "success" : order.status === "cancelled" ? "danger" : "default"}>
              {statusInfo.label}
            </Badge>
          </CardContent>
        </Card>

        {/* Товары в заказе */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Состав заказа</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium">{item.product_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.quantity} × {formatPrice(item.price)}
                    </p>
                  </div>
                  <p className="font-semibold">{formatPrice(item.price * item.quantity)}</p>
                </div>
              ))}
            </div>
            <Separator className="my-4" />
            <div className="flex justify-between text-lg font-bold">
              <span>Итого</span>
              <span className="text-primary">{formatPrice(order.total)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Детали оплаты */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Детали оплаты</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Способ оплаты</span>
              <span>{order.payment_method === "card" ? "Банковская карта" : order.payment_method === "sbp" ? "СБП" : order.payment_method === "yoomoney" ? "ЮMoney" : order.payment_method || "—"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Статус оплаты</span>
              <span>{order.payment_status === "paid" ? "Оплачено" : order.payment_status === "pending" ? "Ожидает оплаты" : order.payment_status || "—"}</span>
            </div>
            {order.payment_method === "yoomoney" && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Примечание</span>
                <span>Оплата через ЮMoney</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
