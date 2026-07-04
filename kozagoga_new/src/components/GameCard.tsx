import { Link } from "react-router-dom"
import { Badge } from "@/components/ui/badge"
import type { GameProduct } from "@/data/products"

interface GameCardProps {
  product: GameProduct
}

export default function GameCard({ product }: GameCardProps) {
  const discount = product.badge?.startsWith("-") ? product.badge : null

  return (
    <Link
      to={`/product/${product.id}`}
      className="group relative flex flex-col items-center overflow-hidden rounded-2xl border border-[rgba(255,122,0,0.2)] bg-gradient-to-br from-[#1E1E1E] to-[#151515] p-4 transition-all duration-300 hover:-translate-y-[6px] hover:scale-[1.03] hover:shadow-[0_12px_30px_rgba(255,122,0,0.2)] hover:border-[#FF7A00]/50"
    >
      {/* Badge */}
      {product.badge && !discount && (
        <div className="absolute left-2 top-2 z-10">
          <Badge className="bg-[#FF7A00] text-white shadow-lg text-[10px] px-2 py-0.5">
            {product.badge}
          </Badge>
        </div>
      )}
      {discount && (
        <div className="absolute left-2 top-2 z-10">
          <Badge className="bg-red-600 text-white shadow-lg text-[10px] px-2 py-0.5">{discount}</Badge>
        </div>
      )}

      {/* Image */}
      <div className="flex h-16 w-16 items-center justify-center sm:h-20 sm:w-20">
        <img
          src={product.image}
          alt={product.name}
          className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-110"
          loading="lazy"
        />
      </div>

      {/* Name */}
      <span className="mt-3 text-center text-xs font-medium text-gray-300 line-clamp-2 leading-tight">
        {product.name}
      </span>

      {/* Price */}
      <span className="mt-1 text-sm font-bold text-white">
        {product.price.toLocaleString("ru-RU")} ₽
      </span>
    </Link>
  )
}
