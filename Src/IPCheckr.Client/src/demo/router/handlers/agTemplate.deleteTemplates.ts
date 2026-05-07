import { readDemoState, writeDemoState } from "../../db"
import { demoResponse, parseBody } from "./_http"
import type { DemoEndpointHandler } from "../../../types/DemoEndpointHandler"

export const deleteAGTemplatesHandler: DemoEndpointHandler = async ({ config, path, method }) => {
  if (path !== "/api/ag-template/delete") return null
  if (method !== "delete") return null

  const body = parseBody<{ templateIds?: number[] }>(config)
  const ids = new Set(body?.templateIds ?? [])

  const state = await readDemoState()
  await writeDemoState({ ...state, templates: state.templates.filter(t => !ids.has(t.id)) })

  return demoResponse(config, {})
}