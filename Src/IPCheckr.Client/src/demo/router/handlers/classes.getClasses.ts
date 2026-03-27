import type { DemoEndpointHandler } from "../../../types/DemoEndpointHandler"
import { parseQueryFromConfig, demoResponse } from "./_http"
import { getClassesFiltered } from "./classes.utils"

export const getClassesHandler: DemoEndpointHandler = async ({ config, path, method }) => {
  if (path !== "/api/classes/get-classes") return null
  if (method !== "get") return null

  const query = parseQueryFromConfig(config)
  const classId = Number(query.get("ClassId") ?? "")
  const className = (query.get("ClassName") ?? "").trim()
  const teacherId = Number(query.get("TeacherId") ?? "")

  const classes = await getClassesFiltered(
    Number.isFinite(classId) ? classId : null,
    className || null,
    Number.isFinite(teacherId) ? teacherId : null,
  )

  return demoResponse(config, { classes, totalCount: classes.length })
}