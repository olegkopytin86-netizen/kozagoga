// ─── AdminLayout — боковое меню + контент ──────────────────
import { useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import {
  Package, ShoppingCart, FolderTree, LifeBuoy, Settings, Users, Key, TicketPercent, Gift, LogOut
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/AuthContext"

const NAV = [
  { id: "products", label: "Каталог продуктов", icon: Package },
  { id: "orders", label: "Список заказов", icon: ShoppingCart },
  { id: "categories", label: "Категории", icon: FolderTree },
  { id: "tickets", label: "Обращения", icon: LifeBuoy },
  { id: "keypool", label: "Пул ключей", icon: Key },
  { id: "coupons", label: "Промокоды", icon: TicketPercent },
  { id: "bundles", label: "Комплекты", icon: Gift },
  { id: "users", label: "Пользователи", icon: Users },
  { id: "settings", label: "Настройка учётки", icon: Settings },
]

export default function AdminLayout({ activeTab, onTabChange, children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen bg-[#08080C]">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 border-r border-white/10 bg-[#0D0D12] flex flex-col">
        <div className="p-5 border-b border-white/10">
          <h1 className="text-lg font-bold text-white">CifraMall</h1>
          <p className="text-xs text-gray-500 mt-0.5">Админ-панель</p>
          <p className="text-[10px] text-[#7850FF] mt-1 font-mono">v2.1.0</p>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV.map(item => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === item.id
                  ? 'bg-[#7850FF]/20 text-[#7850FF] border border-[#7850FF]/30'
                  : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10 space-y-2">
          <div className="text-xs text-gray-500 px-3">
            {user?.email} <span className="text-[#7850FF]">({user?.role})</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { logout(); navigate('/login') }}
            className="w-full justify-start text-gray-400 hover:text-red-400"
          >
            <LogOut className="h-4 w-4 mr-2" /> Выйти
          </Button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-6 lg:p-8">
        {children}
      </main>
    </div>
  )
}
