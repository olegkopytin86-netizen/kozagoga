import { Link } from "react-router-dom"
import { Zap, ChevronRight, Sparkles } from "lucide-react"
import GameCard from "@/components/GameCard"
import TrustBlock from "@/components/TrustBlock"
import { popularProducts } from "@/data/products"

const brands = [
  { name: "Steam", icon: "/images/products/steam.png" },
  { name: "PlayStation", icon: "/images/products/playstation.png" },
  { name: "Xbox", icon: "/images/products/xbox.png" },
  { name: "Apple", icon: "/images/products/appstore.png" },
]

export default function Home() {
  return (
    <div className="bg-[#151515] min-h-screen">
      {/* ─── COMPACT HERO ─── */}
      <section className="relative overflow-hidden bg-[#151515]">
        {/* Orange ambient glow */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-[-20%] right-[-10%] h-[500px] w-[500px] rounded-full bg-gradient-to-br from-[#FF7A00]/10 to-transparent blur-[120px]" />
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#151515] to-transparent" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Logo */}
          <div className="mb-4 sm:mb-6">
            <span className="text-[28px] sm:text-[36px] font-bold tracking-tight select-none">
              <span className="text-white">Cifra</span>
              <span className="text-[#FF7A00] drop-shadow-[0_0_18px_rgba(255,122,0,0.35)]">Mall</span>
            </span>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center lg:gap-10">
            {/* Left: Mascot */}
            <div className="relative flex-shrink-0 flex items-end justify-center w-full lg:w-auto">
              {/* Orange aura */}
              <div className="absolute left-1/2 top-1/2 h-[200px] w-[200px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#FF7A00]/12 blur-[60px]" />
              <div className="absolute left-1/2 top-1/2 h-[140px] w-[140px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#FF7A00]/10" />

              <img
                src="/images/brand/mikhail-original-1783154724.png"
                alt="CifraMall mascot"
                className="relative z-10 h-[200px] sm:h-[240px] lg:h-[280px] w-auto object-contain drop-shadow-[0_20px_40px_rgba(255,122,0,0.25)] animate-[float_4s_ease-in-out_infinite]"
                style={{ imageRendering: "auto" }}
              />
            </div>

            {/* Right: Content */}
            <div className="flex-1 lg:pl-4 mt-4 lg:mt-0 text-center lg:text-left">
              <h1 className="text-[28px] sm:text-[36px] lg:text-[44px] font-bold leading-[1.15] text-white max-w-2xl">
                Игры и цифровые товары — за пару кликов
              </h1>

              <p className="mt-3 text-base sm:text-lg leading-relaxed text-[#A5A5A5] max-w-xl">
                Пополняйте игровые сервисы, покупайте подарочные карты и подписки быстро и удобно в CifraMall.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3 justify-center lg:justify-start">
                <Link to="/catalog">
                  <span className="group relative inline-flex h-[52px] items-center gap-2 overflow-hidden rounded-[20px] bg-gradient-to-r from-[#FF7A00] to-[#FF8C1A] px-7 text-sm font-bold text-white shadow-[0_12px_30px_rgba(255,122,0,0.35)] transition-all duration-300 hover:-translate-y-[2px] hover:shadow-[0_16px_40px_rgba(255,122,0,0.5)] active:translate-y-0">
                    <span className="absolute inset-0 translate-x-[-120%] bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-[120%]" />
                    <span className="relative flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      Начать покупки
                      <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                    </span>
                  </span>
                </Link>
              </div>

              {/* Brand strip */}
              <div className="mt-6 flex items-center gap-4 sm:gap-6 text-[#A5A5A5] justify-center lg:justify-start">
                <span className="text-[11px] font-semibold uppercase tracking-widest">Пополнения</span>
                <span className="w-px h-4 bg-[#2B2B2B]" />
                <span className="text-[11px] font-semibold uppercase tracking-widest">Карты</span>
                <span className="w-px h-4 bg-[#2B2B2B]" />
                <span className="text-[11px] font-semibold uppercase tracking-widest">Сервисы</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── DIVIDER LINE ─── */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="h-px bg-gradient-to-r from-transparent via-[#FF7A00]/20 to-transparent" />
      </div>

      {/* ─── POPULAR PRODUCTS ─── */}
      <section className="py-6 sm:py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <Sparkles className="h-4 w-4 text-[#FF7A00]" />
              <h2 className="text-lg sm:text-xl font-bold text-white">Популярное</h2>
            </div>
            <Link
              to="/catalog"
              className="text-xs font-medium text-[#A5A5A5] hover:text-[#FF7A00] transition-colors flex items-center gap-1"
            >
              Все товары
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          {/* Product grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {popularProducts.map((product) => (
              <GameCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* ─── TRUST ─── */}
      <TrustBlock />
    </div>
  )
}
