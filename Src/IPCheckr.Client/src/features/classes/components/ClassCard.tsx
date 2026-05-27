import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline"
import EditOutlinedIcon from "@mui/icons-material/EditOutlined"
import Groups from "@mui/icons-material/Groups"
import Person from "@mui/icons-material/Person"
import {
  Box,
  Card,
  Checkbox,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material"
import { useTranslation } from "react-i18next"
import { TranslationKey } from "../../../utils/i18n"

type ClassCardProps = {
  classId: number
  className: string
  teacherUsernames: string[]
  studentCount: number
  selected: boolean
  onSelect: (id: number) => void
  onEdit: (id: number) => void
  onDelete: (id: number) => void
  onClick: (id: number) => void
}

const ClassCard = ({
  classId,
  className,
  teacherUsernames,
  studentCount,
  selected,
  onSelect,
  onEdit,
  onDelete,
  onClick,
}: ClassCardProps) => {
  const { t } = useTranslation()

  return (
    <Card
      variant="outlined"
      onClick={() => onClick(classId)}
      sx={{
        borderRadius: 1,
        display: "flex",
        flexDirection: "column",
        borderColor: theme => selected ? theme.palette.primary.main : theme.palette.divider,
        transition: "border-color 0.15s",
        cursor: "pointer",
        "&:hover .class-name": { textDecoration: "underline" },
      }}
    >

      <Box sx={{ display: "flex", alignItems: "center", px: 0.5, py: 0.5, borderBottom: "1px solid", borderColor: "divider" }}>
        <Checkbox
          size="small"
          checked={selected}
          onChange={() => onSelect(classId)}
          onClick={e => e.stopPropagation()}
          sx={{ flexShrink: 0 }}
        />
        <Typography
          className="class-name"
          fontWeight={600}
          sx={{ px: 1, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
        >
          {className}
        </Typography>
        <Stack direction="row" onClick={e => e.stopPropagation()} sx={{ flexShrink: 0 }}>
          <Tooltip title={t(TranslationKey.ADMIN_CLASSES_EDIT_CLASS)}>
            <IconButton size="small" onClick={() => onEdit(classId)}>
              <EditOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={t(TranslationKey.ADMIN_CLASSES_DELETE_CONFIRMATION_TITLE)}>
            <IconButton size="small" onClick={() => onDelete(classId)}>
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>


      <Box sx={{ px: 2, py: 1.5, flex: 1 }}>
        <Stack direction="row" alignItems="center" spacing={0.75}>
          <Groups fontSize="small" sx={{ color: "text.secondary" }} />
          <Typography variant="h5" fontWeight={700} lineHeight={1}>
            {studentCount}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t(TranslationKey.ADMIN_CLASSES_STUDENTS)}
          </Typography>
        </Stack>
        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 1.5 }}>
          <Person fontSize="small" sx={{ color: "text.disabled", flexShrink: 0 }} />
          <Typography variant="body2" noWrap>
            {teacherUsernames.length > 0
              ? teacherUsernames.join(", ")
              : t(TranslationKey.ADMIN_CLASSES_NO_TEACHERS)}
          </Typography>
        </Stack>
      </Box>
    </Card>
  )
}

export default ClassCard