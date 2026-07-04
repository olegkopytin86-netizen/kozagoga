import { Shield, Zap, HeadphonesIcon, Award } from "lucide-react"

const trustItems = [
  {
    icon: Shield,
    title: "Безопасные платежи",
    description: "Все транзакции защищены. Работаем с проверенными платёжными системами.",
  },
  {
    icon: Zap,
    title: "Мгновенная доставка",
    description: "Большинство товаров доставляются в течение 1–5 минут после оплаты.",
  },
  {
    icon: HeadphonesIcon,
    title: "Поддержка 24/7",
    description: "Круглосуточная поддержка покупателей. Поможем с любым вопросом.",
  },
  {
    icon: Award,
    title: "Проверенные продавцы",
    description: "Все продавцы проходят верификацию. Гарантия возврата в течение 24 часов.",
  },
]

export default function TrustBlock() {
  return (
    <section className="bg-black py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold text-white">
            Почему выбирают <span className="text-primary">ciframall</span>
          </h2>
          <p className="mt-2 text-gray-400">
            Мы делаем покупку цифровых товаров быстрой, безопасной и удобной
          </p>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {trustItems.map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-gray-800 bg-gray-900 p-6 text-center transition-colors hover:border-primary/30"
            >
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <item.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 font-semibold text-white">{item.title}</h3>
              <p className="text-sm text-gray-400">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
