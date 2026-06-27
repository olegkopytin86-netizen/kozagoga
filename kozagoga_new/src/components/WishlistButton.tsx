// WishlistButton — сердечко для добавления/удаления из избранного
// ─────────────────────────────────────────────────────────

import { useState } from "react"
import { Heart } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/AuthContext"
import { addToWishlist, removeFromWishlist, fetchWishlist } from "@/lib/wishlist-api"

interface WishlistButtonProps {
  productId: string
  wishlistId?: string | null
  className?: string
  onToggle?: (isWishlisted: boolean) => void
}

export default function WishlistButton({ productId, wishlistId: initialWishlistId, className, onToggle }: WishlistButtonProps) {
  const { user } = useAuth()
  const [isWishlisted, setIsWishlisted] = useState(!!initialWishlistId)
  const [loading, setLoading] = useState(false)

  if (!user) return null

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (loading) return
    setLoading(true)

    try {
      if (isWishlisted && initialWishlistId) {
        await removeFromWishlist(initialWishlistId)
        setIsWishlisted(false)
        onToggle?.(false)
      } else {
        await addToWishlist(productId)
        setIsWishlisted(true)
        onToggle?.(true)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-full transition-all hover:bg-black/5",
        loading && "opacity-50",
        className
      )}
      title={isWishlisted ? "Удалить из избранного" : "Добавить в избранное"}
    >
      <Heart
        className={cn(
          "h-5 w-5 transition-colors",
          isWishlisted
            ? "fill-red-500 text-red-500"
            : "text-gray-400 hover:text-red-400"
        )}
      />
    </button>
  )
}
