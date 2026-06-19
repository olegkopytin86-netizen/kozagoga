import { useEffect, useState } from "react"
import { useAdminAuth } from "@/contexts/AdminAuthContext"
import { adminTransactions, adminProducts, adminCategories } from "@/lib/admin/api"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ShoppingCart,
  TrendingUp,
  Package,
  FolderTree,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
} from "lucide-react"

interface Stats {
  totals: {
    total_orders: number
    successful: number
    cancelled: number
    pending: number
    refunded: number
    revenue: number
  }
  by_period: { date: string; total: number; successful: number; revenue: number }[]
  by_provider: { provider: string; total: number; completed: number; failed: number }[]
}

export default function AdminDashboard() {
  const { admin } = useAdminAuth()
  const [stats, setStats] = useState<Stats | null>(null)
  const [productsCount, setProductsCount] = useState(0)
  const [categoriesCount, setCategoriesCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, prodData, catData] = await Promise.all([
          adminTransactions.stats({ period: 'day' }),
          adminProducts.list({ limit: '1' }),
          adminCategories.list({ flat: 'true' }),
        ])
        setStats(statsData as Stats)
        setProductsCount((prodData as any)?.pagination?.total || 0)
        setCategoriesCount((catData as any[])?.length || 0)
      } catch (err) {
        console.error('[admin-dashboard] Fetch error:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  const totals = stats?.totals || { total_orders: 0, successful: 0, cancelled: 0, pending: 0, refunded: 0, revenue: 0 }
  const successRate = totals.total_orders > 0
    ? Math.round((totals.successful / totals.total_orders) * 100)
    : 0

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Дашборд</h1>
        <p className="text-sm text-gray-400 mt-1">
          Добро пожаловать, {admin?.email}
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-gray-800 bg-gray-900">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500/10">
              <ShoppingCart className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{totals.total_orders}</p>
              <p className="text-xs text-gray-400">Всего операций</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-800 bg-gray-900">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10">
              <CheckCircle2 className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{totals.successful}</p>
              <p className="text-xs text-gray-400">Успешных ({successRate}%)</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-800 bg-gray-900">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/10">
              <TrendingUp className="h-6 w-6 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {new Intl.NumberFormat("ru-RU").format(Number(totals.revenue))} KGS
              </p>
              <p className="text-xs text-gray-400">Выручка</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-800 bg-gray-900">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-500/10">
              <Clock className="h-6 w-6 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{totals.pending}</p>
              <p className="text-xs text-gray-400">В обработке</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-gray-800 bg-gray-900">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-700/50">
              <Package className="h-5 w-5 text-gray-300" />
            </div>
            <div>
              <p className="text-lg font-bold text-white">{productsCount}</p>
              <p className="text-xs text-gray-400">Товаров в каталоге</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-800 bg-gray-900">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-700/50">
              <FolderTree className="h-5 w-5 text-gray-300" />
            </div>
            <div>
              <p className="text-lg font-bold text-white">{categoriesCount}</p>
              <p className="text-xs text-gray-400">Категорий</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-800 bg-gray-900">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
              <AlertCircle className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-white">{totals.cancelled}</p>
              <p className="text-xs text-gray-400">Отменено</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent activity / by provider */}
      {stats?.by_provider && stats.by_provider.length > 0 && (
        <Card className="border-gray-800 bg-gray-900">
          <CardContent className="p-6">
            <h3 className="mb-4 text-sm font-semibold text-gray-300">Операции по провайдерам</h3>
            <div className="space-y-3">
              {stats.by_provider.map((p) => (
                <div key={p.provider} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-gray-700 text-gray-300">
                      {p.provider}
                    </Badge>
                    <span className="text-sm text-gray-400">{p.total} операций</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-emerald-400">{p.completed} успешно</span>
                    {p.failed > 0 && <span className="text-red-400">{p.failed} ошибок</span>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
