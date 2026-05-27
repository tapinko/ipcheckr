import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Checkbox,
  FormControlLabel,
  Stack,
  TextField,
  Typography
} from "@mui/material"
import ExpandMoreIcon from "@mui/icons-material/ExpandMore"
import { Controller, useForm, useWatch } from "react-hook-form"
import type { AxiosError, AxiosResponse } from "axios"
import { assignmentGroupApi, userApi } from "../../utils/apiClients"
import { useAuth } from "../../contexts/AuthContext"
import UserRole from "../../types/UserRole"
import ErrorLoading from "../../components/ui/ErrorLoading"
import AGFormSkeleton from "./components/skeletons/AGFormSkeleton"
import { Language, TranslationKey } from "../../utils/i18n"
import FormRules from "../../utils/FormRules"
import { CustomAlert, type CustomAlertState } from "../../components/ui/CustomAlert"
import {
  AssignmentGroupDifficulty,
  AssignmentGroupHostSortStrategy,
  AssignmentGroupType,
  type ApiProblemDetails,
  type QueryIDNetAGDetailRes,
  type QuerySubnetAGDetailRes,
  type UserDto
} from "../../dtos"
import { RouteParams } from "../../router/routes"
import { fromAssignmentTypeParam } from "../../utils/assignmentType"
import { getIpCatLabel } from "../../utils/getIpCatLabel"
import AGDateColumn, { toLocalDateTimeString } from "./AGDateColumn"

type EditFormValues = {
  name: string
  description: string
  students: number[]
  startDate: string
  deadline: string
}

interface AGEditAssignmentGroupFeatureProps {
  onAfterSave: (id: string, type: AssignmentGroupType) => void
}

