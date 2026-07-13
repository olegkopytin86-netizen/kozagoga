// ─── AdminOrders — список заказов с фильтрацией ────────────
import { useState, useEffect } from "react"
import { Search, Calendar, ShoppingCart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatPrice } from "@/lib/utils"

const API = window.__KOZAGOGA_API_URL__ || ""
function getToken() { try { return localStorage.getItem("kozagogo_token") } catch { return null } }

const STATUS_MAP = {
  pending: "warning", paid: "success", processing: "default",
  completed: "success", cancelled: "danger", failed: "danger",
  refunded: "secondary", partially_refunded: "warning",
}

export default function AdminOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => { fetchOrders() }, [])

  async function fetchOrders() {
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/orders`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      const data = await res.json()
      setOrders(Array.isArray(data) ? data : [])
    } catch (e) { setOrders([]) }
    finally { setLoading(false) }
  }

  const filtered = orders.filter(o => {
    if (search) {
      const q = search.toLowerCase()
      if (!o.id.toLowerCase().includes(q)) return false
    }
    if (dateFrom && new Date(o.created_at) < new Date(dateFrom)) return false
    if (dateTo) {
      const end = new Date(dateTo)
      end.setHours(23, 59, 59)
      if (new Date(o.created_at) > end) return false
    }
    return true
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" /> Заказы
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Фильтры */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Поиск по номеру заказа..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10 bg-white/5 border-white/10 text-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="w-40 bg-white/5 border-white/10 text-white" />
            <span className="text-gray-500">—</span>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="w-40 bg-white/5 border-white/10 text-white" />
          </div>
          {(search || dateFrom || dateTo) && (
            <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setDateFrom(""); setDateTo("") }}
              className="text-gray-400">
              Сбросить
            </Button>
          )}
        </div>

        {/* Таблица */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-gray-500">
                <th className="pb-3 font-medium">Номер</th>
                <th className="pb-3 font-medium">Сумма</th>
                <th className="pb-3 font-medium">Статус</th>
                <th className="pb-3 font-medium">Оплата</th>
                <th className="pb-3 font-medium">Пользователь</th>
                <th className="pb-3 font-medium">Дата</th>
                <th className="pb-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-gray-500">Заказов не найдено.</td></tr>
              ) : (
                filtered.map(order => (
                  <>
                    <tr key={order.id} className="border-b border-white/5 hover:bg-white/[0.02] cursor-pointer"
                      onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}>
                      <td className="py-3 font-mono text-xs text-gray-300">{order.id.substring(0, 12)}...</td>
                      <td className="py-3 font-medium text-white">{formatPrice(order.total)}</td>
                      <td className="py-3">
                        <Badge variant={STATUS_MAP[order.status] || "secondary"}>{order.status}</Badge>
                      </td>
                      <td className="py-3">
                        <Badge variant={STATUS_MAP[order.payment_status] || "secondary"}>{order.payment_status}</Badge>
                      </td>
                      <td className="py-3 text-gray-400 text-xs">{order.user_email || order.user_id?.substring(0, 8)}</td>
                      <td className="py-3 text-gray-400">{new Date(order.created_at).toLocaleString("ru-RU")}</td>
                      <td className="py-3 text-gray-500 text-xs">{expandedId === order.id ? "▲" : "▼"}</td>
                    </tr>
                    {expandedId === order.id && (
                      <tr key={`${order.id}-detail`}>
                        <td colSpan={7} className="pb-4 pt-0">
                          <div className="bg-white/[0.03] rounded-xl p-4 mx-2 text-sm space-y-1">
                            <p><span className="text-gray-500">ID:</span> <span className="text-gray-300 font-mono text-xs">{order.id}</span></p>
                            {order.payment_gateway && <p><span className="text-gray-500">Платёж:</span> <span className="text-gray-300">{order.payment_gateway}</span></p>}
                            {order.gateway_payment_id && <p><span className="text-gray-500">Gateway ID:</span> <span className="text-gray-300 font-mono text-xs">{order.gateway_payment_id}</span></p>}
                            {order.paid_at && <p><span className="text-gray-500">Оплачен:</span> <span className="text-gray-300">{new Date(order.paid_at).toLocaleString("ru-RU")}</span></p>}
                            {order.subtotal && <p><span className="text-gray-500">Сумма:</span> <span className="text-gray-300">{formatPrice(order.subtotal)}</span></p>}
                            {order.discount_amount > 0 && <p><span className="text-gray-500">Скидка:</span> <span className="text-green-400">-{formatPrice(order.discount_amount)}</span></p>}
                            {order.notes && <p><span className="text-gray-500">Заметки:</span> <span className="text-gray-300">{order.notes}</span></p>}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-gray-500">Найдено: {filtered.length} из {orders.length} заказов</p>
      </CardContent>
    </Card>
  )
}
