import { Navigate, Outlet, useSearchParams } from "react-router-dom"
import { useAuth } from "../../contexts/AuthContext"
import UserRole from "../../types/UserRole"
import LoadingPage from "../layout/LoadingPage"
import { Routes, RouteKeys, RolePrefixes } from "../../router/routes"
import type { ReactNode } from "react"

interface PublicRouteProps {
  children?: ReactNode
}

const PublicRoute = ({ children }: PublicRouteProps) => {
  const { isAuthenticated, userRole, loading } = useAuth()
  const [searchParams] = useSearchParams()

  if (loading) return <LoadingPage />

  if (isAuthenticated) {
    const redirect = searchParams.get("redirect")
    if (
      redirect &&
      redirect.startsWith("/") &&
      !redirect.startsWith("//") &&
      userRole &&
      redirect.startsWith(RolePrefixes[userRole])
    ) {
      return <Navigate to={redirect} replace />
    }

    if (userRole === UserRole.ADMIN) return <Navigate to={Routes[RouteKeys.ADMIN_DASHBOARD]} replace />
    if (userRole === UserRole.TEACHER) return <Navigate to={Routes[RouteKeys.TEACHER_DASHBOARD]} replace />
    if (userRole === UserRole.STUDENT) return <Navigate to={Routes[RouteKeys.STUDENT_DASHBOARD]} replace />
    return <Navigate to="/" replace />
  }

  return <>{children ?? <Outlet />}</>
}

export default PublicRoute