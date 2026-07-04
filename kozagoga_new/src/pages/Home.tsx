import { Link } from "react-router-dom"
import { Zap } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import GameCard from "@/components/GameCard"
import TrustBlock from "@/components/TrustBlock"
import { popularProducts } from "@/data/products"

export default function Home() {
  return (
    <div>
      {/* Hero — mascot #4 integrated into the page, not inserted as a separate image */}
      <section className="relative overflow-hidden bg-[#08080d]">
        {/* Сцена сайта: графит + фиолетовый свет */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_48%,rgba(139,92,246,0.22),transparent_32%),radial-gradient(circle_at_72%_35%,rgba(168,85,247,0.14),transparent_30%),linear-gradient(135deg,#07070b_0%,#10101a_48%,#08080d_100%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.026)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.026)_1px,transparent_1px)] bg-[size:72px_72px] opacity-35" />
          <div className="absolute left-0 top-0 h-px w-full bg-gradient-to-r from-transparent via-purple-300/30 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-gray-900 via-gray-900/75 to-transparent" />
        </div>

        <div className="relative z-10 mx-auto grid min-h-[86vh] max-w-7xl items-center gap-10 px-4 py-20 sm:px-6 sm:py-20 lg:grid-cols-2 lg:gap-14 lg:px-8 lg:py-24">
          {/* Левая часть — персонаж как часть интерфейсной сцены */}
          <div className="relative order-2 flex min-h-[420px] items-end justify-center lg:order-1 lg:min-h-[560px] lg:justify-start">
            {/* Пурпурный портал/аура за белым 3D-персонажем */}
            <div className="absolute left-1/2 top-[45%] h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-600/18 blur-[85px] lg:left-[46%] lg:h-[540px] lg:w-[540px]" />
            <div className="absolute left-1/2 top-[45%] h-[310px] w-[310px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-purple-200/18 lg:left-[46%] lg:h-[410px] lg:w-[410px]" />
            <div className="absolute left-1/2 top-[45%] h-[390px] w-[390px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-purple-500/10 lg:left-[46%] lg:h-[510px] lg:w-[510px]" />

            {/* Декоративные цифровые элементы, связанные с тележкой */}
            <div className="absolute left-5 top-12 hidden rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 shadow-xl backdrop-blur-xl sm:block lg:left-0 lg:top-20">
              <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-purple-200">instant</div>
              <div className="mt-1 text-sm font-black text-white">delivery</div>
            </div>
            <div className="absolute right-8 top-20 rounded-2xl border border-purple-300/20 bg-purple-500/10 px-4 py-3 text-xl text-purple-100 shadow-xl backdrop-blur-xl lg:right-16 lg:top-24">
              ♪
            </div>
            <div className="absolute bottom-24 right-2 hidden rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-purple-100 shadow-xl backdrop-blur-xl sm:block lg:right-8">
              play
            </div>

            {/* Световая площадка — персонаж стоит внутри сайта, без белого фона и без рамки */}
            <div className="absolute bottom-14 h-28 w-[88%] max-w-[560px] rounded-[999px] bg-gradient-to-r from-transparent via-purple-300/22 to-transparent blur-2xl" />
            <div className="absolute bottom-[4.35rem] h-px w-[78%] max-w-[520px] bg-gradient-to-r from-transparent via-purple-200/45 to-transparent" />

            <img
              src="/images/brand/mikhail-original-1783154724.png"
              alt="white 3D ciframall mascot with purple shopping cart"
              className="relative z-10 w-[96%] max-w-[610px] object-contain drop-shadow-[0_36px_70px_rgba(124,58,237,0.34)] sm:w-[90%] lg:w-full"
            />
          </div>

          {/* Правая часть — текст по ширине страницы, пропорционально персонажу */}
          <div className="order-1 mx-auto max-w-xl text-center lg:order-2 lg:mx-0 lg:max-w-none lg:text-left">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-purple-400/20 bg-white/[0.04] px-4 py-2 shadow-lg shadow-purple-950/20 backdrop-blur-xl">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-purple-400 opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-purple-400 shadow-[0_0_18px_rgba(168,85,247,0.9)]" />
              </span>
              <span className="text-xs font-semibold uppercase tracking-[0.22em] text-purple-200">
                marketplace цифровых товаров
              </span>
            </div>

            <h1 className="text-5xl font-black tracking-tight sm:text-6xl lg:text-7xl xl:text-8xl">
              <span className="bg-gradient-to-br from-white via-white to-gray-300 bg-clip-text text-transparent">
                cifra
              </span>
              <span className="bg-gradient-to-br from-purple-300 via-purple-500 to-violet-600 bg-clip-text text-transparent drop-shadow-[0_0_28px_rgba(168,85,247,0.35)]">
                mall
              </span>
            </h1>

            <div className="mx-auto mt-5 h-[3px] w-32 rounded-full bg-gradient-to-r from-purple-500 via-violet-400 to-purple-700 shadow-[0_0_22px_rgba(168,85,247,0.55)] lg:mx-0" />

            <p className="mt-7 max-w-2xl text-xl leading-relaxed text-gray-300 sm:text-2xl">
              Цифровые товары, игры, подарочные карты и подписки — с мгновенной выдачей после оплаты.
            </p>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-gray-500">
              Белый 3D-персонаж работает как часть фирменной сцены: свет, тени, фиолетовая аура и интерфейсные элементы объединяют его с дизайном сайта.
            </p>

            <div className="mt-9 flex flex-wrap justify-center gap-4 lg:justify-start">
              <Link to="/catalog">
                <span className="group relative inline-flex h-[54px] items-center gap-2.5 overflow-hidden rounded-2xl bg-gradient-to-r from-purple-600 via-violet-600 to-purple-700 px-8 text-sm font-bold text-white shadow-[0_18px_50px_rgba(124,58,237,0.35)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_65px_rgba(124,58,237,0.48)] active:translate-y-0">
                  <span className="absolute inset-0 translate-x-[-120%] bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-[120%]" />
                  <span className="relative flex items-center gap-2.5">
                    <Zap className="h-5 w-5" />
                    Перейти к покупкам
                  </span>
                </span>
              </Link>
              <Link to="/catalog?category=games">
                <span className="inline-flex h-[54px] items-center rounded-2xl border border-white/10 bg-white/[0.04] px-7 text-sm font-semibold text-gray-200 shadow-xl backdrop-blur-xl transition-all duration-300 hover:border-purple-300/25 hover:bg-purple-400/10 hover:text-white">
                  Смотреть игры
                </span>
              </Link>
            </div>

            <div className="mt-11 grid grid-cols-3 gap-3 rounded-3xl border border-white/[0.06] bg-white/[0.025] p-3 backdrop-blur-xl">
              <div className="rounded-2xl bg-black/20 px-3 py-4 text-center lg:text-left">
                <div className="text-2xl font-black text-white">17+</div>
                <div className="mt-1 text-[11px] uppercase tracking-wider text-gray-500">товаров</div>
              </div>
              <div className="rounded-2xl bg-black/20 px-3 py-4 text-center lg:text-left">
                <div className="text-2xl font-black text-white">30 сек</div>
                <div className="mt-1 text-[11px] uppercase tracking-wider text-gray-500">выдача</div>
              </div>
              <div className="rounded-2xl bg-black/20 px-3 py-4 text-center lg:text-left">
                <div className="text-2xl font-black text-white">24/7</div>
                <div className="mt-1 text-[11px] uppercase tracking-wider text-gray-500">онлайн</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Популярные карточки */}
      <section className="bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <Badge variant="secondary" className="mb-3 bg-primary/10 text-primary border-primary/20">
              <Zap className="mr-1 h-3 w-3" />
              Мгновенная доставка
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight text-white">
              Популярные цифровые товары
            </h2>
            <p className="mt-2 text-gray-400">
              Игры, подарочные карты и подписки с доставкой за секунды
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {popularProducts.map((product) => (
              <GameCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* Trust блок */}
      <TrustBlock />
    </div>
  )
}
