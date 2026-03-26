import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import App from "./App.tsx"
import { isDemoMode } from "./config/demoMode"
import { initDemoDb } from "./demo/db"

if (isDemoMode) {
  initDemoDb().catch(error => {
    console.error("[DEMO] Failed to initialize demo IndexedDB", error)
  })
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)