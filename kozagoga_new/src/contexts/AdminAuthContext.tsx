// ============================================
// AdminAuthContext
// Аутентификация администратора через httpOnly cookie + CSRF
// ============================================

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react"
import { adminAuth } from "@/lib/admin/api"

export type AdminRole = 'viewer' | 'operator' | 'admin' | 'superadmin'

export interface AdminUser {
  id: string
  email: string
  role: AdminRole
  created_at: string
}

interface AdminAuthContextType {
  admin: AdminUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<{ error: string | null }>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined)

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)

  const checkAuth = useCallback(async () => {
    try {
      const user = await adminAuth.me()
      if (user && user.id && user.role) {
        setAdmin(user as AdminUser)
      } else {
        setAdmin(null)
      }
    } catch {
      setAdmin(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  const login = async (email: string, password: string): Promise<{ error: string | null }> => {
    try {
      const res = await adminAuth.login(email, password)
      if (res.error) return { error: res.error }
      setAdmin(res.user)
      return { error: null }
    } catch (err: any) {
      return { error: err.message || 'Ошибка подключения к серверу' }
    }
  }

  const logout = async () => {
    try {
      await adminAuth.logout()
    } catch {
      // Ignore logout errors
    }
    setAdmin(null)
  }

  return (
    <AdminAuthContext.Provider value={{ admin, loading, login, logout, checkAuth }}>
      {children}
    </AdminAuthContext.Provider>
  )
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext)
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within AdminAuthProvider')
  }
  return context
}

/**
 * Проверяет, имеет ли администратор одну из указанных ролей
 */
export function hasAdminRole(admin: AdminUser | null, roles: AdminRole[]): boolean {
  if (!admin) return false
  return roles.includes(admin.role)
}
