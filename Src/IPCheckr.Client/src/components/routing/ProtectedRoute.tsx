import { Navigate, Outlet } from "react-router-dom"
import { useAuth } from "../../contexts/AuthContext"
import UserRole from "../../types/UserRole"
import LoadingPage from "../layout/LoadingPage"
import Unauthorized401 from "../../pages/errors/Unauthorized401"
import { Routes, RouteKeys } from "../../router/routes"
import type { ReactNode } from "react"

interface ProtectedRouteProps {
  allowedRoles?: UserRole[]
  children?: ReactNode
}

const ProtectedRoute = ({ allowedRoles, children }: ProtectedRouteProps) => {
  const { isAuthenticated, userRole, loading } = useAuth()

  if (loading) return <LoadingPage />
  if (!isAuthenticated) return <Navigate to={Routes[RouteKeys.LOGIN]} replace />
  if (allowedRoles && (!userRole || !allowedRoles.includes(userRole))) return <Unauthorized401 />

  return <>{children ?? <Outlet />}</>
}

export default ProtectedRoute