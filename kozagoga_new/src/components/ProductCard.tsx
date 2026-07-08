import { Link } from "react-router-dom"
import type { GameProduct } from "@/data/products"

/*
 * ════════════════════════════════════════════════════════════════
 * CifraMall Card — Igromir Gamestore Card 1:1
 *
 * Точная копия структуры FeaturedGamestoreCard с igromir.yandex.ru:
 *
 *   <a class="gamestore-card">
 *     <div class="gamestore-card-bg" />            // фон
 *     <div class="gamestore-card-gradient" />       // blur-слой
 *     <div class="gamestore-card-content">
 *       <div class="gamestore-card-icon-title">
 *         <div class="gamestore-card-icon" />      // mask-image логотип
 *         <span class="gamestore-card-title" />     // заголовок
 *       </div>
 *       <span class="gamestore-card-desc" />        // описание
 *     </div>
 *   </a>
 * ════════════════════════════════════════════════════════════════
 */

interface CardTexts {
  title: string
  sub: string
}

const CARD_TEXTS: Record<string, CardTexts> = {
  "steam-gift-card":          { title: "Steam", sub: "Пополнение кошелька" },
  "playstation-network":      { title: "PlayStation", sub: "Подарочные карты" },
  "sony-playstation-card":    { title: "PlayStation", sub: "Карты оплаты" },
  "xbox-live":                { title: "Xbox", sub: "Игры и подписки" },
  "nintendo-eshop":           { title: "Nintendo", sub: "Цифровые товары" },
  "nintendo-online":          { title: "Nintendo", sub: "Подписка Online" },
  "blizzard-gift-card":       { title: "Battle.net", sub: "Игры Blizzard" },
  "world-of-warcraft-time":   { title: "World of Warcraft", sub: "60 дней" },
  "roblox-gift-card":         { title: "Roblox", sub: "Robux и подарки" },
  "roblox-card-pay":          { title: "Roblox", sub: "Robux и подарки" },
  "appstore-itunes":          { title: "Apple", sub: "Подарочные карты" },
  "netflix-digital":          { title: "Netflix", sub: "Подписка на кино" },
  "apex-legends":             { title: "Apex Legends", sub: "Пополнение кошелька" },
  "apex-legends-xbox":        { title: "Apex Legends", sub: "Пополнение Xbox" },
  "battlefield-6":            { title: "Battlefield", sub: "Предзаказ игры" },
  "a-way-out":                { title: "A Way Out", sub: "Кооперативный экшен" },
  "stalcraft":                { title: "Stalcraft", sub: "Пополнение кошелька" },
  "fortnite-1000-vbucks":     { title: "Fortnite", sub: "V-Bucks" },
  "google-play-1000":         { title: "Google Play", sub: "Игры и приложения" },
  "valorant-1000-vp":         { title: "Valorant", sub: "1000 VP" },
  "pubg-1000-gcoin":          { title: "PUBG", sub: "1000 G-COIN" },
  "genshin-1000-crystals":    { title: "Genshin Impact", sub: "1000 Кристаллов" },
  "mobile-legends-1000":      { title: "Mobile Legends", sub: "1000 Алмазов" },
  "lol-2000-rp":              { title: "League of Legends", sub: "2000 RP" },
  "minecraft-java-gift":      { title: "Minecraft", sub: "Java Edition" },
  "razer-gold-500":           { title: "Razer Gold", sub: "500 Gold" },
}

/* Фоны с igromir — 1920x1080 */
const BG_IMAGES: Record<string, string> = {
  "steam-gift-card":          "/images/products/gamestore-steam.webp",
  "playstation-network":      "/images/products/gamestore-playstation.webp",
  "sony-playstation-card":    "/images/products/gamestore-playstation.webp",
  "xbox-live":                "/images/products/gamestore-xbox-v3.webp",
  "nintendo-eshop":           "/images/products/gamestore-nintendo.webp",
  "nintendo-online":          "/images/products/gamestore-nintendo.webp",
  "blizzard-gift-card":       "/images/products/gamestore-battlenet.webp",
  "world-of-warcraft-time":   "/images/products/gamestore-battlenet.webp",
  "roblox-gift-card":         "/images/products/mts-roblox.png",
  "roblox-card-pay":          "/images/products/mts-roblox.png",
  "apex-legends":             "/images/products/mts-apex.png",
  "apex-legends-xbox":        "/images/products/mts-apex.png",
  "appstore-itunes":          "/images/products/gamestore-apple-v2.webp",
  "netflix-digital":          "/images/products/gamestore-netflix.webp",
}

