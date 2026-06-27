import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { MessageCircle, Plus, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getTickets, type Ticket } from "@/lib/support-api"

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "success" | "warning" | "danger" }> = {
  open: { label: "Открыт", variant: "default" },
  in_progress: { label: "В работе", variant: "secondary" },
  waiting_customer: { label: "Ожидает ответа", variant: "outline" },
  resolved: { label: "Решён", variant: "success" },
  closed: { label: "Закрыт", variant: "outline" },
}

const categoryLabels: Record<string, string> = {
  key_not_received: "Не пришёл ключ",
  code_not_working: "Код не работает",
  activation_failed: "Ошибка активации",
  refund: "Возврат",
  other: "Другое",
}

export default function TicketList() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getTickets().then(setTickets).catch(() => {}).finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Мои обращения
        </h2>
        <Link to="/dashboard/support/new">
          <Button size="sm" className="gap-1">
            <Plus className="h-4 w-4" />
            Создать
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-secondary" />
          ))}
        </div>
      ) : tickets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <MessageCircle className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-4">У вас пока нет обращений</p>
            <Link to="/dashboard/support/new">
              <Button>Создать обращение</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {tickets.map(ticket => {
            const s = statusLabels[ticket.status] || { label: ticket.status, variant: "outline" }
            return (
              <Link key={ticket.id} to={`/dashboard/support/${ticket.id}`}>
                <Card className="hover:border-primary/30 transition-colors cursor-pointer">
                  <CardContent className="flex items-center justify-between py-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-muted-foreground">
                          {categoryLabels[ticket.category] || ticket.category}
                        </span>
                        <Badge variant={s.variant} className="text-[10px] px-1.5 py-0">{s.label}</Badge>
                      </div>
                      <p className="font-medium truncate">{ticket.subject}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(ticket.created_at).toLocaleDateString("ru-RU")}
                        {ticket.messages !== undefined && ` · ${ticket.messages} сообщ.`}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
