import { Controller, type Control, type FieldError } from "react-hook-form"
import {
  Box,
  Checkbox,
  FormControlLabel,
  IconButton,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography
} from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import RemoveIcon from "@mui/icons-material/Remove"
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined"
import { AssignmentGroupDifficulty, AssignmentGroupHostSortStrategy, AssignmentGroupType } from "../../dtos"
import { isDemoMode } from "../../config/demoMode"
import FormRules from "../../utils/FormRules"

type AGTypeSpecificSettingsLabels = {
  numberOfRecords: string
  numberOfRecordsRange: string
  increaseNumberOfRecords: string
  decreaseNumberOfRecords: string
  difficulty: string
  difficultyTooltip: string
  easy: string
  medium: string
  hard: string
  hostSort: string
  random: string
  ascending: string
  descending: string
  possibleOctets: string
  possibleOctetsRange: string
  testWildcard: string
  testFirstLastBr: string
}

type Props = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any>
  selectedType: AssignmentGroupType
  numberOfRecordsError?: FieldError
  possibleOctetsError?: FieldError
  labels: AGTypeSpecificSettingsLabels
}

const NumberStepper = ({
  name,
  control,
  label,
  helperText,
  increaseLabel,
  decreaseLabel,
  rules,
  error,
  min,
  max
}: {
  name: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any>
  label: string
  helperText: string
  increaseLabel: string
  decreaseLabel: string
  rules: object
  error?: FieldError
  min: number
  max: number
}) => (
  <Controller
    name={name}
    control={control}
    rules={rules}
    render={({ field }) => (
      <Box onBlur={field.onBlur}>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 0.75, display: "block" }}>
          {label}
        </Typography>
        <Box
          sx={{
            display: "flex",
            alignItems: "stretch",
            width: 130,
            height: 40,
            border: "1px solid",
            borderColor: error ? "error.main" : "divider",
            borderRadius: 1,
            overflow: "hidden"
          }}
        >
          <IconButton
            size="small"
            aria-label={decreaseLabel}
            onClick={() => field.onChange(Math.max(min, Number(field.value) - 1))}
            sx={{ borderRadius: 0, borderRight: "1px solid", borderColor: "divider", px: 1 }}
          >
            <RemoveIcon sx={{ fontSize: 14 }} />
          </IconButton>
          <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", typography: "body2" }}>
            {field.value}
          </Box>
          <IconButton
            size="small"
            aria-label={increaseLabel}
            onClick={() => field.onChange(Math.min(max, Number(field.value) + 1))}
            sx={{ borderRadius: 0, borderLeft: "1px solid", borderColor: "divider", px: 1 }}
          >
            <AddIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Box>
        {error && (
          <Typography variant="caption" color="error" sx={{ mt: 0.5, display: "block" }}>
            {helperText}
          </Typography>
        )}
      </Box>
    )}
  />
)

const AGTypeSpecificSettings = ({ control, selectedType, numberOfRecordsError, possibleOctetsError, labels }: Props) => (
  <Stack direction={{ xs: "column", sm: "row" }} spacing={3} alignItems="flex-start" flexWrap="wrap" useFlexGap justifyContent={{ sm: selectedType === AssignmentGroupType.Subnet ? "space-between" : "flex-start" }} sx={{ width: "100%" }}>
    <NumberStepper
      name="numberOfRecords"
      control={control}
      label={labels.numberOfRecords}
      helperText={labels.numberOfRecordsRange}
      increaseLabel={labels.increaseNumberOfRecords}
      decreaseLabel={labels.decreaseNumberOfRecords}
      rules={{ ...FormRules.required(), min: 1, max: 12 }}
      error={numberOfRecordsError}
      min={1}
      max={12}
    />

    {selectedType === AssignmentGroupType.Subnet && (
      <>
        <Box sx={{ flex: 1 }}>
          <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 0.75 }}>
            <Typography variant="caption" color="text.secondary">
              {labels.difficulty}
            </Typography>
            <Tooltip title={labels.difficultyTooltip}>
              <InfoOutlinedIcon sx={{ fontSize: 14, color: "text.secondary" }} />
            </Tooltip>
          </Stack>
          <Controller
            name="difficulty"
            control={control}
            render={({ field }) => (
              <ToggleButtonGroup
                value={field.value}
                exclusive
                onChange={(_, val) => val && field.onChange(val)}
                size="small"
                sx={{ width: "100%" }}
                disabled={isDemoMode}
              >
                <ToggleButton value={AssignmentGroupDifficulty.Easy} sx={{ flex: 1 }}>{labels.easy}</ToggleButton>
                <ToggleButton value={AssignmentGroupDifficulty.Medium} sx={{ flex: 1 }}>{labels.medium}</ToggleButton>
                <ToggleButton value={AssignmentGroupDifficulty.Hard} sx={{ flex: 1 }}>{labels.hard}</ToggleButton>
              </ToggleButtonGroup>
            )}
          />
        </Box>

        <Box sx={{ flex: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 0.75, display: "block" }}>
            {labels.hostSort}
          </Typography>
          <Controller
            name="hostSortStrategy"
            control={control}
            render={({ field }) => (
              <ToggleButtonGroup
                value={field.value}
                exclusive
                onChange={(_, val) => val && field.onChange(val)}
                size="small"
                sx={{ width: "100%" }}
                disabled={isDemoMode}
              >
                <ToggleButton value={AssignmentGroupHostSortStrategy.Random} sx={{ flex: 1 }}>{labels.random}</ToggleButton>
                <ToggleButton value={AssignmentGroupHostSortStrategy.Ascending} sx={{ flex: 1 }}>{labels.ascending}</ToggleButton>
                <ToggleButton value={AssignmentGroupHostSortStrategy.Descending} sx={{ flex: 1 }}>{labels.descending}</ToggleButton>
              </ToggleButtonGroup>
            )}
          />
        </Box>
      </>
    )}

    {selectedType === AssignmentGroupType.Idnet && (
      <>
        <NumberStepper
          name="possibleOctets"
          control={control}
          label={labels.possibleOctets}
          helperText={labels.possibleOctetsRange}
          increaseLabel={labels.increaseNumberOfRecords}
          decreaseLabel={labels.decreaseNumberOfRecords}
          rules={{ ...FormRules.required(), min: 1, max: 4 }}
          error={possibleOctetsError}
          min={1}
          max={4}
        />

        <Stack direction={{ xs: "column", sm: "row" }} spacing={0.5} alignItems={{ sm: "center" }} sx={{ pt: { sm: 3.5 } }}>
          <Controller
            name="testWildcard"
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={<Checkbox checked={field.value} onChange={(_, checked) => field.onChange(checked)} size="small" />}
                label={<Typography variant="body2">{labels.testWildcard}</Typography>}
              />
            )}
          />
          <Controller
            name="testFirstLastBr"
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={<Checkbox checked={field.value} onChange={(_, checked) => field.onChange(checked)} size="small" />}
                label={<Typography variant="body2">{labels.testFirstLastBr}</Typography>}
              />
            )}
          />
        </Stack>
      </>
    )}
  </Stack>
)

export default AGTypeSpecificSettings