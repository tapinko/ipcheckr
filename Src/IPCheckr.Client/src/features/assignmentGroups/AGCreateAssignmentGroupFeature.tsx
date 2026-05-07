import { useEffect, useRef, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useMutation, useQuery } from "@tanstack/react-query"
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  FormControlLabel,
  Stack,
  TextField,
  Typography
} from "@mui/material"
import ExpandMoreIcon from "@mui/icons-material/ExpandMore"
import { Controller, useForm, useWatch } from "react-hook-form"
import type { AxiosError, AxiosResponse } from "axios"
import { assignmentGroupApi, classApi, userApi } from "../../utils/apiClients"
import { useAuth } from "../../contexts/AuthContext"
import UserRole from "../../types/UserRole"
import ErrorLoading from "../../components/ErrorLoading"
import AGFormSkeleton from "../../components/ag/AGFormSkeleton"
import { Language, TranslationKey } from "../../utils/i18n"
import FormRules from "../../utils/FormRules"
import { CustomAlert, type CustomAlertState } from "../../components/CustomAlert"
import {
  AssignmentGroupDifficulty,
  AssignmentGroupHostSortStrategy,
  AssignmentGroupIpCat,
  AssignmentGroupType,
  type ApiProblemDetails,
  type ClassDto,
  type UserDto
} from "../../dtos"
import AGClassSelector from "./AGClassSelector"
import AGTypeIpCatSelector from "./AGTypeIpCatSelector"
import AGDateColumn, { toLocalDateTimeString } from "./AGDateColumn"
import AGTypeSpecificSettings from "./AGTypeSpecificSettings"

type CreateFormValues = {
  name: string
  description: string
  classId: number | null
  type: AssignmentGroupType
  numberOfRecords: number
  possibleOctets: number
  ipCat: AssignmentGroupIpCat
  difficulty: AssignmentGroupDifficulty
  hostSortStrategy: AssignmentGroupHostSortStrategy
  testWildcard: boolean
  testFirstLastBr: boolean
  students: number[]
  startDate: string
  deadline: string
}

interface AGCreateAssignmentGroupFeatureProps {
  onAfterCreate: (classId?: number) => void
  teacherFilter?: number | null
}

