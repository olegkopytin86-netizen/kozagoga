// Категории по умолчанию (используются, пока БД пуста)
export interface DefaultCategory {
  name: string
  slug: string
  icon: string
}

export const defaultCategories: DefaultCategory[] = [
  { name: "Игры", slug: "games", icon: "🎮" },
  { name: "Пополнение кошельков", slug: "top-ups", icon: "💰" },
  { name: "Подарочные карты", slug: "gift-cards", icon: "🎁" },
  { name: "Подписки", slug: "subscriptions", icon: "📱" },
  { name: "Аккаунты", slug: "accounts", icon: "👤" },
  { name: "Услуги", slug: "services", icon: "⚡" },
]

// Маппинг slug → читаемое название
export const categoryTitleMap: Record<string, string> = {
  games: "Игры",
  "top-ups": "Пополнение кошельков",
  "gift-cards": "Подарочные карты",
  subscriptions: "Подписки",
  accounts: "Аккаунты",
  services: "Услуги",
}
