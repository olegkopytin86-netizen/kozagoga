import { Link } from "react-router-dom"
import { Mail, Phone, MapPin, ArrowLeft, MessageCircle, Clock, Headphones } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useState } from "react"

const contactMethods = [
  {
    icon: Mail,
    title: "Email",
    value: "support@ciframall.net",
    description: "Ответим в течение 1 часа",
    href: "mailto:support@ciframall.net",
  },
  {
    icon: Phone,
    title: "Телефон",
    value: "8 (800) 123-45-67",
    description: "Ежедневно с 9:00 до 21:00",
    href: "tel:+78001234567",
  },
  {
    icon: MessageCircle,
    title: "Онлайн-чат",
    value: "Чат на сайте",
    description: "Онлайн 24/7, среднее время ответа — 2 минуты",
    href: "#",
  },
  {
    icon: MapPin,
    title: "Офис",
    value: "Москва, ул. Цифровая, 1",
    description: "Бизнес-центр «Технопарк», офис 301",
    href: "https://maps.yandex.ru",
  },
]

export default function Contacts() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  })
  const [sent, setSent] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // В реальном приложении здесь была бы отправка в БД
    setSent(true)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Link to="/" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4" />
          На главную
        </Link>

        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
            <Headphones className="h-7 w-7 text-primary" />
          </div>
          <h1 className="mb-2 text-3xl font-bold">Свяжитесь с нами</h1>
          <p className="text-muted-foreground">
            Мы всегда готовы помочь. Выберите удобный способ связи
          </p>
        </div>

        {/* Способы связи */}
        <div className="mb-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {contactMethods.map((method) => (
            <a
              key={method.title}
              href={method.href}
              className="rounded-xl border bg-white p-6 text-center transition-all hover:shadow-md hover:border-primary/30"
            >
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <method.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-1 font-semibold">{method.title}</h3>
              <p className="mb-1 text-sm font-medium text-primary">{method.value}</p>
              <p className="text-xs text-muted-foreground">{method.description}</p>
            </a>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Форма обратной связи */}
          <Card>
            <CardContent className="p-6">
              <h2 className="mb-6 text-xl font-semibold">Напишите нам</h2>
              {sent ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                    <svg className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="mb-2 text-lg font-semibold">Сообщение отправлено!</h3>
                  <p className="text-sm text-muted-foreground">
                    Мы ответим вам в ближайшее время
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Ваше имя</Label>
                      <Input
                        id="name"
                        placeholder="Иван"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="ivan@example.ru"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subject">Тема</Label>
                    <Input
                      id="subject"
                      placeholder="Проблема с заказом"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message">Сообщение</Label>
                    <Textarea
                      id="message"
                      placeholder="Опишите ваш вопрос..."
                      rows={5}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    Отправить сообщение
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Информация */}
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <h2 className="mb-4 text-xl font-semibold">Часы работы</h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Пн — Пт</span>
                    <span className="font-medium">9:00 — 21:00</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Сб — Вс</span>
                    <span className="font-medium">10:00 — 20:00</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Онлайн-чат</span>
                    <span className="font-medium text-emerald-600">24/7</span>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-primary/5 p-3 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4 shrink-0 text-primary" />
                  <span>Среднее время ответа: 15 минут</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h2 className="mb-4 text-xl font-semibold">Реквизиты</h2>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>ИП ciframall</p>
                  <p>ИНН: 1234567890</p>
                  <p>ОГРН: 123456789012345</p>
                  <p>Юридический адрес: г. Москва, ул. Цифровая, д. 1, оф. 301</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h2 className="mb-4 text-xl font-semibold">Быстрая помощь</h2>
                <div className="space-y-2">
                  <Link
                    to="/faq"
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-secondary transition-colors"
                  >
                    <HelpCircle className="h-4 w-4 text-primary" />
                    Часто задаваемые вопросы
                  </Link>
                  <Link
                    to="/about"
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-secondary transition-colors"
                  >
                    <Info className="h-4 w-4 text-primary" />
                    О платформе
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

function HelpCircle(props: React.SVGProps<SVGSVGElement>) {
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
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </svg>
  )
}

function Info(props: React.SVGProps<SVGSVGElement>) {
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
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  )
}
