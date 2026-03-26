import type { DemoEndpointHandler } from "../types"
import { parseQueryFromConfig, demoResponse } from "./_http"
import { getUsersFiltered } from "./users.utils"

export const getUsersHandler: DemoEndpointHandler = async ({ config, path, method }) => {
  if (path !== "/api/users/get-users") return null
  if (method !== "get") return null

  const query = parseQueryFromConfig(config)
  const username = (query.get("Username") ?? "").trim()
  const roleFilter = query.get("Role")
  const classId = Number(query.get("ClassId") ?? "")
  const className = (query.get("ClassName") ?? "").trim()
  const descending = (query.get("Descending") ?? "false").toLowerCase() === "true"

  const users = await getUsersFiltered(
    username || null,
    roleFilter,
    Number.isFinite(classId) ? classId : null,
    className || null,
    descending,
  )

  return demoResponse(config, { users, totalCount: users.length })
}