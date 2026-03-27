import type { DemoEndpointHandler } from "../../../types/DemoEndpointHandler"
import { parseBody, demoResponse } from "./_http"
import { deleteUsers } from "./users.utils"

export const deleteUsersHandler: DemoEndpointHandler = async ({ config, path, method }) => {
  if (path !== "/api/users/delete-users") return null
  if (method !== "delete") return null

  const body = parseBody(config) as { userIds?: number[] } | null
  const userIds = body?.userIds ?? []

  await deleteUsers(userIds)

  return demoResponse(config, {})
}