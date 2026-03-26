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