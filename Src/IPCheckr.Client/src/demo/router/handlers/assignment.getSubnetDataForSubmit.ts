import { AssignmentGroupType } from "../../../dtos"
import UserRole from "../../../types/UserRole"
import type { DemoEndpointHandler } from "../types"
import { parseQueryFromConfig, demoResponse, resolveUser } from "./_http"
import { readDemoState } from "../../db"
import { resolveStatus } from "./assignmentGroup.utils"
import { findVariantAndGroup } from "./assignment.utils"
import { AssignmentGroupStatus } from "../../../dtos"

export const getSubnetDataForSubmitHandler: DemoEndpointHandler = async ({ config, role, path, method }) => {
  if (path !== "/api/assignment/get-subnet-assignment-data-for-submit") return null
  if (method !== "get") return null

  const currentUser = resolveUser(role)
  const query = parseQueryFromConfig(config)
  const assignmentId = Number(query.get("AssignmentId") ?? "0")
  const state = await readDemoState()
  const found = findVariantAndGroup(state, assignmentId)
  if (!found || found.group.type !== AssignmentGroupType.Subnet) return demoResponse(config, { messageEn: "Assignment not found" }, 400)
  const { group, variant } = found

  if (currentUser?.role === UserRole.STUDENT && currentUser.id !== variant.studentUserId) {
    return demoResponse(config, { messageEn: "Forbidden" }, 403)
  }

  const hasSubmit = state.submissions.some((s: any) => s.assignmentId === assignmentId)
  const firstNetwork = variant.rows[0]?.network ?? variant.cidr ?? "-"
  const isAvailable = resolveStatus(group.startDate, group.deadline, group.completedAt ?? null) === AssignmentGroupStatus.InProgress && !hasSubmit

  return demoResponse(config, {
    assignmentName: group.name,
    teacherUsername: group.teacherUsername,
    className: group.className,
    deadline: group.deadline,
    hostsPerNetwork: variant.hosts ?? variant.rows.map((row: any) => row.hosts ?? 0),
    cidr: firstNetwork,
    isAvailableForSubmission: isAvailable,
  })
}