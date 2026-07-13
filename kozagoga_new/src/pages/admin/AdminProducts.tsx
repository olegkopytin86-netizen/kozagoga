// ─── AdminProducts — CRUD товаров ─────────────────────────
import { useState, useEffect } from "react"
import { Package, Plus, Edit, Trash2, X, Save, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatPrice } from "@/lib/utils"

const API = window.__KOZAGOGA_API_URL__ || ""

function getToken() {
  try { return localStorage.getItem("kozagogo_token") } catch { return null }
}

async function api(url, opts = {}) {
  const res = await fetch(`${API}${url}`, {
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
    ...opts,
  })
  return res.json()
}

export default function AdminProducts({ products: initial, categories, onRefresh }) {
  const [items, setItems] = useState(initial || [])
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState({ name: "", slug: "", description: "", price: "", image_url: "", category_id: "", is_active: true, product_type: "digital" })
  const [saving, setSaving] = useState(false)
  const [savingKey, setSavingKey] = useState(0)

  useEffect(() => { setItems(initial || []) }, [initial])

  function resetForm(data) {
    setForm({
      name: data?.name || "",
      slug: data?.slug || "",
      description: data?.description || "",
      price: data?.price ? String(Number(data.price)) : "",
      image_url: data?.image_url || "",
      category_id: data?.category_id || "",
      is_active: data?.is_active !== false,
      product_type: data?.product_type || "digital",
    })
    setEditItem(data || null)
  }

  async function handleSave() {
    if (!form.name || !form.slug || !form.price) return
    setSaving(true)
    setSavingKey(k => k + 1)
    try {
      const body = { ...form, price: parseFloat(form.price) || 0 }
      if (editItem) {
        await fetch(`${API}/api/products/${editItem.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
          body: JSON.stringify(body),
        })
      } else {
        await fetch(`${API}/api/products`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
          body: JSON.stringify(body),
        })
      }
      setShowModal(false)
      onRefresh?.()
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  async function handleDelete(id) {
    if (!confirm("Удалить товар?")) return
    await fetch(`${API}/api/products/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${getToken()}` },
    })
    onRefresh?.()
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Управление товарами</CardTitle>
        <Button size="sm" onClick={() => { resetForm(null); setShowModal(true) }}>
          <Plus className="mr-2 h-4 w-4" /> Добавить товар
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-3 font-medium">Название</th>
                <th className="pb-3 font-medium">Цена</th>
                <th className="pb-3 font-medium">Категория</th>
                <th className="pb-3 font-medium">Статус</th>
                <th className="pb-3 font-medium">Рейтинг</th>
                <th className="pb-3 font-medium">Действия</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">Товары не найдены.</td></tr>
              ) : (
                items.map(p => (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-secondary/50">
                    <td className="py-3 font-medium">{p.name}</td>
                    <td className="py-3">{formatPrice(p.price)}</td>
                    <td className="py-3 text-muted-foreground">
                      {categories?.find(c => c.id === p.category_id)?.name || categories?.find(c => c.id === p.category_id)?.slug || "—"}
                    </td>
                    <td className="py-3">
                      <Badge variant={p.is_active ? "success" : "secondary"}>
                        {p.is_active ? "Активен" : "Неактивен"}
                      </Badge>
                    </td>
                    <td className="py-3">{Number(p.rating || 0).toFixed(1)}</td>
                    <td className="py-3">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { resetForm(p); setShowModal(true) }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleDelete(p.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="w-full max-w-lg rounded-2xl bg-[#0D0D12] border border-white/10 p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">{editItem ? "Редактировать товар" : "Новый товар"}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs text-gray-400">Название *</label>
                  <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="bg-white/5 border-white/10 text-white" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-400">Slug *</label>
                  <Input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} className="bg-white/5 border-white/10 text-white" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-400">Описание</label>
                <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="bg-white/5 border-white/10 text-white" rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs text-gray-400">Цена *</label>
                  <Input type="number" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} className="bg-white/5 border-white/10 text-white" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-400">Категория</label>
                  <select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
                    className="w-full h-10 rounded-lg bg-white/5 border border-white/10 text-white px-3 text-sm">
                    <option value="" className="bg-[#0D0D12]">Без категории</option>
                    {categories?.map(c => (
                      <option key={c.id} value={c.id} className="bg-[#0D0D12]">{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-400">URL изображения</label>
                <Input value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} placeholder="https://..." className="bg-white/5 border-white/10 text-white placeholder:text-gray-600" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="is_active" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                  className="rounded border-white/20 bg-white/5" />
                <label htmlFor="is_active" className="text-sm text-gray-300">Активен</label>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowModal(false)}>Отмена</Button>
              <Button key={savingKey} onClick={handleSave} disabled={saving || !form.name || !form.slug || !form.price}>
                <Save className="mr-2 h-4 w-4" /> {editItem ? "Сохранить" : "Создать"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
