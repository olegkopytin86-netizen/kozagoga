import { Link } from "react-router-dom"
import { ArrowLeft } from "lucide-react"
import CifraMallCard from "@/components/CifraMallCard"
import { popularProducts } from "@/data/products"
import GameCard from "@/components/GameCard"

export default function CifraMallPreview() {
  return (
    <div className="min-h-screen bg-[#08080C] text-white">
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Навигация */}
        <Link
          to="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          На главную
        </Link>

        <h1 className="mb-2 text-4xl font-bold tracking-tight">CifraMall</h1>
        <p className="mb-12 text-gray-400">
          Premium Digital Store — премиальные карточки товаров
        </p>

        {/* Steam Gift Card - CifraMall Premium */}
        <section className="mb-20">
          <h2 className="mb-6 text-2xl font-semibold text-white/80">
            CifraMall Premium Card — Steam Gift Card
          </h2>
          <div className="flex justify-center">
            <CifraMallCard
              imageUrl="/images/products/steam.png"
              title="Steam Gift Card"
              subtitle="Пополнение баланса Steam"
              price="от 500 ₽"
              onClick={() => window.open("/product/steam-gift-card", "_self")}
            />
          </div>
        </section>

        {/* Другие товары в формате GameCard для сравнения */}
        <section>
          <h2 className="mb-6 text-2xl font-semibold text-white/80">
            Текущие GameCard (для сравнения)
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {popularProducts.map((product) => (
              <GameCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