/* Логотипы SVG для mask-image */
const LOGO_SVG: Record<string, string> = {
  "steam-gift-card":          "/images/products/steam_logo.svg",
  "xbox-live":                "/images/products/logo_xbox.svg",
}

/* Градиенты для продуктов без фонового изображения */
const POSTER_GRADIENTS: Record<string, string> = {
  "fortnite-1000-vbucks":   "radial-gradient(ellipse 180% 70% at 50% 10%, rgba(255,48,192,0.50) 0%, transparent 65%), radial-gradient(ellipse 120% 80% at 50% 80%, rgba(100,0,150,0.60) 0%, transparent 65%), linear-gradient(145deg, #0a0010 0%, #1a0520 35%, #2d0040 65%, #0a0010 100%)",
  "google-play-1000":       "radial-gradient(ellipse 180% 70% at 50% 10%, rgba(0,200,100,0.45) 0%, transparent 65%), radial-gradient(ellipse 120% 80% at 50% 80%, rgba(0,100,200,0.35) 0%, transparent 60%), linear-gradient(145deg, #001a0a 0%, #003d1a 30%, #002040 65%, #000500 100%)",
  "valorant-1000-vp":       "radial-gradient(ellipse 180% 70% at 50% 10%, rgba(255,48,48,0.50) 0%, transparent 65%), radial-gradient(ellipse 120% 80% at 50% 80%, rgba(200,0,0,0.40) 0%, transparent 60%), linear-gradient(145deg, #1a0505 0%, #3d0a0a 30%, #1a0000 65%, #0a0000 100%)",
  "pubg-1000-gcoin":        "radial-gradient(ellipse 180% 70% at 50% 10%, rgba(255,176,0,0.50) 0%, transparent 65%), radial-gradient(ellipse 120% 80% at 50% 80%, rgba(200,80,0,0.40) 0%, transparent 60%), linear-gradient(145deg, #1a1400 0%, #3d2d00 30%, #1a0a00 65%, #080500 100%)",
  "genshin-1000-crystals":  "radial-gradient(ellipse 180% 70% at 50% 10%, rgba(100,200,255,0.45) 0%, transparent 65%), radial-gradient(ellipse 120% 80% at 50% 80%, rgba(50,100,255,0.35) 0%, transparent 60%), linear-gradient(145deg, #00101a 0%, #002040 30%, #001030 65%, #000508 100%)",
  "mobile-legends-1000":    "radial-gradient(ellipse 180% 70% at 50% 10%, rgba(51,102,255,0.50) 0%, transparent 65%), radial-gradient(ellipse 120% 80% at 50% 80%, rgba(0,50,200,0.40) 0%, transparent 60%), linear-gradient(145deg, #00051a 0%, #00103d 30%, #000520 65%, #000108 100%)",
  "lol-2000-rp":            "radial-gradient(ellipse 180% 70% at 50% 10%, rgba(0,100,200,0.50) 0%, transparent 65%), radial-gradient(ellipse 120% 80% at 50% 80%, rgba(0,50,150,0.40) 0%, transparent 60%), linear-gradient(145deg, #000d1a 0%, #001a3d 30%, #000d20 65%, #000308 100%)",
  "minecraft-java-gift":    "radial-gradient(ellipse 180% 70% at 50% 10%, rgba(68,204,68,0.45) 0%, transparent 65%), radial-gradient(ellipse 120% 80% at 50% 80%, rgba(0,100,50,0.40) 0%, transparent 60%), linear-gradient(145deg, #051505 0%, #0a2d0a 30%, #051505 65%, #000500 100%)",
  "razer-gold-500":         "radial-gradient(ellipse 180% 70% at 50% 10%, rgba(0,200,200,0.45) 0%, transparent 65%), radial-gradient(ellipse 120% 80% at 50% 80%, rgba(0,100,200,0.35) 0%, transparent 60%), linear-gradient(145deg, #001a1a 0%, #003d3d 30%, #001a30 65%, #000808 100%)",
  "battlefield-6":          "radial-gradient(ellipse 180% 70% at 50% 10%, rgba(0,85,255,0.50) 0%, transparent 65%), radial-gradient(ellipse 120% 80% at 50% 80%, rgba(0,30,150,0.45) 0%, transparent 60%), linear-gradient(145deg, #00081a 0%, #00103d 30%, #000820 65%, #000205 100%)",
  "a-way-out":              "radial-gradient(ellipse 180% 70% at 50% 10%, rgba(200,160,48,0.50) 0%, transparent 65%), radial-gradient(ellipse 120% 80% at 50% 80%, rgba(150,100,20,0.40) 0%, transparent 60%), linear-gradient(145deg, #1a1508 0%, #3d2d10 30%, #1a1508 65%, #0a0800 100%)",
  "stalcraft":              "radial-gradient(ellipse 180% 70% at 50% 10%, rgba(51,170,51,0.50) 0%, transparent 65%), radial-gradient(ellipse 120% 80% at 50% 80%, rgba(0,80,30,0.45) 0%, transparent 60%), linear-gradient(145deg, #051505 0%, #0a2d0a 30%, #051505 65%, #000500 100%)",
}

