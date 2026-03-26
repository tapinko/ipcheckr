import { AppBar, IconButton, Toolbar, Tooltip, Typography } from "@mui/material"
import { isDemoMode } from "../config/demoMode"
import { resetDemoState } from "../demo/db"
import { Refresh } from "@mui/icons-material"

const Footer = () => {
  const handleDemoReset = async () => {
    try {
      await resetDemoState()
    } catch (error) {
      console.error("Failed to reset demo state:", error)
    }
  }

  const versionDisplay = isDemoMode ? `${__APP_VERSION__}-demo` : __APP_VERSION__

  return (
    <AppBar component="footer" position="static" color="primary">
      <Toolbar sx={{ justifyContent: "center", minHeight: "48px !important", gap: 2 }}>
        <Typography variant="body2" color="inherit">
          Patrik Tapušík • v{versionDisplay}
        </Typography>

        {isDemoMode && (
          <Tooltip title="Reset demo session">
            <IconButton
              size="small"
              color="inherit"
              onClick={handleDemoReset}
              aria-label="Reset demo session"
            >
              <Refresh fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Toolbar>
    </AppBar>
  )
}

export default Footer