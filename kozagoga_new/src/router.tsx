import { createBrowserRouter } from 'react-router-dom'
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
import AdminDashboard from './pages/AdminDashboard'
import WalletPage from './pages/Wallet'
import NotFound from './pages/NotFound'
import { ProtectedRoute, AdminRoute } from './components/ProtectedRoute'

export const router = createBrowserRouter([
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
      {
        path: 'admin',
        element: <AdminRoute><AdminDashboard /></AdminRoute>,
      },
      { path: '*', element: <NotFound /> },
    ],
  },
])
