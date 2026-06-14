import { Link } from "react-router-dom"
import { Zap, Shield, Headphones, Mail, Phone, MapPin } from "lucide-react"

const footerLinks = {
  Покупателям: [
    { label: "Каталог", href: "/catalog" },
    { label: "Как купить", href: "/about" },
    { label: "Оплата", href: "/about" },
    { label: "Доставка", href: "/about" },
    { label: "Возврат", href: "/about" },
    { label: "FAQ", href: "/faq" },
  ],
  Компания: [
    { label: "О нас", href: "/about" },
    { label: "Контакты", href: "/contacts" },
    { label: "Партнёрам", href: "/about" },
    { label: "Блог", href: "/about" },
  ],
  Правовая: [
    { label: "Пользовательское соглашение", href: "/about" },
    { label: "Политика конфиденциальности", href: "/about" },
    { label: "Публичная оферта", href: "/about" },
  ],
}

const paymentSystems = [
  { name: "Visa", icon: "💳" },
  { name: "Mastercard", icon: "💳" },
  { name: "Мир", icon: "💳" },
  { name: "СБП", icon: "📱" },
  { name: "СберПэй", icon: "🏦" },
  { name: "Qiwi", icon: "⚡" },
]

export default function Footer() {
  return (
    <footer className="border-t bg-black text-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-5">
          {/* Бренд */}
          <div className="lg:col-span-2">
            <Link to="/" className="mb-4 inline-flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 font-bold text-white text-sm shadow-sm">
                К
              </div>
              <span className="text-xl font-bold">Козагога</span>
            </Link>
            <p className="mb-6 text-sm text-gray-400 max-w-sm">
              Маркетплейс цифровых товаров. Игры, пополнения кошельков, подарочные карты, подписки и многое другое. Мгновенная доставка, безопасные платежи, лучшие цены.
            </p>

            {/* Контакты */}
            <div className="space-y-2 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                <a href="mailto:support@kozagogo.ru" className="hover:text-primary transition-colors">
                  support@kozagogo.ru
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary" />
                <a href="tel:+78001234567" className="hover:text-primary transition-colors">
                  8 (800) 123-45-67
                </a>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <span>Москва, ул. Цифровая, 1</span>
              </div>
            </div>

            {/* Преимущества */}
            <div className="mt-6 flex flex-wrap gap-3">
              <div className="flex items-center gap-1.5 rounded-lg border border-gray-800 bg-gray-900 px-3 py-1.5 text-xs text-gray-400">
                <Zap className="h-3.5 w-3.5 text-primary" />
                Мгновенно
              </div>
              <div className="flex items-center gap-1.5 rounded-lg border border-gray-800 bg-gray-900 px-3 py-1.5 text-xs text-gray-400">
                <Shield className="h-3.5 w-3.5 text-primary" />
                Безопасно
              </div>
              <div className="flex items-center gap-1.5 rounded-lg border border-gray-800 bg-gray-900 px-3 py-1.5 text-xs text-gray-400">
                <Headphones className="h-3.5 w-3.5 text-primary" />
                24/7
              </div>
            </div>
          </div>

          {/* Ссылки */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h3 className="mb-4 text-sm font-semibold text-white">{title}</h3>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.href}
                      className="text-sm text-gray-400 transition-colors hover:text-primary"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Платёжные системы */}
        <div className="mt-8 border-t border-gray-800 pt-8">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500">Принимаем к оплате:</span>
              <div className="flex flex-wrap gap-2">
                {paymentSystems.map((ps) => (
                  <span
                    key={ps.name}
                    className="inline-flex items-center gap-1 rounded-md border border-gray-800 bg-gray-900 px-2.5 py-1 text-xs text-gray-400"
                  >
                    <span>{ps.icon}</span>
                    {ps.name}
                  </span>
                ))}
              </div>
            </div>
            <p className="text-xs text-gray-600">
              © {new Date().getFullYear()} Козагога. Все права защищены.
            </p>
          </div>
        </div>

        <div className="mt-4 text-center text-xs text-gray-600">
          <p>
            Все товары предоставляются в цифровом виде. Оплата через защищённые платёжные системы.
            Не является публичной офертой.
          </p>
        </div>
      </div>
    </footer>
  )
}
