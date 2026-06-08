import { Outlet } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import { AuthProvider } from './contexts/AuthContext'
import { CartProvider } from './contexts/CartContext'

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">
          <Outlet />
        </main>
        <Footer />
      </div>
      </CartProvider>
    </AuthProvider>
  )
}
