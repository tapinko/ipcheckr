import type { DemoEndpointHandler } from "../../../types/DemoEndpointHandler"
import { parseQueryFromConfig, demoResponse } from "./_http"
import { buildIdNetDetails } from "./assignment.utils"

export const getIdnetSubmitDetailsFullHandler: DemoEndpointHandler = async ({ config, path, method }) => {
  if (path !== "/api/assignment/get-idnet-assignment-submit-details-full") return null
  if (method !== "get") return null

  const query = parseQueryFromConfig(config)
  const assignmentId = Number(query.get("AssignmentId") ?? "0")
  if (!assignmentId) return demoResponse(config, { messageEn: "Assignment not found" }, 400)

  const details = await buildIdNetDetails(assignmentId)
  if (!details) return demoResponse(config, { messageEn: "Assignment not found" }, 400)
  return demoResponse(config, details)
}