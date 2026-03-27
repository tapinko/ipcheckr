import { AssignmentGroupType } from "../../../dtos"
import { readDemoState, writeDemoState } from "../../db"
import { demoResponse, parseBody } from "./_http"
import type { DemoEndpointHandler } from "../../../types/DemoEndpointHandler"

export const editIdnetAssignmentGroupHandler: DemoEndpointHandler = async ({ config, path, method }) => {
  if (path !== "/api/assignment-group/edit-idnet-assignment-group") return null
  if (method !== "put") return null

  const body = parseBody<{
    id?: number
    name?: string
    description?: string
    startDate?: string
    deadline?: string
  }>(config)

  const id = Number(body?.id ?? 0)
  const state = await readDemoState()
  const idx = state.assignments.findIndex(item => item.id === id && item.type === AssignmentGroupType.Idnet)
  if (idx < 0) return demoResponse(config, { messageEn: "Assignment group not found" }, 400)

  const updated = {
    ...state.assignments[idx],
    name: body?.name ?? state.assignments[idx].name,
    description: body?.description ?? state.assignments[idx].description,
    startDate: body?.startDate ?? state.assignments[idx].startDate,
    deadline: body?.deadline ?? state.assignments[idx].deadline,
  }

  const assignments = [...state.assignments]
  assignments[idx] = updated
  await writeDemoState({ ...state, assignments })
  return demoResponse(config, {})
}