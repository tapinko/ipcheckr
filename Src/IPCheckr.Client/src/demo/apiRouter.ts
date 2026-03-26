import type { AxiosRequestConfig, AxiosResponse } from "axios"
import { demoEndpointHandlers } from "./router/handlers"

const parsePath = (url: string) => (url.split("?")[0] ?? "").toLowerCase()

export const resolveDemoApiResponse = async (
  config: AxiosRequestConfig,
  role: string | null,
): Promise<AxiosResponse | null> => {
  const path = parsePath(config.url || "")
  const method = (config.method ?? "get").toLowerCase()

  for (const handler of demoEndpointHandlers) {
    const result = await handler({ config, role, path, method })
    if (result) return result
  }

  return null
}