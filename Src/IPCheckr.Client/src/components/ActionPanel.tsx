import {
  Box,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Typography,
  useMediaQuery
} from "@mui/material"
import MoreVertIcon from "@mui/icons-material/MoreVert"
import { useTranslation } from "react-i18next"
import { TranslationKey } from "../utils/i18n"
import { useTheme } from "@mui/material/styles"
import { useState, type MouseEvent, type ReactNode } from "react"

interface IActionPanelProps {
  onAdd?: () => void
  onEdit?: () => void
  onDetails?: () => void
  onDelete?: () => void
  disableAdd?: boolean
  disableEdit?: boolean
  disableDetails?: boolean
  disableDelete?: boolean
  showDetails?: boolean
  title?: ReactNode
  addLabel?: string
  children?: ReactNode
  customActions?: ReactNode
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
  children,
  customActions,
}: IActionPanelProps) => {
  const { t } = useTranslation()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"))
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null)
  const addLabelText = addLabel ?? ""

  const openMenu = (event: MouseEvent<HTMLButtonElement>) => {
    setMenuAnchor(event.currentTarget)
  }

  const closeMenu = () => setMenuAnchor(null)

  const handleEdit = () => {
    if (disableEdit) return
    closeMenu()
    onEdit?.()
  }

  const handleDelete = () => {
    if (disableDelete) return
    closeMenu()
    onDelete?.()
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: { xs: "column", md: "row" },
        justifyContent: "space-between",
        alignItems: { xs: "flex-start", md: "center" },
        gap: 2,
        mb: 2,
        width: "100%"
      }}
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1, flex: 1, width: "100%" }}>
        {title ? <Typography variant="h5">{title}</Typography> : null}
        {children ? <Box>{children}</Box> : null}
      </Box>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: isMobile ? "space-between" : "flex-end",
          gap: 1,
          width: { xs: "100%", md: "auto" }
        }}
      >
        {customActions ? (
          <Box sx={{ width: isMobile ? "100%" : "auto", display: "flex", gap: 1, justifyContent: "flex-end" }}>
            {customActions}
          </Box>
        ) : (
          <>
            <Button
              variant="contained"
              color="success"
              onClick={onAdd}
              disabled={disableAdd}
              fullWidth={isMobile}
            >
              {addLabelText}
            </Button>
            {isMobile ? (
              <>
                {showDetails && (
                  <Button
                    variant="contained"
                    color="info"
                    onClick={onDetails}
                    disabled={disableDetails}
                    fullWidth
                  >
                    {t(TranslationKey.ACTION_PANEL_DETAILS)}
                  </Button>
                )}
                <IconButton
                  aria-label="more"
                  onClick={openMenu}
                  disabled={disableEdit && disableDelete}
                  sx={{ alignSelf: "stretch" }}
                >
                  <MoreVertIcon />
                </IconButton>
                <Menu
                  anchorEl={menuAnchor}
                  open={Boolean(menuAnchor)}
                  onClose={closeMenu}
                  anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                  transformOrigin={{ vertical: "top", horizontal: "right" }}
                >
                  <MenuItem onClick={handleEdit} disabled={disableEdit}>
                    {t(TranslationKey.ACTION_PANEL_EDIT)}
                  </MenuItem>
                  <MenuItem onClick={handleDelete} disabled={disableDelete}>
                    {t(TranslationKey.ACTION_PANEL_DELETE)}
                  </MenuItem>
                </Menu>
              </>
            ) : (
              <>
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
              </>
            )}
          </>
        )}
      </Box>
    </Box>
  )
}

export default ActionPanel