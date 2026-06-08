import { useSearchParams } from "react-router-dom"
import { SlidersHorizontal, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface FilterPanelProps {
  className?: string
}

export default function FilterPanel({ className }: FilterPanelProps) {
  const [searchParams, setSearchParams] = useSearchParams()

  const sort = searchParams.get("sort") || "popular"
  const minPrice = searchParams.get("minPrice") || ""
  const maxPrice = searchParams.get("maxPrice") || ""
  const delivery = searchParams.get("delivery") || "any"
  const region = searchParams.get("region") || "all"

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams)
    if (value && value !== "any" && value !== "all") {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    setSearchParams(params)
  }

  const clearFilters = () => {
    const params = new URLSearchParams()
    const category = searchParams.get("category")
    const q = searchParams.get("q")
    if (category) params.set("category", category)
    if (q) params.set("q", q)
    setSearchParams(params)
  }

  const hasFilters = sort !== "popular" || minPrice || maxPrice || delivery !== "any" || region !== "all"

  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4" />
          <span className="text-sm font-medium">Фильтры</span>
        </div>
        {hasFilters && (
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={clearFilters}>
            <X className="mr-1 h-3 w-3" />
            Сбросить
          </Button>
        )}
      </div>

      {/* Сортировка */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Сортировка</Label>
        <Select value={sort} onValueChange={(v) => updateParam("sort", v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="popular">Популярные</SelectItem>
            <SelectItem value="price-asc">Сначала дешёвые</SelectItem>
            <SelectItem value="price-desc">Сначала дорогие</SelectItem>
            <SelectItem value="rating">По рейтингу</SelectItem>
            <SelectItem value="newest">Новинки</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Цена */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Цена</Label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder="От"
            value={minPrice}
            onChange={(e) => updateParam("minPrice", e.target.value)}
            className="h-9"
          />
          <span className="text-muted-foreground">—</span>
          <Input
            type="number"
            placeholder="До"
            value={maxPrice}
            onChange={(e) => updateParam("maxPrice", e.target.value)}
            className="h-9"
          />
        </div>
      </div>

      {/* Время доставки */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Время доставки</Label>
        <Select value={delivery} onValueChange={(v) => updateParam("delivery", v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Любое</SelectItem>
            <SelectItem value="Мгновенно">Мгновенно</SelectItem>
            <SelectItem value="1–5 минут">1–5 минут</SelectItem>
            <SelectItem value="5–30 минут">5–30 минут</SelectItem>
            <SelectItem value="1–3 дня">1–3 дня</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Регион */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Регион</Label>
        <Select value={region} onValueChange={(v) => updateParam("region", v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все регионы</SelectItem>
            <SelectItem value="Россия">Россия</SelectItem>
            <SelectItem value="Европа">Европа</SelectItem>
            <SelectItem value="СНГ">СНГ</SelectItem>
            <SelectItem value="Мир">Мир</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
