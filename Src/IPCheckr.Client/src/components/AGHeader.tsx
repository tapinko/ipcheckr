import {
  Box,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField
} from "@mui/material"
import SearchIcon from "@mui/icons-material/Search"

import {
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
  typeValue: AssignmentGroupType | "ALL"
  classValue: number | "ALL" | null
  ipCatValue: AssignmentGroupIpCat | "ALL_CAT"
  onSearchChange: (value: string) => void
  onClassChange: (value: number | "ALL" | null) => void
  onTypeChange: (value: AssignmentGroupType | "ALL") => void
  onIpCatChange: (value: AssignmentGroupIpCat | "ALL_CAT") => void
}

const AGHeader = ({
  t,
  search,
  classOptions,
  classValue,
  typeValue,
  ipCatValue,
  onSearchChange,
  onClassChange,
  onTypeChange,
  onIpCatChange
}: AGHeaderProps) => {
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange(e.target.value)
  }

  const handleClassChange = (e: any) => {
    onClassChange(e.target.value as number | "ALL" | null)
  }

  const handleTypeChange = (e: any) => {
    onTypeChange(e.target.value as AssignmentGroupType | "ALL")
  }

  const handleIpCategoryChange = (e: any) => {
    onIpCatChange(e.target.value as AssignmentGroupIpCat | "ALL_CAT")
  }

  return (
    <Box display="flex" flexDirection="column" gap={2}>
      <TextField
        fullWidth
        value={search}
        onChange={handleSearchChange}
        placeholder={t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_NAME)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          )
        }}
      />

      <Box
        display="grid"
        gap={2}
        alignItems="center"
        gridTemplateColumns={{ xs: "1fr", md: "2fr 1fr" }}
      >

        <FormControl fullWidth>
          <InputLabel>
            {t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_CLASS)}
          </InputLabel>
          <Select
            label={t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_CLASS)}
            value={classValue ?? "ALL"}
            onChange={handleClassChange}
          >
            <MenuItem value="ALL">
              {t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_ALL_CLASSES)}
            </MenuItem>

            {classOptions.map(({ classId, className }) => (
              <MenuItem key={classId} value={classId}>
                {className}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
          <FormControl fullWidth>
            <InputLabel>
              {t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_TYPE)}
            </InputLabel>
            <Select
              label={t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_TYPE)}
              value={typeValue}
              onChange={handleTypeChange}
            >
              <MenuItem value="ALL">
                {t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_TYPE_ALL)}
              </MenuItem>
              <MenuItem value={AssignmentGroupType.Subnet}>
                {t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_TYPE_SUBNET)}
              </MenuItem>
              <MenuItem value={AssignmentGroupType.Idnet}>
                {t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_TYPE_IDNET)}
              </MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>
              {t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_IP_CATEGORY)}
            </InputLabel>
            <Select
              label={t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_IP_CATEGORY)}
              value={ipCatValue}
              onChange={handleIpCategoryChange}
            >
              <MenuItem value="ALL_CAT">
                {t(
                  TranslationKey.TEACHER_ASSIGNMENT_GROUPS_IP_CATEGORY_ALL
                )}
              </MenuItem>

              {Object.values(AssignmentGroupIpCat).map(cat => (
                <MenuItem key={cat} value={cat}>
                  {getIpCatLabel(cat, t)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </Box>
    </Box>
  )
}

export type AGClassFilterValue = number | "ALL" | null
export type AGTypeFilterValue = AssignmentGroupType | "ALL"
export type AGIpCatFilterValue = AssignmentGroupIpCat | "ALL_CAT"

export default AGHeader