const DEFAULT_BG = "radial-gradient(ellipse 180% 70% at 50% 10%, rgba(0,148,255,0.40) 0%, transparent 65%), radial-gradient(ellipse 120% 80% at 50% 80%, rgba(79,70,229,0.35) 0%, transparent 60%), linear-gradient(145deg, #060B1A 0%, #0F1B3D 30%, #081326 65%, #060B1A 100%)"

export default function ProductCard({ product }: { product: GameProduct }) {
  const badge = product.badge
  const discount = badge?.startsWith("-") ? badge : null
  const texts = CARD_TEXTS[product.id]
  const bgImage = BG_IMAGES[product.id]
  const logoSvg = LOGO_SVG[product.id]

  const bgStyle = bgImage
    ? { backgroundImage: `url(${bgImage})` }
    : { background: POSTER_GRADIENTS[product.id] || DEFAULT_BG }

  return (
    <Link
      to={`/product/${product.id}`}
      className="gamestore-card group"
      style={{ aspectRatio: "150 / 225" }}
    >
      {/* ═══ Background image — 1:1 как на igromir ═══ */}
      <div className="gamestore-card-bg" style={bgStyle} />

      {/* ═══ Blurred gradient layer (как на igromir) ═══ */}
      {bgImage && (
        <div className="gamestore-card-gradient" style={{ backgroundImage: `url(${bgImage})` }} />
      )}

      {/* ═══ Content — 1:1 структура igromir ═══ */}
      <div className="gamestore-card-content">
        {product.id === "steam-gift-card" || product.id === "appstore-itunes" ? (
          /* Steam и Apple: только описание, без заголовка */
          <span className="gamestore-card-desc">{texts?.sub || ""}</span>
        ) : (
          <>
            <div className="gamestore-card-icon-title">
              {logoSvg && (
                <div
                  className="gamestore-card-icon"
                  style={{
                    maskImage: `url(${logoSvg})`,
                    WebkitMaskImage: `url(${logoSvg})`,
                  }}
                />
              )}
              {texts && (
                <span className="gamestore-card-title">{texts.title}</span>
              )}
            </div>
            {texts && (
              <span className="gamestore-card-desc">{texts.sub}</span>
            )}
          </>
        )}
      </div>

      {/* ═══ Badge (наша доработка) ═══ */}
      {badge && (
        <div className="absolute left-2 top-2 z-10">
          {discount ? (
            <span className="inline-flex items-center rounded-md bg-[#FF4D6D]/80 px-2 py-0.5 text-[10px] font-bold text-white border border-[#FF4D6D]/30 shadow-lg tracking-wide">
              {discount}
            </span>
          ) : (
            <span className="inline-flex items-center rounded-md bg-[rgba(0,148,255,0.20)] px-2 py-0.5 text-[10px] font-bold text-[#0094FF] border border-[rgba(0,148,255,0.30)] shadow-lg tracking-wide">
              {badge}
            </span>
          )}
        </div>
      )}
    </Link>
  )
}
