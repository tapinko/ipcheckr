import type { AxiosRequestConfig } from "axios"

export type DemoRouteContext = {
  config: AxiosRequestConfig
  role: string | null
  path: string
  method: string
}