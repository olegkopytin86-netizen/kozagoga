// ─── AdminCategories — CRUD категорий ────────────────────
import { useState, useEffect } from "react"
import { FolderTree, Plus, Edit, Trash2, X, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const API = window.__KOZAGOGA_API_URL__ || ""

function getToken() {
  try { return localStorage.getItem("kozagogo_token") } catch { return null }
}

export default function AdminCategories({ categories: initial, onRefresh }) {
  const [items, setItems] = useState(initial || [])
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState({ name: "", slug: "", sort_order: 0 })
  const [saving, setSaving] = useState(false)

  useEffect(() => { setItems(initial || []) }, [initial])

  function resetForm(data) {
    setForm({ name: data?.name || "", slug: data?.slug || "", sort_order: data?.sort_order || 0 })
    setEditItem(data || null)
  }

  async function handleSave() {
    if (!form.name || !form.slug) return
    setSaving(true)
    try {
      const body = { ...form, sort_order: Number(form.sort_order) }
      if (editItem) {
        await fetch(`${API}/api/categories/${editItem.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
          body: JSON.stringify(body),
        })
      } else {
        await fetch(`${API}/api/categories`, {
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
    if (!confirm("Удалить категорию?")) return
    await fetch(`${API}/api/categories/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${getToken()}` },
    })
    onRefresh?.()
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Категории</CardTitle>
        <Button size="sm" onClick={() => { resetForm(null); setShowModal(true) }}>
          <Plus className="mr-2 h-4 w-4" /> Добавить категорию
        </Button>
      </CardHeader>
      <CardContent>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="pb-3 font-medium">Название</th>
              <th className="pb-3 font-medium">Slug</th>
              <th className="pb-3 font-medium">Порядок</th>
              <th className="pb-3 font-medium">Действия</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={4} className="py-8 text-center text-muted-foreground">Категории не найдены.</td></tr>
            ) : (
              items.map(c => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-secondary/50">
                  <td className="py-3 font-medium">{c.name}</td>
                  <td className="py-3 text-muted-foreground">{c.slug}</td>
                  <td className="py-3">{c.sort_order || "—"}</td>
                  <td className="py-3">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { resetForm(c); setShowModal(true) }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleDelete(c.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </CardContent>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="w-full max-w-md rounded-2xl bg-[#0D0D12] border border-white/10 p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">{editItem ? "Редактировать категорию" : "Новая категория"}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs text-gray-400">Название *</label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="bg-white/5 border-white/10 text-white" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-400">Slug *</label>
                <Input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} className="bg-white/5 border-white/10 text-white" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-400">Порядок сортировки</label>
                <Input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: e.target.value }))} className="bg-white/5 border-white/10 text-white" />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowModal(false)}>Отмена</Button>
              <Button onClick={handleSave} disabled={saving || !form.name || !form.slug}>
                <Save className="mr-2 h-4 w-4" /> {editItem ? "Сохранить" : "Создать"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
