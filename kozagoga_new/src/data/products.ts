export interface GameProduct {
  id: string
  name: string
  description: string
  price: number
  image: string
  category: string
  badge?: string
  rating?: number
  sales?: number
}

export const popularProducts: GameProduct[] = [
  {
    id: "steam-gift-card",
    name: "Steam Gift Card",
    description: "Пополнение кошелька Steam. Мгновенная доставка кода на email. Пополняйте свой аккаунт и покупайте тысячи игр.",
    price: 1499,
    image: "/images/products/steam.png",
    category: "Подарочные карты",
    badge: "🔥 Хит",
    rating: 4.8,
    sales: 15420
  },
  {
    id: "playstation-network",
    name: "PlayStation Network Card PSN",
    description: "Пополнение кошелька PSN. Игры, подписки, дополнения для PlayStation. Мгновенная доставка.",
    price: 1999,
    image: "/images/products/playstation.png",
    category: "Подарочные карты",
    badge: "🎮 Топ",
    rating: 4.7,
    sales: 12340
  },
  {
    id: "sony-playstation-card",
    name: "Карта оплаты Sony PlayStation",
    description: "Универсальная карта оплаты PlayStation. Пополнение кошелька, покупка игр, подписок и дополнений.",
    price: 1499,
    image: "/images/products/sony-playstation.png",
    category: "Подарочные карты",
    rating: 4.6,
    sales: 8920
  },
  {
    id: "xbox-live",
    name: "XBOX Live Gift Card",
    description: "Пополнение кошелька Xbox. Игры, подписка Game Pass, дополнения. Моментальная доставка на email.",
    price: 1799,
    image: "/images/products/sberpay-card.jpg",
    category: "Подарочные карты",
    badge: "-15%",
    rating: 4.6,
    sales: 9870
  },
  {
    id: "appstore-itunes",
    name: "AppStore & iTunes",
    description: "Пополнение счёта Apple ID. Покупки в App Store, iTunes, Apple Music, iCloud+. Мгновенно.",
    price: 999,
    image: "/images/products/appstore.png",
    category: "Подарочные карты",
    rating: 4.9,
    sales: 21300
  },
  {
    id: "roblox-gift-card",
    name: "Roblox Gift Card",
    description: "Пополнение Robux. Покупайте скины, аксессуары, игровые предметы в Roblox. Мгновенная доставка.",
    price: 799,
    image: "/images/products/roblox.png",
    category: "Игровые карты",
    badge: "🎯 Популярное",
    rating: 4.5,
    sales: 18900
  },
  {
    id: "roblox-card-pay",
    name: "Карта оплаты Roblox",
    description: "Пополнение счёта Roblox. Покупайте Robux, премиум-подписку и эксклюзивные предметы.",
    price: 499,
    image: "/images/products/roblox-card.png",
    category: "Игровые карты",
    rating: 4.5,
    sales: 22100
  },
  {
    id: "nintendo-eshop",
    name: "Nintendo eShop Card",
    description: "Пополнение Nintendo eShop. Игры для Nintendo Switch, дополнения, подписка Nintendo Switch Online.",
    price: 2499,
    image: "/images/products/nintendo.png",
    category: "Подарочные карты",
    rating: 4.7,
    sales: 7650
  },
  {
    id: "nintendo-online",
    name: "Nintendo Switch Online Membership",
    description: "Подписка Nintendo Switch Online. Играйте онлайн, получайте классические игры NES/SNES и облачные сохранения.",
    price: 1999,
    image: "/images/products/nintendo-online.png",
    category: "Подписки",
    badge: "🎮 Топ",
    rating: 4.6,
    sales: 5430
  },
  {
    id: "blizzard-gift-card",
    name: "Blizzard Gift Card",
    description: "Пополнение Battle.net. World of Warcraft, Overwatch, Diablo, Hearthstone.",
    price: 1499,
    image: "/images/products/blizzard.png",
    category: "Игровые карты",
    badge: "⚡ Хит",
    rating: 4.6,
    sales: 11200
  },
  {
    id: "netflix-digital",
    name: "Netflix Digital Code",
    description: "Оплата подписки Netflix. Код на 1 месяц. Доступ ко всем фильмам и сериалам в Ultra HD.",
    price: 1299,
    image: "/images/products/netflix.png",
    category: "Подписки",
    rating: 4.8,
    sales: 14560
  },
  {
    id: "world-of-warcraft-time",
    name: "World of Warcraft Time Card 60 Days",
    description: "60 дней игрового времени для World of Warcraft. Для Dragonflight и Classic.",
    price: 3499,
    image: "/images/products/wow.png",
    category: "Игровое время",
    badge: "🔥 Хит",
    rating: 4.7,
    sales: 8900
  },
  {
    id: "apex-legends",
    name: "APEX Legends",
    description: "Пополнение кошелька Apex Legends. Покупайте легенды, скины, Battle Pass.",
    price: 999,
    image: "/images/products/apex.png",
    category: "Игровая валюта",
    rating: 4.4,
    sales: 6780
  },
  {
    id: "battlefield-6",
    name: "Battlefield™ 6",
    description: "Предзаказ Battlefield 6. Погрузитесь в масштабные сражения нового поколения.",
    price: 4999,
    image: "/images/products/battlefield.png",
    category: "Игры",
    badge: "🎮 Новинка",
    rating: 4.9,
    sales: 3450
  },
  {
    id: "a-way-out",
    name: "A WAY OUT",
    description: "Кооперативный экшен-приключение. Проходите с другом уникальную историю побега из тюрьмы.",
    price: 2499,
    image: "/images/products/a-way-out.png",
    category: "Игры",
    rating: 4.7,
    sales: 3210
  },
  {
    id: "stalcraft",
    name: "Stalcraft",
    description: "Пополнение кошелька Stalcraft. Уникальная игра в сеттинге S.T.A.L.K.E.R. с элементами крафта и PvP.",
    price: 599,
    image: "/images/products/stalcraft.png",
    category: "Игровая валюта",
    rating: 4.3,
    sales: 4560
  },
  {
    id: "apex-legends-xbox",
    name: "APEX Legends",
    description: "Пополнение кошелька Apex Legends на Xbox. Легенды, скины, Battle Pass и эксклюзивный контент.",
    price: 1499,
    image: "/images/products/apex.png",
    category: "Игровая валюта",
    rating: 4.4,
    sales: 5540
  }
]
