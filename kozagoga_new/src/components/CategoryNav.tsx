import { useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { cn } from "@/lib/utils"
import { db } from "@lork/sdk"
import type { Category } from "@/types/database"

interface CategoryNavProps {
  className?: string
}

const defaultCategories = [
  { name: "Игры", slug: "games", icon: "🎮" },
  { name: "Пополнение кошельков", slug: "top-ups", icon: "💰" },
  { name: "Подарочные карты", slug: "gift-cards", icon: "🎁" },
  { name: "Подписки", slug: "subscriptions", icon: "📱" },
  { name: "Аккаунты", slug: "accounts", icon: "👤" },
  { name: "Услуги", slug: "services", icon: "⚡" },
]

export default function CategoryNav({ className }: CategoryNavProps) {
  const [searchParams] = useSearchParams()
  const currentCategory = searchParams.get("category")
  const [categories, setCategories] = useState<Category[]>([])

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await db
        .from("categories")
        .select("*")
        .order("sort_order", { ascending: true })
      if (data && data.length > 0) {
        setCategories(data)
      }
    }
    fetchCategories()
  }, [])

  const displayCategories = categories.length > 0 ? categories : defaultCategories

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      <Link
        to="/catalog"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
          !currentCategory
            ? "border-primary bg-primary/10 text-primary"
            : "border-border bg-white text-muted-foreground hover:border-primary/30 hover:text-foreground"
        )}
      >
        Все
      </Link>
      {displayCategories.map((cat) => {
        const isActive = currentCategory === cat.slug
        return (
          <Link
            key={cat.slug}
            to={`/catalog?category=${cat.slug}`}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
              isActive
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-white text-muted-foreground hover:border-primary/30 hover:text-foreground"
            )}
          >
            {"icon" in cat && cat.icon && <span>{cat.icon}</span>}
            {cat.name}
          </Link>
        )
      })}
    </div>
  )
}
