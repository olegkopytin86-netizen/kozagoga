import { Link } from "react-router-dom"
import { Shield, Zap, Headphones, Award, ArrowRight, Users, Globe, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"

const stats = [
  { label: "Товаров в каталоге", value: "500+", icon: Globe },
  { label: "Довольных клиентов", value: "10 000+", icon: Users },
  { label: "Среднее время доставки", value: "2 мин", icon: Clock },
  { label: "Возвратов", value: "< 0.5%", icon: Award },
]

const values = [
  {
    icon: Zap,
    title: "Мгновенная доставка",
    description: "Большинство товаров доставляются автоматически в течение 1–5 минут после оплаты. Никакого ожидания.",
  },
  {
    icon: Shield,
    title: "Безопасность",
    description: "Все платежи проходят через защищённые каналы. Мы не храним данные ваших карт.",
  },
  {
    icon: Headphones,
    title: "Поддержка 24/7",
    description: "Круглосуточная поддержка через чат, email и телефон. Решаем любые вопросы в течение 15 минут.",
  },
  {
    icon: Award,
    title: "Гарантия качества",
    description: "Все продавцы проходят верификацию. Гарантируем возврат средств в течение 24 часов при проблемах.",
  },
]

export default function About() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-black via-gray-900 to-black py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="mb-6 text-4xl font-bold text-white sm:text-5xl">
              О платформе <span className="text-primary">Козагога</span>
            </h1>
            <p className="text-lg text-gray-400">
              Мы делаем покупку цифровых товаров быстрой, безопасной и удобной.
              Тысячи клиентов уже доверяют нам — присоединяйтесь!
            </p>
          </div>
        </div>
        <div className="absolute -left-20 top-1/2 h-60 w-60 -translate-y-1/2 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -right-20 top-1/3 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
      </section>

      {/* Статистика */}
      <section className="relative -mt-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border bg-white p-6 text-center shadow-sm"
              >
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <stat.icon className="h-6 w-6 text-primary" />
                </div>
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Ценности */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold">Наши ценности</h2>
            <p className="mt-2 text-muted-foreground">
              Четыре принципа, на которых построена Козагога
            </p>
          </div>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
            {values.map((value) => (
              <div
                key={value.title}
                className="rounded-xl border bg-white p-8 transition-all hover:shadow-lg"
              >
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                  <value.icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="mb-3 text-xl font-semibold">{value.title}</h3>
                <p className="text-muted-foreground">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Как это работает */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold">Как это работает</h2>
            <p className="mt-2 text-muted-foreground">
              Всего несколько шагов до покупки
            </p>
          </div>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {[
              { step: "01", title: "Выберите товар", description: "Найдите нужный товар в каталоге или через поиск" },
              { step: "02", title: "Оплатите", description: "Безопасная оплата картой, СБП или электронными деньгами" },
              { step: "03", title: "Получите мгновенно", description: "Цифровой товар придёт на email или в личный кабинет" },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
                  {item.step}
                </div>
                <h3 className="mb-2 text-lg font-semibold">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-br from-primary/5 to-primary/10 py-20">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="mb-4 text-3xl font-bold">Готовы сделать покупку?</h2>
          <p className="mb-8 text-lg text-muted-foreground">
            Присоединяйтесь к тысячам довольных клиентов
          </p>
          <div className="flex justify-center gap-4">
            <Link to="/catalog">
              <Button size="lg" className="gap-2">
                Перейти в каталог <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <Link to="/register">
              <Button variant="outline" size="lg">
                Создать аккаунт
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
