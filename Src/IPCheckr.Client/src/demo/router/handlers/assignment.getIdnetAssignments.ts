import { AssignmentGroupType } from "../../../dtos"
import type { DemoEndpointHandler } from "../types"
import { parseQueryFromConfig, demoResponse, resolveUser } from "./_http"
import { buildAssignmentRowsByType } from "./assignment.utils"

export const getIdnetAssignmentsHandler: DemoEndpointHandler = async ({ config, role, path, method }) => {
  if (path !== "/api/assignment/get-idnet-assignments") return null
  if (method !== "get") return null

  const currentUser = resolveUser(role)
  const query = parseQueryFromConfig(config)
  const studentId = Number(query.get("StudentId") ?? currentUser?.id ?? 0)
  const assignments = await buildAssignmentRowsByType(AssignmentGroupType.Idnet, Number.isFinite(studentId) ? studentId : null)

  return demoResponse(config, { assignments })
}