import { readDemoState, writeDemoState } from "../../db"
import { demoResponse, parseBody } from "./_http"
import { getGroupVariants } from "./assignmentGroup.utils"
import type { DemoEndpointHandler } from "../../../types/DemoEndpointHandler"

export const deleteIdnetAssignmentGroupsHandler: DemoEndpointHandler = async ({ config, path, method }) => {
  if (path !== "/api/assignment-group/delete-idnet-assignment-groups") return null
  if (method !== "delete") return null

  const body = parseBody<{ assignmentGroupIds?: number[] }>(config)
  const ids = new Set((body?.assignmentGroupIds ?? []).filter(Number.isFinite))
  const state = await readDemoState()
  const deletedVariantIds = state.assignments
    .filter(item => ids.has(item.id))
    .flatMap(group => getGroupVariants(state, group).map(v => v.assignmentId))
  const deletedVariantIdSet = new Set(deletedVariantIds)

  await writeDemoState({
    ...state,
    assignments: state.assignments.filter(item => !ids.has(item.id)),
    submissions: state.submissions.filter(item => !deletedVariantIdSet.has(item.assignmentId)),
  })

  return demoResponse(config, {})
}