import AddIcon from "@mui/icons-material/Add"
import ArchiveOutlinedIcon from "@mui/icons-material/ArchiveOutlined"
import LayersOutlinedIcon from "@mui/icons-material/LayersOutlined"
import SearchIcon from "@mui/icons-material/Search"
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Divider,
  FormControlLabel,
  FormGroup,
  IconButton,
  InputAdornment,
  Stack,
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
import { useState } from "react"

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
  onTemplatesClick?: () => void
  createDisabled?: boolean
  templatesDisabled?: boolean
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
  typeValues,
  ipCatValues,
  difficultyValues,
  onSearchChange,
  onClassChange,
  onToggleType,
  onToggleIpCat,
  onToggleDifficulty,
  onCreateClick,
  onTemplatesClick,
  createDisabled,
  templatesDisabled
}: AGHeaderProps) => {
  const selectedTypeValues = typeValues ?? []
  const selectedIpCatValues = ipCatValues ?? []
  const selectedDifficultyValues = difficultyValues ?? []
  const [filtersVisible, setFiltersVisible] = useState(false)

  return (
    <Box display="flex" flexDirection="column" gap={3}>
      <Card
        variant="outlined"
        sx={{
          borderRadius: 1,
          borderColor: theme => theme.palette.divider
        }}
      >
        <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
          <Stack direction={{ xs: "column", lg: "row" }} spacing={2} alignItems={{ lg: "center" }}>
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
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 1,
                  bgcolor: "background.paper"
                }
              }}
            />

            <Stack direction="row" spacing={1.25} justifyContent={{ xs: "flex-start", lg: "flex-end" }}>
              <Tooltip title={t(TranslationKey.AG_HEADER_ARCHIVE_TOOLTIP)}>
                <span>
                  <IconButton
                    disabled
                    aria-label="Archive"
                    sx={{
                      border: theme => `1px solid ${theme.palette.warning.main}`,
                      width: 56,
                      height: 56,
                      backgroundColor: theme => theme.palette.warning.light,
                      "& .MuiSvgIcon-root": {
                        fontSize: 28
                      },
                      "&.Mui-disabled": {
                        color: theme => theme.palette.warning.dark,
                        borderColor: theme => theme.palette.warning.main,
                        opacity: 0.75
                      }
                    }}
                  >
                    <ArchiveOutlinedIcon />
                  </IconButton>
                </span>
              </Tooltip>

              <Tooltip title={t(TranslationKey.AG_HEADER_TEMPLATES_TOOLTIP)}>
                <span>
                  <IconButton
                    onClick={onTemplatesClick}
                    disabled={templatesDisabled ?? true}
                    aria-label={t(TranslationKey.AG_HEADER_TEMPLATES_TOOLTIP)}
                    sx={{
                      border: theme => `1px solid ${theme.palette.info.main}`,
                      width: 56,
                      height: 56,
                      backgroundColor: theme => theme.palette.info.light,
                      "& .MuiSvgIcon-root": {
                        fontSize: 28
                      },
                      "&.Mui-disabled": {
                        color: theme => theme.palette.info.dark,
                        borderColor: theme => theme.palette.info.main,
                        opacity: 0.75
                      }
                    }}
                  >
                    <LayersOutlinedIcon />
                  </IconButton>
                </span>
              </Tooltip>

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
                        width: 56,
                        height: 56,
                        backgroundColor: theme => theme.palette.success.light,
                        "& .MuiSvgIcon-root": {
                          fontSize: 30
                        },
                        color: theme => theme.palette.success.dark,
                        "&.Mui-disabled": {
                          color: theme => theme.palette.success.dark,
                          borderColor: theme => theme.palette.success.main,
                          backgroundColor: theme => theme.palette.success.light,
                          opacity: 0.75
                        }
                      }}
                    >
                      <AddIcon />
                    </IconButton>
                  </span>
                </Tooltip>
              )}
            </Stack>
          </Stack>

          <Divider sx={{ my: 1.75 }} />

          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
            <Button
              variant={(classValue ?? "ALL") === "ALL" ? "contained" : "outlined"}
              onClick={() => onClassChange("ALL")}
              size="small"
              sx={{
                borderRadius: 1,
                textTransform: "none",
                px: 2,
                fontWeight: 600,
                minHeight: 32
              }}
            >
              {t(TranslationKey.AG_HEADER_ALL_CLASSES)}
            </Button>
            {classOptions.map(({ classId, className }) => (
              <Button
                key={classId}
                variant={classValue === classId ? "contained" : "outlined"}
                onClick={() => onClassChange(classId)}
                size="small"
                sx={{
                  borderRadius: 1,
                  textTransform: "none",
                  px: 2,
                  fontWeight: 600,
                  minHeight: 32
                }}
              >
                {className}
              </Button>
            ))}
            <Button
              variant="outlined"
              size="small"
              onClick={() => setFiltersVisible(prev => !prev)}
              sx={{
                borderRadius: 1,
                textTransform: "none",
                px: 2,
                fontWeight: 600,
                minHeight: 32,
                ml: { xs: 0, md: "auto" }
              }}
            >
              {filtersVisible
                ? t(TranslationKey.AG_HEADER_HIDE_FILTERS)
                : t(TranslationKey.AG_HEADER_SHOW_FILTERS)}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {filtersVisible && (
        <Stack direction={{ xs: "column", md: "row" }} spacing={3}>
          <Card variant="outlined" sx={{ flex: 1, borderRadius: 1 }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                {t(TranslationKey.AG_HEADER_TYPE)}
              </Typography>
              <FormGroup>
                <FormControlLabel
                  control={<Checkbox checked={selectedTypeValues.includes(AssignmentGroupType.Subnet)} onChange={() => onToggleType?.(AssignmentGroupType.Subnet)} />}
                  label={t(TranslationKey.AG_HEADER_TYPE_SUBNET)}
                />
                <FormControlLabel
                  control={<Checkbox checked={selectedTypeValues.includes(AssignmentGroupType.Idnet)} onChange={() => onToggleType?.(AssignmentGroupType.Idnet)} />}
                  label={t(TranslationKey.AG_HEADER_TYPE_IDNET)}
                />
              </FormGroup>
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ flex: 1, borderRadius: 1 }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                {t(TranslationKey.AG_HEADER_IP_CATEGORY)}
              </Typography>
              <FormGroup>
                {Object.values(AssignmentGroupIpCat).map(cat => (
                  <FormControlLabel
                    key={cat}
                    control={<Checkbox checked={selectedIpCatValues.includes(cat)} onChange={() => onToggleIpCat?.(cat)} />}
                    label={getIpCatLabel(cat, t)}
                  />
                ))}
              </FormGroup>
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ flex: 1, borderRadius: 1 }}>
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
                        checked={selectedDifficultyValues.includes(difficulty)}
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
      )}
    </Box>
  )
}

export type AGClassFilterValue = number | "ALL" | null
export type AGTypeFilterValue = AssignmentGroupType | "ALL"
export type AGIpCatFilterValue = AssignmentGroupIpCat | "ALL_CAT"

export default AGHeader