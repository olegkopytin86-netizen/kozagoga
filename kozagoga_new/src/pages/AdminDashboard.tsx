import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  FolderTree,
  TrendingUp,
  Plus,
  Edit,
  Trash2,
  ArrowLeft,
} from "lucide-react"
import { db } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { formatPrice } from "@/lib/utils"
import type { Product, Order, Category } from "@/types/database"

export default function AdminDashboard() {
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const [prodRes, ordRes, catRes] = await Promise.all([
        db.from("products").select("*").order("created_at", { ascending: false }),
        db.from("orders").select("*").order("created_at", { ascending: false }).limit(10),
        db.from("categories").select("*").order("sort_order", { ascending: true }),
      ])
      if (prodRes.data) setProducts(prodRes.data)
      if (ordRes.data) setOrders(ordRes.data)
      if (catRes.data) setCategories(catRes.data)
      setLoading(false)
    }
    fetchData()
  }, [])

  const statusBadge = (status: string | null) => {
    const variants: Record<string, "default" | "secondary" | "success" | "warning" | "danger"> = {
      pending: "warning",
      paid: "success",
      processing: "default",
      completed: "success",
      cancelled: "danger",
    }
    return <Badge variant={variants[status || "pending"] || "secondary"}>{status || "unknown"}</Badge>
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <Skeleton className="mb-6 h-8 w-64" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  const totalRevenue = orders.reduce((sum, o) => sum + (o.status === "paid" || o.status === "completed" ? o.total : 0), 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              <LayoutDashboard className="mr-3 inline-block h-8 w-8 text-primary" />
              Админ-панель
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Управление магазином Козагога
            </p>
          </div>
          <Link to="/dashboard">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              В кабинет
            </Button>
          </Link>
        </div>

        {/* Статистика */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{products.length}</p>
                <p className="text-xs text-muted-foreground">Товаров</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100">
                <ShoppingCart className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{orders.length}</p>
                <p className="text-xs text-muted-foreground">Заказов</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100">
                <TrendingUp className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatPrice(totalRevenue)}</p>
                <p className="text-xs text-muted-foreground">Выручка</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{categories.length}</p>
                <p className="text-xs text-muted-foreground">Категорий</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Табы */}
        <Tabs defaultValue="products" className="space-y-6">
          <TabsList>
            <TabsTrigger value="products">
              <Package className="mr-2 h-4 w-4" />
              Товары
            </TabsTrigger>
            <TabsTrigger value="orders">
              <ShoppingCart className="mr-2 h-4 w-4" />
              Заказы
            </TabsTrigger>
            <TabsTrigger value="categories">
              <FolderTree className="mr-2 h-4 w-4" />
              Категории
            </TabsTrigger>
          </TabsList>

          {/* Товары */}
          <TabsContent value="products">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Управление товарами</CardTitle>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Добавить товар
                </Button>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-3 font-medium">Название</th>
                        <th className="pb-3 font-medium">Цена</th>
                        <th className="pb-3 font-medium">Категория</th>
                        <th className="pb-3 font-medium">Статус</th>
                        <th className="pb-3 font-medium">Рейтинг</th>
                        <th className="pb-3 font-medium">Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-muted-foreground">
                            Товары не найдены. Добавьте первый товар.
                          </td>
                        </tr>
                      ) : (
                        products.map((product) => (
                          <tr key={product.id} className="border-b last:border-0 hover:bg-secondary/50">
                            <td className="py-3 font-medium">{product.name}</td>
                            <td className="py-3">{formatPrice(product.price)}</td>
                            <td className="py-3 text-muted-foreground">
                              {product.category_id ? product.category_id.substring(0, 8) : "—"}
                            </td>
                            <td className="py-3">
                              <Badge variant={product.is_active ? "success" : "secondary"}>
                                {product.is_active ? "Активен" : "Неактивен"}
                              </Badge>
                            </td>
                            <td className="py-3">{product.rating?.toFixed(1) || "—"}</td>
                            <td className="py-3">
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Заказы */}
          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Последние заказы</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-3 font-medium">ID</th>
                        <th className="pb-3 font-medium">Сумма</th>
                        <th className="pb-3 font-medium">Статус</th>
                        <th className="pb-3 font-medium">Оплата</th>
                        <th className="pb-3 font-medium">Дата</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-muted-foreground">
                            Заказов пока нет.
                          </td>
                        </tr>
                      ) : (
                        orders.map((order) => (
                          <tr key={order.id} className="border-b last:border-0 hover:bg-secondary/50">
                            <td className="py-3 font-mono text-xs">{order.id.substring(0, 8)}...</td>
                            <td className="py-3 font-medium">{formatPrice(order.total)}</td>
                            <td className="py-3">{statusBadge(order.status)}</td>
                            <td className="py-3">{statusBadge(order.payment_status)}</td>
                            <td className="py-3 text-muted-foreground">
                              {new Date(order.created_at).toLocaleDateString("ru-RU")}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Категории */}
          <TabsContent value="categories">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Категории</CardTitle>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Добавить категорию
                </Button>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-3 font-medium">Название</th>
                        <th className="pb-3 font-medium">Slug</th>
                        <th className="pb-3 font-medium">Порядок</th>
                        <th className="pb-3 font-medium">Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categories.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-muted-foreground">
                            Категории не найдены.
                          </td>
                        </tr>
                      ) : (
                        categories.map((cat) => (
                          <tr key={cat.id} className="border-b last:border-0 hover:bg-secondary/50">
                            <td className="py-3 font-medium">{cat.name}</td>
                            <td className="py-3 text-muted-foreground">{cat.slug}</td>
                            <td className="py-3">{cat.sort_order || "—"}</td>
                            <td className="py-3">
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