const AGCreateAssignmentGroupFeature = ({ onAfterCreate, teacherFilter }: AGCreateAssignmentGroupFeatureProps) => {
  const { t, i18n } = useTranslation()
  const { userId } = useAuth()
  const queryUserId = teacherFilter !== undefined ? teacherFilter : userId
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [alert, setAlert] = useState<CustomAlertState | null>(null)

  const value = Number(searchParams.get("classId"))
  const initialClassId = Number.isFinite(value) && value > 0 ? value : null

  const parseEnumParam = <T extends string>(key: string, enumObj: Record<string, T>, fallback: T): T => {
    const val = searchParams.get(key)
    return val !== null && Object.values(enumObj).includes(val as T) ? (val as T) : fallback
  }
  const parseIntParam = (key: string, fallback: number, min: number, max: number): number => {
    const val = Number(searchParams.get(key))
    return Number.isInteger(val) && val >= min && val <= max ? val : fallback
  }

  const classesQuery = useQuery<ClassDto[], Error>({
    queryKey: ["agCreateClasses", queryUserId],
    enabled: !!userId,
    queryFn: () => classApi.classQueryClasses(null, null, queryUserId).then(r => r.data.classes)
  })

  const {
    control,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors }
  } = useForm<CreateFormValues>({
    defaultValues: {
      name: searchParams.get("name") ?? "",
      description: searchParams.get("desc") ?? "",
      classId: initialClassId,
      type: parseEnumParam("type", AssignmentGroupType, AssignmentGroupType.Idnet),
      numberOfRecords: parseIntParam("records", 6, 1, 12),
      possibleOctets: parseIntParam("octets", 3, 1, 4),
      ipCat: parseEnumParam("ipCat", AssignmentGroupIpCat, AssignmentGroupIpCat.Abc),
      difficulty: parseEnumParam("difficulty", AssignmentGroupDifficulty, AssignmentGroupDifficulty.Medium),
      hostSortStrategy: parseEnumParam("hostSort", AssignmentGroupHostSortStrategy, AssignmentGroupHostSortStrategy.Descending),
      testWildcard: searchParams.get("wildcard") === "true",
      testFirstLastBr: searchParams.get("firstLastBr") === "true",
      students: [],
      startDate: "",
      deadline: ""
    },
    mode: "onBlur"
  })

  const selectedClassId = useWatch({ control, name: "classId" })
  const selectedType = useWatch({ control, name: "type" })
  const selectedIpCat = useWatch({ control, name: "ipCat" })
  const selectedStudents = useWatch({ control, name: "students" })
  const nameValue = useWatch({ control, name: "name" })
  const startDateValue = useWatch({ control, name: "startDate" })
  const deadlineValue = useWatch({ control, name: "deadline" })
  const studentsInitializedClassRef = useRef<number | null>(null)

  useEffect(() => {
    if (selectedClassId == null && classesQuery.data?.length) {
      const nextClassId = initialClassId ?? classesQuery.data[0]?.classId ?? null
      setValue("classId", nextClassId)
    }
  }, [classesQuery.data, initialClassId, selectedClassId, setValue])

  useEffect(() => {
    studentsInitializedClassRef.current = null
  }, [selectedClassId])

  useEffect(() => {
    const subscription = watch(values => {
      const params: Record<string, string> = {}
      if (values.classId) params.classId = String(values.classId)
      if (values.name) params.name = values.name
      if (values.description) params.desc = values.description
      if (values.type) params.type = values.type
      if (values.ipCat) params.ipCat = values.ipCat
      if (values.numberOfRecords) params.records = String(values.numberOfRecords)
      if (values.difficulty) params.difficulty = values.difficulty
      if (values.hostSortStrategy) params.hostSort = values.hostSortStrategy
      if (values.possibleOctets) params.octets = String(values.possibleOctets)
      params.wildcard = String(values.testWildcard ?? false)
      params.firstLastBr = String(values.testFirstLastBr ?? false)
      setSearchParams(params, { replace: true })
    })
    return () => subscription.unsubscribe()
  }, [watch, setSearchParams])

  const studentsQuery = useQuery<UserDto[], Error>({
    queryKey: ["agCreateStudents", userId, selectedClassId],
    enabled: !!userId && !!selectedClassId,
    queryFn: () =>
      userApi.userQueryUsers(null, null, UserRole.STUDENT, selectedClassId ?? null).then(r => r.data.users ?? [])
  })

  useEffect(() => {
    if (!selectedClassId || !studentsQuery.data?.length) return
    if (studentsInitializedClassRef.current === selectedClassId) return
    setValue("students", studentsQuery.data.map(student => student.id))
    studentsInitializedClassRef.current = selectedClassId
  }, [selectedClassId, setValue, studentsQuery.data])

  const createMutation = useMutation<AxiosResponse<unknown>, AxiosError<ApiProblemDetails>, CreateFormValues>({
    mutationFn: async data => {
      const payload = {
        name: data.name,
        description: data.description || null,
        classId: data.classId!,
        students: data.students.length ? data.students : null,
        type: data.type,
        startDate: data.startDate,
        deadline: data.deadline,
        numberOfRecords: data.numberOfRecords,
        ipCat: data.ipCat
      }

      if (data.type === AssignmentGroupType.Idnet) {
        return assignmentGroupApi.assignmentGroupCreateIdNetAssignmentGroup({
          ...payload,
          possibleOctets: data.possibleOctets,
          testWildcard: data.testWildcard,
          testFirstLastBr: data.testFirstLastBr
        })
      }

      return assignmentGroupApi.assignmentGroupCreateSubnetAssignmentGroup({
        ...payload,
        hostSortStrategy: data.hostSortStrategy,
        difficulty: data.difficulty
      })
    },
    onSuccess: (_response, variables) => {
      onAfterCreate(variables.classId ?? undefined)
      reset()
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

  if (classesQuery.isLoading) return <AGFormSkeleton />
  if (classesQuery.isError) return <ErrorLoading onRetry={() => classesQuery.refetch()} />

  const hasStudentsInClass = (studentsQuery.data?.length ?? 0) > 0
  const hasSelectedStudents = (selectedStudents?.length ?? 0) > 0
  const canSubmit = !!nameValue?.trim() && !!startDateValue && !!deadlineValue && !!selectedClassId && hasStudentsInClass && hasSelectedStudents && !createMutation.isPending

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {alert && <CustomAlert severity={alert.severity} message={alert.message} onClose={() => setAlert(null)} />}

      <Card variant="outlined">
        <CardContent>
          <Box
            component="form"
            onSubmit={handleSubmit(data => createMutation.mutate(data))}
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 3,
              "& .MuiToggleButton-root": { textTransform: "none" },
              "& .MuiButton-root": { textTransform: "none" }
            }}
          >
            <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ width: "100%" }}>
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
                      label={t(TranslationKey.AG_CREATE_ASSIGNMENT_GROUP_NAME)}
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
                      label={t(TranslationKey.AG_CREATE_ASSIGNMENT_GROUP_DESCRIPTION)}
                      fullWidth
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
                <AGClassSelector
                  classes={classesQuery.data ?? []}
                  selectedClassId={selectedClassId}
                  onChange={classId => setValue("classId", classId)}
                />
                <AGTypeIpCatSelector
                  selectedType={selectedType}
                  selectedIpCat={selectedIpCat}
                  onTypeChange={type => setValue("type", type)}
                  onIpCatChange={cat => setValue("ipCat", cat)}
                  labels={{
                    typeLabel: t(TranslationKey.AG_CREATE_ASSIGNMENT_GROUP_TYPE),
                    subnet: t(TranslationKey.AG_CREATE_ASSIGNMENT_GROUP_TYPE_SUBNET),
                    idnet: t(TranslationKey.AG_CREATE_ASSIGNMENT_GROUP_TYPE_IDNET),
                    ipCatLabel: t(TranslationKey.AG_CREATE_ASSIGNMENT_GROUP_IP_CATEGORY),
                    ipCatAbc: t(TranslationKey.AG_CREATE_ASSIGNMENT_GROUP_IP_CAT_ABC),
                    ipCatAll: t(TranslationKey.AG_CREATE_ASSIGNMENT_GROUP_IP_CAT_ALL),
                    ipCatLocal: t(TranslationKey.AG_CREATE_ASSIGNMENT_GROUP_IP_CAT_LOCAL)
                  }}
                />
              </Stack>

              <AGDateColumn
                control={control}
                startDateError={errors.startDate}
                deadlineError={errors.deadline}
                onApplyQuickDuration={applyQuickDuration}
                labels={{
                  startDate: t(TranslationKey.AG_CREATE_ASSIGNMENT_GROUP_START_DATE),
                  deadline: t(TranslationKey.AG_CREATE_ASSIGNMENT_GROUP_DEADLINE)
                }}
              />
            </Stack>

            <AGTypeSpecificSettings
              control={control}
              selectedType={selectedType}
              numberOfRecordsError={errors.numberOfRecords}
              possibleOctetsError={errors.possibleOctets}
              labels={{
                numberOfRecords: t(TranslationKey.AG_CREATE_ASSIGNMENT_GROUP_NUMBER_OF_RECORDS),
                numberOfRecordsRange: t(TranslationKey.AG_CREATE_ASSIGNMENT_GROUP_NUMBER_OF_RECORDS_RANGE),
                increaseNumberOfRecords: t(TranslationKey.AG_CREATE_ASSIGNMENT_GROUP_NUMBER_FIELD_INCREASE),
                decreaseNumberOfRecords: t(TranslationKey.AG_CREATE_ASSIGNMENT_GROUP_NUMBER_FIELD_DECREASE),
                difficulty: t(TranslationKey.AG_CREATE_ASSIGNMENT_GROUP_DIFFICULTY),
                difficultyTooltip: t(TranslationKey.AG_CREATE_ASSIGNMENT_GROUP_DIFFICULTY_TOOLTIP),
                easy: t(TranslationKey.AG_CREATE_ASSIGNMENT_GROUP_DIFFICULTY_EASY),
                medium: t(TranslationKey.AG_CREATE_ASSIGNMENT_GROUP_DIFFICULTY_MEDIUM),
                hard: t(TranslationKey.AG_CREATE_ASSIGNMENT_GROUP_DIFFICULTY_HARD),
                hostSort: t(TranslationKey.AG_CREATE_ASSIGNMENT_GROUP_HOST_SORT),
                random: t(TranslationKey.AG_CREATE_ASSIGNMENT_GROUP_HOST_SORT_RANDOM),
                ascending: t(TranslationKey.AG_CREATE_ASSIGNMENT_GROUP_HOST_SORT_ASCENDING),
                descending: t(TranslationKey.AG_CREATE_ASSIGNMENT_GROUP_HOST_SORT_DESCENDING),
                possibleOctets: t(TranslationKey.AG_CREATE_ASSIGNMENT_GROUP_POSSIBLE_OCTETS),
                possibleOctetsRange: t(TranslationKey.AG_CREATE_ASSIGNMENT_GROUP_POSSIBLE_OCTETS_RANGE),
                testWildcard: t(TranslationKey.AG_CREATE_ASSIGNMENT_GROUP_TEST_WILDCARD),
                testFirstLastBr: t(TranslationKey.AG_CREATE_ASSIGNMENT_GROUP_TEST_FIRST_LAST_BR)
              }}
            />

            <Controller
              name="students"
              control={control}
              render={({ field }) => (
                <Accordion disableGutters>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="body2" fontWeight={600}>
                      {t(TranslationKey.AG_CREATE_ASSIGNMENT_GROUP_STUDENTS)} ({field.value.length})
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

            {selectedClassId && !studentsQuery.isLoading && !hasStudentsInClass && (
              <Typography variant="caption" color="error.main">
                {t(TranslationKey.AG_CREATE_ASSIGNMENT_GROUP_NO_STUDENTS)}
              </Typography>
            )}

            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
              <Button onClick={() => navigate(-1)}>
                {t(TranslationKey.AG_CREATE_ASSIGNMENT_GROUP_CANCEL)}
              </Button>
              <Button type="submit" variant="contained" color="success" disabled={!canSubmit}>
                {createMutation.isPending
                  ? t(TranslationKey.AG_CREATE_ASSIGNMENT_GROUP_LOADING)
                  : t(TranslationKey.AG_CREATE_ASSIGNMENT_GROUP_CREATE)}
              </Button>
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}

export default AGCreateAssignmentGroupFeature