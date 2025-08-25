import { useState, type FC } from "react"
import { Alert, IconButton, Snackbar } from "@mui/material"
import CloseIcon from "@mui/icons-material/Close"
import type { AlertColor } from "@mui/material"

type CustomAlertState = {
  severity: AlertColor
  message: string
}

interface ICustomAlertProps {
  severity: AlertColor
  message: string
  onClose?: () => void
}

const CustomAlert: FC<ICustomAlertProps> = ({
  severity,
  message,
  onClose,
}) => {
  const [open, setOpen] = useState(true)
  const duration = 4000 // 4 seconds

  const handleClose = (_event?: unknown, reason?: string) => {
    if (reason === "clickaway") return
    setOpen(false)
    onClose?.()
  }

  return (
    <Snackbar
      open={open}
      autoHideDuration={duration}
      onClose={handleClose}
      anchorOrigin={{ vertical: "top", horizontal: "center" }}
    >
      <Alert
        severity={severity}
        variant="filled"
        onClose={handleClose}
        action={
          <IconButton
            aria-label="close"
            size="small"
            onClick={handleClose}
            color="inherit"
          >
            <CloseIcon fontSize="inherit" />
          </IconButton>
        }
        sx={{ alignItems: "center", boxShadow: 3 }}
      >
        {message}
      </Alert>
    </Snackbar>
  )
}

export { CustomAlert, type CustomAlertState }