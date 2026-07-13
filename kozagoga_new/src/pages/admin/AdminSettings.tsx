// ─── AdminSettings — настройка учётной записи ──────────────
import { useState } from "react"
import { Settings, Save, Key } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/contexts/AuthContext"

const API = window.__KOZAGOGA_API_URL__ || ""
function getToken() { try { return localStorage.getItem("kozagogo_token") } catch { return null } }

export default function AdminSettings() {
  const { user } = useAuth()
  const [oldPw, setOldPw] = useState("")
  const [newPw, setNewPw] = useState("")
  const [confirmPw, setConfirmPw] = useState("")
  const [msg, setMsg] = useState(null)
  const [saving, setSaving] = useState(false)

  async function handleChangePassword() {
    if (!oldPw || !newPw) { setMsg({ type: "error", text: "Заполните все поля" }); return }
    if (newPw.length < 6) { setMsg({ type: "error", text: "Новый пароль минимум 6 символов" }); return }
    if (newPw !== confirmPw) { setMsg({ type: "error", text: "Пароли не совпадают" }); return }

    setSaving(true)
    try {
      const res = await fetch(`${API}/api/auth/password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ oldPassword: oldPw, newPassword: newPw }),
      })
      const data = await res.json()
      if (data.error) {
        setMsg({ type: "error", text: data.error })
      } else {
        setMsg({ type: "success", text: "Пароль изменён" })
        setOldPw(""); setNewPw(""); setConfirmPw("")
      }
    } catch (e) { setMsg({ type: "error", text: "Ошибка" }) }
    finally { setSaving(false) }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Card className="bg-white/[0.03] border-white/10">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 text-white">
            <Settings className="h-5 w-5" /> Настройка учётной записи
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Email / Логин</label>
            <div className="text-white font-medium bg-white/5 rounded-lg px-4 py-2.5 border border-white/10">
              {user?.email}
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Роль</label>
            <div className="text-white font-medium bg-white/5 rounded-lg px-4 py-2.5 border border-white/10">
              {user?.role}
            </div>
          </div>

          <hr className="border-white/10" />

          <h3 className="text-sm font-medium text-white flex items-center gap-2">
            <Key className="h-4 w-4" /> Сменить пароль
          </h3>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-gray-400">Текущий пароль</label>
              <Input type="password" value={oldPw} onChange={e => setOldPw(e.target.value)}
                className="bg-white/5 border-white/10 text-white max-w-xs" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-400">Новый пароль</label>
              <Input type="password" value={newPw} onChange={e => setNewPw(e.target.value)}
                className="bg-white/5 border-white/10 text-white max-w-xs" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-400">Подтверждение</label>
              <Input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                className="bg-white/5 border-white/10 text-white max-w-xs" />
            </div>
            {msg && (
              <p className={`text-sm ${msg.type === "error" ? "text-red-400" : "text-green-400"}`}>{msg.text}</p>
            )}
            <Button onClick={handleChangePassword} disabled={saving}
              className="bg-[#7850FF] hover:bg-[#6340E0] text-white">
              <Save className="mr-2 h-4 w-4" /> {saving ? "Сохранение..." : "Сменить пароль"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
