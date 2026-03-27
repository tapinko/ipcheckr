import type { DemoEndpointHandler } from "../../../types/DemoEndpointHandler"
import { parseQueryFromConfig, demoResponse } from "./_http"
import { buildTeacherDashboard } from "./dashboard.utils"

export const getTeacherDashboardHandler: DemoEndpointHandler = async ({ config, path, method }) => {
  if (path !== "/api/dashboard/get-teacher-dashboard") return null
  if (method !== "get") return null

  const query = parseQueryFromConfig(config)
  const barChartLength = Number(query.get("BarChartLength") ?? "5")
  const validLength = Number.isFinite(barChartLength) ? barChartLength : 5

  const dashboard = await buildTeacherDashboard(validLength)
  return demoResponse(config, dashboard)
}