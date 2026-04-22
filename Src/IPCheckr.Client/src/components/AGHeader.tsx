import AddIcon from "@mui/icons-material/Add"
import ArchiveOutlinedIcon from "@mui/icons-material/ArchiveOutlined"
import SearchIcon from "@mui/icons-material/Search"
import {
  Box,
  Card,
  CardContent,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormGroup,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography
} from "@mui/material"
import {
  AssignmentGroupDifficulty,
  AssignmentGroupIpCat,
  AssignmentGroupType,
  type ClassDto
} from "../dtos"
import { getIpCatLabel } from "../utils/getIpCatLabel"
import { TranslationKey } from "../utils/i18n"
import type { TFunction } from "i18next"

interface AGHeaderProps {
  t: TFunction
  search: string
  classOptions: ClassDto[]
  classValue: number | "ALL" | null
  typeValue?: AssignmentGroupType | "ALL"
  ipCatValue?: AssignmentGroupIpCat | "ALL_CAT"
  typeValues?: AssignmentGroupType[]
  ipCatValues?: AssignmentGroupIpCat[]
  difficultyValues?: AssignmentGroupDifficulty[]
  onSearchChange: (value: string) => void
  onClassChange: (value: number | "ALL" | null) => void
  onTypeChange?: (value: AssignmentGroupType | "ALL") => void
  onIpCatChange?: (value: AssignmentGroupIpCat | "ALL_CAT") => void
  onToggleType?: (value: AssignmentGroupType) => void
  onToggleIpCat?: (value: AssignmentGroupIpCat) => void
  onToggleDifficulty?: (value: AssignmentGroupDifficulty) => void
  onCreateClick?: () => void
  createDisabled?: boolean
}

const getDifficultyLabel = (difficulty: AssignmentGroupDifficulty, t: TFunction) => {
  if (difficulty === AssignmentGroupDifficulty.Easy) {
    return t(TranslationKey.AG_HEADER_DIFFICULTY_EASY)
  }
  if (difficulty === AssignmentGroupDifficulty.Medium) {
    return t(TranslationKey.AG_HEADER_DIFFICULTY_MEDIUM)
  }
  return t(TranslationKey.AG_HEADER_DIFFICULTY_HARD)
}

