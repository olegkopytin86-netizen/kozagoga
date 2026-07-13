// ─── AdminUsers — управление пользователями ───────────────
import { useState, useEffect } from "react"
import { Users, Plus, X, Save, Search, Shield, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const API = window.__KOZAGOGA_API_URL__ || ""
function getToken() { try { return localStorage.getItem("kozagogo_token") } catch { return null } }

const ROLE_COLORS = { superadmin: "danger", admin: "warning", user: "success", viewer: "secondary" }

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ email: "", password: "", role: "viewer" })
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchUsers() }, [])

  async function fetchUsers() {
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/users`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      const data = await res.json()
      setUsers(Array.isArray(data) ? data : [])
    } catch (e) { setUsers([]) }
    finally { setLoading(false) }
  }

  async function handleCreate() {
    if (!form.email || !form.password || !form.role) return
    setSaving(true)
    try {
      await fetch(`${API}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, password: form.password, role: form.role }),
      })
      setShowModal(false)
      setForm({ email: "", password: "", role: "viewer" })
      fetchUsers()
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  async function handleRoleChange(userId, newRole) {
    await fetch(`${API}/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ role: newRole }),
    })
    fetchUsers()
  }

  const filtered = users.filter(u => !search || u.email?.toLowerCase().includes(search.toLowerCase()))

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5" /> Пользователи
          <span className="text-sm font-normal text-gray-500">({users.length})</span>
        </CardTitle>
        <Button size="sm" onClick={() => setShowModal(true)}>
          <Plus className="mr-2 h-4 w-4" /> Создать учётку
        </Button>
      </CardHeader>
      <CardContent>
        <div className="relative mb-4 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input placeholder="Поиск по email..." value={search} onChange={e => setSearch(e.target.value)}
            className="pl-10 bg-white/5 border-white/10 text-white" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-gray-500">
                <th className="pb-3 font-medium">Email</th>
                <th className="pb-3 font-medium">Роль</th>
                <th className="pb-3 font-medium">Создан</th>
                <th className="pb-3 font-medium">Действия</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="py-3 text-white">{u.email}</td>
                  <td className="py-3">
                    <Badge variant={ROLE_COLORS[u.role] || "secondary"}>{u.role}</Badge>
                  </td>
                  <td className="py-3 text-gray-400">{new Date(u.created_at).toLocaleDateString("ru-RU")}</td>
                  <td className="py-3">
                    <div className="flex gap-1">
                      {u.role !== "superadmin" && (
                        <select value={u.role} onChange={e => handleRoleChange(u.id, e.target.value)}
                          className="text-xs bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-gray-300">
                          <option value="user" className="bg-[#0D0D12]">Пользователь</option>
                          <option value="viewer" className="bg-[#0D0D12]">Только просмотр</option>
                          {u.role === "admin" && <option value="admin" className="bg-[#0D0D12]">Админ</option>}
                        </select>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Модалка создания */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowModal(false)}>
            <div className="w-full max-w-md rounded-2xl bg-[#0D0D12] border border-white/10 p-6 shadow-2xl"
              onClick={e => e.stopPropagation()}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">Новая учётная запись</h2>
                <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs text-gray-400">Логин / Email *</label>
                  <Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="bg-white/5 border-white/10 text-white" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-400">Пароль *</label>
                  <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    className="bg-white/5 border-white/10 text-white" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-400">Роль</label>
                  <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                    className="w-full h-10 rounded-lg bg-white/5 border border-white/10 text-white px-3 text-sm">
                    <option value="viewer" className="bg-[#0D0D12]">Только просмотр</option>
                    <option value="user" className="bg-[#0D0D12]">Пользователь</option>
                    <option value="admin" className="bg-[#0D0D12]">Администратор</option>
                  </select>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setShowModal(false)}>Отмена</Button>
                <Button onClick={handleCreate} disabled={saving || !form.email || !form.password}>
                  <Save className="mr-2 h-4 w-4" /> Создать
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
