import UserRole from "../types/UserRole"

const demoModeEnvValue = (import.meta.env.VITE_DEMO_MODE ?? "")
const isDemoMode = demoModeEnvValue.toLowerCase() === "true"

const DEMO_ALWAYS_ALLOWED_PREFIXES = ["/api/auth/"]

const DEMO_ROLE_ALLOWED_PREFIXES: Record<UserRole, string[]> = {
  [UserRole.ADMIN]: [],
  [UserRole.TEACHER]: [
    "/api/dashboard/get-teacher-dashboard",
    "/api/classes/",
    "/api/users/",
    "/api/assignment-group/",
    "/api/assignment/",
  ],
  [UserRole.STUDENT]: [
    "/api/dashboard/get-student-dashboard",
    "/api/assignment/",
  ],
}

const normalizePath = (url: string) => {
  const noQuery = url.split("?")[0] ?? ""
  return noQuery.toLowerCase()
}

export const getDemoAllowedPrefixes = (role: string | null) => {
  const normalizedRole = (role ?? "") as UserRole
  const rolePrefixes = DEMO_ROLE_ALLOWED_PREFIXES[normalizedRole] ?? []
  return [...DEMO_ALWAYS_ALLOWED_PREFIXES, ...rolePrefixes]
}

export const isDemoEndpointAllowed = (url: string, role: string | null) => {
  const path = normalizePath(url)
  const prefixes = getDemoAllowedPrefixes(role)
  return prefixes.some(prefix => path.startsWith(prefix))
}

export { isDemoMode }