import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  FormControlLabel,
  Checkbox,
} from "@mui/material"
import { useTranslation } from "react-i18next"
import { TranslationKey } from "../utils/i18n"

interface IDeleteDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  label?: string
  question: string
  title: string
  checkboxLabel?: string
  checked?: boolean
  setChecked?: (value: boolean) => void
  color? : "primary" | "secondary" | "error" | "info" | "success" | "warning",
  confirmLabel?: string
}

export default function DeleteDialog({
  open,
  onClose,
  onConfirm,
  label,
  question,
  title,
  checkboxLabel,
  checked,
  setChecked,
  color = "error",
  confirmLabel = TranslationKey.DELETE_DIALOG_DELETE,
}: IDeleteDialogProps) {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <Typography>{question}</Typography>
        <Typography color="error" fontWeight="bold" sx={{ mt: 1 }}>
          {label}
        </Typography>
        {checkboxLabel && setChecked && (
          <FormControlLabel control={
            <Checkbox
              checked={checked}
              onChange={() => setChecked(!checked)}
              defaultChecked />
            }
            label={checkboxLabel}
          />
        )}
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
          {t([confirmLabel])}
        </Button>
      </DialogActions>
    </Dialog>
  )
}