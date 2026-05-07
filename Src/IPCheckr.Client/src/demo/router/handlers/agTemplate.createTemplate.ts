import { readDemoState, writeDemoState } from "../../db"
import { demoResponse, parseBody } from "./_http"
import type { DemoEndpointHandler } from "../../../types/DemoEndpointHandler"
import type { AssignmentGroupType, AssignmentGroupIpCat } from "../../../dtos"

export const createAGTemplateHandler: DemoEndpointHandler = async ({ config, path, method }) => {
  if (path !== "/api/ag-template/create") return null
  if (method !== "post") return null

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

  if (!body?.name?.trim()) return demoResponse(config, { messageEn: "Name is required" }, 400)

  const state = await readDemoState()
  const id = Math.max(0, ...state.templates.map(t => t.id)) + 1

  const template = {
    id,
    name: body.name.trim(),
    agName: body.agName ?? null,
    agDescription: body.agDescription ?? null,
    type: body.type!,
    ipCat: body.ipCat!,
    numberOfRecords: body.numberOfRecords ?? 6,
    difficulty: body.difficulty ?? null,
    hostSortStrategy: body.hostSortStrategy ?? null,
    possibleOctets: body.possibleOctets ?? null,
    testWildcard: !!body.testWildcard,
    testFirstLastBr: !!body.testFirstLastBr,
  }

  await writeDemoState({ ...state, templates: [...state.templates, template] })

  return demoResponse(config, { id })
}