import { AssignmentGroupType } from "../../../dtos"
import type { DemoEndpointHandler } from "../../../types/DemoEndpointHandler"
import { parseQueryFromConfig, demoResponse, extractUserIdFromToken } from "./_http"
import { buildAssignmentRowsByType } from "./assignment.utils"

export const getIdnetAssignmentsHandler: DemoEndpointHandler = async ({ config, path, method }) => {
  if (path !== "/api/assignment/get-idnet-assignments") return null
  if (method !== "get") return null

  const query = parseQueryFromConfig(config)
  const queryStudentId = Number(query.get("StudentId") ?? "0")
  const tokenUserId = extractUserIdFromToken(config)
  const studentId = tokenUserId ?? (queryStudentId > 0 ? queryStudentId : 0)
  const assignments = await buildAssignmentRowsByType(AssignmentGroupType.Idnet, Number.isFinite(studentId) ? studentId : null)

  return demoResponse(config, { assignments })
}