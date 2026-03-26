import { AssignmentGroupType } from "../../../dtos"
import type { DemoEndpointHandler } from "../types"
import { parseBody, demoResponse, resolveUser } from "./_http"
import { readDemoState, writeDemoState, type DemoSubmission } from "../../db"
import { resolveStatus, getGroupVariants } from "./assignmentGroup.utils"
import { findVariantAndGroup, computeIdNetSubmissionScore } from "./assignment.utils"
import { AssignmentGroupStatus } from "../../../dtos"

export const submitIdnetAssignmentHandler: DemoEndpointHandler = async ({ config, role, path, method }) => {
  if (path !== "/api/assignment/submit-idnet-assignment") return null
  if (method !== "post") return null

  const currentUser = resolveUser(role)
  const body = parseBody(config) as {
    assignmentId?: number
    data?: Array<{
      idNet?: string
      wildcard?: string
      firstUsable?: string
      lastUsable?: string
      broadcast?: string
    }>
  } | null

  const assignmentId = Number(body?.assignmentId ?? 0)
  if (!assignmentId || !currentUser?.id) {
    return demoResponse(config, { messageEn: "Invalid submit payload" }, 400)
  }

  const state = await readDemoState()
  const found = findVariantAndGroup(state, assignmentId)
  if (!found || found.group.type !== AssignmentGroupType.Idnet) return demoResponse(config, { messageEn: "Assignment not found" }, 400)
  const { group, variant } = found

  if (variant.studentUserId !== currentUser.id) return demoResponse(config, { messageEn: "Forbidden" }, 403)
  if (state.submissions.some(item => item.assignmentId === assignmentId)) {
    return demoResponse(config, { messageEn: "Assignment has already been submitted" }, 403)
  }
  if (resolveStatus(group.startDate, group.deadline, group.completedAt ?? null) !== AssignmentGroupStatus.InProgress) {
    return demoResponse(config, { messageEn: "Assignment is not available for submission" }, 403)
  }

  const rows = body?.data ?? []
  const score = computeIdNetSubmissionScore(variant.rows, rows, group.testWildcard, group.testFirstLastBr)

  const submission: DemoSubmission = {
    id: Date.now(),
    assignmentId,
    studentUserId: currentUser.id,
    rows,
    score,
    submittedAt: new Date().toISOString(),
  }

  const nextSubmissions = [submission, ...state.submissions]

  const assignmentGroupIds = getGroupVariants(state, group).map(v => v.assignmentId)
  const submittedCount = new Set(nextSubmissions.filter(s => assignmentGroupIds.includes(s.assignmentId)).map(s => s.studentUserId)).size
  const shouldComplete = assignmentGroupIds.length > 0 && submittedCount >= assignmentGroupIds.length

  await writeDemoState({
    ...state,
    assignments: state.assignments.map(item =>
      item.id === group.id ? { ...item, completedAt: shouldComplete ? new Date().toISOString() : item.completedAt ?? null } : item,
    ),
    submissions: nextSubmissions,
  })

  return demoResponse(config, {
    assignmentSubmitId: submission.id,
    score,
  })
}