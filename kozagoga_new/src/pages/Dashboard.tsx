import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { User, ShoppingCart, Settings, CreditCard, LogOut, ArrowRight, Wallet as WalletIcon, MessageCircle, Gift, Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useAuth } from "@/contexts/AuthContext"
import { getWalletBalance } from "@/lib/api"
import { formatPrice } from "@/lib/utils"

export default function Dashboard() {
  const { user, logout } = useAuth()
  const [balance, setBalance] = useState<number | null>(null)
  const [balanceLoading, setBalanceLoading] = useState(true)

  useEffect(() => {
    getWalletBalance()
      .then((res) => setBalance(Number(res.balance)))
      .catch(() => setBalance(null))
      .finally(() => setBalanceLoading(false))
  }, [])

  const menuItems = [
    {
      title: "Мои заказы",
      description: "Просмотр и отслеживание заказов",
      icon: ShoppingCart,
      href: "/orders",
      color: "text-primary",
    },
    {
      title: "Кошелёк",
      description: "Баланс и история пополнений",
      icon: CreditCard,
      href: "/dashboard/wallet",
      color: "text-emerald-500",
    },
    {
      title: "Настройки профиля",
      description: "Изменить email, пароль и личные данные",
      icon: Settings,
      href: "/dashboard/settings",
      color: "text-muted-foreground",
    },
    {
      title: "Поддержка",
      description: "Обращения и тикеты",
      icon: MessageCircle,
      href: "/dashboard/support",
      color: "text-blue-500",
    },
    {
      title: "Избранное",
      description: "Сохранённые товары",
      icon: Heart,
      href: "/dashboard/favorites",
      color: "text-red-500",
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Приветствие */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Личный кабинет</h1>
              <p className="mt-1 text-muted-foreground">
                Добро пожаловать, {user?.email?.split("@")[0] || "пользователь"}
              </p>
            </div>
            <Button variant="ghost" onClick={logout} className="text-red-500 hover:text-red-600 hover:bg-red-50">
              <LogOut className="mr-2 h-4 w-4" />
              Выйти
            </Button>
          </div>
        </div>

        {/* Карточки профиля */}
        <div className="mb-8">
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <User className="h-8 w-8 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-lg font-semibold">{user?.email}</p>
                <p className="text-sm text-muted-foreground">
                  Роль: {user?.role === "admin" ? "Администратор" : "Пользователь"}
                </p>
              </div>
              <Link to="/dashboard/wallet" className="text-right block hover:opacity-80 transition-opacity">
                <p className="text-2xl font-bold font-mono">
                  {balanceLoading ? "..." : balance !== null ? formatPrice(balance) : "—"}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                  <WalletIcon className="w-3 h-3" />
                  Баланс кошелька
                </p>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Меню */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {menuItems.map((item) => (
            <Link key={item.href} to={item.href}>
              <Card className="group transition-all hover:border-primary/30 hover:shadow-md">
                <CardContent className="flex items-start gap-4 p-6">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-secondary ${item.color}`}>
                    <item.icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold group-hover:text-primary transition-colors">{item.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                  </div>
                  <ArrowRight className="mt-1 h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
