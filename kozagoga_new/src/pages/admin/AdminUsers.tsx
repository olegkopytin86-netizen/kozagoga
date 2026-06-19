import { useEffect, useState, useCallback } from "react"
import { useAdminAuth } from "@/contexts/AdminAuthContext"
import { adminUsers } from "@/lib/admin/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Plus, Shield, AlertCircle, Loader2, Trash2, Eye, EyeOff,
} from "lucide-react"

interface AdminUser {
  id: string
  email: string
  role: string
  created_at: string
  action_count: number
  last_action_at: string | null
}

const ROLE_MAP: Record<string, { label: string; color: string }> = {
  viewer: { label: 'Просмотр', color: 'bg-gray-500/20 text-gray-300' },
  operator: { label: 'Оператор', color: 'bg-blue-500/20 text-blue-300' },
  admin: { label: 'Администратор', color: 'bg-amber-500/20 text-amber-300' },
  superadmin: { label: 'Superadmin', color: 'bg-red-500/20 text-red-300' },
  blocked: { label: 'Заблокирован', color: 'bg-red-500/10 text-red-400' },
}

export default function AdminUsers() {
  const { admin } = useAdminAuth()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState("admin")
  const [showPassword, setShowPassword] = useState(false)

  const fetchUsers = useCallback(async () => {
    try {
      const data = await adminUsers.list()
      setUsers(data as AdminUser[])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const handleCreate = async () => {
    setError(null)
    if (!email || !password) {
      setError("Email и пароль обязательны")
      return
    }
    if (password.length < 8) {
      setError("Пароль должен быть не менее 8 символов")
      return
    }

    setSaving(true)
    try {
      await adminUsers.create({ email, password, role })
      setDialogOpen(false)
      setEmail("")
      setPassword("")
      setRole("admin")
      fetchUsers()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await adminUsers.update(userId, { role: newRole })
      fetchUsers()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleDelete = async (userId: string, userEmail: string) => {
    if (!confirm(`Удалить администратора «${userEmail}»?`)) return
    try {
      await adminUsers.delete(userId)
      fetchUsers()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const formatDate = (date: string | null) => {
    if (!date) return '—'
    return new Date(date).toLocaleDateString('ru-RU')
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Администраторы</h1>
          <p className="text-sm text-gray-400 mt-1">Управление учётными записями администраторов</p>
        </div>
        <Button onClick={() => { setError(null); setDialogOpen(true) }}>
          <Plus className="mr-2 h-4 w-4" />
          Добавить администратора
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* User list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      ) : (
        <div className="space-y-2">
          {users.map(u => {
            const roleInfo = ROLE_MAP[u.role] || { label: u.role, color: 'bg-gray-500/20 text-gray-300' }
            return (
              <Card key={u.id} className="border-gray-800 bg-gray-900">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-800">
                    <Shield className={`h-5 w-5 ${u.role === 'superadmin' ? 'text-red-400' : 'text-gray-400'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-white truncate">{u.email}</p>
                      <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${roleInfo.color}`}>
                        {roleInfo.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Создан: {formatDate(u.created_at)}
                      {u.last_action_at && ` · Последнее действие: ${formatDate(u.last_action_at)}`}
                      · Действий: {u.action_count}
                    </p>
                  </div>

                  {/* Role changer (не для себя) */}
                  {u.id !== admin?.id && u.role !== 'superadmin' && (
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      className="rounded border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-white"
                    >
                      <option value="viewer">Просмотр</option>
                      <option value="operator">Оператор</option>
                      <option value="admin">Администратор</option>
                    </select>
                  )}

                  {u.id !== admin?.id && u.role !== 'superadmin' && (
                    <button
                      onClick={() => handleDelete(u.id, u.email)}
                      className="rounded p-1.5 text-gray-500 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </CardContent>
              </Card>
            )
          })}

          {users.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500">
              <Shield className="mb-3 h-12 w-12" />
              <p className="text-sm">Администраторы не найдены</p>
            </div>
          )}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="border-gray-800 bg-gray-900 text-white">
          <DialogHeader>
            <DialogTitle>Добавить администратора</DialogTitle>
            <DialogDescription className="text-gray-400">
              Создайте учётную запись для нового администратора
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-gray-300">Email</Label>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-gray-700 bg-gray-800 text-white"
                placeholder="admin@kozagogo.ru"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Пароль (мин. 8 символов)</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border-gray-700 bg-gray-800 pr-10 text-white"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Роль</Label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
              >
                <option value="viewer">Просмотр</option>
                <option value="operator">Оператор</option>
                <option value="admin">Администратор</option>
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-gray-700 text-gray-300">
              Отмена
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
