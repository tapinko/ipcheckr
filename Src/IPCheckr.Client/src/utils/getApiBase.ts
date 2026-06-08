const getApiBase = () => {
  const runtimeConfig = (window as unknown as Record<string, unknown>).__RUNTIME_CONFIG__ as Record<string, string> | undefined
  const runtimeApiBase = runtimeConfig?.API_BASE_URL
  if (runtimeApiBase) return runtimeApiBase.replace(/\/+$/, "")

  const env = import.meta.env.VITE_API_BASE_URL
  if (env) return env.replace(/\/+$/, "")

  return window.location.origin
}

export default getApiBase