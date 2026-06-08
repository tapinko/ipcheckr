import { Controller, type Control, type FieldError } from "react-hook-form"
import { Button, Stack, TextField } from "@mui/material"

// eslint-disable-next-line react-refresh/only-export-components
export const toLocalDateTimeString = (date: Date): string => {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const QUICK_DURATIONS_MINUTES = [5, 10, 15, 20]

type AGDateColumnLabels = {
  startDate: string
  deadline: string
}

type Props = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any>
  startDateError?: FieldError
  deadlineError?: FieldError
  onApplyQuickDuration: (minutes: number) => void
  labels: AGDateColumnLabels
}

const AGDateColumn = ({ control, startDateError, deadlineError, onApplyQuickDuration, labels }: Props) => (
  <Stack spacing={2} sx={{ flex: 1, minWidth: 0 }}>
    <Controller
      name="startDate"
      control={control}
      rules={{ required: true }}
      render={({ field }) => (
        <TextField
          label={labels.startDate}
          type="datetime-local"
          fullWidth
          slotProps={{ inputLabel: { shrink: true } }}
          {...field}
          error={!!startDateError}
        />
      )}
    />
    <Controller
      name="deadline"
      control={control}
      rules={{ required: true }}
      render={({ field }) => (
        <TextField
          label={labels.deadline}
          type="datetime-local"
          fullWidth
          slotProps={{ inputLabel: { shrink: true } }}
          {...field}
          error={!!deadlineError}
        />
      )}
    />
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
      {QUICK_DURATIONS_MINUTES.map(min => (
        <Button
          key={min}
          size="small"
          variant="outlined"
          onClick={() => onApplyQuickDuration(min)}
        >
          {min < 60 ? `${min}m` : `${min / 60}h`}
        </Button>
      ))}
    </Stack>
  </Stack>
)

export default AGDateColumn