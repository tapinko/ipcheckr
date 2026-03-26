import type { DemoEndpointHandler } from "../types"
import { parseBody, demoResponse } from "./_http"
import { editUser } from "./users.utils"

export const editUserHandler: DemoEndpointHandler = async ({ config, path, method }) => {
  if (path !== "/api/users/edit-user") return null
  if (method !== "put") return null

  const body = parseBody(config) as {
    id?: number
    username?: string
    password?: string
    classIds?: number[]
  } | null

  const id = Number(body?.id ?? 0)
  if (!id) return demoResponse(config, { messageEn: "User not found" }, 400)

  const success = await editUser(
    id,
    body?.username || null,
    body?.password || null,
    body?.classIds || null,
  )
  if (!success) return demoResponse(config, { messageEn: "User not found" }, 400)

  return demoResponse(config, {})
}