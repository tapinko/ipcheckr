import { AssignmentGroupType } from "../../../dtos"
import { readDemoState } from "../../db"
import { demoResponse, parseQueryFromConfig } from "./_http"
import { getGroupVariants, resolveStatus } from "./assignmentGroup.utils"
import type { DemoEndpointHandler } from "../types"

export const getSubnetAssignmentGroupDetailsHandler: DemoEndpointHandler = async ({ config, path, method }) => {
  if (path !== "/api/assignment-group/get-subnet-assignment-group-details") return null
  if (method !== "get") return null

  const state = await readDemoState()
  const query = parseQueryFromConfig(config)
  const id = Number(query.get("Id") ?? "0")
  const assignment = state.assignments.find(item => item.id === id && item.type === AssignmentGroupType.Subnet)
  if (!assignment) return demoResponse(config, { messageEn: "Assignment group not found" }, 400)

  const classObj = state.classes.find(c => c.className === assignment.className)
  const variants = getGroupVariants(state, assignment)
  const submissions = state.submissions.filter(sub => variants.some(v => v.assignmentId === sub.assignmentId))
  const submitted = new Set(submissions.map(s => s.studentUserId)).size
  const total = variants.length
  const successRate = total > 0
    ? variants.reduce((sum, variant) => {
      const sub = submissions.find(s => s.assignmentId === variant.assignmentId)
      return sum + (sub?.score ?? 0)
    }, 0) / total
    : 0

  const assignmentSubmissions = variants.map(variant => {
    const student = state.users.find(u => u.id === variant.studentUserId)
    const submission = submissions.find(sub => sub.assignmentId === variant.assignmentId)
    return {
      assignmentId: variant.assignmentId,
      studentId: variant.studentUserId,
      studentUsername: student?.username ?? "-",
      successRate: submission?.score ?? 0,
      submittedAt: submission?.submittedAt ?? null,
    }
  })

  return demoResponse(config, {
    assignmentGroupId: assignment.id,
    name: assignment.name,
    description: assignment.description,
    classId: classObj?.classId ?? 0,
    className: assignment.className,
    startDate: assignment.startDate,
    deadline: assignment.deadline,
    ipCat: assignment.ipCat,
    status: resolveStatus(assignment.startDate, assignment.deadline, assignment.completedAt ?? null),
    type: AssignmentGroupType.Subnet,
    submitted,
    total,
    successRate: Number.isFinite(successRate) ? successRate : 0,
    assignments: assignmentSubmissions,
  })
}