import { Chip, Stack } from "@mui/material"
import type { ClassDto } from "../../dtos"

type Props = {
  classes: ClassDto[]
  selectedClassId: number | null
  onChange: (classId: number) => void
}

const AGClassSelector = ({ classes, selectedClassId, onChange }: Props) => (
  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
    {classes.map(cls => (
      <Chip
        key={cls.classId}
        label={cls.className}
        variant={selectedClassId === cls.classId ? "filled" : "outlined"}
        color={selectedClassId === cls.classId ? "primary" : "default"}
        onClick={() => onChange(cls.classId)}
        clickable
        sx={{ fontSize: "0.9rem", height: 36, px: 1 }}
      />
    ))}
  </Stack>
)

export default AGClassSelector