import type { AxiosResponse } from "axios"
import type { DemoRouteContext } from "./DemoRouteContext"

export type DemoEndpointHandler = (context: DemoRouteContext) => Promise<AxiosResponse | null>