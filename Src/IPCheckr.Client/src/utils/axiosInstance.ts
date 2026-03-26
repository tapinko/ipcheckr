import axios, { AxiosError } from "axios"
import getApiBase from "./getApiBase"
import { isDemoEndpointAllowed, isDemoMode } from "../config/demoMode"
import { resolveDemoApiResponse } from "../demo/apiRouter"

const axiosInstance = axios.create({
  baseURL: getApiBase(),
})

axiosInstance.interceptors.request.use(config => {
  const token = sessionStorage.getItem("token")
  if (token) {
    config.headers = config.headers || {}
    config.headers["Authorization"] = `Bearer ${token}`
  }

  if (isDemoMode) {
    const url = config.url || ""
    const role = sessionStorage.getItem("role")
    const allowed = isDemoEndpointAllowed(url, role)

    config.adapter = async currentConfig => {
      const resolved = await resolveDemoApiResponse(currentConfig, role)
      if (resolved) return resolved

      if (allowed) {
        return Promise.reject(
          new AxiosError(
            "Not ported.",
            "ERR_NOT_IMPLEMENTED",
            currentConfig,
            undefined,
            {
              data: {
                messageEn: "Not ported.",
                messageSk: "Neportnute.",
              },
              status: 501,
              statusText: "Not ported.",
              headers: {},
              config: currentConfig,
            },
          ),
        )
      }

      return Promise.reject(
        new AxiosError(
          "Not ported.",
          "ERR_BAD_REQUEST",
          currentConfig,
          undefined,
          {
            data: {
              messageEn: "Not ported.",
              messageSk: "Neportnute.",
            },
            status: 400,
            statusText: "Bad Request",
            headers: {},
            config: currentConfig,
          },
        ),
      )
    }

    return config
  }

  return config
})

export default axiosInstance