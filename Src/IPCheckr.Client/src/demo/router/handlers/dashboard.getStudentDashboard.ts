import type { DemoEndpointHandler } from "../types"
import { demoResponse } from "./_http"
import { buildStudentDashboard } from "./dashboard.utils"

export const getStudentDashboardHandler: DemoEndpointHandler = async ({ config, role, path, method }) => {
  if (path !== "/api/dashboard/get-student-dashboard") return null
  if (method !== "get") return null

  const dashboard = await buildStudentDashboard(role)
  return demoResponse(config, dashboard)
}