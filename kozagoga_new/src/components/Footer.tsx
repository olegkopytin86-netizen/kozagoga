import { Link } from "react-router-dom"
import { Zap, Shield, Headphones, Mail, Gamepad2 } from "lucide-react"

const footerLinks = {
  Покупателям: [
    { label: "Каталог", href: "/catalog" },
    { label: "Как купить", href: "/about" },
    { label: "Оплата", href: "/about" },
    { label: "Доставка", href: "/about" },
    { label: "FAQ", href: "/faq" },
  ],
  Компания: [
    { label: "О нас", href: "/about" },
    { label: "Контакты", href: "/contacts" },
    { label: "Партнёрам", href: "/about" },
  ],
  Правовая: [
    { label: "Пользовательское соглашение", href: "/about" },
    { label: "Политика конфиденциальности", href: "/about" },
    { label: "Публичная оферта", href: "/about" },
  ],
}

const paymentSystems = [
  "Visa", "Mastercard", "Мир", "СБП", "СберПэй", "ЮMoney",
]

export default function Footer() {
  return (
    <footer className="border-t border-[rgba(0,148,255,0.10)] bg-[rgba(6,11,26,0.5)] backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Link to="/" className="mb-4 inline-flex items-center gap-2.5 group">
              <div className="relative">
                <div className="absolute inset-0 rounded-lg bg-[#0094FF]/20 blur-xl group-hover:bg-[#0094FF]/30 transition-all" />
                <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-[rgba(255,255,255,0.06)] border border-[rgba(0,148,255,0.20)] group-hover:border-[#00E5FF]/40 transition-colors">
                  <Gamepad2 className="h-5 w-5 text-[#00E5FF]" />
                </div>
              </div>
              <span className="text-lg font-bold">
                <span className="text-white">Cifra</span>
                <span className="text-galaxy-gradient">Mall</span>
              </span>
            </Link>
            <p className="mb-5 text-sm text-[#6F7A99] max-w-sm leading-relaxed">
              Маркетплейс цифровых товаров. Игры, пополнения кошельков, подарочные карты, 
              подписки и многое другое. Мгновенная доставка, безопасные платежи.
            </p>
            <div className="flex flex-wrap gap-2 mb-5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(255,255,255,0.06)] border border-[rgba(0,148,255,0.12)] px-3 py-1 text-xs text-[#A9B4D0]">
                <Zap className="h-3 w-3 text-[#00E5FF]" /> Мгновенно
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(255,255,255,0.06)] border border-[rgba(0,229,255,0.12)] px-3 py-1 text-xs text-[#A9B4D0]">
                <Shield className="h-3 w-3 text-[#0094FF]" /> Безопасно
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(255,255,255,0.06)] border border-[rgba(79,70,229,0.12)] px-3 py-1 text-xs text-[#A9B4D0]">
                <Headphones className="h-3 w-3 text-[#4F46E5]" /> 24/7
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-[#6F7A99]">
              <Mail className="h-4 w-4 text-[#0094FF]" />
              <a href="mailto:support@ciframall.net" className="hover:text-[#00E5FF] transition-colors">support@ciframall.net</a>
            </div>
          </div>
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h3 className="mb-4 text-xs font-semibold text-[#6F7A99] uppercase tracking-widest">{title}</h3>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link to={link.href} className="text-sm text-[#A9B4D0] transition-colors hover:text-[#00E5FF]">{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 border-t border-[rgba(0,148,255,0.08)] pt-8">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xs text-[#6F7A99]">Принимаем к оплате:</span>
              <div className="flex flex-wrap gap-2">
                {paymentSystems.map((ps) => (
                  <span key={ps} className="inline-flex items-center rounded-md bg-[rgba(255,255,255,0.06)] border border-[rgba(0,229,255,0.12)] px-2.5 py-1 text-xs text-[#A9B4D0]">{ps}</span>
                ))}
              </div>
            </div>
            <p className="text-xs text-[#6F7A99]">© {new Date().getFullYear()} CifraMall.</p>
          </div>
        </div>
      </div>
    </footer>
  )
}
