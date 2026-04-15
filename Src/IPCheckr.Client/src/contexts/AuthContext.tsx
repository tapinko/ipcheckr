import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react"
import { useNavigate } from "react-router-dom"
import { authApi } from "../utils/apiClients"
import UserRole from "../types/UserRole"
import { isDemoMode } from "../config/demoMode"
import { demoValidateToken } from "../demo/auth"
import { RouteKeys, Routes } from "../router/routes"

type AuthContextType = {
  isAuthenticated: boolean
  userRole: UserRole | null
  userId: number | null
  username: string | null
  loading: boolean
  refreshAuth: () => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  userRole: null,
  loading: true,
  userId: null,
  username: null,
  refreshAuth: () => {},
  logout: () => {},
})

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const [userId, setUserId] = useState<number | null>(null)
  const [username, setUsername] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const clearAuthState = useCallback((redirectToLogin = false) => {
    sessionStorage.removeItem("token")
    sessionStorage.removeItem("role")
    setIsAuthenticated(false)
    setUserRole(null)
    setUserId(null)
    setUsername(null)

    if (redirectToLogin && window.location.pathname !== Routes[RouteKeys.LOGIN]) {
      navigate(Routes[RouteKeys.LOGIN], { replace: true })
    }
  }, [navigate])

  const getTokenExpiryMs = useCallback((token: string): number | null => {
    try {
      const parts = token.split(".")
      if (parts.length < 2) return null

      const payloadBase64Url = parts[1]
      const payloadBase64 = payloadBase64Url.replace(/-/g, "+").replace(/_/g, "/")
      const padded = payloadBase64 + "=".repeat((4 - (payloadBase64.length % 4)) % 4)
      const payloadJson = atob(padded)
      const payload = JSON.parse(payloadJson) as { exp?: number }

      return typeof payload.exp === "number" ? payload.exp * 1000 : null
    } catch {
      return null
    }
  }, [])

  const refreshAuth = useCallback(() => {
    const token = sessionStorage.getItem("token") || ""
    if (!token) {
      clearAuthState()
      setLoading(false)
      return
    }
    setLoading(true)

    if (isDemoMode) {
      demoValidateToken(token)
        .then(res => {
          setIsAuthenticated(res.isValid)
          setUserRole(res.role)
          setUsername(res.username)
          setUserId(res.userId)
          if (!res.isValid) {
            clearAuthState(true)
          }
        })
        .catch(() => {
          clearAuthState(true)
        })
        .finally(() => setLoading(false))
      return
    }

    authApi.authValidateToken({ token })
      .then(res => {
        if (!res.data.isValid) {
          clearAuthState(true)
          return
        }

        setIsAuthenticated(res.data.isValid)
        setUserRole(res.data.role ? (res.data.role as UserRole) : null)
        setUsername(res.data.username || null)
        setUserId(res.data.userId || null)
      })
      .catch(() => {
        clearAuthState(true)
      })
      .finally(() => setLoading(false))
  }, [clearAuthState])

  useEffect(() => {
    refreshAuth()
  }, [refreshAuth])

  useEffect(() => {
    if (!isAuthenticated || isDemoMode) return

    const token = sessionStorage.getItem("token") || ""
    if (!token) {
      clearAuthState(true)
      return
    }

    const expiryMs = getTokenExpiryMs(token)
    if (!expiryMs) {
      clearAuthState(true)
      return
    }

    const delay = expiryMs - Date.now()
    if (delay <= 0) {
      clearAuthState(true)
      return
    }

    const timerId = window.setTimeout(() => {
      clearAuthState(true)
    }, delay)

    return () => {
      window.clearTimeout(timerId)
    }
  }, [isAuthenticated, clearAuthState, getTokenExpiryMs])

  const logout = useCallback(() => {
    clearAuthState(true)
  }, [clearAuthState])

  return (
    <AuthContext.Provider value={{ isAuthenticated, userRole, userId, username, loading, refreshAuth, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)