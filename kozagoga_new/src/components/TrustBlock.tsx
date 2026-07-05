import { Shield, Zap, HeadphonesIcon, Award } from "lucide-react"

const trustItems = [
  {
    icon: Shield,
    title: "Безопасные платежи",
    description: "Все транзакции защищены. Работаем с проверенными платёжными системами.",
    accent: "#0094FF",
  },
  {
    icon: Zap,
    title: "Мгновенная доставка",
    description: "Большинство товаров доставляются в течение 1–5 минут после оплаты.",
    accent: "#00E5FF",
  },
  {
    icon: HeadphonesIcon,
    title: "Поддержка 24/7",
    description: "Круглосуточная поддержка покупателей. Поможем с любым вопросом.",
    accent: "#4F46E5",
  },
  {
    icon: Award,
    title: "Проверенные продавцы",
    description: "Все продавцы проходят верификацию. Гарантия возврата в течение 24 часов.",
    accent: "#00E096",
  },
]

export default function TrustBlock() {
  return (
    <section className="py-14 border-t border-[rgba(0,148,255,0.08)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold text-white">
            Почему выбирают <span className="text-glow-aqua">CifraMall</span>
          </h2>
          <p className="mt-2 text-[#6F7A99] text-sm">
            Мы делаем покупку цифровых товаров быстрой, безопасной и удобной
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {trustItems.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl galaxy-glass p-6 text-center transition-all duration-500"
            >
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[rgba(255,255,255,0.04)] border"
                style={{ borderColor: `${item.accent}40` }}>
                <item.icon className="h-6 w-6" style={{ color: item.accent }} />
              </div>
              <h3 className="mb-2 font-semibold text-white">{item.title}</h3>
              <p className="text-sm text-[#A9B4D0]">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
