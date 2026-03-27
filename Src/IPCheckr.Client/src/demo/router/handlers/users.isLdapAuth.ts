import type { DemoEndpointHandler } from "../../../types/DemoEndpointHandler"
import { demoResponse } from "./_http"

export const isLdapAuthHandler: DemoEndpointHandler = async ({ config, path, method }) => {
  if (path !== "/api/users/is-ldap-auth") return null
  if (method !== "get") return null
  return demoResponse(config, { isLdapAuth: false })
}