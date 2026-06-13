import { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Search, ShoppingCart, User, Menu, X, ChevronDown, Package, Zap, Gift, CreditCard, Headphones, LogOut, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/contexts/AuthContext"
import { useCart } from "@/contexts/CartContext"
import { db } from "@/lib/api"
import { defaultCategories } from "@/lib/categories"
import type { Category } from "@/types/database"

export default function Header() {
  const { user, isAdmin, logout } = useAuth()
  const { itemCount } = useCart()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState("")
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [catalogOpen, setCatalogOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
      setMobileMenuOpen(false)
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Логотип */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 font-bold text-white text-sm shadow-sm">
              К
            </div>
            <span className="hidden text-xl font-bold sm:block bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              Kozagoga
            </span>
          </Link>

          {/* Поиск */}
          <form onSubmit={handleSearch} className="hidden flex-1 md:block max-w-md lg:max-w-lg">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Поиск игр, ключей, пополнений..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 bg-secondary/50 border-none focus-visible:bg-white"
              />
            </div>
          </form>

          {/* Навигация */}
          <nav className="hidden items-center gap-1 md:flex">
            {/* Каталог с выпадающим меню */}
            <div
              className="relative"
              onMouseEnter={() => setCatalogOpen(true)}
              onMouseLeave={() => setCatalogOpen(false)}
            >
              <button className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
                Каталог
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${catalogOpen ? "rotate-180" : ""}`} />
              </button>
              {catalogOpen && (
                <div className="absolute left-0 top-full mt-1 w-56 rounded-xl border bg-white p-2 shadow-lg animate-in fade-in slide-in-from-top-2">
                  {displayCategories.map((cat) => (
                    <Link
                      key={cat.slug}
                      to={`/catalog?category=${cat.slug}`}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-secondary transition-colors"
                    >
                      {"icon" in cat && cat.icon && <span className="text-lg">{cat.icon}</span>}
                      <span>{cat.name}</span>
                    </Link>
                  ))}
                  <div className="mt-1 border-t pt-1">
                    <Link
                      to="/catalog"
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-primary hover:bg-primary/5 transition-colors"
                    >
                      <Package className="h-4 w-4" />
                      Все товары
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <Link
              to="/about"
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            >
              О нас
            </Link>

            <Link
              to="/faq"
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            >
              FAQ
            </Link>

            {/* Пользователь */}
            {user ? (
              <div
                className="relative"
                onMouseEnter={() => setUserMenuOpen(true)}
                onMouseLeave={() => setUserMenuOpen(false)}
              >
                <button className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
                  <User className="h-4 w-4" />
                  <span className="hidden lg:inline">{user.email?.split("@")[0]}</span>
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${userMenuOpen ? "rotate-180" : ""}`} />
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-1 w-56 rounded-xl border bg-white p-2 shadow-lg animate-in fade-in slide-in-from-top-2">
                    <Link
                      to="/dashboard"
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-secondary transition-colors"
                    >
                      <User className="h-4 w-4" />
                      Личный кабинет
                    </Link>
                    <Link
                      to="/orders"
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-secondary transition-colors"
                    >
                      <Package className="h-4 w-4" />
                      Мои заказы
                    </Link>
                    {isAdmin && (
                      <Link
                        to="/admin"
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-primary hover:bg-primary/5 transition-colors"
                      >
                        <Shield className="h-4 w-4" />
                        Админ-панель
                      </Link>
                    )}
                    <div className="mt-1 border-t pt-1">
                      <button
                        onClick={logout}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="h-4 w-4" />
                        Выйти
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login">
                <Button variant="outline" size="sm" className="gap-1">
                  <User className="h-4 w-4" />
                  Войти
                </Button>
              </Link>
            )}

            {/* Корзина */}
            <Link to="/cart">
              <Button variant="ghost" size="icon" className="relative">
                <ShoppingCart className="h-5 w-5" />
                {itemCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground animate-in zoom-in">
                    {itemCount > 99 ? "99+" : itemCount}
                  </span>
                )}
              </Button>
            </Link>
          </nav>

          {/* Мобильное меню */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex items-center justify-center rounded-lg p-2 md:hidden hover:bg-secondary"
            aria-label="Меню"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Мобильное меню */}
      {mobileMenuOpen && (
        <div className="border-t bg-white md:hidden">
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
            <form onSubmit={handleSearch} className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Поиск товаров..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10"
                />
              </div>
            </form>
            <nav className="flex flex-col gap-1">
              <Link
                to="/catalog"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-secondary"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Package className="h-4 w-4" />
                Каталог
              </Link>
              {displayCategories.slice(0, 4).map((cat) => (
                <Link
                  key={cat.slug}
                  to={`/catalog?category=${cat.slug}`}
                  className="ml-6 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-secondary"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {"icon" in cat && cat.icon && <span className="mr-2">{cat.icon}</span>}
                  {cat.name}
                </Link>
              ))}
              <Link
                to="/about"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-secondary"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Headphones className="h-4 w-4" />
                О нас
              </Link>
              <Link
                to="/faq"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-secondary"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Zap className="h-4 w-4" />
                FAQ
              </Link>
              <div className="my-2 border-t" />
              {user ? (
                <>
                  <Link
                    to="/dashboard"
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-secondary"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <User className="h-4 w-4" />
                    Личный кабинет
                  </Link>
                  <Link
                    to="/orders"
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-secondary"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Package className="h-4 w-4" />
                    Мои заказы
                  </Link>
                  {isAdmin && (
                    <Link
                      to="/admin"
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-primary"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Shield className="h-4 w-4" />
                      Админ-панель
                    </Link>
                  )}
                  <button
                    onClick={() => { logout(); setMobileMenuOpen(false) }}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-red-500 hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Выйти
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-secondary"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <User className="h-4 w-4" />
                  Войти
                </Link>
              )}
              <Link
                to="/cart"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-secondary"
                onClick={() => setMobileMenuOpen(false)}
              >
                <ShoppingCart className="h-4 w-4" />
                Корзина {itemCount > 0 && `(${itemCount})`}
              </Link>
            </nav>
          </div>
        </div>
      )}
    </header>
  )
}
