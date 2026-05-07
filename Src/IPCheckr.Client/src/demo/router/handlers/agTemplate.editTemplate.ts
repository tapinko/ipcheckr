import { readDemoState, writeDemoState } from "../../db"
import { demoResponse, parseBody } from "./_http"
import type { DemoEndpointHandler } from "../../../types/DemoEndpointHandler"
import type { AssignmentGroupType, AssignmentGroupIpCat } from "../../../dtos"

export const editAGTemplateHandler: DemoEndpointHandler = async ({ config, path, method }) => {
  const match = path.match(/^\/api\/ag-template\/edit\/(\d+)$/)
  if (!match) return null
  if (method !== "put") return null

  const id = Number(match[1])

  const body = parseBody<{
    name?: string
    agName?: string | null
    agDescription?: string | null
    type?: AssignmentGroupType
    ipCat?: AssignmentGroupIpCat
    numberOfRecords?: number
    difficulty?: string | null
    hostSortStrategy?: string | null
    possibleOctets?: number | null
    testWildcard?: boolean
    testFirstLastBr?: boolean
  }>(config)

  const state = await readDemoState()
  const existing = state.templates.find(t => t.id === id)
  if (!existing) return demoResponse(config, { messageEn: "Template not found" }, 404)

  const updated = {
    ...existing,
    name: body?.name?.trim() ?? existing.name,
    agName: body?.agName ?? existing.agName,
    agDescription: body?.agDescription ?? existing.agDescription,
    type: body?.type ?? existing.type,
    ipCat: body?.ipCat ?? existing.ipCat,
    numberOfRecords: body?.numberOfRecords ?? existing.numberOfRecords,
    difficulty: body?.difficulty !== undefined ? body.difficulty : existing.difficulty,
    hostSortStrategy: body?.hostSortStrategy !== undefined ? body.hostSortStrategy : existing.hostSortStrategy,
    possibleOctets: body?.possibleOctets !== undefined ? body.possibleOctets : existing.possibleOctets,
    testWildcard: body?.testWildcard !== undefined ? !!body.testWildcard : existing.testWildcard,
    testFirstLastBr: body?.testFirstLastBr !== undefined ? !!body.testFirstLastBr : existing.testFirstLastBr,
  }

  await writeDemoState({
    ...state,
    templates: state.templates.map(t => t.id === id ? updated : t),
  })

  return demoResponse(config, {})
}