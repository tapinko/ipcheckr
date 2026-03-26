import { AssignmentGroupType } from "../../../dtos"
import UserRole from "../../../types/UserRole"
import type { DemoEndpointHandler } from "../types"
import { parseQueryFromConfig, demoResponse, resolveUser } from "./_http"
import { readDemoState } from "../../db"
import { resolveStatus } from "./assignmentGroup.utils"
import { findVariantAndGroup } from "./assignment.utils"
import { AssignmentGroupStatus } from "../../../dtos"

export const getIdnetDataForSubmitHandler: DemoEndpointHandler = async ({ config, role, path, method }) => {
  if (path !== "/api/assignment/get-idnet-assignment-data-for-submit") return null
  if (method !== "get") return null

  const currentUser = resolveUser(role)
  const query = parseQueryFromConfig(config)
  const assignmentId = Number(query.get("AssignmentId") ?? "0")
  const state = await readDemoState()
  const found = findVariantAndGroup(state, assignmentId)
  if (!found || found.group.type !== AssignmentGroupType.Idnet) return demoResponse(config, { messageEn: "Assignment not found" }, 400)
  const { group, variant } = found

  if (currentUser?.role === UserRole.STUDENT && currentUser.id !== variant.studentUserId) {
    return demoResponse(config, { messageEn: "Forbidden" }, 403)
  }

  const hasSubmit = state.submissions.some((s: any) => s.assignmentId === assignmentId)
  const isAvailable = resolveStatus(group.startDate, group.deadline, group.completedAt ?? null) === AssignmentGroupStatus.InProgress && !hasSubmit

  return demoResponse(config, {
    assignmentName: group.name,
    teacherUsername: group.teacherUsername,
    className: group.className,
    deadline: group.deadline,
    cidr: variant.rows[0]?.idNet ?? "-",
    testWildcard: group.testWildcard,
    testFirstLastBr: group.testFirstLastBr,
    addresses: variant.addresses ?? variant.rows.map((row: any) => row.address ?? ""),
    isAvailableForSubmission: isAvailable,
  })
}