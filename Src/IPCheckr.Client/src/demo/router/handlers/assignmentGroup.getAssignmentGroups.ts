import { AssignmentGroupType } from "../../../dtos"
import { readDemoState, writeDemoState } from "../../db"
import { demoResponse, extractUserIdFromToken, parseQueryFromConfig } from "./_http"
import { makeIdNetAgDto, makeSubnetAgDto } from "./assignmentGroup.utils"
import type { DemoEndpointHandler } from "../../../types/DemoEndpointHandler"
import UserRole from "../../../types/UserRole"

const ARCHIVE_THRESHOLD_DAYS = 7

export const getAssignmentGroupsHandler: DemoEndpointHandler = async ({ config, path, method }) => {
  if (path !== "/api/assignment-group/get-assignment-groups") return null
  if (method !== "get") return null

  const state = await readDemoState()
  const query = parseQueryFromConfig(config)
  const name = (query.get("Name") ?? "").trim().toLowerCase()
  const classId = Number(query.get("ClassId") ?? "")
  const teacherId = Number(query.get("TeacherId") ?? "")
  const status = query.get("Status")
  const type = query.get("AssignmentGroupType")
  const isArchivedParam = query.get("IsArchived")
  const isArchived = isArchivedParam === "true"

  const callerId = extractUserIdFromToken(config)
  const caller = callerId !== null ? state.users.find(u => u.id === callerId) : null

  const thresholdMs = Date.now() - ARCHIVE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000

  // Auto-archive overdue groups
  let stateChanged = false
  const updatedAssignments = state.assignments.map(ag => {
    if (!ag.isArchived && new Date(ag.deadline).getTime() < thresholdMs) {
      stateChanged = true
      return { ...ag, isArchived: true }
    }
    return ag
  })

  if (stateChanged) {
    await writeDemoState({ ...state, assignments: updatedAssignments })
  }

  const assignments = stateChanged ? updatedAssignments : state.assignments

  const assignmentGroups = assignments
    .filter(ag => {
      // Students see only their own groups
      if (caller?.role === UserRole.STUDENT) {
        return ag.studentAssignments?.some(sa => sa.studentUserId === callerId) ?? false
      }
      // Teachers see groups in their classes
      if (caller?.role === UserRole.TEACHER) {
        const classObj = state.classes.find(c => c.className === ag.className)
        return classObj?.teachers.includes(callerId!) ?? false
      }
      return true
    })
    .filter(ag => ag.isArchived === isArchived)
    .filter(ag => (name ? ag.name.toLowerCase().includes(name) : true))
    .filter(ag => (Number.isFinite(classId) && classId > 0 ? state.classes.find(c => c.className === ag.className)?.classId === classId : true))
    .filter(ag => (Number.isFinite(teacherId) && teacherId > 0 ? state.classes.find(c => c.className === ag.className)?.teachers.includes(teacherId) ?? false : true))
    .filter(ag => (type ? ag.type === type : true))
    .map(ag => ag.type === AssignmentGroupType.Subnet
      ? makeSubnetAgDto(state, ag)
      : makeIdNetAgDto(state, ag)
    )
    .filter(ag => (status ? ag.status === status : true))

  return demoResponse(config, { assignmentGroups, totalCount: assignmentGroups.length })
}