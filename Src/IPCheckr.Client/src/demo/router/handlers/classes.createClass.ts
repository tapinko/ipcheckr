import type { DemoEndpointHandler } from "../types"
import { parseBody, demoResponse } from "./_http"
import { createClass } from "./classes.utils"

export const createClassHandler: DemoEndpointHandler = async ({ config, path, method }) => {
  if (path !== "/api/classes/create-class") return null
  if (method !== "post") return null

  const body = parseBody(config) as { className?: string; teachers?: number[] } | null
  const className = (body?.className ?? "").trim()
  if (!className) return demoResponse(config, { messageEn: "Class name is required" }, 400)

  const classId = await createClass(className, body?.teachers ?? [])

  return demoResponse(config, { classId })
}