import { Link } from "react-router-dom"
import { TrendingUp, ChevronRight } from "lucide-react"
import ProductCard from "@/components/ProductCard"
import TrustBlock from "@/components/TrustBlock"
import { popularProducts } from "@/data/products"
import type { GameProduct } from "@/data/products"

/* Маппинг изображений */
const imageMap: Record<string, string> = {
  "steam-gift-card": "/images/products/igromir-steam.webp",
  "playstation-network": "/images/products/igromir-playstation.webp",
  "sony-playstation-card": "/images/products/igromir-playstation.webp",
  "xbox-live": "/images/products/igromir-xbox.webp",
  "nintendo-eshop": "/images/products/igromir-nintendo.webp",
  "nintendo-online": "/images/products/igromir-nintendo.webp",
  "blizzard-gift-card": "/images/products/igromir-battlenet.webp",
  "world-of-warcraft-time": "/images/products/igromir-battlenet.webp",
  "roblox-gift-card": "/images/products/roblox.svg",
  "roblox-card-pay": "/images/products/roblox.svg",
  "apex-legends": "/images/products/apex.svg",
  "apex-legends-xbox": "/images/products/apex.svg",
  "appstore-itunes": "/images/products/apple-gift.svg",
  "netflix-digital": "/images/products/search-netflix.png",
  "fortnite-1000-vbucks": "/images/products/fortnite.svg",
  "google-play-1000": "/images/products/google-play.svg",
  "valorant-1000-vp": "/images/products/valorant.svg",
  "pubg-1000-gcoin": "/images/products/pubg.svg",
  "genshin-1000-crystals": "/images/products/genshin.svg",
  "mobile-legends-1000": "/images/products/mobile-legends.svg",
  "lol-2000-rp": "/images/products/league-of-legends.svg",
  "minecraft-java-gift": "/images/products/minecraft.svg",
  "razer-gold-500": "/images/products/razer-gold.svg",
}

const shortDescriptions: Record<string, string> = {
  "steam-gift-card": "Пополнение кошелька Steam",
  "playstation-network": "Пополнение кошелька PSN",
  "sony-playstation-card": "Пополнение кошелька PlayStation",
  "xbox-live": "Пополнение баланса Xbox",
  "roblox-gift-card": "Пополнение Roblox",
  "roblox-card-pay": "Пополнение Roblox",
  "nintendo-eshop": "Пополнение Nintendo eShop",
  "nintendo-online": "Подписка Nintendo Switch Online",
  "blizzard-gift-card": "Пополнение Battle.net",
  "world-of-warcraft-time": "Тайм-карта WoW 60 дней",
  "apex-legends": "Пополнение Apex Legends",
  "apex-legends-xbox": "Пополнение Apex Legends Xbox",
  "fortnite-1000-vbucks": "1000 V-Bucks для Fortnite",
  "google-play-1000": "Google Play на 1000 ₽",
  "valorant-1000-vp": "1000 VP для Valorant",
  "pubg-1000-gcoin": "1000 G-COIN для PUBG",
  "genshin-1000-crystals": "1000 Кристаллов Genshin",
  "mobile-legends-1000": "1000 алмазов Mobile Legends",
  "lol-2000-rp": "2000 RP для League of Legends",
  "minecraft-java-gift": "Minecraft Java Edition",
  "razer-gold-500": "500 Razer Gold",
}

const enhancedProducts: GameProduct[] = popularProducts.map((p) => ({
  ...p,
  ...(imageMap[p.id] ? { image: imageMap[p.id] } : {}),
  ...(shortDescriptions[p.id] ? { description: shortDescriptions[p.id] } : {}),
}))

// Все 17 товаров — без фильтрации дубликатов
const filteredProducts = enhancedProducts

/* Платформы-магазины — igromir gamestore фоны */
const PLATFORM_STORES = [
  { slug: "steam", label: "Steam", image: "/images/products/gamestore-steam.webp", logo: "/images/products/steam_logo.svg" },
  { slug: "playstation", label: "PlayStation", image: "/images/products/gamestore-playstation.webp", logo: null },
  { slug: "xbox", label: "Xbox", image: "/images/products/gamestore-xbox.webp", logo: "/images/products/logo_xbox.svg" },
  { slug: "nintendo", label: "Nintendo", image: "/images/products/gamestore-nintendo.webp", logo: null },
  { slug: "battlenet", label: "Battle.net", image: "/images/products/gamestore-battlenet.webp", logo: null },
]

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* ══════════════════════════════════════════════ */}
      {/* POPULAR STORES — galaxy витрина                */}
      {/* ══════════════════════════════════════════════ */}
      <section className="pt-4 pb-3 lg:pt-8 lg:pb-5">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 mb-3 lg:mb-4">
            <TrendingUp className="h-4 w-4 text-[#0094FF]" />
            <h2 className="text-xs font-bold text-[#6F7A99] uppercase tracking-widest">Популярные магазины</h2>
          </div>

          {/* Igromir-style gamestore cards — Mobile & Desktop */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 pb-2">
            {PLATFORM_STORES.map((pf, index) => (
              <Link
                key={pf.slug}
                to={`/catalog?category=${pf.slug}`}
                className={`${index === 0 ? "col-span-2 lg:col-span-1" : "col-span-1"} gamestore-card group`}
                style={{ aspectRatio: index === 0 ? "16 / 9" : "150 / 225" }}
              >
                <div className="gamestore-card-bg" style={{ backgroundImage: `url(${pf.image})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                <div className="gamestore-card-gradient" style={{ backgroundImage: `url(${pf.image})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                <div className="gamestore-card-content">
                  {pf.slug === "steam" ? (
                    <span className="gamestore-card-desc">Пополнение аккаунтов РФ и СНГ, подарочные карты</span>
                  ) : (
                    <div className="gamestore-card-icon-title">
                      {pf.logo && (
                        <div
                          className="gamestore-card-icon"
                          style={{
                            maskImage: `url(${pf.logo})`,
                            WebkitMaskImage: `url(${pf.logo})`,
                          }}
                        />
                      )}
                      <span className="gamestore-card-title">{pf.label}</span>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════ */}
      {/* ALL PRODUCTS — galaxy витрина                  */}
      {/* ══════════════════════════════════════════════ */}
      <section className="pb-12 pt-2 lg:pt-4">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-4 lg:mb-5">
            <h2 className="text-base sm:text-lg lg:text-xl font-bold">
              <span className="text-white">Все товары</span>
              <span className="text-galaxy-gradient">.</span>
            </h2>
            <Link to="/catalog"
              className="text-xs font-medium text-[#6F7A99] hover:text-[#00E5FF] transition-colors flex items-center gap-1">
              Все <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {filteredProducts.map((product, i) => (
              <div key={product.id} className="animate-fade-in-up" style={{ animationDelay: `${i * 30}ms` }}>
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <TrustBlock />
    </div>
  )
}
