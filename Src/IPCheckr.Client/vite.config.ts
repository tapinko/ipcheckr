import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import packageJson from "./package.json"

// https://vite.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version)
  },
  plugins: [react()],
  logLevel: "info",
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined
          if (id.includes("@mui/x-")) return "vendor-mui-x"
          if (id.includes("@mui/icons-material")) return "vendor-mui-icons"
          if (id.includes("@mui/") || id.includes("@emotion/")) return "vendor-mui"
          if (id.includes("@microsoft/signalr")) return "vendor-signalr"
          if (
            id.includes("/react/") ||
            id.includes("/react-dom/") ||
            id.includes("react-router") ||
            id.includes("react-hook-form") ||
            id.includes("react-i18next") ||
            id.includes("scheduler")
          )
            return "vendor-react"
          return "vendor"
        },
      },
    },
  },
})
