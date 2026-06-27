import { useState, useEffect } from "react"
import { Package, Plus, Trash2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { API_BASE, headers } from "@/lib/api"

interface Bundle {
  id: string
  name: string
  slug: string
  description: string | null
  total_price: string | null
  discount_percent: string | null
  is_active: boolean
  created_at: string
}

export default function AdminBundles() {
  const [bundles, setBundles] = useState<Bundle[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: "", slug: "", description: "", discount_percent: "", total_price: "" })

  const fetchBundles = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/bundles/admin/bundles`, { headers: headers() })
      if (res.ok) setBundles(await res.json())
    } catch {}
    setLoading(false)
  }

  useEffect(() => { fetchBundles() }, [])

  const handleCreate = async () => {
    if (!form.name) return
    const res = await fetch(`${API_BASE}/api/bundles/admin/bundles`, {
      method: 'POST', headers: headers(),
      body: JSON.stringify({
        name: form.name,
        slug: form.slug || form.name.toLowerCase().replace(/\s+/g, '-'),
        description: form.description || null,
        discount_percent: form.discount_percent ? parseFloat(form.discount_percent) : null,
        total_price: form.total_price ? parseFloat(form.total_price) : null,
      }),
    })
    if (res.ok) { setShowForm(false); setForm({ name: "", slug: "", description: "", discount_percent: "", total_price: "" }); fetchBundles() }
  }

  const handleToggle = async (id: string, active: boolean) => {
    await fetch(`${API_BASE}/api/bundles/admin/bundles/${id}`, {
      method: 'PUT', headers: headers(),
      body: JSON.stringify({ is_active: !active }),
    })
    fetchBundles()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить комплект?')) return
    await fetch(`${API_BASE}/api/bundles/admin/bundles/${id}`, { method: 'DELETE', headers: headers() })
    fetchBundles()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Package className="h-6 w-6" /> Комплекты</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1" onClick={fetchBundles}><RefreshCw className="h-4 w-4" /> Обновить</Button>
          <Button size="sm" className="gap-1" onClick={() => setShowForm(!showForm)}><Plus className="h-4 w-4" /> Создать</Button>
        </div>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <Input placeholder="Название *" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
            <Input placeholder="Slug (оставьте пустым для автогенерации)" value={form.slug} onChange={e => setForm({...form, slug: e.target.value})} />
            <Input placeholder="Описание" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Скидка %" type="number" value={form.discount_percent} onChange={e => setForm({...form, discount_percent: e.target.value})} />
              <Input placeholder="Фикс. цена" type="number" value={form.total_price} onChange={e => setForm({...form, total_price: e.target.value})} />
            </div>
            <Button onClick={handleCreate}>Создать комплект</Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Комплекты ({bundles.length})</CardTitle></CardHeader>
        <CardContent>
          {loading ? <div className="h-32 animate-pulse bg-secondary rounded-lg" /> : (
            <div className="space-y-2">
              {bundles.map(b => (
                <Card key={b.id}>
                  <CardContent className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-medium">{b.name}</p>
                      <p className="text-xs text-muted-foreground">{b.slug} · {b.description || "—"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {b.discount_percent && <Badge variant="default">-{b.discount_percent}%</Badge>}
                      <Badge variant={b.is_active ? "default" : "secondary"} className="cursor-pointer" onClick={() => handleToggle(b.id, b.is_active)}>
                        {b.is_active ? "Активен" : "Выкл"}
                      </Badge>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => handleDelete(b.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
