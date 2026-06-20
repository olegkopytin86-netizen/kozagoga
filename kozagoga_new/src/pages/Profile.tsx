import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { User, Mail, Lock, Save, ArrowLeft, Eye, EyeOff, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/contexts/AuthContext"

const API_BASE = typeof window !== 'undefined'
  ? (window.__KOZAGOGA_API_URL__ || '')
  : ''

function getToken(): string | null {
  try {
    return localStorage.getItem('kozagogo_token')
  } catch {
    return null
  }
}

function headers(extra: Record<string, string> = {}): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json', ...extra }
  const token = getToken()
  if (token) h['Authorization'] = `Bearer ${token}`
  return h
}

export default function Profile() {
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
  })

  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
  })
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordSaved, setPasswordSaved] = useState(false)
  const [passwordError, setPasswordError] = useState("")

  // Загружаем профиль с сервера
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/profile`, { headers: headers() })
        if (res.ok) {
          const data = await res.json()
          setForm({
            name: data.name || user?.email?.split("@")[0] || "",
            email: data.email || user?.email || "",
            phone: data.phone || "",
          })
        } else {
          // Fallback: используем данные из контекста
          setForm({
            name: user?.email?.split("@")[0] || "",
            email: user?.email || "",
            phone: "",
          })
        }
      } catch {
        setForm({
          name: user?.email?.split("@")[0] || "",
          email: user?.email || "",
          phone: "",
        })
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [user])

  // Сохраняем профиль
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSaving(true)

    try {
      const res = await fetch(`${API_BASE}/api/auth/profile`, {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Ошибка сохранения')
        return
      }

      setSaved(true)
      setError("")
      setTimeout(() => setSaved(false), 3000)
    } catch (err: any) {
      setError('Ошибка подключения к серверу')
    } finally {
      setSaving(false)
    }
  }

  // Смена пароля
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError("")
    setPasswordSaved(false)
    setPasswordSaving(true)

    try {
      const res = await fetch(`${API_BASE}/api/auth/password`, {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify({
          current_password: passwordForm.current_password,
          new_password: passwordForm.new_password,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setPasswordError(data.error || 'Ошибка смены пароля')
        return
      }

      setPasswordSaved(true)
      setPasswordError("")
      setPasswordForm({ current_password: "", new_password: "" })
      setTimeout(() => setPasswordSaved(false), 3000)
    } catch {
      setPasswordError('Ошибка подключения к серверу')
    } finally {
      setPasswordSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          to="/dashboard"
          className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Назад в кабинет
        </Link>

        <div className="mb-6">
          <h1 className="text-2xl font-bold">Настройки профиля</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Управляйте своими личными данными
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-600 border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSave}>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5 text-primary" />
                Личные данные
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Имя</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ваше имя"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="your@email.ru"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Телефон</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+7 (999) 123-45-67"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-muted-foreground">
              {saved && "✅ Изменения сохранены"}
            </p>
            <Button type="submit" disabled={saving} className="gap-2">
              <Save className="h-4 w-4" />
              {saving ? "Сохранение..." : "Сохранить изменения"}
            </Button>
          </div>
        </form>

        <Separator className="my-8" />

        <form onSubmit={handlePasswordChange}>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Lock className="h-5 w-5 text-primary" />
                Сменить пароль
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current_password">Текущий пароль</Label>
                <Input
                  id="current_password"
                  type="password"
                  value={passwordForm.current_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                  placeholder="Введите текущий пароль"
                  minLength={6}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new_password">Новый пароль</Label>
                <div className="relative">
                  <Input
                    id="new_password"
                    type={showPassword ? "text" : "password"}
                    value={passwordForm.new_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                    placeholder="Минимум 6 символов"
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {passwordError && (
                <p className="text-sm text-red-500">{passwordError}</p>
              )}
              {passwordSaved && (
                <p className="text-sm text-emerald-600">✅ Пароль успешно изменён</p>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={passwordSaving} variant="outline" className="gap-2">
              <Lock className="h-4 w-4" />
              {passwordSaving ? "Сохранение..." : "Сменить пароль"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
