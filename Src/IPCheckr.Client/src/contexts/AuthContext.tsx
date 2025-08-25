import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react"
import { authApi } from "../utils/apiClients"
import UserRole from "../types/UserRole"

type AuthContextType = {
  isAuthenticated: boolean
  userRole: UserRole | null
  userId: number | null
  username: string | null
  loading: boolean
  refreshAuth: () => void
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  userRole: null,
  loading: true,
  userId: null,
  username: null,
  refreshAuth: () => {},
})

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const [userId, setUserId] = useState<number | null>(null)
  const [username, setUsername] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshAuth = useCallback(() => {
    const token = sessionStorage.getItem("token") || ""
    if (!token) {
      setIsAuthenticated(false)
      setUserRole(null)
      setUserId(null)
      setUsername(null)
      setLoading(false)
      return
    }
    setLoading(true)
    authApi.authValidateToken({ token })
      .then(res => {
        setIsAuthenticated(res.data.isValid)
        setUserRole(res.data.role ? (res.data.role as UserRole) : null)
        setUsername(res.data.username || null)
        setUserId(res.data.userId || null)
      })
      .catch(() => {
        setIsAuthenticated(false)
        setUserRole(null)
        setUserId(null)
        setUsername(null)
        setUserId(null)
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    refreshAuth()
  }, [])

  return (
    <AuthContext.Provider value={{ isAuthenticated, userRole, userId, username, loading, refreshAuth }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)