import { useEffect, useState } from "react"
import { useSearchParams, Link } from "react-router-dom"
import { Search, ArrowLeft } from "lucide-react"
import { db } from "@/lib/api"
import ProductCard from "@/components/ProductCard"
import { ProductGridSkeleton } from "@/components/ProductSkeleton"
import { Button } from "@/components/ui/button"
import type { Product } from "@/types/database"

export default function SearchResults() {
  const [searchParams] = useSearchParams()
  const query = searchParams.get("q") || ""
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!query) {
      setLoading(false)
      setProducts([])
      return
    }
    const fetchResults = async () => {
      setLoading(true)
      const { data } = await db
        .from("products")
        .select("*")
        .eq("is_active", true)
        .ilike("name", `%${query}%`)
        .order("rating", { ascending: false })
      if (data) setProducts(data)
      setLoading(false)
    }
    fetchResults()
  }, [query])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Link to="/catalog" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4" />
          Назад в каталог
        </Link>

        <div className="mb-6">
          <h1 className="text-2xl font-bold">
            <Search className="mr-2 inline-block h-6 w-6 text-primary" />
            Результаты поиска: «{query}»
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading ? "Поиск..." : `Найдено ${products.length} товаров`}
          </p>
        </div>

        {loading ? (
          <ProductGridSkeleton count={4} />
        ) : products.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border bg-white p-12 text-center">
            <Search className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">Ничего не найдено</h3>
            <p className="mb-6 text-sm text-muted-foreground">
              Попробуйте изменить поисковый запрос
            </p>
            <Link to="/catalog">
              <Button variant="outline">Смотреть все товары</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
