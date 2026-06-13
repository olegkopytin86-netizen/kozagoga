import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { Search, Package } from "lucide-react"
import { db } from "@lork/sdk"
import ProductCard from "@/components/ProductCard"
import CategoryNav from "@/components/CategoryNav"
import FilterPanel from "@/components/FilterPanel"
import { ProductGridSkeleton } from "@/components/ProductSkeleton"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { categoryTitleMap } from "@/lib/categories"
import type { Product } from "@/types/database"

export default function Catalog() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState(searchParams.get("q") || "")

  const category = searchParams.get("category")
  const query = searchParams.get("q")
  const sort = searchParams.get("sort") || "popular"
  const minPrice = searchParams.get("minPrice")
  const maxPrice = searchParams.get("maxPrice")
  const delivery = searchParams.get("delivery")
  const region = searchParams.get("region")

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true)
      let queryBuilder = db.from("products").select("*").eq("is_active", true)

      if (category) {
        // Получаем category_id по slug
        const { data: catData } = await db
          .from("categories")
          .select("id")
          .eq("slug", category)
          .single()
        if (catData) {
          queryBuilder = queryBuilder.eq("category_id", catData.id)
        }
      }

      if (query) {
        queryBuilder = queryBuilder.ilike("name", `%${query}%`)
      }

      if (minPrice) {
        queryBuilder = queryBuilder.gte("price", parseFloat(minPrice))
      }
      if (maxPrice) {
        queryBuilder = queryBuilder.lte("price", parseFloat(maxPrice))
      }

      if (delivery && delivery !== "any") {
        queryBuilder = queryBuilder.eq("delivery_time", delivery)
      }

      if (region && region !== "all") {
        queryBuilder = queryBuilder.eq("region", region)
      }

      // Сортировка
      switch (sort) {
        case "price-asc":
          queryBuilder = queryBuilder.order("price", { ascending: true })
          break
        case "price-desc":
          queryBuilder = queryBuilder.order("price", { ascending: false })
          break
        case "rating":
          queryBuilder = queryBuilder.order("rating", { ascending: false })
          break
        case "newest":
          queryBuilder = queryBuilder.order("created_at", { ascending: false })
          break
        default:
          queryBuilder = queryBuilder.order("rating", { ascending: false })
      }

      const { data } = await queryBuilder
      if (data) {
        setProducts(data)
      } else {
        setProducts([])
      }
      setLoading(false)
    }
    fetchProducts()
  }, [category, query, sort, minPrice, maxPrice, delivery, region])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams(searchParams)
    if (searchInput.trim()) {
      params.set("q", searchInput.trim())
    } else {
      params.delete("q")
    }
    setSearchParams(params)
  }

  const categoryTitle = category
    ? categoryTitleMap[category] || category
    : "Каталог"

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Заголовок */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold">
            {query ? `Результаты поиска: "${query}"` : categoryTitle}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading ? "Загрузка..." : `${products.length} товаров`}
          </p>
        </div>

        {/* Поиск */}
        <form onSubmit={handleSearch} className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Поиск в каталоге..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10"
            />
          </div>
        </form>

        {/* Категории */}
        <CategoryNav className="mb-6" />

        <div className="flex flex-col gap-8 lg:flex-row">
          {/* Фильтры */}
          <FilterPanel className="w-full shrink-0 lg:w-64" />

          {/* Товары */}
          <div className="flex-1">
            {loading ? (
              <ProductGridSkeleton count={8} />
            ) : products.length > 0 ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="rounded-lg border bg-white p-12 text-center">
                <Package className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-semibold">Товары не найдены</h3>
                <p className="mb-6 text-sm text-muted-foreground">
                  Попробуйте изменить параметры поиска или фильтры
                </p>
                <Button
                  variant="outline"
                  onClick={() => setSearchParams(new URLSearchParams())}
                >
                  Сбросить фильтры
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
