// ============================================
// Admin Router
// Lazy-loaded маршруты для личного кабинета администратора
// Каждый раздел — отдельный JS-чанк (Vite dynamic import)
// ============================================

import { lazy, Suspense } from "react"
import { Route } from "react-router-dom"
import { Skeleton } from "@/components/ui/skeleton"

// Lazy-loaded admin pages
const AdminLayout = lazy(() => import("@/pages/admin/AdminLayout"))
const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard"))
const AdminCategories = lazy(() => import("@/pages/admin/AdminCategories"))
const AdminProducts = lazy(() => import("@/pages/admin/AdminProducts"))
const AdminTransactions = lazy(() => import("@/pages/admin/AdminTransactions"))
const AdminUsers = lazy(() => import("@/pages/admin/AdminUsers"))
const AdminLogs = lazy(() => import("@/pages/admin/AdminLogs"))
const AdminConfig = lazy(() => import("@/pages/admin/AdminConfig"))

// Loading fallback
function AdminFallback() {
  return (
    <div className="flex items-center justify-center h-full min-h-[60vh]">
      <div className="space-y-4 w-full max-w-md p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
        <div className="grid grid-cols-2 gap-4 mt-6">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
      </div>
    </div>
  )
}

/**
 * Возвращает React Router Route для админ-панели
 * Использование: в главном router.tsx добавить { adminRoutes() }
 */
export function adminRoutes() {
  return (
    <Route
      path="/admin"
      element={
        <Suspense fallback={<AdminFallback />}>
          <AdminLayout />
        </Suspense>
      }
    >
      <Route index element={<AdminDashboard />} />
      <Route path="dashboard" element={
        <Suspense fallback={<AdminFallback />}>
          <AdminDashboard />
        </Suspense>
      } />
      <Route path="categories" element={
        <Suspense fallback={<div className="p-6"><Skeleton className="h-96 rounded-xl" /></div>}>
          <AdminCategories />
        </Suspense>
      } />
      <Route path="products" element={
        <Suspense fallback={<div className="p-6"><Skeleton className="h-96 rounded-xl" /></div>}>
          <AdminProducts />
        </Suspense>
      } />
      <Route path="transactions" element={
        <Suspense fallback={<div className="p-6"><Skeleton className="h-96 rounded-xl" /></div>}>
          <AdminTransactions />
        </Suspense>
      } />
      <Route path="users" element={
        <Suspense fallback={<div className="p-6"><Skeleton className="h-96 rounded-xl" /></div>}>
          <AdminUsers />
        </Suspense>
      } />
      <Route path="logs" element={
        <Suspense fallback={<div className="p-6"><Skeleton className="h-48 rounded-xl" /></div>}>
          <AdminLogs />
        </Suspense>
      } />
      <Route path="config" element={
        <Suspense fallback={<div className="p-6"><Skeleton className="h-48 rounded-xl" /></div>}>
          <AdminConfig />
        </Suspense>
      } />
    </Route>
  )
}

// Также экспортируем отдельный AdminLogin (без Layout)
export { default as AdminLogin } from "@/pages/admin/AdminLogin"
