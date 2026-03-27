import type { DemoEndpointHandler } from "../../../types/DemoEndpointHandler"
import { parseBody, demoResponse } from "./_http"
import { editClass } from "./classes.utils"

export const editClassHandler: DemoEndpointHandler = async ({ config, path, method }) => {
  if (path !== "/api/classes/edit-class") return null
  if (method !== "put") return null

  const body = parseBody(config) as { id?: number; classname?: string; teachers?: number[] } | null
  const id = Number(body?.id ?? 0)
  if (!id) return demoResponse(config, { messageEn: "Class not found" }, 400)

  const success = await editClass(id, body?.classname || null, body?.teachers || null)
  if (!success) return demoResponse(config, { messageEn: "Class not found" }, 400)

  return demoResponse(config, {})
}