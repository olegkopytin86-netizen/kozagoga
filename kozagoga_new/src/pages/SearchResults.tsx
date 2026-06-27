import { useEffect, useState } from "react"
import { useSearchParams, Link } from "react-router-dom"
import { Search, ArrowLeft, Package } from "lucide-react"
import ProductCard from "@/components/ProductCard"
import { ProductGridSkeleton } from "@/components/ProductSkeleton"
import { Button } from "@/components/ui/button"
import { API_BASE } from "@/lib/api"

interface SearchResult {
  id: string
  name: string
  slug: string
  price_min: number
  price_max: number
  image_url: string | null
  rating: number
  review_count: number
  delivery_time: string
  region: string
  short_description: string
  variants: any[]
}

interface SearchResponse {
  items: SearchResult[]
  pagination: {
    page: number
    limit: number
    total: number
    total_pages: number
  }
}

export default function SearchResults() {
  const [searchParams] = useSearchParams()
  const query = searchParams.get("q") || ""
  const [data, setData] = useState<SearchResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!query) {
      setLoading(false)
      setData(null)
      return
    }
    const fetchResults = async () => {
      setLoading(true)
      try {
        const res = await fetch(`${API_BASE}/api/products?search=${encodeURIComponent(query)}&limit=50`)
        if (res.ok) {
          setData(await res.json())
        }
      } catch {
        // ignore
      }
      setLoading(false)
    }
    fetchResults()
  }, [query])

  const products = data?.items || []

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Заголовок */}
      <div className="mb-8">
        <Link
          to="/catalog"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Назад в каталог
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Search className="h-6 w-6" />
          {query ? `Результаты поиска: "${query}"` : "Поиск"}
        </h1>
        {data && (
          <p className="mt-1 text-sm text-muted-foreground">
            Найдено {data.pagination.total} товаров
          </p>
        )}
      </div>

      {/* Результаты */}
      {loading ? (
        <ProductGridSkeleton />
      ) : !query ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <Search className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-2 text-lg font-semibold">Введите поисковый запрос</h2>
          <p className="text-sm text-muted-foreground">
            Начните вводить название товара в строке поиска
          </p>
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <Package className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-2 text-lg font-semibold">Ничего не найдено</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            По запросу "{query}" ничего не найдено. Попробуйте изменить запрос.
          </p>
          <Link to="/catalog">
            <Button variant="outline">Смотреть каталог</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product as any}
            />
          ))}
        </div>
      )}
    </div>
  )
}
