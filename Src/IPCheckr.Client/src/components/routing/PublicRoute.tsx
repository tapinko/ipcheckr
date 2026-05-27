import { Navigate, Outlet } from "react-router-dom"
import { useAuth } from "../../contexts/AuthContext"
import UserRole from "../../types/UserRole"
import LoadingPage from "../layout/LoadingPage"
import { Routes, RouteKeys } from "../../router/routes"
import type { ReactNode } from "react"

interface PublicRouteProps {
  children?: ReactNode
}

const PublicRoute = ({ children }: PublicRouteProps) => {
  const { isAuthenticated, userRole, loading } = useAuth()

  if (loading) return <LoadingPage />

  if (isAuthenticated) {
    if (userRole === UserRole.ADMIN) return <Navigate to={Routes[RouteKeys.ADMIN_DASHBOARD]} replace />
    if (userRole === UserRole.TEACHER) return <Navigate to={Routes[RouteKeys.TEACHER_DASHBOARD]} replace />
    if (userRole === UserRole.STUDENT) return <Navigate to={Routes[RouteKeys.STUDENT_DASHBOARD]} replace />
    return <Navigate to="/" replace />
  }

  return <>{children ?? <Outlet />}</>
}

export default PublicRoute