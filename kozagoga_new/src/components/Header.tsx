import { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Search, User, Menu, X, ChevronDown, Package, Headphones, LogOut, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/contexts/AuthContext"
import { db } from "@/lib/api"
import { defaultCategories } from "@/lib/categories"
import type { Category } from "@/types/database"

export default function Header() {
  const { user, isAdmin, logout } = useAuth()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState("")
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [catalogOpen, setCatalogOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [scrolled, setScrolled] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    const { data } = await db.from("categories").select("*").order("sort_order", { ascending: true })
    if (data && data.length > 0) setCategories(data)
  }

  const displayCategories = categories.length > 0 ? categories : defaultCategories

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
      setMobileMenuOpen(false)
      setSearchOpen(false)
    }
  }

  return (
    <>
      <header
        className={`sticky top-0 z-50 transition-all duration-500 ${
          scrolled
            ? "bg-[rgba(6,11,26,0.82)] backdrop-blur-2xl shadow-[0_18px_60px_rgba(0,148,255,0.14),0_4px_30px_rgba(0,0,0,0.5)]"
            : "bg-[rgba(6,11,26,0.55)] backdrop-blur-xl shadow-[0_14px_50px_rgba(0,148,255,0.06)]"
        }`}
        style={{ borderBottom: scrolled ? '1px solid rgba(0,229,255,0.16)' : '1px solid rgba(0,229,255,0.10)' }}
      >
        <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
          <div className="flex h-14 sm:h-[90px] lg:h-[130px] items-center justify-between relative">
            {/* ─── Левая часть: CifraMall logo (персонаж скрыт, потом отладим) ─── */}
            <Link to="/" className="flex items-center gap-2 sm:gap-5 shrink-0 group">
              <div className="flex flex-col leading-none">
                <span className="text-xl sm:text-[32px] lg:text-[56px] font-bold tracking-tight leading-none">
                  <span className="text-white drop-shadow-[0_0_20px_rgba(0,148,255,0.30)]">Cifra</span>
                  <span className="text-galaxy-gradient">Mall</span>
                </span>
              </div>
            </Link>

            {/* ─── Поиск (десктоп) — galaxy input ─── */}
            <form onSubmit={handleSearch} className="hidden lg:block flex-1 max-w-md mx-auto">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6F7A99]" />
                <Input
                  type="search"
                  placeholder="Поиск игр, ключей, пополнений..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 bg-[rgba(255,255,255,0.06)] text-white placeholder:text-[rgba(255,255,255,0.28)] border border-[rgba(0,229,255,0.20)] rounded-2xl text-sm backdrop-blur-xl focus-visible:ring-2 focus-visible:ring-[#00E5FF]/35 focus-visible:border-[#00E5FF]/28 shadow-[0_10px_34px_rgba(0,229,255,0.06)]"
                />
              </div>
            </form>

            {/* ─── Правая секция ─── */}
            <div className="flex items-center gap-0.5 sm:gap-2">
              {/* Поиск (мобильный) */}
              <button
                onClick={() => setSearchOpen(true)}
                className="lg:hidden flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl text-[rgba(255,255,255,0.5)] hover:text-white hover:bg-[rgba(0,148,255,0.10)] hover:border-[rgba(0,148,255,0.20)] border border-transparent active:scale-95 transition-all"
                aria-label="Поиск"
              >
                <Search className="h-5 w-5" />
              </button>

              {/* Категории (десктоп) */}
              <nav className="hidden xl:flex items-center gap-1 mr-2">
                <div className="relative"
                  onMouseEnter={() => setCatalogOpen(true)}
                  onMouseLeave={() => setCatalogOpen(false)}>
                  <button className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-[#A9B4D0] hover:text-white rounded-xl hover:bg-[rgba(0,148,255,0.08)] hover:border-[rgba(0,148,255,0.15)] border border-transparent transition-all duration-200">
                    Всё <ChevronDown className={`h-3.5 w-3.5 transition-transform ${catalogOpen ? "rotate-180" : ""}`} />
                  </button>
                  {catalogOpen && (
                    <div className="absolute left-0 top-full mt-1 w-52 rounded-xl border border-[rgba(0,148,255,0.15)] bg-[rgba(8,12,25,0.95)] backdrop-blur-2xl p-2 shadow-2xl shadow-[rgba(0,148,255,0.12)] animate-fade-in-up">
                      {displayCategories.map((cat) => (
                        <Link key={cat.slug} to={`/catalog?category=${cat.slug}`}
                          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[#A9B4D0] hover:text-white hover:bg-[rgba(0,148,255,0.08)] transition-colors">
                          {"icon" in cat && cat.icon && <span className="text-lg">{cat.icon}</span>}
                          <span>{cat.name}</span>
                        </Link>
                      ))}
                      <div className="mt-1 border-t border-[rgba(0,148,255,0.08)] pt-1">
                        <Link to="/catalog"
                          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[#00E5FF] hover:bg-[rgba(0,148,255,0.08)]">
                          <Package className="h-4 w-4" /> Все товары
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              </nav>

              {/* Пользователь */}
              {user ? (
                <div className="relative"
                  onMouseEnter={() => setUserMenuOpen(true)}
                  onMouseLeave={() => setUserMenuOpen(false)}>
                  <button className="flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl text-[rgba(255,255,255,0.5)] hover:text-white hover:bg-[rgba(0,148,255,0.10)] hover:border-[rgba(0,148,255,0.20)] border border-transparent active:scale-95 transition-all">
                    <User className="h-5 w-5" />
                  </button>
                  {userMenuOpen && (
                    <div className="absolute right-0 top-full mt-1 w-56 rounded-xl border border-[rgba(0,148,255,0.15)] bg-[rgba(8,12,25,0.95)] backdrop-blur-2xl p-2 shadow-2xl shadow-[rgba(0,148,255,0.12)] animate-fade-in-up">
                      <Link to="/dashboard" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[#A9B4D0] hover:text-white hover:bg-[rgba(0,148,255,0.08)]"><User className="h-4 w-4" /> Личный кабинет</Link>
                      <Link to="/orders" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[#A9B4D0] hover:text-white hover:bg-[rgba(0,148,255,0.08)]"><Package className="h-4 w-4" /> Мои заказы</Link>
                      {isAdmin && <Link to="/admin" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[#00E5FF] hover:bg-[rgba(0,148,255,0.08)]"><Shield className="h-4 w-4" /> Админ-панель</Link>}
                      <div className="mt-1 border-t border-[rgba(0,148,255,0.08)] pt-1">
                        <button onClick={() => { logout(); setUserMenuOpen(false) }}
                          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[#FF4D6D] hover:bg-red-500/10"><LogOut className="h-4 w-4" /> Выйти</button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Link to="/login">
                  <Button variant="ghost" size="icon"
                    className="w-10 h-10 sm:w-11 sm:h-11 text-[rgba(255,255,255,0.5)] hover:text-white hover:bg-[rgba(0,148,255,0.10)]">
                    <User className="h-5 w-5" />
                  </Button>
                </Link>
              )}

              {/* Мобильное меню */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl text-[rgba(255,255,255,0.5)] hover:text-white hover:bg-[rgba(0,148,255,0.10)] hover:border-[rgba(0,148,255,0.20)] border border-transparent active:scale-95 transition-all xl:hidden"
                aria-label="Меню"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ─── Полноэкранный поиск (мобильный) ─── */}
      {searchOpen && (
        <div className="fixed inset-0 z-[100] bg-[rgba(6,11,26,0.98)] backdrop-blur-2xl flex flex-col p-4 pt-12 lg:hidden animate-fade-in-up">
          <div className="flex items-center justify-between mb-6">
            <span className="text-lg font-bold text-white">Поиск</span>
            <button onClick={() => setSearchOpen(false)}
              className="flex items-center justify-center w-11 h-11 rounded-xl text-[rgba(255,255,255,0.5)] hover:text-white hover:bg-[rgba(0,148,255,0.10)] active:scale-95 transition-all">
              <X className="h-6 w-6" />
            </button>
          </div>
          <form onSubmit={handleSearch}>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#6F7A99]" />
              <Input
                type="search"
                placeholder="Поиск игр, ключей, пополнений..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="w-full pl-12 pr-4 h-14 bg-[rgba(255,255,255,0.08)] text-white placeholder:text-[rgba(255,255,255,0.3)] border border-[rgba(0,229,255,0.20)] rounded-2xl text-base backdrop-blur-md focus-visible:ring-2 focus-visible:ring-[#00E5FF]/35"
              />
            </div>
          </form>
          <div className="mt-6 text-center text-sm text-[#6F7A99]">
            Введите название игры или товара
          </div>
        </div>
      )}

      {/* ─── Мобильное меню ─── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[100] bg-[rgba(6,11,26,0.98)] backdrop-blur-2xl flex flex-col xl:hidden animate-fade-in-up">
          <div className="flex items-center justify-between p-4 pt-12">
            <span className="text-lg font-bold text-white">Меню</span>
            <button onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center w-11 h-11 rounded-xl text-[rgba(255,255,255,0.5)] hover:text-white hover:bg-[rgba(0,148,255,0.10)] active:scale-95 transition-all">
              <X className="h-6 w-6" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 pb-8">
            <div className="space-y-1">
              <Link to="/catalog" className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-medium text-white hover:bg-[rgba(0,148,255,0.10)] active:scale-[0.98] transition-all"
                onClick={() => setMobileMenuOpen(false)}>
                <Package className="h-5 w-5 text-[#0094FF]" />
                Каталог
              </Link>
              <div className="h-px bg-[rgba(0,148,255,0.08)] my-3" />
              {user ? (
                <>
                  <Link to="/dashboard" className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm text-[#A9B4D0] hover:text-white hover:bg-[rgba(0,148,255,0.08)] active:scale-[0.98] transition-all"
                    onClick={() => setMobileMenuOpen(false)}>
                    <User className="h-5 w-5" /> Личный кабинет
                  </Link>
                  <Link to="/orders" className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm text-[#A9B4D0] hover:text-white hover:bg-[rgba(0,148,255,0.08)] active:scale-[0.98] transition-all"
                    onClick={() => setMobileMenuOpen(false)}>
                    <Package className="h-5 w-5" /> Мои заказы
                  </Link>
                  {isAdmin && <Link to="/admin" className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-medium text-[#00E5FF] hover:bg-[rgba(0,148,255,0.08)] active:scale-[0.98] transition-all"
                    onClick={() => setMobileMenuOpen(false)}>
                    <Shield className="h-5 w-5" /> Админ-панель
                  </Link>}
                  <button onClick={() => { logout(); setMobileMenuOpen(false) }}
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-sm text-[#FF4D6D] hover:bg-red-500/10 active:scale-[0.98] transition-all">
                    <LogOut className="h-5 w-5" /> Выйти
                  </button>
                </>
              ) : (
                <Link to="/login" className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-medium text-white hover:bg-[rgba(0,148,255,0.10)] active:scale-[0.98] transition-all"
                  onClick={() => setMobileMenuOpen(false)}>
                  <User className="h-5 w-5" /> Войти
                </Link>
              )}
              <Link to="/faq" className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm text-[rgba(255,255,255,0.4)] hover:text-white hover:bg-[rgba(0,148,255,0.08)] active:scale-[0.98] transition-all"
                onClick={() => setMobileMenuOpen(false)}>
                <Headphones className="h-5 w-5" /> FAQ
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
