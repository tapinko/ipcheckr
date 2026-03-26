import { AssignmentGroupType } from "../../../dtos"
import { readDemoState } from "../../db"
import { demoResponse, parseQueryFromConfig } from "./_http"
import { makeIdNetAgDto } from "./assignmentGroup.utils"
import type { DemoEndpointHandler } from "../types"

export const getIdnetAssignmentGroupsHandler: DemoEndpointHandler = async ({ config, path, method }) => {
  if (path !== "/api/assignment-group/get-idnet-assignment-groups") return null
  if (method !== "get") return null

  const state = await readDemoState()
  const query = parseQueryFromConfig(config)
  const name = (query.get("Name") ?? "").trim().toLowerCase()
  const classId = Number(query.get("ClassId") ?? "")
  const status = query.get("Status")

  const assignmentGroups = state.assignments
    .filter(item => item.type === AssignmentGroupType.Idnet)
    .map(item => makeIdNetAgDto(state, item))
    .filter(item => (name ? item.name.toLowerCase().includes(name) : true))
    .filter(item => (Number.isFinite(classId) && classId > 0 ? item.classId === classId : true))
    .filter(item => (status ? item.status === status : true))

  return demoResponse(config, { assignmentGroups, totalCount: assignmentGroups.length })
}