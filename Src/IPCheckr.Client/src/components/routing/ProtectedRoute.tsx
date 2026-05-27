import { Navigate, Outlet, useLocation } from "react-router-dom"
import { useAuth } from "../../contexts/AuthContext"
import UserRole from "../../types/UserRole"
import LoadingPage from "../layout/LoadingPage"
import { Routes, RouteKeys } from "../../router/routes"
import type { ReactNode } from "react"

interface ProtectedRouteProps {
  allowedRoles?: UserRole[]
  children?: ReactNode
}

const rolePrefix: Record<UserRole, string> = {
  [UserRole.ADMIN]: "/admin",
  [UserRole.TEACHER]: "/teacher",
  [UserRole.STUDENT]: "/student",
}

// Mapping of first path segment to target route keys for each role
const sectionTargets: Record<string, Partial<Record<UserRole, RouteKeys>>> = {
  dashboard: {
    [UserRole.ADMIN]: RouteKeys.ADMIN_DASHBOARD,
    [UserRole.TEACHER]: RouteKeys.TEACHER_DASHBOARD,
    [UserRole.STUDENT]: RouteKeys.STUDENT_DASHBOARD,
  },
  "assignment-groups": {
    [UserRole.ADMIN]: RouteKeys.ADMIN_ASSIGNMENT_GROUPS,
    [UserRole.TEACHER]: RouteKeys.TEACHER_ASSIGNMENT_GROUPS,
    [UserRole.STUDENT]: RouteKeys.STUDENT_ASSIGNMENTS,
  },
  assignments: {
    [UserRole.ADMIN]: RouteKeys.ADMIN_ASSIGNMENT_GROUPS,
    [UserRole.TEACHER]: RouteKeys.TEACHER_ASSIGNMENT_GROUPS,
    [UserRole.STUDENT]: RouteKeys.STUDENT_ASSIGNMENTS,
  },
  classes: {
    [UserRole.ADMIN]: RouteKeys.ADMIN_CLASSES,
    [UserRole.TEACHER]: RouteKeys.TEACHER_MY_CLASSES,
  },
  "my-classes": {
    [UserRole.ADMIN]: RouteKeys.ADMIN_CLASSES,
    [UserRole.TEACHER]: RouteKeys.TEACHER_MY_CLASSES,
  },
  users: {
    [UserRole.ADMIN]: RouteKeys.ADMIN_USERS,
    [UserRole.TEACHER]: RouteKeys.TEACHER_MY_CLASSES,
  },
  gns3: {
    [UserRole.ADMIN]: RouteKeys.ADMIN_GNS3,
    [UserRole.TEACHER]: RouteKeys.TEACHER_GNS3,
    [UserRole.STUDENT]: RouteKeys.STUDENT_GNS3,
  },
  settings: {
    [UserRole.ADMIN]: RouteKeys.ADMIN_SETTINGS,
  },
}

const dashboardByRole: Record<UserRole, string> = {
  [UserRole.ADMIN]: Routes[RouteKeys.ADMIN_DASHBOARD],
  [UserRole.TEACHER]: Routes[RouteKeys.TEACHER_DASHBOARD],
  [UserRole.STUDENT]: Routes[RouteKeys.STUDENT_DASHBOARD],
}

// If user tries to access a page not allowed for their role, redirect to the "same" page for their role if it exists, otherwise to their dashboard
const resolveRoleRedirect = (pathname: string, targetRole: UserRole): string => {
  const fallback = dashboardByRole[targetRole]

  let sourceRole: UserRole | null = null
  for (const role of [UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT] as UserRole[]) {
    if (pathname.startsWith(rolePrefix[role])) {
      sourceRole = role
      break
    }
  }
  if (!sourceRole || sourceRole === targetRole) return fallback

  const sub = pathname.slice(rolePrefix[sourceRole].length) // e.g. "/dashboard", "/assignment-groups/..."
  const section = sub.split("/")[1] // first segment: "dashboard", "assignment-groups", etc.

  const mapping = sectionTargets[section]
  if (!mapping) return fallback

  const targetKey = mapping[targetRole]
  return targetKey !== undefined ? Routes[targetKey] : fallback
}

const ProtectedRoute = ({ allowedRoles, children }: ProtectedRouteProps) => {
  const { isAuthenticated, userRole, loading } = useAuth()
  const location = useLocation()

  if (loading) return <LoadingPage />
  if (!isAuthenticated) return <Navigate to={Routes[RouteKeys.LOGIN]} replace />
  if (allowedRoles && (!userRole || !allowedRoles.includes(userRole))) {
    const target = userRole ? resolveRoleRedirect(location.pathname, userRole) : Routes[RouteKeys.LOGIN]
    return <Navigate to={target} replace />
  }

  return <>{children ?? <Outlet />}</>
}

export default ProtectedRoute