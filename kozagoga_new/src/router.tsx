import { createBrowserRouter } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import App from './App'
import Home from './pages/Home'
import About from './pages/About'
import FAQ from './pages/FAQ'
import Contacts from './pages/Contacts'
import Catalog from './pages/Catalog'
import ProductDetail from './pages/ProductDetail'
import SearchResults from './pages/SearchResults'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Orders from './pages/Orders'
import Checkout from './pages/Checkout'
import Cart from './pages/Cart'
import OrderDetail from './pages/OrderDetail'
import Profile from './pages/Profile'
import WalletPage from './pages/Wallet'
import NotFound from './pages/NotFound'
import { ProtectedRoute, AdminRoute } from './components/ProtectedRoute'
import { Skeleton } from '@/components/ui/skeleton'

// Lazy-loaded admin pages (separate chunks)
const AdminLayout = lazy(() => import('@/pages/admin/AdminLayout'))
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'))
const AdminCategories = lazy(() => import('@/pages/admin/AdminCategories'))
const AdminProducts = lazy(() => import('@/pages/admin/AdminProducts'))
const AdminTransactions = lazy(() => import('@/pages/admin/AdminTransactions'))
const AdminUsers = lazy(() => import('@/pages/admin/AdminUsers'))
const AdminLogs = lazy(() => import('@/pages/admin/AdminLogs'))
const AdminConfig = lazy(() => import('@/pages/admin/AdminConfig'))
const AdminLogin = lazy(() => import('@/pages/admin/AdminLogin'))

function AdminFallback() {
  return (
    <div className="flex h-screen items-center justify-center bg-gray-950">
      <div className="space-y-4 w-full max-w-md p-6">
        <Skeleton className="h-8 w-48 bg-gray-800" />
        <Skeleton className="h-4 w-64 bg-gray-800" />
        <div className="grid grid-cols-2 gap-4 mt-6">
          <Skeleton className="h-28 rounded-xl bg-gray-800" />
          <Skeleton className="h-28 rounded-xl bg-gray-800" />
        </div>
      </div>
    </div>
  )
}

export const router = createBrowserRouter([
  // ═══════════════════════════════════════════
  // Public / User routes (with Header + Footer)
  // ═══════════════════════════════════════════
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Home /> },
      { path: 'about', element: <About /> },
      { path: 'faq', element: <FAQ /> },
      { path: 'contacts', element: <Contacts /> },
      { path: 'catalog', element: <Catalog /> },
      { path: 'product/:slug', element: <ProductDetail /> },
      { path: 'search', element: <SearchResults /> },
      { path: 'login', element: <Login /> },
      { path: 'register', element: <Register /> },
      {
        path: 'dashboard',
        element: <ProtectedRoute><Dashboard /></ProtectedRoute>,
      },
      {
        path: 'dashboard/wallet',
        element: <ProtectedRoute><WalletPage /></ProtectedRoute>,
      },
      { path: 'checkout', element: <Checkout /> },
      { path: 'cart', element: <Cart /> },
      {
        path: 'orders',
        element: <ProtectedRoute><Orders /></ProtectedRoute>,
      },
      {
        path: 'orders/:id',
        element: <ProtectedRoute><OrderDetail /></ProtectedRoute>,
      },
      {
        path: 'profile',
        element: <ProtectedRoute><Profile /></ProtectedRoute>,
      },
      { path: '*', element: <NotFound /> },
    ],
  },

  // ═══════════════════════════════════════════
  // Admin routes (без Header/Footer, своя layout)
  // ═══════════════════════════════════════════
  {
    path: '/admin/login',
    element: (
      <Suspense fallback={<div className="flex h-screen items-center justify-center bg-gray-950"><Skeleton className="h-96 w-96 rounded-xl bg-gray-800" /></div>}>
        <AdminLogin />
      </Suspense>
    ),
  },
  {
    path: '/admin',
    element: (
      <Suspense fallback={<AdminFallback />}>
        <AdminLayout />
      </Suspense>
    ),
    children: [
      { index: true, element: <AdminDashboard /> },
      { path: 'dashboard', element: <AdminDashboard /> },
      { path: 'categories', element: <AdminCategories /> },
      { path: 'products', element: <AdminProducts /> },
      { path: 'transactions', element: <AdminTransactions /> },
      { path: 'users', element: <AdminUsers /> },
      { path: 'logs', element: <AdminLogs /> },
      { path: 'config', element: <AdminConfig /> },
    ],
  },
])
