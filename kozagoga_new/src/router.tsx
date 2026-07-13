import { createBrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './contexts/AuthContext'
import AdminShell from './pages/admin/AdminShell'
import Home from './pages/Home'
import About from './pages/About'
import FAQ from './pages/FAQ'
import Contacts from './pages/Contacts'
import Catalog from './pages/Catalog'
import ProductDetail from './pages/ProductDetail'
import ProductDetailV2 from './pages/ProductDetailV2'
import SearchResults from './pages/SearchResults'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Orders from './pages/Orders'
import Checkout from './pages/Checkout'
import Cart from './pages/Cart'
import OrderDetail from './pages/OrderDetail'
import Profile from './pages/Profile'
import AdminDashboard from './pages/AdminDashboard'
import WalletPage from './pages/Wallet'
import TicketList from './pages/TicketList'
import TicketForm from './pages/TicketForm'
import TicketDetail from './pages/TicketDetail'
import CifraMallPreview from './pages/CifraMallPreview'
import NotFound from './pages/NotFound'
import { ProtectedRoute, AdminRoute } from './components/ProtectedRoute'

export const router = createBrowserRouter([
  // ─── Основной сайт (с Header/Footer) ──────────────────
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Home /> },
      { path: 'about', element: <About /> },
      { path: 'faq', element: <FAQ /> },
      { path: 'contacts', element: <Contacts /> },
      { path: 'catalog', element: <Catalog /> },
      { path: 'product/:slug', element: <ProductDetailV2 /> },
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
      {
        path: 'dashboard/support',
        element: <ProtectedRoute><TicketList /></ProtectedRoute>,
      },
      {
        path: 'dashboard/support/new',
        element: <ProtectedRoute><TicketForm /></ProtectedRoute>,
      },
      {
        path: 'dashboard/support/:id',
        element: <ProtectedRoute><TicketDetail /></ProtectedRoute>,
      },
      { path: 'checkout', element: <Checkout /> },
      {
        path: 'cart',
        element: <Cart />,
      },
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
      { path: 'ciframall', element: <CifraMallPreview /> },
      { path: '*', element: <NotFound /> },
    ],
  },

  // ─── Админка (БЕЗ Header/Footer, отдельная зона) ────
  {
    path: '/admin',
    element: <AuthProvider><AdminRoute><AdminShell /></AdminRoute></AuthProvider>,
    children: [
      { index: true, element: <AdminDashboard /> },
    ],
  },

  // ─── /tech/admin — ведёт на ту же админку ────────────
  {
    path: '/tech/admin',
    element: <AuthProvider><AdminRoute><AdminShell /></AdminRoute></AuthProvider>,
    children: [
      { index: true, element: <AdminDashboard /> },
    ],
  },
])
