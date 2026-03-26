import type { DemoEndpointHandler } from "../types"
import { parseQueryFromConfig, demoResponse } from "./_http"
import { getClassDetails } from "./classes.utils"

export const getClassDetailsHandler: DemoEndpointHandler = async ({ config, path, method }) => {
  if (path !== "/api/classes/get-class-details") return null
  if (method !== "get") return null

  const query = parseQueryFromConfig(config)
  const classId = Number(query.get("Id") ?? "0")

  const details = await getClassDetails(classId)
  if (!details) return demoResponse(config, { messageEn: "Class not found" }, 400)

  return demoResponse(config, details)
}