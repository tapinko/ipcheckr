import axios from "axios"
import getApiBase from "./getApiBase"

const axiosInstance = axios.create({
  baseURL: getApiBase(),
})

axiosInstance.interceptors.request.use(config => {
  const token = sessionStorage.getItem("token")
  if (token) {
    config.headers = config.headers || {}
    config.headers["Authorization"] = `Bearer ${token}`
  }
  return config
})

export default axiosInstance