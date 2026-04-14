import type { AxiosRequestConfig, AxiosResponse } from "axios"
import { getDemoUsers } from "../../auth"
import UserRole from "../../../types/UserRole"

export const parseQueryFromConfig = (config: AxiosRequestConfig) => {
  const query = (config.url || "").split("?")[1] ?? ""
  return new URLSearchParams(query)
}

export const parseBody = <T>(config: AxiosRequestConfig): T | null => {
  const raw = config.data
  if (!raw) return null
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as T
    } catch {
      return null
    }
  }

  return raw as T
}

export const demoResponse = (config: AxiosRequestConfig, data: unknown, status = 200): AxiosResponse => ({
  data,
  status,
  statusText: status === 200 ? "OK" : "Bad Request",
  headers: {},
  config: config as any,
})

export const resolveUser = (role: string | null) => {
  const users = getDemoUsers()
  const normalizedRole = (role as UserRole | null) ?? null
  return users.find(user => user.role === normalizedRole) ?? users[0] ?? null
}

export const extractUserIdFromToken = (config: AxiosRequestConfig): number | null => {
  const authHeaderRaw = (config.headers as any)?.Authorization ?? (config.headers as any)?.authorization
  const authHeader = typeof authHeaderRaw === "string" ? authHeaderRaw : null
  if (!authHeader?.startsWith("Bearer ")) return null

  const token = authHeader.slice("Bearer ".length)
  if (!token.startsWith("demo.")) return null

  const tokenPart = token.slice("demo.".length)
  try {
    const decoded = window.atob(tokenPart)
    const payload = JSON.parse(decoded) as any
    return typeof payload.userId === "number" ? payload.userId : null
  } catch {
    return null
  }
}