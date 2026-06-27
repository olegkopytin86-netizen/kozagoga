import { useState, useEffect } from "react"
import { Tag, Plus, Trash2, RefreshCw, Copy, Wand2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { API_BASE, headers } from "@/lib/api"

interface Coupon {
  id: string
  code: string
  type: string
  value: string
  min_order_amount: string
  max_uses: number
  used_count: number
  is_active: boolean
  valid_from: string | null
  valid_to: string | null
}

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [bulkCount, setBulkCount] = useState("10")
  const [bulkValue, setBulkValue] = useState("")
  const [bulkResult, setBulkResult] = useState<any>(null)
  const [form, setForm] = useState({ code: "", type: "fixed", value: "", min_order_amount: "0", max_uses: "1", valid_to: "" })

  const fetchCoupons = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/admin/promotions/coupons`, { headers: headers() })
      if (res.ok) setCoupons(await res.json())
    } catch {}
    setLoading(false)
  }

  useEffect(() => { fetchCoupons() }, [])

  const handleCreate = async () => {
    if (!form.code || !form.value) return
    const res = await fetch(`${API_BASE}/api/admin/promotions/coupons`, {
      method: 'POST', headers: headers(),
      body: JSON.stringify({ ...form, value: parseFloat(form.value), min_order_amount: parseFloat(form.min_order_amount), max_uses: parseInt(form.max_uses), valid_to: form.valid_to || null }),
    })
    if (res.ok) { setShowForm(false); setForm({ code: "", type: "fixed", value: "", min_order_amount: "0", max_uses: "1", valid_to: "" }); fetchCoupons() }
  }

  const handleBulk = async () => {
    if (!bulkValue) return
    const res = await fetch(`${API_BASE}/api/admin/promotions/bulk-generate`, {
      method: 'POST', headers: headers(),
      body: JSON.stringify({ type: 'fixed', value: parseFloat(bulkValue), count: parseInt(bulkCount), prefix: 'PROMO' }),
    })
    if (res.ok) { setBulkResult(await res.json()); fetchCoupons() }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить промокод?')) return
    await fetch(`${API_BASE}/api/admin/promotions/coupons/${id}`, { method: 'DELETE', headers: headers() })
    fetchCoupons()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Tag className="h-6 w-6" /> Промокоды</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1" onClick={fetchCoupons}><RefreshCw className="h-4 w-4" /> Обновить</Button>
          <Button size="sm" className="gap-1" onClick={() => setShowForm(!showForm)}><Plus className="h-4 w-4" /> Создать</Button>
        </div>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Код" value={form.code} onChange={e => setForm({...form, code: e.target.value})} />
              <select className="rounded-lg border bg-background px-3 py-2 text-sm" value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                <option value="fixed">Фикс. сумма</option>
                <option value="percent">Процент</option>
              </select>
              <Input placeholder="Значение" type="number" value={form.value} onChange={e => setForm({...form, value: e.target.value})} />
              <Input placeholder="Мин. сумма заказа" type="number" value={form.min_order_amount} onChange={e => setForm({...form, min_order_amount: e.target.value})} />
              <Input placeholder="Макс. использований" type="number" value={form.max_uses} onChange={e => setForm({...form, max_uses: e.target.value})} />
              <Input placeholder="Действует до (2026-12-31)" value={form.valid_to} onChange={e => setForm({...form, valid_to: e.target.value})} />
            </div>
            <Button onClick={handleCreate}>Создать промокод</Button>
          </CardContent>
        </Card>
      )}

      {/* Bulk generate */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Wand2 className="h-4 w-4" /> Массовая генерация</CardTitle></CardHeader>
        <CardContent className="flex gap-3 items-end">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Количество</p>
            <Input type="number" value={bulkCount} onChange={e => setBulkCount(e.target.value)} className="w-24" />
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Номинал</p>
            <Input type="number" value={bulkValue} onChange={e => setBulkValue(e.target.value)} className="w-24" />
          </div>
          <Button onClick={handleBulk} className="gap-1"><Wand2 className="h-4 w-4" /> Сгенерировать</Button>
        </CardContent>
        {bulkResult && (
          <CardContent className="pt-0">
            <p className="text-sm">Сгенерировано: {bulkResult.generated}</p>
            <div className="flex flex-wrap gap-1 mt-2">
              {bulkResult.codes?.slice(0, 20).map((c: string) => (
                <Badge key={c} variant="outline" className="font-mono text-[10px]">{c}</Badge>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Список промокодов ({coupons.length})</CardTitle></CardHeader>
        <CardContent>
          {loading ? <div className="h-32 animate-pulse bg-secondary rounded-lg" /> : (
            <div className="space-y-1 max-h-[500px] overflow-y-auto">
              {coupons.map(c => (
                <div key={c.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-secondary/50 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-medium">{c.code}</span>
                    <Badge variant="outline" className="text-[10px]">{c.type === 'fixed' ? `${c.value} ₽` : `${c.value}%`}</Badge>
                    <Badge variant={c.is_active ? "default" : "secondary"} className="text-[10px]">{c.is_active ? "Активен" : "Выкл"}</Badge>
                    <span className="text-xs text-muted-foreground">использовано {c.used_count}/{c.max_uses}</span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => handleDelete(c.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