const AGEditAssignmentGroupFeature = ({ onAfterSave }: AGEditAssignmentGroupFeatureProps) => {
  const { t, i18n } = useTranslation()
  const { userId } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [alert, setAlert] = useState<CustomAlertState | null>(null)
  const {
    [RouteParams.ASSIGNMENT_GROUP_ID]: assignmentGroupId,
    [RouteParams.ASSIGNMENT_GROUP_TYPE]: assignmentTypeParam
  } = useParams()

  const assignmentType = fromAssignmentTypeParam(assignmentTypeParam)
  const isSubnet = assignmentType === AssignmentGroupType.Subnet

  const getDifficultyLabel = (difficulty: AssignmentGroupDifficulty): string => {
    switch (difficulty) {
      case AssignmentGroupDifficulty.Easy: return t(TranslationKey.AG_EDIT_ASSIGNMENT_GROUP_DIFFICULTY_EASY)
      case AssignmentGroupDifficulty.Medium: return t(TranslationKey.AG_EDIT_ASSIGNMENT_GROUP_DIFFICULTY_MEDIUM)
      case AssignmentGroupDifficulty.Hard: return t(TranslationKey.AG_EDIT_ASSIGNMENT_GROUP_DIFFICULTY_HARD)
    }
  }

  const getHostSortLabel = (strategy: AssignmentGroupHostSortStrategy): string => {
    switch (strategy) {
      case AssignmentGroupHostSortStrategy.Random: return t(TranslationKey.AG_EDIT_ASSIGNMENT_GROUP_HOST_SORT_RANDOM)
      case AssignmentGroupHostSortStrategy.Ascending: return t(TranslationKey.AG_EDIT_ASSIGNMENT_GROUP_HOST_SORT_ASCENDING)
      case AssignmentGroupHostSortStrategy.Descending: return t(TranslationKey.AG_EDIT_ASSIGNMENT_GROUP_HOST_SORT_DESCENDING)
    }
  }

  const getIpCatShortLabel = (ipCat: string): string => {
    switch (ipCat) {
      case "ABC": return t(TranslationKey.AG_EDIT_ASSIGNMENT_GROUP_IP_CAT_ABC)
      case "ALL": return t(TranslationKey.AG_EDIT_ASSIGNMENT_GROUP_IP_CAT_ALL)
      case "LOCAL": return t(TranslationKey.AG_EDIT_ASSIGNMENT_GROUP_IP_CAT_LOCAL)
      default: return getIpCatLabel(ipCat as never, t)
    }
  }

  const detailQuery = useQuery<QueryIDNetAGDetailRes | QuerySubnetAGDetailRes, Error>({
    queryKey: ["agEditDetail", assignmentGroupId, assignmentType],
    enabled: !!assignmentGroupId,
    queryFn: () =>
      assignmentType === AssignmentGroupType.Subnet
        ? assignmentGroupApi.assignmentGroupQuerySubnetAssignmentGroupDetails(Number(assignmentGroupId)).then(r => r.data)
        : assignmentGroupApi.assignmentGroupQueryIdNetAssignmentGroupDetails(Number(assignmentGroupId)).then(r => r.data)
  })

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors }
  } = useForm<EditFormValues>({
    defaultValues: {
      name: "",
      description: "",
      students: [],
      startDate: new Date().toISOString(),
      deadline: new Date().toISOString()
    },
    mode: "onBlur"
  })

  const selectedStudents = useWatch({ control, name: "students" })

  useEffect(() => {
    if (!detailQuery.data) return
    const detail = detailQuery.data
    reset({
      name: detail.name,
      description: detail.description ?? "",
      students: detail.assignments?.map(a => a.studentId) ?? [],
      startDate: toLocalDateTimeString(new Date(detail.startDate)),
      deadline: toLocalDateTimeString(new Date(detail.deadline))
    })
  }, [detailQuery.data, reset])

  const classId = detailQuery.data?.classId ?? null
  const studentsQuery = useQuery<UserDto[], Error>({
    queryKey: ["agEditStudents", userId, classId],
    enabled: !!userId && !!classId,
    queryFn: () => userApi.userQueryUsers(null, null, UserRole.STUDENT, classId ?? null).then(r => r.data.users ?? [])
  })

  const editMutation = useMutation<AxiosResponse<void>, AxiosError<ApiProblemDetails>, EditFormValues>({
    mutationFn: async data => {
      if (!assignmentGroupId || !assignmentType) throw new Error("Missing assignment group reference")

      const payload = {
        id: Number(assignmentGroupId),
        name: data.name,
        description: data.description,
        students: data.students.length ? data.students : null,
        startDate: new Date(data.startDate).toISOString(),
        deadline: new Date(data.deadline).toISOString()
      }

      if (assignmentType === AssignmentGroupType.Subnet)
        return assignmentGroupApi.assignmentGroupEditSubnetAssignmentGroup(payload)

      return assignmentGroupApi.assignmentGroupEditIdNetAssignmentGroup(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agAssignmentGroups"] })
      queryClient.invalidateQueries({ queryKey: ["agEditDetail", assignmentGroupId, assignmentType] })
      onAfterSave(assignmentGroupId ?? "", assignmentType ?? AssignmentGroupType.Subnet)
    },
    onError: error => {
      const details = error.response?.data
      const localMessage = i18n.language === Language.EN ? details?.messageEn : details?.messageSk
      setAlert({
        severity: "error",
        message: localMessage ?? details?.detail ?? error.message
      })
    }
  })

  const applyQuickDuration = (minutes: number) => {
    const start = new Date()
    start.setSeconds(0, 0)
    start.setMinutes(start.getMinutes() + 1)
    const end = new Date(start.getTime() + minutes * 60 * 1000)
    setValue("startDate", toLocalDateTimeString(start))
    setValue("deadline", toLocalDateTimeString(end))
  }

  if (detailQuery.isLoading) return <AGFormSkeleton />
  if (detailQuery.isError || !detailQuery.data) return <ErrorLoading onRetry={() => detailQuery.refetch()} />

  const detail = detailQuery.data
  const subnetDetail = isSubnet ? (detail as QuerySubnetAGDetailRes) : null
  const hasStudentsInClass = (studentsQuery.data?.length ?? 0) > 0
  const canSubmit = !editMutation.isPending && (selectedStudents?.length ?? 0) > 0

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {alert && <CustomAlert severity={alert.severity} message={alert.message} onClose={() => setAlert(null)} />}

      <Card variant="outlined">
        <CardContent>
          <Box
            component="form"
            onSubmit={handleSubmit(data => editMutation.mutateAsync(data))}
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 3,
              "& .MuiButton-root": { textTransform: "none" }
            }}
          >
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Controller
                  name="name"
                  control={control}
                  rules={{
                    ...FormRules.required(),
                    ...FormRules.minLengthShort(),
                    ...FormRules.maxLengthShort(),
                    ...FormRules.patternLettersNumbersSpaces()
                  }}
                  render={({ field }) => (
                    <TextField
                      label={t(TranslationKey.AG_EDIT_ASSIGNMENT_GROUP_NAME)}
                      fullWidth
                      {...field}
                      error={!!errors.name}
                      helperText={errors.name ? t(errors.name.message as string) : ""}
                    />
                  )}
                />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Controller
                  name="description"
                  control={control}
                  rules={{
                    ...FormRules.maxLengthLong(),
                    ...FormRules.patternLettersNumbersSpecialSpaces()
                  }}
                  render={({ field }) => (
                    <TextField
                      label={t(TranslationKey.AG_EDIT_ASSIGNMENT_GROUP_DESCRIPTION)}
                      fullWidth
                      multiline
                      minRows={1}
                      {...field}
                      error={!!errors.description}
                      helperText={errors.description ? t(errors.description.message as string) : ""}
                    />
                  )}
                />
              </Box>
            </Stack>

            <Stack direction={{ xs: "column", md: "row" }} spacing={3} alignItems="flex-start">
              <Stack spacing={2} sx={{ flex: 1, minWidth: 0 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 0.75, display: "block" }}>
                    {t(TranslationKey.AG_EDIT_ASSIGNMENT_GROUP_CLASS)}
                  </Typography>
                  <Typography variant="subtitle1" fontWeight={600}>{detail.className}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 0.75, display: "block" }}>
                    {t(TranslationKey.AG_EDIT_ASSIGNMENT_GROUP_TYPE)}
                  </Typography>
                  <Chip
                    label={isSubnet
                      ? t(TranslationKey.AG_EDIT_ASSIGNMENT_GROUP_TYPE_SUBNET)
                      : t(TranslationKey.AG_EDIT_ASSIGNMENT_GROUP_TYPE_IDNET)}
                    size="small"
                  />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 0.75, display: "block" }}>
                    {t(TranslationKey.AG_EDIT_ASSIGNMENT_GROUP_IP_CATEGORY)}
                  </Typography>
                  <Chip label={detail.ipCat ? getIpCatShortLabel(detail.ipCat) : "-"} size="small" />
                </Box>
                {isSubnet && subnetDetail?.difficulty && (
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 0.75, display: "block" }}>
                      {t(TranslationKey.AG_EDIT_ASSIGNMENT_GROUP_DIFFICULTY)}
                    </Typography>
                    <Chip label={getDifficultyLabel(subnetDetail.difficulty)} size="small" />
                  </Box>
                )}
                {isSubnet && subnetDetail?.hostSortStrategy && (
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 0.75, display: "block" }}>
                      {t(TranslationKey.AG_EDIT_ASSIGNMENT_GROUP_HOST_SORT)}
                    </Typography>
                    <Chip label={getHostSortLabel(subnetDetail.hostSortStrategy)} size="small" />
                  </Box>
                )}
              </Stack>

              <AGDateColumn
                control={control}
                startDateError={errors.startDate}
                deadlineError={errors.deadline}
                onApplyQuickDuration={applyQuickDuration}
                labels={{
                  startDate: t(TranslationKey.AG_EDIT_ASSIGNMENT_GROUP_START_DATE),
                  deadline: t(TranslationKey.AG_EDIT_ASSIGNMENT_GROUP_DEADLINE)
                }}
              />
            </Stack>

            <Controller
              name="students"
              control={control}
              render={({ field }) => (
                <Accordion disableGutters>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="body2" fontWeight={600}>
                      {t(TranslationKey.AG_EDIT_ASSIGNMENT_GROUP_STUDENTS)} ({field.value.length})
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", md: "repeat(3, minmax(0, 1fr))" },
                        gap: 1
                      }}
                    >
                      {(studentsQuery.data ?? []).map(student => (
                        <FormControlLabel
                          key={student.id}
                          control={
                            <Checkbox
                              checked={field.value.includes(student.id)}
                              onChange={(_, checked) => {
                                if (checked) {
                                  field.onChange([...field.value, student.id])
                                  return
                                }
                                field.onChange(field.value.filter(id => id !== student.id))
                              }}
                            />
                          }
                          label={student.username}
                        />
                      ))}
                    </Box>
                  </AccordionDetails>
                </Accordion>
              )}
            />

            {classId && !studentsQuery.isLoading && !hasStudentsInClass && (
              <Typography variant="caption" color="error.main">
                {t(TranslationKey.AG_EDIT_ASSIGNMENT_GROUP_NO_STUDENTS)}
              </Typography>
            )}

            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
              <Button onClick={() => navigate(-1)}>
                {t(TranslationKey.AG_EDIT_ASSIGNMENT_GROUP_CANCEL)}
              </Button>
              <Button type="submit" variant="contained" color="success" disabled={!canSubmit}>
                {editMutation.isPending
                  ? t(TranslationKey.AG_EDIT_ASSIGNMENT_GROUP_LOADING)
                  : t(TranslationKey.AG_EDIT_ASSIGNMENT_GROUP_SAVE)}
              </Button>
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}

export default AGEditAssignmentGroupFeature