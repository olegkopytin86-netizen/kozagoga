// ─── AdminTickets — обращения пользователей ────────────────
import { useState, useEffect } from "react"
import { LifeBuoy, Search, MessageSquare, CheckCircle, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const API = window.__KOZAGOGA_API_URL__ || ""
function getToken() { try { return localStorage.getItem("kozagogo_token") } catch { return null } }

export default function AdminTickets() {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => { fetchTickets() }, [])

  async function fetchTickets() {
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/admin/support/tickets`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      const data = await res.json()
      setTickets(Array.isArray(data) ? data : [])
    } catch (e) { setTickets([]) }
    finally { setLoading(false) }
  }

  const STATUS_COLORS = { open: "warning", closed: "success", in_progress: "default" }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <LifeBuoy className="h-5 w-5" /> Обращения
          <span className="text-sm font-normal text-gray-500 ml-2">({tickets.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative mb-4 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input placeholder="Поиск по теме..." value={search} onChange={e => setSearch(e.target.value)}
            className="pl-10 bg-white/5 border-white/10 text-white" />
        </div>

        <div className="space-y-2">
          {tickets.filter(t => !search || t.subject?.toLowerCase().includes(search.toLowerCase())).map(t => (
            <div key={t.id} className="bg-white/[0.03] rounded-xl p-4 border border-white/5 hover:border-[#7850FF]/20 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-medium text-white truncate">{t.subject || "Без темы"}</h3>
                    <Badge variant={STATUS_COLORS[t.status] || "secondary"}>{t.status}</Badge>
                  </div>
                  <p className="text-xs text-gray-500 truncate">{t.description || ""}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                    <span>{t.category || "—"}</span>
                    <span>{new Date(t.created_at).toLocaleString("ru-RU")}</span>
                    {t.messages > 0 && <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" />{t.messages}</span>}
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="text-gray-400 shrink-0">Ответить</Button>
              </div>
            </div>
          ))}
          {tickets.length === 0 && !loading && (
            <p className="py-8 text-center text-gray-500">Обращений нет.</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
