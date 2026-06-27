import { useEffect, useState, useRef } from "react"
import { useParams, Link } from "react-router-dom"
import { ArrowLeft, Send, Loader2, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { getTicketDetail, sendMessage, closeTicket, type Ticket, type TicketMessage } from "@/lib/support-api"

const statusLabels: Record<string, string> = {
  open: "Открыт", in_progress: "В работе", waiting_customer: "Ожидает ответа",
  resolved: "Решён", closed: "Закрыт",
}

export default function TicketDetail() {
  const { id } = useParams<{ id: string }>()
  const [ticket, setTicket] = useState<(Ticket & { messages: TicketMessage[] }) | null>(null)
  const [newMsg, setNewMsg] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!id) return
    getTicketDetail(id).then(setTicket).catch(() => {}).finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [ticket?.messages])

  const handleSend = async () => {
    if (!newMsg.trim() || !id) return
    setSending(true)
    try {
      await sendMessage(id, newMsg.trim())
      setNewMsg("")
      const updated = await getTicketDetail(id)
      setTicket(updated)
    } catch {}
    setSending(false)
  }

  const handleClose = async () => {
    if (!id) return
    await closeTicket(id)
    const updated = await getTicketDetail(id)
    setTicket(updated)
  }

  if (loading) return <div className="h-64 animate-pulse rounded-xl bg-secondary" />

  if (!ticket) return <p className="text-muted-foreground">Тикет не найден</p>

  const isClosed = ticket.status === 'closed' || ticket.status === 'resolved'

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/dashboard/support" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors">
        <ArrowLeft className="h-4 w-4" /> Назад к обращениям
      </Link>

      <Card className="mb-4">
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-1">
            <Badge>{statusLabels[ticket.status] || ticket.status}</Badge>
            <span className="text-xs text-muted-foreground">{new Date(ticket.created_at).toLocaleString("ru-RU")}</span>
          </div>
          <h2 className="text-lg font-bold">{ticket.subject}</h2>
          {ticket.description && (
            <p className="text-sm text-muted-foreground mt-1">{ticket.description}</p>
          )}
        </CardContent>
      </Card>

      <div className="space-y-3 mb-4 max-h-[500px] overflow-y-auto px-1">
        {ticket.messages.map(msg => (
          <div key={msg.id} className={cn(
            "flex", msg.sender_type === 'customer' ? "justify-end" : "justify-start"
          )}>
            <div className={cn(
              "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
              msg.sender_type === 'customer'
                ? "bg-primary text-primary-foreground rounded-br-md"
                : "bg-secondary text-secondary-foreground rounded-bl-md"
            )}>
              <p className="whitespace-pre-wrap">{msg.message}</p>
              <p className={cn(
                "text-[10px] mt-1",
                msg.sender_type === 'customer' ? "text-primary-foreground/60" : "text-muted-foreground"
              )}>
                {new Date(msg.created_at).toLocaleTimeString("ru-RU", { hour: '2-digit', minute: '2-digit' })}
                {msg.sender_type === 'operator' && " · Оператор"}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {!isClosed ? (
        <div className="flex gap-2">
          <Input
            placeholder="Напишите сообщение..."
            value={newMsg}
            onChange={e => setNewMsg(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          />
          <Button size="icon" onClick={handleSend} disabled={sending || !newMsg.trim()}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      ) : (
        <p className="text-center text-sm text-muted-foreground">Тикет {ticket.status === 'resolved' ? 'решён' : 'закрыт'}</p>
      )}

      {!isClosed && ticket.status !== 'closed' && (
        <div className="mt-3 flex justify-end">
          <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" onClick={handleClose}>
            <CheckCircle className="h-3.5 w-3.5" />
            Закрыть обращение
          </Button>
        </div>
      )}
    </div>
  )
}