const AGHeader = ({
  t,
  search,
  classOptions,
  classValue,
  typeValue,
  ipCatValue,
  typeValues,
  ipCatValues,
  difficultyValues,
  onSearchChange,
  onClassChange,
  onTypeChange,
  onIpCatChange,
  onToggleType,
  onToggleIpCat,
  onToggleDifficulty,
  onCreateClick,
  createDisabled
}: AGHeaderProps) => {
  const usesNewLayout = Array.isArray(typeValues) && Array.isArray(ipCatValues)

  return (
    <Box display="flex" flexDirection="column" gap={2}>
      {!usesNewLayout && (
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }} justifyContent="space-between">
          <TextField
            fullWidth
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            placeholder={t(TranslationKey.AG_HEADER_SEARCH_PLACEHOLDER)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              )
            }}
          />

          {onCreateClick && (
            <Tooltip title={t(TranslationKey.AG_HEADER_CREATE_ASSIGNMENT_TOOLTIP)}>
              <span>
                <IconButton
                  onClick={onCreateClick}
                  disabled={createDisabled}
                  color="success"
                  aria-label={t(TranslationKey.AG_HEADER_CREATE_ASSIGNMENT_TOOLTIP)}
                  sx={{
                    border: theme => `1px solid ${theme.palette.success.main}`,
                    width: 60,
                    height: 60
                  }}
                >
                  <AddIcon />
                </IconButton>
              </span>
            </Tooltip>
          )}
        </Stack>
      )}

      {usesNewLayout ? (
        <>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            {onCreateClick && (
              <Card
                sx={{
                  minWidth: 184,
                  bgcolor: theme => theme.palette.action.hover
                }}
              >
                <CardContent sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
                  <Stack spacing={3} alignItems="center" justifyContent="center">
                    <Tooltip title={t(TranslationKey.AG_HEADER_ARCHIVE_TOOLTIP)}>
                      <span>
                        <IconButton
                          disabled
                          aria-label="Archive"
                          sx={{
                            border: theme => `1px solid ${theme.palette.warning.main}`,
                            width: 60,
                            height: 60,
                            "& .MuiSvgIcon-root": {
                              fontSize: 30
                            },
                            "&.Mui-disabled": {
                              color: theme => theme.palette.warning.dark,
                              borderColor: theme => theme.palette.warning.main,
                              backgroundColor: theme => theme.palette.warning.light,
                              opacity: 0.75
                            }
                          }}
                        >
                          <ArchiveOutlinedIcon />
                        </IconButton>
                      </span>
                    </Tooltip>

                    <Tooltip title={t(TranslationKey.AG_HEADER_CREATE_ASSIGNMENT_TOOLTIP)}>
                      <span>
                        <IconButton
                          onClick={onCreateClick}
                          disabled={createDisabled}
                          color="success"
                          aria-label={t(TranslationKey.AG_HEADER_CREATE_ASSIGNMENT_TOOLTIP)}
                          sx={{
                            border: theme => `1px solid ${theme.palette.success.main}`,
                            width: 60,
                            height: 60,
                            "& .MuiSvgIcon-root": {
                              fontSize: 34
                            }
                          }}
                        >
                          <AddIcon />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Stack>
                </CardContent>
              </Card>
            )}

            <Card variant="outlined" sx={{ flex: 1 }}>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  {t(TranslationKey.AG_HEADER_TYPE)}
                </Typography>
                <FormGroup>
                  <FormControlLabel
                    control={<Checkbox checked={typeValues!.includes(AssignmentGroupType.Subnet)} onChange={() => onToggleType?.(AssignmentGroupType.Subnet)} />}
                    label={t(TranslationKey.AG_HEADER_TYPE_SUBNET)}
                  />
                  <FormControlLabel
                    control={<Checkbox checked={typeValues!.includes(AssignmentGroupType.Idnet)} onChange={() => onToggleType?.(AssignmentGroupType.Idnet)} />}
                    label={t(TranslationKey.AG_HEADER_TYPE_IDNET)}
                  />
                </FormGroup>
              </CardContent>
            </Card>

            <Card variant="outlined" sx={{ flex: 1 }}>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  {t(TranslationKey.AG_HEADER_IP_CATEGORY)}
                </Typography>
                <FormGroup>
                  {Object.values(AssignmentGroupIpCat).map(cat => (
                    <FormControlLabel
                      key={cat}
                      control={<Checkbox checked={ipCatValues!.includes(cat)} onChange={() => onToggleIpCat?.(cat)} />}
                      label={getIpCatLabel(cat, t)}
                    />
                  ))}
                </FormGroup>
              </CardContent>
            </Card>

            <Card variant="outlined" sx={{ flex: 1 }}>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  {t(TranslationKey.AG_HEADER_DIFFICULTY)}
                </Typography>
                <FormGroup>
                  {Object.values(AssignmentGroupDifficulty).map(difficulty => (
                    <FormControlLabel
                      key={difficulty}
                      control={
                        <Checkbox
                          checked={(difficultyValues ?? []).includes(difficulty)}
                          onChange={() => onToggleDifficulty?.(difficulty)}
                        />
                      }
                      label={getDifficultyLabel(difficulty, t)}
                    />
                  ))}
                </FormGroup>
              </CardContent>
            </Card>
          </Stack>

          <Box>
            <Tabs
              value={classValue ?? "ALL"}
              onChange={(_, value) => onClassChange(value as number | "ALL")}
              variant="fullWidth"
              sx={{ minHeight: 42 }}
            >
              <Tab
                value="ALL"
                label={t(TranslationKey.AG_HEADER_ALL_CLASSES)}
                sx={{
                  minHeight: 42,
                  borderBottom: theme => `3px solid ${theme.palette.grey[400]}`,
                  "&.Mui-selected": {
                    borderBottomColor: theme => theme.palette.primary.main
                  }
                }}
              />
              {classOptions.map(({ classId, className }) => (
                <Tab
                  key={classId}
                  value={classId}
                  label={className}
                  sx={{
                    minHeight: 42,
                    borderBottom: theme => `3px solid ${theme.palette.grey[400]}`,
                    "&.Mui-selected": {
                      borderBottomColor: theme => theme.palette.primary.main
                    }
                  }}
                />
              ))}
            </Tabs>
          </Box>
        </>
      ) : (
        <>
          <Box>
            <Tabs
              value={classValue ?? "ALL"}
              onChange={(_, value) => onClassChange(value as number | "ALL")}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ minHeight: 40 }}
            >
              <Tab value="ALL" label={t(TranslationKey.AG_HEADER_ALL_CLASSES)} />
              {classOptions.map(({ classId, className }) => (
                <Tab key={classId} value={classId} label={className} />
              ))}
            </Tabs>
          </Box>

          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <FormControl fullWidth>
              <InputLabel>{t(TranslationKey.AG_HEADER_TYPE)}</InputLabel>
              <Select
                label={t(TranslationKey.AG_HEADER_TYPE)}
                value={typeValue ?? "ALL"}
                onChange={e => onTypeChange?.(e.target.value as AssignmentGroupType | "ALL")}
              >
                <MenuItem value="ALL">{t(TranslationKey.AG_HEADER_TYPE_ALL)}</MenuItem>
                <MenuItem value={AssignmentGroupType.Subnet}>{t(TranslationKey.AG_HEADER_TYPE_SUBNET)}</MenuItem>
                <MenuItem value={AssignmentGroupType.Idnet}>{t(TranslationKey.AG_HEADER_TYPE_IDNET)}</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>{t(TranslationKey.AG_HEADER_IP_CATEGORY)}</InputLabel>
              <Select
                label={t(TranslationKey.AG_HEADER_IP_CATEGORY)}
                value={ipCatValue ?? "ALL_CAT"}
                onChange={e => onIpCatChange?.(e.target.value as AssignmentGroupIpCat | "ALL_CAT")}
              >
                <MenuItem value="ALL_CAT">{t(TranslationKey.AG_HEADER_IP_CATEGORY_ALL)}</MenuItem>
                {Object.values(AssignmentGroupIpCat).map(cat => (
                  <MenuItem key={cat} value={cat}>{getIpCatLabel(cat, t)}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </>
      )}
    </Box>
  )
}

export type AGClassFilterValue = number | "ALL" | null
export type AGTypeFilterValue = AssignmentGroupType | "ALL"
export type AGIpCatFilterValue = AssignmentGroupIpCat | "ALL_CAT"

export default AGHeader