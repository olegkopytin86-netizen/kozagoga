import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { db } from "@lork/sdk"
import type { AppUser } from "@/types/database"

interface AuthContextType {
  user: AppUser | null
  isAdmin: boolean
  loading: boolean
  login: (email: string, password: string) => Promise<{ error: string | null }>
  register: (email: string, password: string) => Promise<{ error: string | null }>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Проверяем, есть ли сохранённая сессия
    const stored = localStorage.getItem("kozagogo_user")
    if (stored) {
      try {
        setUser(JSON.parse(stored))
      } catch {
        localStorage.removeItem("kozagogo_user")
      }
    }
    setLoading(false)
  }, [])

  const login = async (email: string, password: string): Promise<{ error: string | null }> => {
    try {
      // Пытаемся найти пользователя в БД
      const { data, error } = await db
        .from("users")
        .select("*")
        .eq("email", email)
        .single()

      if (error || !data) {
        // Если БД пуста, создаём демо-логин
        if (email === "admin@kozagogo.ru" && password === "admin123") {
          const demoUser: AppUser = {
            id: "admin-demo-id",
            email: "admin@kozagogo.ru",
            role: "admin",
            created_at: new Date().toISOString(),
          }
          setUser(demoUser)
          localStorage.setItem("kozagogo_user", JSON.stringify(demoUser))
          return { error: null }
        }
        if (email === "user@kozagogo.ru" && password === "user123") {
          const demoUser: AppUser = {
            id: "user-demo-id",
            email: "user@kozagogo.ru",
            role: "user",
            created_at: new Date().toISOString(),
          }
          setUser(demoUser)
          localStorage.setItem("kozagogo_user", JSON.stringify(demoUser))
          return { error: null }
        }
        return { error: "Неверный email или пароль" }
      }

      const appUser: AppUser = {
        id: data.id,
        email: data.email,
        role: data.role || "user",
        created_at: data.created_at,
      }
      setUser(appUser)
      localStorage.setItem("kozagogo_user", JSON.stringify(appUser))
      return { error: null }
    } catch {
      return { error: "Ошибка входа. Попробуйте позже." }
    }
  }

  const register = async (email: string, password: string): Promise<{ error: string | null }> => {
    try {
      // Проверяем, не занят ли email
      const { data: existing } = await db
        .from("users")
        .select("id")
        .eq("email", email)
        .single()

      if (existing) {
        return { error: "Пользователь с таким email уже существует" }
      }

      // Создаём пользователя
      const { data, error } = await db
        .from("users")
        .insert({ email, password, role: "user" })
        .select()
        .single()

      if (error || !data) {
        // Если БД не настроена, создаём локальную сессию
        const demoUser: AppUser = {
          id: `local-${Date.now()}`,
          email,
          role: "user",
          created_at: new Date().toISOString(),
        }
        setUser(demoUser)
        localStorage.setItem("kozagogo_user", JSON.stringify(demoUser))
        return { error: null }
      }

      const appUser: AppUser = {
        id: data.id,
        email: data.email,
        role: data.role || "user",
        created_at: data.created_at,
      }
      setUser(appUser)
      localStorage.setItem("kozagogo_user", JSON.stringify(appUser))
      return { error: null }
    } catch {
      // Fallback — локальная регистрация
      const demoUser: AppUser = {
        id: `local-${Date.now()}`,
        email,
        role: "user",
        created_at: new Date().toISOString(),
      }
      setUser(demoUser)
      localStorage.setItem("kozagogo_user", JSON.stringify(demoUser))
      return { error: null }
    }
  }

  const logout = async () => {
    setUser(null)
    localStorage.removeItem("kozagogo_user")
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin: user?.role === "admin",
        loading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
