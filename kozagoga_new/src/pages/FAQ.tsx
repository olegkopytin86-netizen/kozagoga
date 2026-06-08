import { useState } from "react"
import { Link } from "react-router-dom"
import { HelpCircle, ArrowLeft, Search, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

const faqItems = [
  {
    category: "Покупки",
    items: [
      {
        q: "Как сделать заказ?",
        a: "Выберите товар в каталоге, нажмите «Купить», укажите необходимые данные (например, Riot ID или email) и оплатите. Товар придёт мгновенно на указанный email или в личный кабинет.",
      },
      {
        q: "Какие способы оплаты доступны?",
        a: "Мы принимаем банковские карты (Visa, Mastercard, Мир), СБП, ЮMoney, Qiwi и другие популярные платёжные системы. Все платежи защищены.",
      },
      {
        q: "Можно ли отменить заказ?",
        a: "Если товар ещё не был доставлен (не отправлен на email), вы можете отменить заказ в личном кабинете. После доставки цифрового товара возврат возможен только в случае неработоспособности ключа.",
      },
      {
        q: "Как получить чек об оплате?",
        a: "Чек приходит на указанный email сразу после оплаты. Также вы можете скачать чек в личном кабинете в разделе «Мои заказы».",
      },
    ],
  },
  {
    category: "Доставка",
    items: [
      {
        q: "Как быстро доставляются товары?",
        a: "Большинство цифровых товаров (ключи, пополнения) доставляются мгновенно — в течение 1–5 минут. Некоторые товары могут доставляться до 30 минут. Время доставки указано на карточке товара.",
      },
      {
        q: "На какой email придёт товар?",
        a: "Товар приходит на email, указанный при оформлении заказа. Также все покупки доступны в личном кабинете в разделе «Мои заказы».",
      },
      {
        q: "Что делать, если товар не пришёл?",
        a: "Проверьте папку «Спам» в вашей почте. Если товара нет в течение указанного времени доставки, обратитесь в поддержку — мы решим вопрос в течение 15 минут.",
      },
    ],
  },
  {
    category: "Аккаунт",
    items: [
      {
        q: "Зачем регистрироваться?",
        a: "Регистрация даёт доступ к личному кабинету, где хранятся все ваши заказы, чеки и история покупок. Также зарегистрированные пользователи получают доступ к эксклюзивным скидкам.",
      },
      {
        q: "Я забыл пароль. Что делать?",
        a: "На странице входа нажмите «Забыли пароль?» и укажите ваш email. Мы отправим ссылку для сброса пароля.",
      },
      {
        q: "Как удалить аккаунт?",
        a: "Напишите в поддержку с вашего зарегистрированного email с запросом на удаление аккаунта. Мы обработаем запрос в течение 24 часов.",
      },
    ],
  },
  {
    category: "Гарантии и возврат",
    items: [
      {
        q: "Даёте ли вы гарантию на товары?",
        a: "Да, мы гарантируем работоспособность всех цифровых товаров. Если ключ не активируется или товар не работает, мы вернём деньги или заменим товар в течение 24 часов.",
      },
      {
        q: "Как оформить возврат?",
        a: "Обратитесь в поддержку через чат на сайте, email или телефон. Укажите номер заказа и опишите проблему. Мы рассмотрим запрос в течение 1 часа.",
      },
      {
        q: "Возвращаются ли деньги сразу?",
        a: "После одобрения возврата деньги поступают на счёт в течение 1–5 рабочих дней в зависимости от платёжной системы.",
      },
    ],
  },
]

export default function FAQ() {
  const [searchQuery, setSearchQuery] = useState("")
  const [openItems, setOpenItems] = useState<Set<string>>(new Set())

  const toggleItem = (key: string) => {
    setOpenItems((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const filteredFaq = faqItems
    .map((section) => ({
      ...section,
      items: section.items.filter(
        (item) =>
          item.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.a.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    }))
    .filter((section) => section.items.length > 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Link to="/" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4" />
          На главную
        </Link>

        <div className="mx-auto max-w-3xl">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
              <HelpCircle className="h-7 w-7 text-primary" />
            </div>
            <h1 className="mb-2 text-3xl font-bold">Часто задаваемые вопросы</h1>
            <p className="text-muted-foreground">
              Найдём ответ на любой вопрос о покупке цифровых товаров
            </p>
          </div>

          {/* Поиск */}
          <div className="relative mb-8">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Поиск по вопросам..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10"
            />
          </div>

          {/* FAQ */}
          {filteredFaq.length > 0 ? (
            <div className="space-y-8">
              {filteredFaq.map((section) => (
                <div key={section.category}>
                  <h2 className="mb-4 text-lg font-semibold">{section.category}</h2>
                  <div className="space-y-2">
                    {section.items.map((item, idx) => {
                      const key = `${section.category}-${idx}`
                      const isOpen = openItems.has(key)
                      return (
                        <div
                          key={key}
                          className="rounded-xl border bg-white transition-all hover:shadow-sm"
                        >
                          <button
                            onClick={() => toggleItem(key)}
                            className="flex w-full items-center justify-between px-6 py-4 text-left"
                          >
                            <span className="font-medium pr-4">{item.q}</span>
                            <ChevronDown
                              className={cn(
                                "h-5 w-5 shrink-0 text-muted-foreground transition-transform",
                                isOpen && "rotate-180"
                              )}
                            />
                          </button>
                          {isOpen && (
                            <div className="border-t px-6 py-4">
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                {item.a}
                              </p>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border bg-white p-12 text-center">
              <Search className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">Ничего не найдено</h3>
              <p className="mb-6 text-sm text-muted-foreground">
                Попробуйте изменить поисковый запрос
              </p>
              <Button variant="outline" onClick={() => setSearchQuery("")}>
                Сбросить поиск
              </Button>
            </div>
          )}

          {/* Поддержка */}
          <div className="mt-12 rounded-xl border bg-white p-8 text-center">
            <Headphones className="mx-auto mb-4 h-10 w-10 text-primary" />
            <h3 className="mb-2 text-lg font-semibold">Не нашли ответ?</h3>
            <p className="mb-6 text-sm text-muted-foreground">
              Напишите нам — мы ответим в течение 15 минут
            </p>
            <div className="flex justify-center gap-4">
              <Link to="/contacts">
                <Button>Связаться с поддержкой</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Headphones(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3" />
    </svg>
  )
}
