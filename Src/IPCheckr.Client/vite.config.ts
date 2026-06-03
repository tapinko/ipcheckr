import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import packageJson from "./package.json"

// https://vite.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
    __GIT_REPO_URL__: JSON.stringify("https://github.com/tapinko/ipcheckr"),
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
          return "vendor"
        },
      },
    },
  },
})
