import { Box, Button, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"
import { TranslationKey } from "../utils/i18n"
import type { ReactNode } from "react"

interface IActionPanelProps {
  onAdd: () => void
  onEdit: () => void
  onDetails: () => void
  onDelete: () => void
  disableAdd?: boolean
  disableEdit?: boolean
  disableDetails?: boolean
  disableDelete?: boolean
  showDetails?: boolean
  title?: ReactNode
  addLabel: string
  children?: ReactNode
}

const ActionPanel = ({
  onAdd,
  onEdit,
  onDetails,
  onDelete,
  disableAdd = false,
  disableEdit = false,
  disableDetails = false,
  disableDelete = false,
  showDetails = true,
  title,
  addLabel,
  children
}: IActionPanelProps) => {
  const { t } = useTranslation()

  return (
  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
    {title ? <Typography variant="h5">{title}</Typography> : null}
    {children ? children : null}
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <Button
        variant="contained"
        color="success"
        onClick={onAdd}
        disabled={disableAdd}
      >
      {addLabel}
      </Button>
      <Button
        variant="contained"
        color="info"
        onClick={onEdit}
        disabled={disableEdit}
      >
      {t(TranslationKey.ACTION_PANEL_EDIT)}
      </Button>
      {showDetails && (
        <Button
          variant="contained"
          color="info"
          onClick={onDetails}
          disabled={disableDetails}
        >
        {t(TranslationKey.ACTION_PANEL_DETAILS)}
        </Button>
      )}
      <Button
        variant="contained"
        color="error"
        onClick={onDelete}
        disabled={disableDelete}
      >
      {t(TranslationKey.ACTION_PANEL_DELETE)}
      </Button>
    </Box>
  </Box>
  )
}

export default ActionPanel