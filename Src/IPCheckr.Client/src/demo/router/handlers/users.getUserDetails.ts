import type { DemoEndpointHandler } from "../types"
import { parseQueryFromConfig, demoResponse } from "./_http"
import { getUserDetails } from "./users.utils"

export const getUserDetailsHandler: DemoEndpointHandler = async ({ config, path, method }) => {
  if (path !== "/api/users/get-user-details") return null
  if (method !== "get") return null

  const query = parseQueryFromConfig(config)
  const id = Number(query.get("Id") ?? "0")

  const details = await getUserDetails(id)
  if (!details) return demoResponse(config, { messageEn: "User not found" }, 400)

  return demoResponse(config, details)
}