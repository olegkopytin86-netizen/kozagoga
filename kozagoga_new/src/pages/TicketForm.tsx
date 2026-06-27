import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { ArrowLeft, Send, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createTicket } from "@/lib/support-api"

const categories = [
  { value: "key_not_received", label: "Не пришёл ключ" },
  { value: "code_not_working", label: "Код не работает" },
  { value: "activation_failed", label: "Ошибка активации" },
  { value: "refund", label: "Возврат" },
  { value: "other", label: "Другое" },
]

export default function TicketForm() {
  const navigate = useNavigate()
  const [category, setCategory] = useState("")
  const [subject, setSubject] = useState("")
  const [description, setDescription] = useState("")
  const [orderId, setOrderId] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!category || !subject.trim()) return
    setLoading(true)
    setError("")

    try {
      const ticket = await createTicket({
        category,
        subject: subject.trim(),
        description: description.trim() || undefined,
        order_id: orderId.trim() || undefined,
      })
      navigate(`/dashboard/support/${ticket.id}`)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/dashboard/support" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Назад к обращениям
      </Link>

      <h1 className="text-2xl font-bold mb-6">Новое обращение</h1>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label>Категория *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите категорию" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Тема *</Label>
              <Input
                placeholder="Кратко опишите проблему"
                value={subject}
                onChange={e => setSubject(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Описание</Label>
              <Textarea
                placeholder="Подробно опишите вашу проблему"
                rows={5}
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Номер заказа (если есть)</Label>
              <Input
                placeholder="ID заказа"
                value={orderId}
                onChange={e => setOrderId(e.target.value)}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full gap-2" disabled={loading || !category || !subject.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Отправить
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
