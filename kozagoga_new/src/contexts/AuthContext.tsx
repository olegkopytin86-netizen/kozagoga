import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import type { AppUser } from "@/types/database"

// API_BASE — используем относительный путь (nginx проксирует /api/ на backend)
const API_BASE = typeof window !== 'undefined'
  ? (window.__KOZAGOGA_API_URL__ || '')
  : ''

interface AuthContextType {
  user: AppUser | null
  isAdmin: boolean
  loading: boolean
  login: (email: string, password: string) => Promise<{ error: string | null }>
  register: (email: string, password: string) => Promise<{ error: string | null }>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const TOKEN_KEY = "kozagogo_token"
const USER_KEY = "kozagogo_user"

// Храним токен в глобальной переменной для @lork/sdk
let globalToken: string | null = null
export function getStoredToken(): string | null {
  return globalToken || localStorage.getItem(TOKEN_KEY)
}

async function apiPost(path: string, body: unknown) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  return res.json()
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Восстанавливаем сессию из localStorage
    const token = localStorage.getItem(TOKEN_KEY)
    const stored = localStorage.getItem(USER_KEY)

    if (token && stored) {
      try {
        const parsed = JSON.parse(stored)
        if (parsed?.id && parsed?.email && parsed?.role) {
          globalToken = token
          setUser(parsed)
        }
      } catch {
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(USER_KEY)
      }
    }
    setLoading(false)
  }, [])

  const saveSession = (userData: AppUser, token: string) => {
    globalToken = token
    setUser(userData)
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USER_KEY, JSON.stringify(userData))
  }

  const clearSession = () => {
    globalToken = null
    setUser(null)
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  }

  const login = async (email: string, password: string): Promise<{ error: string | null }> => {
    try {
      const res = await apiPost("/api/auth/login", { email, password })
      if (res.error) return { error: res.error }
      saveSession(
        { id: res.user.id, email: res.user.email, role: res.user.role, created_at: res.user.created_at },
        res.token
      )
      return { error: null }
    } catch {
      return { error: "Ошибка подключения к серверу. Убедитесь, что API запущен." }
    }
  }

  const register = async (email: string, password: string): Promise<{ error: string | null }> => {
    try {
      const res = await apiPost("/api/auth/register", { email, password })
      if (res.error) return { error: res.error }
      saveSession(
        { id: res.user.id, email: res.user.email, role: res.user.role, created_at: res.user.created_at },
        res.token
      )
      return { error: null }
    } catch {
      return { error: "Ошибка подключения к серверу. Убедитесь, что API запущен." }
    }
  }

  const logout = async () => {
    clearSession()
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin: ['admin', 'superadmin'].includes(user?.role || ''),
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
