import { useState, useEffect } from "react"
import { Package, ShoppingCart, Users, FolderTree, TrendingUp } from "lucide-react"
import { db } from "@/lib/api"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatPrice } from "@/lib/utils"
import AdminLayout from "./admin/AdminLayout"
import AdminProducts from "./admin/AdminProducts"
import AdminOrders from "./admin/AdminOrders"
import AdminCategories from "./admin/AdminCategories"
import AdminTickets from "./admin/AdminTickets"
import AdminUsers from "./admin/AdminUsers"
import AdminKeyPool from "./admin/AdminKeyPool"
import AdminCoupons from "./admin/AdminCoupons"
import AdminBundles from "./admin/AdminBundles"
import AdminSettings from "./admin/AdminSettings"
import type { Product, Order, Category } from "@/types/database"

export default function AdminDashboard({ defaultTab }) {
  const [activeTab, setActiveTab] = useState(defaultTab || "products")
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
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

  const totalRevenue = orders.reduce((sum, o) => sum + (o.status === "paid" || o.status === "completed" ? Number(o.total) : 0), 0)

  if (loading && activeTab === "products") {
    return (
      <div className="min-h-screen bg-[#08080C] p-8">
        <Skeleton className="mb-6 h-8 w-64 bg-white/5" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-xl bg-white/5" />)}
        </div>
      </div>
    )
  }

  function renderContent() {
    switch (activeTab) {
      case "products":
        return (
          <div className="space-y-6">
            {/* Stats bar */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard icon={Package} label="Товаров" value={products.length} color="primary" />
              <StatCard icon={ShoppingCart} label="Заказов" value={orders.length} color="emerald" />
              <StatCard icon={TrendingUp} label="Выручка" value={formatPrice(totalRevenue)} color="amber" />
              <StatCard icon={FolderTree} label="Категорий" value={categories.length} color="blue" />
            </div>
            <AdminProducts products={products} categories={categories}
              onRefresh={async () => {
                const r = await db.from("products").select("*").order("created_at", { ascending: false })
                if (r.data) setProducts(r.data)
              }} />
          </div>
        )
      case "orders": return <AdminOrders />
      case "categories":
        return <AdminCategories categories={categories}
          onRefresh={async () => {
            const r = await db.from("categories").select("*").order("sort_order", { ascending: true })
            if (r.data) setCategories(r.data)
          }} />
      case "tickets": return <AdminTickets />
      case "keypool": return <AdminKeyPool />
      case "coupons": return <AdminCoupons />
      case "bundles": return <AdminBundles />
      case "users": return <AdminUsers />
      case "settings": return <AdminSettings />
      default: return <AdminProducts products={products} categories={categories} onRefresh={() => {}} />
    }
  }

  return (
    <AdminLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderContent()}
    </AdminLayout>
  )
}

function StatCard({ icon: Icon, label, value, color }) {
  const colors = {
    primary: "bg-[#7850FF]/10 text-[#7850FF]",
    emerald: "bg-emerald-900/30 text-emerald-400",
    amber: "bg-amber-900/30 text-amber-400",
    blue: "bg-blue-900/30 text-blue-400",
  }
  return (
    <Card className="bg-white/[0.03] border-white/10">
      <CardContent className="flex items-center gap-4 p-6">
        <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${colors[color] || colors.primary}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-2xl font-bold text-white">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}
