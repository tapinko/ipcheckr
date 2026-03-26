import type { DemoEndpointHandler } from "../types"
import { parseBody, demoResponse } from "./_http"
import { deleteClasses } from "./classes.utils"

export const deleteClassesHandler: DemoEndpointHandler = async ({ config, path, method }) => {
  if (path !== "/api/classes/delete-classes") return null
  if (method !== "delete") return null

  const body = parseBody(config) as { classIds?: number[] } | null
  const classIds = body?.classIds ?? []

  await deleteClasses(classIds)

  return demoResponse(config, {})
}