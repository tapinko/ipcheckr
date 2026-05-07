import { readDemoState } from "../../db"
import { demoResponse } from "./_http"
import type { DemoEndpointHandler } from "../../../types/DemoEndpointHandler"

export const queryAGTemplatesHandler: DemoEndpointHandler = async ({ config, path, method }) => {
  if (path !== "/api/ag-template/query") return null
  if (method !== "get") return null

  const state = await readDemoState()

  const templates = state.templates.map(t => ({
    id: t.id,
    name: t.name,
    agName: t.agName,
    agDescription: t.agDescription,
    type: t.type,
    ipCat: t.ipCat,
    numberOfRecords: t.numberOfRecords,
    difficulty: t.difficulty,
    hostSortStrategy: t.hostSortStrategy,
    possibleOctets: t.possibleOctets,
    testWildcard: t.testWildcard,
    testFirstLastBr: t.testFirstLastBr,
  }))

  return demoResponse(config, { templates })
}