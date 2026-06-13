import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { ArrowRight, Zap, TrendingUp, Star } from "lucide-react"
import { db } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import ProductCard from "@/components/ProductCard"
import CategoryNav from "@/components/CategoryNav"
import TrustBlock from "@/components/TrustBlock"
import { ProductGridSkeleton } from "@/components/ProductSkeleton"
import type { Product } from "@/types/database"

export default function Home() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProducts = async () => {
      const { data } = await db
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("is_featured", { ascending: false })
        .order("rating", { ascending: false })
        .limit(8)
      if (data) {
        setFeaturedProducts(data)
      }
      setLoading(false)
    }
    fetchProducts()
  }, [])

  return (
    <div>
      {/* Hero секция */}
      <section className="relative overflow-hidden bg-gradient-to-br from-black via-gray-900 to-black">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="max-w-2xl">
            <Badge variant="secondary" className="mb-4 bg-primary/20 text-primary border-primary/30">
              <Zap className="mr-1 h-3 w-3" />
              Мгновенная доставка цифровых товаров
            </Badge>
            <h1 className="mb-4 text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Маркетплейс
              <span className="text-primary"> цифровых </span>
              товаров
            </h1>
            <p className="mb-8 text-lg text-gray-400">
              Игры, пополнения кошельков, подарочные карты, подписки и многое другое.
              Мгновенная доставка, безопасные платежи, лучшие цены.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/catalog">
                <Button size="lg" className="gap-2">
                  <Zap className="h-5 w-5" />
                  Перейти к покупкам
                </Button>
              </Link>
              <Link to="/catalog?category=games">
                <Button variant="outline" size="lg" className="border-white/20 text-white hover:bg-white/10">
                  Игры
                </Button>
              </Link>
            </div>
          </div>
        </div>
        {/* Декоративные элементы */}
        <div className="absolute -right-20 top-1/2 hidden h-80 w-80 -translate-y-1/2 rounded-full bg-primary/5 blur-3xl lg:block" />
        <div className="absolute -bottom-20 left-1/3 hidden h-60 w-60 rounded-full bg-primary/10 blur-3xl lg:block" />
      </section>

      {/* Категории */}
      <section className="border-b bg-white py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Категории</h2>
            <Link to="/catalog" className="flex items-center gap-1 text-sm text-primary hover:underline">
              Все категории <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <CategoryNav />
        </div>
      </section>

      {/* Товары */}
      <section className="bg-white py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">
                <TrendingUp className="mr-2 inline-block h-6 w-6 text-primary" />
                Популярные товары
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Самые востребованные позиции у наших покупателей
              </p>
            </div>
            <Link to="/catalog">
              <Button variant="outline" className="hidden sm:flex">
                Смотреть все <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          {loading ? (
            <ProductGridSkeleton count={8} />
          ) : featuredProducts.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border bg-secondary/50 p-12 text-center">
              <Star className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">Товары скоро появятся</h3>
              <p className="mb-6 text-sm text-muted-foreground">
                Мы наполняем каталог лучшими предложениями. Загляните позже!
              </p>
              <Link to="/catalog">
                <Button>Перейти в каталог</Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Trust блок */}
      <TrustBlock />

      {/* CTA секция */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="mb-4 text-3xl font-bold">
            Начните покупать прямо сейчас
          </h2>
          <p className="mb-8 text-lg text-muted-foreground">
            Тысячи цифровых товаров с мгновенной доставкой. Безопасно и удобно.
          </p>
          <div className="flex justify-center gap-4">
            <Link to="/register">
              <Button size="lg">Создать аккаунт</Button>
            </Link>
            <Link to="/catalog">
              <Button variant="outline" size="lg">Каталог</Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
