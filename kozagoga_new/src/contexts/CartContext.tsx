// Cart Context — серверная корзина через /api/cart/*
// (SRS Модуль 3)
// ─────────────────────────────────────────────────────────

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react"
import { fetchCart, addToCartAPI, updateCartItemAPI, removeFromCartAPI, clearCartAPI } from "@/lib/cart-api"
import type { ServerCartItem, ServerCartResponse } from "@/lib/cart-api"

export interface CartItem {
  id: string
  productId: string
  name: string
  price: number
  quantity: number
  image: string
  slug: string
  variantId?: string | null
}

interface CartContextType {
  items: CartItem[]
  addItem: (item: Omit<CartItem, "quantity"> & { variantId?: string | null }) => Promise<void>
  removeItem: (id: string) => Promise<void>
  updateQuantity: (id: string, quantity: number) => Promise<void>
  clearCart: () => Promise<void>
  itemCount: number
  subtotal: number
  loading: boolean
  serverCart: ServerCartResponse | null
  refreshCart: () => Promise<void>
}

const CartContext = createContext<CartContextType | undefined>(undefined)

function mapServerItems(items: ServerCartItem[]): CartItem[] {
  return items.map(item => ({
    id: item.id,
    productId: item.product_id,
    name: item.product_name,
    price: parseFloat(item.item_price),
    quantity: item.quantity,
    image: item.image_url || '',
    slug: item.slug,
  }))
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [serverCart, setServerCart] = useState<ServerCartResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshCart = useCallback(async () => {
    try {
      const cart = await fetchCart()
      setServerCart(cart)
    } catch {
      // Если сервер недоступен — показываем пустую корзину
      setServerCart(null)
    } finally {
      setLoading(false)
    }
  }, [])

  // Загружаем корзину при монтировании
  useEffect(() => {
    refreshCart()
  }, [refreshCart])

  const items = serverCart ? mapServerItems(serverCart.items) : []
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)
  const subtotal = serverCart?.subtotal || 0

  const addItem = useCallback(async (newItem: Omit<CartItem, "quantity"> & { variantId?: string | null }) => {
    await addToCartAPI(newItem.productId, 1, newItem.variantId || undefined)
    await refreshCart()
  }, [refreshCart])

  const removeItem = useCallback(async (id: string) => {
    await removeFromCartAPI(id)
    await refreshCart()
  }, [refreshCart])

  const updateQuantity = useCallback(async (id: string, quantity: number) => {
    if (quantity <= 0) {
      await removeItem(id)
      return
    }
    await updateCartItemAPI(id, quantity)
    await refreshCart()
  }, [removeItem, refreshCart])

  const clearCart = useCallback(async () => {
    await clearCartAPI()
    await refreshCart()
  }, [refreshCart])

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        itemCount,
        subtotal,
        loading,
        serverCart,
        refreshCart,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return context
}
