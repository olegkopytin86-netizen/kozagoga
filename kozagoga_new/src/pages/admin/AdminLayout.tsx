import { useState, useEffect } from "react"
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom"
import { useAdminAuth, type AdminRole } from "@/contexts/AdminAuthContext"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ShoppingCart,
  Users,
  FileText,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  Sun,
  Moon,
  Shield,
} from "lucide-react"
import { useTheme } from "next-themes"

// ─── Sidebar navigation items ─────────────────────────

interface NavItem {
  to: string
  label: string
  icon: React.ReactNode
  roles: AdminRole[] // доступные роли
}

const navItems: NavItem[] = [
  { to: "/admin/dashboard", label: "Дашборд", icon: <LayoutDashboard className="h-5 w-5" />, roles: ["viewer", "operator", "admin", "superadmin"] },
  { to: "/admin/categories", label: "Категории", icon: <FolderTree className="h-5 w-5" />, roles: ["admin", "superadmin"] },
  { to: "/admin/products", label: "Товары", icon: <Package className="h-5 w-5" />, roles: ["admin", "superadmin"] },
  { to: "/admin/transactions", label: "Операции", icon: <ShoppingCart className="h-5 w-5" />, roles: ["viewer", "operator", "admin", "superadmin"] },
  { to: "/admin/users", label: "Администраторы", icon: <Users className="h-5 w-5" />, roles: ["superadmin"] },
  { to: "/admin/logs", label: "Логи", icon: <FileText className="h-5 w-5" />, roles: ["viewer", "operator", "admin", "superadmin"] },
  { to: "/admin/config", label: "Конфигурация", icon: <Settings className="h-5 w-5" />, roles: ["superadmin"] },
]

// ─── Breadcrumb mapping ───────────────────────────────

const breadcrumbMap: Record<string, string> = {
  dashboard: "Дашборд",
  categories: "Категории",
  products: "Товары",
  transactions: "Операции",
  users: "Администраторы",
  logs: "Логи",
  config: "Конфигурация",
}

// ─── Role badges ──────────────────────────────────────

const roleBadge: Record<AdminRole, { label: string; className: string }> = {
  viewer: { label: "Просмотр", className: "bg-gray-500/20 text-gray-300" },
  operator: { label: "Оператор", className: "bg-blue-500/20 text-blue-300" },
  admin: { label: "Админ", className: "bg-amber-500/20 text-amber-300" },
  superadmin: { label: "Superadmin", className: "bg-red-500/20 text-red-300" },
}

export default function AdminLayout() {
  const { admin, loading, logout } = useAdminAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { theme, setTheme } = useTheme()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !admin) {
      navigate('/admin/login', { replace: true })
    }
  }, [admin, loading, navigate])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!admin) return null

  const handleLogout = async () => {
    await logout()
    navigate("/admin/login")
  }

  // Фильтруем пункты меню по роли
  const visibleItems = navItems.filter(
    (item) => admin && item.roles.includes(admin.role as AdminRole)
  )

  // Текущий раздел для breadcrumb
  const currentSection = location.pathname.split("/")[2]
  const breadcrumb = breadcrumbMap[currentSection] || ""

  if (!admin) return null

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-gray-700/50 px-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <Shield className="h-5 w-5 text-primary" />
        </div>
        {!sidebarCollapsed && (
          <div>
            <p className="text-sm font-semibold text-white">Kozagogo</p>
            <p className="text-xs text-gray-400">Админ-панель</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-gray-400 hover:bg-gray-700/50 hover:text-gray-200"
              }`
            }
          >
            {item.icon}
            {!sidebarCollapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User info */}
      <div className="border-t border-gray-700/50 p-3">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-gray-600 text-xs text-gray-300">
              {admin.email.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {!sidebarCollapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{admin.email}</p>
              <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${roleBadge[admin.role]?.className || ""}`}>
                {roleBadge[admin.role]?.label || admin.role}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-gray-950 text-gray-100">
      {/* Desktop sidebar */}
      <aside
        className={`hidden border-r border-gray-800 bg-gray-900 transition-all duration-200 md:block ${
          sidebarCollapsed ? "w-16" : "w-64"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform border-r border-gray-800 bg-gray-900 transition-transform duration-200 md:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-16 items-center gap-4 border-b border-gray-800 bg-gray-900/80 px-4 backdrop-blur">
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden text-gray-400 hover:text-white"
          >
            <Menu className="h-5 w-5" />
          </button>

          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden text-gray-400 hover:text-white md:block"
          >
            {sidebarCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </button>

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">Админка</span>
            {breadcrumb && (
              <>
                <span className="text-gray-600">/</span>
                <span className="text-gray-200">{breadcrumb}</span>
              </>
            )}
          </div>

          <div className="flex-1" />

          {/* Theme toggle */}
          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          )}

          {/* Date/time */}
          <span className="hidden text-xs text-gray-500 lg:block">
            {new Date().toLocaleDateString("ru-RU", {
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>

          {/* Logout */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-gray-400 hover:text-red-400"
          >
            <LogOut className="h-4 w-4" />
            <span className="ml-2 hidden sm:inline">Выйти</span>
          </Button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
