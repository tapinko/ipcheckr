import type { DemoEndpointHandler } from "../../../types/DemoEndpointHandler"
import { parseBody, demoResponse } from "./_http"
import { addUser } from "./users.utils"

export const addUserHandler: DemoEndpointHandler = async ({ config, path, method }) => {
  if (path !== "/api/users/add-user") return null
  if (method !== "post") return null

  const body = parseBody(config) as {
    username?: string
    password?: string
    role?: string
    classIds?: number[] | null
  } | null

  const username = (body?.username ?? "").trim()
  if (!username) return demoResponse(config, { messageEn: "Username is required" }, 400)

  const result = await addUser(username, body?.password ?? null, body?.role ?? "STUDENT", body?.classIds ?? null)
  if (!result.success) {
    return demoResponse(config, { messageEn: result.error }, 400)
  }

  return demoResponse(config, { id: result.id })
}