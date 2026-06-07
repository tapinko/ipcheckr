import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from "@mui/material"
import { useTranslation } from "react-i18next"
import { TranslationKey } from "../../utils/i18n"
import type { ButtonOwnProps } from "@mui/material"

interface ICustomDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  question: string
  confirmLabel: string
  color?: ButtonOwnProps["color"]
}

export default function CustomDialog({
  open,
  onClose,
  onConfirm,
  title,
  question,
  confirmLabel,
  color = "primary",
}: ICustomDialogProps) {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Typography>{question}</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>
          {t(TranslationKey.DELETE_DIALOG_CANCEL)}
        </Button>
        <Button
          onClick={() => {
            onConfirm()
            onClose()
          }}
          color={color}
          variant="contained"
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  )
}