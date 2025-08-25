const getApiBase = () => {
  const runtime = (window as any).__RUNTIME_CONFIG__?.API_BASE_URL
  if (runtime) return runtime.replace(/\/+$/, "")

  const env = import.meta.env.VITE_API_BASE_URL
  if (env) return env.replace(/\/+$/, "")

  return window.location.origin
}

export default getApiBase