import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  InputLabel,
  ListItemText,
  MenuItem,
  OutlinedInput,
  Select,
  TextField,
  Tooltip,
  Typography
} from "@mui/material"
import { useTranslation } from "react-i18next"
import {
  AssignmentGroupState,
  type ApiProblemDetails,
  type AssignmentGroupDto,
  type ClassDto,
  type CreateAssignmentGroupRes,
  type UserDto
} from "../../dtos"
import { Language, TranslationKey } from "../../utils/i18n"
import { assignmentGroupApi, classApi, userApi } from "../../utils/apiClients"
import { useAuth } from "../../contexts/AuthContext"
import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  getParametrizedUrl,
  RouteKeys,
  RouteParams,
  Routes
} from "../../router/routes"
import type ISelectedClass from "../../types/ISelectedClass"
import ActionPanel from "../../components/ActionPanel"
import SelectSearchField from "../../components/SelectSearchField"
import DeleteDialog from "../../components/DeleteDialog"
import UserRole from "../../types/UserRole"
import {
  LocalizationProvider,
  renderTimeViewClock,
  DateTimePicker
} from "@mui/x-date-pickers"
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns"
import { getStateMap } from "../../utils/getStateMap"
import { Controller, useForm } from "react-hook-form"
import FormRules from "../../utils/FormRules"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import ErrorLoading from "../../components/ErrorLoading"
import CardsSkeleton from "../../components/CardsSkeleton"
import type { AxiosError, AxiosResponse } from "axios"
import { CustomAlert, type CustomAlertState } from "../../components/CustomAlert"

interface IAssignmentGroupCardProps {
  id: number
  name: string
  successRate: number
  submitted: number
  total: number
  state: AssignmentGroupState
  startDate: string
  deadline: string
  selected: boolean
  onSelect?: (selected: boolean) => void
  className?: string
  description?: string
}

const AssignmentGroupCard = ({
  id,
  name,
  successRate,
  submitted,
  total,
  state,
  startDate,
  deadline,
  selected,
  onSelect,
  className,
  description
}: IAssignmentGroupCardProps) => {
  const { t } = useTranslation()
  const stateMap = getStateMap(t)
  const navigate = useNavigate()

  return (
    <Tooltip title={description ?? ""}>
      <Card
        variant="outlined"
        sx={{
          width: 320,
          minWidth: 320,
          maxWidth: 320,
          borderColor: selected ? "primary.main" : "divider",
            borderWidth: 2,
          borderStyle: "solid",
          cursor: onSelect ? "pointer" : "default",
          boxShadow: selected ? 2 : 0,
          transition: "box-shadow 0.2s, border-color 0.2s",
          backgroundColor: selected ? "action.selected" : "background.paper"
        }}
        onClick={() => onSelect && onSelect(!selected)}
      >
        <CardHeader
          title={
            <Typography variant="h5" fontWeight="bold">
              {name}
            </Typography>
          }
          action={
            <Chip
              label={stateMap[state]?.label ?? t("unknown")}
              color={
                state === AssignmentGroupState.Ended
                  ? "success"
                  : state === AssignmentGroupState.InProgress
                  ? "warning"
                  : state === AssignmentGroupState.Upcoming
                  ? "default"
                  : "default"
              }
              variant="outlined"
            />
          }
        />
        <CardContent
          sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}
        >
          {className && (
            <Typography variant="body2" color="textSecondary">
              <strong>
                {t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_CARD_CLASS)}:
              </strong>{" "}
              {className}
            </Typography>
          )}
          <Typography variant="body2" color="textSecondary">
            <strong>
              {t(
                TranslationKey.TEACHER_ASSIGNMENT_GROUPS_CARD_SUBMITTED
              )}
              :
            </strong>{" "}
            {submitted}/{total}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            <strong>
              {t(
                TranslationKey.TEACHER_ASSIGNMENT_GROUPS_CARD_SUCCESS_RATE
              )}
              :
            </strong>{" "}
            {successRate}%
          </Typography>
          <Typography variant="body2" color="textSecondary">
            <strong>
              {t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_CARD_START_DATE)}:
            </strong>{" "}
            {startDate}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            <strong>
              {t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_CARD_DEADLINE)}:
            </strong>{" "}
            {deadline}
          </Typography>
          <Button
            onClick={() =>
              navigate(
                getParametrizedUrl(
                  RouteKeys.TEACHER_ASSIGNMENT_GROUPS_DETAILS,
                  {
                    [RouteParams.ASSIGNMENT_GROUP_ID]: id.toString()
                  }
                )
              )
            }
            variant="outlined"
            color="primary"
            fullWidth
            sx={{ mt: 1 }}
          >
            {t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_CARD_DETAILS)}
          </Button>
        </CardContent>
      </Card>
    </Tooltip>
  )
}

interface ISelectedAssignmentGroups {
  assignmentGroupId: number
  assignmentGroupName: string
}

type CreateAssignmentGroupFormValues = {
  assignmentGroupName: string
  description: string
  numberOfRecords: number
  possibleAttempts: number
  studentsIds: number[]
  startDate: string
  deadline: string
}

type EditAssignmentGroupFormValues = {
  assignmentGroupName: string
  description: string
  possibleAttempts: number
  studentsIds: number[]
  startDate: string
  deadline: string
}

const TeacherAssignmentGroups = () => {
  const { t, i18n } = useTranslation()
  const { userId } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [selectedStudentUsernames, setSelectedStudentUsernames] = useState<string[]>([]);

  const [selectedClass, setSelectedClass] = useState<ISelectedClass | null>(null)
  const [selectedAssignmentGroups, setSelectedAssignmentGroups] = useState<ISelectedAssignmentGroups[]>([])
  const [
    createAssignmentGroupDialogVis,
    setCreateAssignmentGroupDialogVis
  ] = useState(false)
  const [
    deleteAssignmentGroupsDialogVis,
    setDeleteAssignmentGroupsDialogVis
  ] = useState(false)
  const [
    editAssignmentGroupDialogVis,
    setEditAssignmentGroupDialogVis
  ] = useState(false)

  const getCreateAssignmentGroupDefaults = (): CreateAssignmentGroupFormValues => ({
    assignmentGroupName: "",
    description: "",
    numberOfRecords: 6,
    possibleAttempts: 1,
    studentsIds: [],
    startDate: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes from now
    deadline: new Date(
      new Date().setDate(new Date().getDate() + 7) // 7 days from now
    ).toISOString()
  })

  const {
    control: createAGControl,
    handleSubmit: handleCreateAGSubmit,
    reset: resetCreateAG,
    watch: watchCreateAG,
    getValues,
    formState: { errors: createAGErrors }
  } = useForm<CreateAssignmentGroupFormValues>({
    defaultValues: getCreateAssignmentGroupDefaults(),
    mode: "onBlur"
  })

  const {
    control: editAGControl,
    handleSubmit: handleEditAGSubmit,
    reset: resetEditAG,
    watch: watchEditAG,
    formState: { errors: editAGErrors }
  } = useForm<EditAssignmentGroupFormValues>({
    defaultValues: {
      assignmentGroupName: "",
      description: "",
      possibleAttempts: 1,
      studentsIds: [],
      startDate: new Date().toISOString(),
      deadline: new Date().toISOString()
    },
    mode: "onBlur"
  })

  const agWatch = watchCreateAG()
  const editWatch = watchEditAG()

  const skLocaleDateTime = {
    cancelButtonLabel: t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_CANCEL),
    okButtonLabel: t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_OK),
    todayButtonLabel: t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_TODAY),
    clearButtonLabel: t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_CLEAR)
  }

  const [alert, setAlert] = useState<CustomAlertState | null>(null)

  const classesQuery = useQuery<ClassDto[], Error>({
    queryKey: ["teacherClasses", userId],
    enabled: !!userId,
    queryFn: () =>
      classApi.classQueryClasses(null, null, userId).then(r => r.data.classes),
    placeholderData: prev => prev
  })

  const classesWithAll: ISelectedClass[] = useMemo(() => {
    if (!classesQuery.data) return []
    return [
      {
        classId: 0,
        className: t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_ALL_CLASSES)
      },
      ...classesQuery.data.map(c => ({
        classId: c.classId,
        className: c.className
      }))
    ]
  }, [classesQuery.data, t])

  useEffect(() => {
    if (classesWithAll.length === 0) {
      setSelectedClass(null)
      return
    }
    if (!selectedClass) {
      setSelectedClass(classesWithAll[0])
      return
    }
    if (selectedClass.classId === 0) {
      const all = classesWithAll[0]
      if (all.className !== selectedClass.className) {
        setSelectedClass(all)
      }
    }
    if (
      selectedClass.classId !== 0 &&
      !classesWithAll.some(c => c.classId === selectedClass.classId)
    ) {
      setSelectedClass(classesWithAll[0])
    }
  }, [classesWithAll, selectedClass])

  const assignmentGroupsQuery = useQuery<AssignmentGroupDto[], Error>({
    queryKey: [
      "assignmentGroups",
      userId,
      selectedClass?.classId ?? null
    ],
    enabled: !!userId && !!selectedClass,
    queryFn: () =>
      assignmentGroupApi
        .assignmentGroupQueryAssignmentGroups(
          null,
          selectedClass?.classId === 0 ? null : selectedClass?.classId,
          userId
        )
        .then(r => r.data.assignmentGroups ?? []),
    placeholderData: prev => prev
  })

  const selectedEditId =
  editAssignmentGroupDialogVis && selectedAssignmentGroups.length === 1
    ? selectedAssignmentGroups[0].assignmentGroupId
    : null

  const assignmentGroupDetailsQuery = useQuery({
    queryKey: ["assignmentGroupDetails", selectedEditId],
    enabled: !!selectedEditId,
    queryFn: () =>
      assignmentGroupApi
        .assignmentGroupQueryAssignmentGroupDetails(selectedEditId!)
        .then(r => r.data),
    placeholderData: prev => prev
  })

  const studentsQueryClassId = useMemo(() => {
    const editClassId = (assignmentGroupDetailsQuery.data as any)?.classId as number | undefined
    if (editAssignmentGroupDialogVis && editClassId) return editClassId
    const sc = selectedClass?.classId
    return sc === 0 ? null : sc ?? null
  }, [
    assignmentGroupDetailsQuery.data,
    editAssignmentGroupDialogVis,
    selectedClass
  ])

  const studentsQuery = useQuery<UserDto[], Error>({
    queryKey: [
      "assignmentGroupStudents",
      userId,
      studentsQueryClassId
    ],
    enabled: !!userId && (studentsQueryClassId !== undefined),
    queryFn: () =>
      userApi
        .userQueryUsers(
          null,
          null,
          UserRole.STUDENT,
          studentsQueryClassId ?? null
        )
        .then(r => r.data.users ?? []),
    placeholderData: prev => prev
  })

  const createAssignmentGroupMutation = useMutation<
    AxiosResponse<CreateAssignmentGroupRes>,
    AxiosError<ApiProblemDetails>,
    CreateAssignmentGroupFormValues
  >({
    mutationFn: (data) =>
      assignmentGroupApi.assignmentGroupCreateAssignmentGroup({
        assignmentGroupName: data.assignmentGroupName,
        description: data.description,
        numberOfRecords: data.numberOfRecords,
        possibleAttempts: data.possibleAttempts,
        classId: selectedClass!.classId,
        students: data.studentsIds.length === 0 ? null : data.studentsIds,
        startDate: data.startDate,
        deadline: data.deadline
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assignmentGroups"] })
      setAlert({
        severity: "success",
        message: t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_CREATE_SUCCESS, {
          value: agWatch.assignmentGroupName
        })
      })
    },
    onError: (error) => {
      const details = error.response?.data
      const localMessage =
        i18n.language === Language.EN
          ? details?.messageEn
          : details?.messageSk
      setAlert({
        severity: "error",
        message: `${t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_CREATE_ERROR)}. ${localMessage ?? ""}`
      })
    }
  })

  const deleteAssignmentGroupsMutation = useMutation<
    AxiosResponse,
    AxiosError<ApiProblemDetails>,
    ISelectedAssignmentGroups["assignmentGroupId"][]
  >({
    mutationFn: (ids) =>
      assignmentGroupApi.assignmentGroupDeleteAssignmentGroups({
        assignmentGroupIds: ids
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assignmentGroups"] })
      setAlert({
        severity: "success",
        message: t(
          TranslationKey.TEACHER_ASSIGNMENT_GROUPS_DELETE_SUCCESS,
          {
            value: selectedAssignmentGroups
              .map(g => g.assignmentGroupName)
              .join(", ")
          }
        )
      })
    },
    onError: (error) => {
      const details = error.response?.data
      const localMessage =
        i18n.language === Language.EN
          ? details?.messageEn
          : details?.messageSk
      setAlert({
        severity: "error",
        message: `${t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_DELETE_ERROR)}. ${localMessage ?? ""}`
      })
    }
  })

  const editAssignmentGroupMutation = useMutation<
    AxiosResponse,
    AxiosError<ApiProblemDetails>,
    EditAssignmentGroupFormValues
  >({
    mutationFn: (data) =>
      assignmentGroupApi.assignmentGroupEditAssignmentGroups({
        id: selectedEditId!,
        assignmentGroupName: data.assignmentGroupName,
        description: data.description,
        possibleAttempts: data.possibleAttempts,
        students:
          data.studentsIds.length === 0 ? null : data.studentsIds,
        startDate: data.startDate,
        deadline: data.deadline
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assignmentGroups"] })
      if (selectedEditId) {
        queryClient.invalidateQueries({
          queryKey: ["assignmentGroupDetails", selectedEditId]
        })
      }
      setAlert({
        severity: "success",
        message: t(
          TranslationKey.TEACHER_ASSIGNMENT_GROUPS_EDIT_SUCCESS,
          { value: editWatch.assignmentGroupName }
        )
      })
    },
    onError: (error) => {
      const details = error.response?.data
      const localMessage =
        i18n.language === Language.EN
          ? details?.messageEn
          : details?.messageSk
      setAlert({
        severity: "error",
        message: `${t(
          TranslationKey.TEACHER_ASSIGNMENT_GROUPS_EDIT_ERROR
        )}. ${localMessage ?? ""}`
      })
    }
  })

  const handleCreateAssignmentGroup = async (
    data: CreateAssignmentGroupFormValues
  ) => {
    if (!selectedClass) return
    await createAssignmentGroupMutation.mutateAsync(data).catch(() => {})
    setCreateAssignmentGroupDialogVis(false)
    resetCreateAG(getCreateAssignmentGroupDefaults())
  }

  const handleDeleteAssignmentGroups = async () => {
    if (selectedAssignmentGroups.length === 0) return
    await deleteAssignmentGroupsMutation
      .mutateAsync(
        selectedAssignmentGroups.map(g => g.assignmentGroupId)
      )
      .catch(() => {})
    setSelectedAssignmentGroups([])
    setDeleteAssignmentGroupsDialogVis(false)
  }

  const handleEditAssignmentGroup = async (
    data: EditAssignmentGroupFormValues
  ) => {
    if (!selectedEditId) return
    await editAssignmentGroupMutation.mutateAsync(data).catch(() => {})
    setEditAssignmentGroupDialogVis(false)
  }

  useEffect(() => {
    if (
      assignmentGroupDetailsQuery.isSuccess &&
      editAssignmentGroupDialogVis
    ) {
      const detail = assignmentGroupDetailsQuery.data;
  
      // getting student IDs and usernames from assignments
      const studentIds = detail.assignments?.map(
        (assignment: any) => assignment.studentId
      ) || [];
      const studentUsernames = detail.assignments?.map(
        (assignment: any) => assignment.studentUsername
      ) || [];
  
      resetEditAG({
        assignmentGroupName: detail.assignmentGroupName,
        description: detail.assignmentGroupDescription || "",
        possibleAttempts: detail.possibleAttempts,
        studentsIds: studentIds,
        startDate: detail.startDate,
        deadline: detail.deadline
      });
  
      setSelectedStudentUsernames(studentUsernames);
    }
  }, [
    assignmentGroupDetailsQuery.data,
    assignmentGroupDetailsQuery.isSuccess,
    editAssignmentGroupDialogVis,
    resetEditAG
  ]);

  const createAGDisabled =
    !agWatch.assignmentGroupName ||
    !agWatch.numberOfRecords ||
    !agWatch.possibleAttempts ||
    !agWatch.startDate ||
    !agWatch.deadline ||
    createAssignmentGroupMutation.isPending

  const editAGDisabled =
    !editWatch.assignmentGroupName ||
    !editWatch.possibleAttempts ||
    !editWatch.startDate ||
    !editWatch.deadline ||
    editAssignmentGroupMutation.isPending

  const showMainUI = classesWithAll.length > 1

  return (
    <>
      {classesQuery.isLoading && !showMainUI ? (
        <CardsSkeleton />
      ) : classesQuery.isError ? (
        <ErrorLoading
          onRetry={() =>
            queryClient.invalidateQueries({
              queryKey: ["teacherClasses"]
            })
          }
        />
      ) : showMainUI ? (
        <>
          <SelectSearchField
            label={t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_CLASS)}
            items={classesWithAll}
            value={selectedClass?.classId}
            onChange={item => setSelectedClass(item as ISelectedClass)}
            valueKey="classId"
            labelKey="className"
            sx={{ width: "30vw" }}
          />

          <Divider sx={{ my: 2 }} />

          <ActionPanel
            onAdd={() => {
              resetCreateAG(getCreateAssignmentGroupDefaults())
              setCreateAssignmentGroupDialogVis(true)
            }}
            onEdit={() => {
              if (selectedAssignmentGroups.length === 1) {
                setEditAssignmentGroupDialogVis(true)
              }
            }}
            onDetails={() => {}}
            onDelete={() => setDeleteAssignmentGroupsDialogVis(true)}
            disableAdd={selectedClass?.classId === 0}
            disableEdit={selectedAssignmentGroups.length !== 1}
            disableDelete={selectedAssignmentGroups.length === 0}
            showDetails={false}
            addLabel={t(
              TranslationKey.TEACHER_ASSIGNMENT_GROUPS_CREATE_ASSIGNMENT_GROUP
            )}
            title={t(
              TranslationKey.TEACHER_ASSIGNMENT_GROUPS_ASSIGNMENTS_IN_THIS_CLASS
            )}
          />

          {assignmentGroupsQuery.isLoading ? (
            <CardsSkeleton />
          ) : assignmentGroupsQuery.isError ? (
            <ErrorLoading
              onRetry={() =>
                queryClient.invalidateQueries({
                  queryKey: ["assignmentGroups"]
                })
              }
            />
          ) : (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
              {assignmentGroupsQuery.data?.map(ag => (
                <AssignmentGroupCard
                  id={ag.assignmentGroupId}
                  key={ag.assignmentGroupId}
                  name={ag.assignmentGroupName}
                  successRate={ag.successRate.toFixed(2) as unknown as number}
                  submitted={ag.submitted}
                  total={ag.total}
                  state={ag.state}
                  description={ag.assignmentGroupDescription || ""}
                  className={
                    selectedClass?.classId === 0 ? ag.className : undefined
                  }
                  startDate={new Date(ag.startDate).toLocaleString()}
                  deadline={new Date(ag.deadline).toLocaleString()}
                  selected={selectedAssignmentGroups.some(
                    g => g.assignmentGroupId === ag.assignmentGroupId
                  )}
                  onSelect={selected => {
                    setSelectedAssignmentGroups(prev =>
                      selected
                        ? [
                            ...prev,
                            {
                              assignmentGroupId: ag.assignmentGroupId,
                              assignmentGroupName: ag.assignmentGroupName
                            }
                          ]
                        : prev.filter(
                            g => g.assignmentGroupId !== ag.assignmentGroupId
                          )
                    )
                  }}
                />
              ))}
            </Box>
          )}

          <Dialog
            open={createAssignmentGroupDialogVis}
            onClose={() => setCreateAssignmentGroupDialogVis(false)}
            sx={{ "& .MuiDialog-paper": { width: "30vw" } }}
          >
            <form
              onSubmit={handleCreateAGSubmit(handleCreateAssignmentGroup)}
            >
              <DialogTitle>
                {t(
                  TranslationKey.TEACHER_ASSIGNMENT_GROUPS_CREATE_ASSIGNMENT
                )}
              </DialogTitle>
              <DialogContent>
                <Controller
                  name="assignmentGroupName"
                  control={createAGControl}
                  rules={{
                    ...FormRules.required(),
                    ...FormRules.minLengthShort(),
                    ...FormRules.maxLengthShort(),
                    ...FormRules.patternLettersNumbersSpaces()
                  }}
                  render={({ field }) => (
                    <TextField
                      margin="dense"
                      label={t(
                        TranslationKey.TEACHER_ASSIGNMENT_GROUPS_NAME
                      )}
                      fullWidth
                      {...field}
                      error={!!createAGErrors.assignmentGroupName}
                      helperText={
                        createAGErrors.assignmentGroupName
                          ? t(
                              createAGErrors.assignmentGroupName
                                .message as string
                            )
                          : ""
                      }
                    />
                  )}
                />
                <Controller
                  name="description"
                  control={createAGControl}
                  rules={{
                    ...FormRules.maxLengthLong(),
                    ...FormRules.patternLettersNumbersSpecialSpaces()
                  }}
                  render={({ field }) => (
                    <TextField
                      margin="dense"
                      label={t(
                        TranslationKey.TEACHER_ASSIGNMENT_GROUPS_DESCRIPTION
                      )}
                      fullWidth
                      {...field}
                      error={!!createAGErrors.description}
                      helperText={
                        createAGErrors.description
                          ? t(
                              createAGErrors.description.message as string
                            )
                          : ""
                      }
                    />
                  )}
                />
                <Controller
                  name="numberOfRecords"
                  control={createAGControl}
                  rules={{
                    ...FormRules.required(),
                    validate: v =>
                      v > 0 ||
                      t(TranslationKey.FORM_RULES_REQUIRED).toString()
                  }}
                  render={({ field }) => (
                    <Tooltip
                      title={t(
                        TranslationKey.TEACHER_ASSIGNMENT_GROUPS_NUMBER_OF_RECORDS_TOOLTIP
                      )}
                    >
                      <TextField
                        margin="dense"
                        label={t(
                          TranslationKey.TEACHER_ASSIGNMENT_GROUPS_NUMBER_OF_RECORDS
                        )}
                        type="number"
                        fullWidth
                        {...field}
                        onChange={e =>
                          field.onChange(Number(e.target.value))
                        }
                        error={!!createAGErrors.numberOfRecords}
                        helperText={
                          createAGErrors.numberOfRecords
                            ? createAGErrors.numberOfRecords.message?.toString()
                            : ""
                        }
                      />
                    </Tooltip>
                  )}
                />
                <Controller
                  name="possibleAttempts"
                  control={createAGControl}
                  rules={{
                    ...FormRules.required(),
                    validate: v =>
                      v > 0 ||
                      t(TranslationKey.FORM_RULES_REQUIRED).toString()
                  }}
                  render={({ field }) => (
                    <TextField
                      margin="dense"
                      label={t(
                        TranslationKey.TEACHER_ASSIGNMENT_GROUPS_POSSIBLE_ATTEMPTS
                      )}
                      type="number"
                      fullWidth
                      {...field}
                      onChange={e =>
                        field.onChange(Number(e.target.value))
                      }
                      error={!!createAGErrors.possibleAttempts}
                      helperText={
                        createAGErrors.possibleAttempts
                          ? createAGErrors.possibleAttempts.message?.toString()
                          : ""
                      }
                    />
                  )}
                />
                <Controller
                  name="studentsIds"
                  control={createAGControl}
                  render={({ field }) => (
                    <Tooltip
                      title={t(
                        TranslationKey.TEACHER_ASSIGNMENT_GROUPS_ALL_STUDENTS_INCLUDED_TOOLTIP
                      )}
                    >
                      <FormControl fullWidth margin="dense">
                        <InputLabel>
                          {t(
                            TranslationKey.TEACHER_ASSIGNMENT_GROUPS_STUDENTS
                          )}
                        </InputLabel>
                        <Select
                          multiple
                          value={field.value}
                          onChange={e =>
                            field.onChange(
                              Array.isArray(e.target.value)
                                ? e.target.value.map(Number)
                                : []
                            )
                          }
                          input={
                            <OutlinedInput
                              label={t(
                                TranslationKey.TEACHER_ASSIGNMENT_GROUPS_STUDENTS
                              )}
                            />
                          }
                          renderValue={selected =>
                            (studentsQuery.data ?? [])
                              .filter(c =>
                                (selected as (number | string)[]).includes(
                                  c.id
                                )
                              )
                              .map(c => c.username)
                              .join(", ")
                          }
                        >
                          {(studentsQuery.data ?? []).map(_student => (
                            <MenuItem key={_student.id} value={_student.id}>
                              <Checkbox
                                checked={
                                  (field.value ?? []).indexOf(_student.id) >
                                  -1
                                }
                              />
                              <ListItemText primary={_student.username} />
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Tooltip>
                  )}
                />
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <Controller
                    name="startDate"
                    control={createAGControl}
                    rules={{
                      ...FormRules.required()
                    }}
                    render={({ field }) => (
                      <DateTimePicker
                        label={t(
                          TranslationKey.TEACHER_ASSIGNMENT_GROUPS_START_DATE
                        )}
                        value={field.value ? new Date(field.value) : null}
                        onChange={date =>
                          field.onChange(
                            date ? date.toISOString() : ""
                          )
                        }
                        slotProps={{
                          textField: {
                            margin: "dense",
                            fullWidth: true,
                            InputLabelProps: { shrink: true },
                            error: !!createAGErrors.startDate,
                            helperText: createAGErrors.startDate
                              ? t(
                                  createAGErrors.startDate
                                    .message as string
                                )
                              : ""
                          }
                        }}
                        localeText={
                          i18n.language === Language.SK
                            ? skLocaleDateTime
                            : undefined
                        }
                        orientation="landscape"
                        disablePast
                        format="dd/MM/yyyy HH:mm"
                        ampm={false}
                        viewRenderers={{
                          hours: renderTimeViewClock,
                          minutes: renderTimeViewClock,
                          seconds: renderTimeViewClock
                        }}
                      />
                    )}
                  />
                  <Controller
                    name="deadline"
                    control={createAGControl}
                    rules={{
                      ...FormRules.required(),
                      validate: v => {
                        const start = new Date(
                          getValues("startDate")
                        ).getTime()
                        const end = new Date(v).getTime()
                        return (
                          end > start ||
                          t(TranslationKey.FORM_RULES_REQUIRED).toString()
                        )
                      }
                    }}
                    render={({ field }) => (
                      <DateTimePicker
                        label={t(
                          TranslationKey.TEACHER_ASSIGNMENT_GROUPS_DEADLINE
                        )}
                        value={field.value ? new Date(field.value) : null}
                        onChange={date =>
                          field.onChange(
                            date ? date.toISOString() : ""
                          )
                        }
                        slotProps={{
                          textField: {
                            margin: "dense",
                            fullWidth: true,
                            InputLabelProps: { shrink: true },
                            error: !!createAGErrors.deadline,
                            helperText: createAGErrors.deadline
                              ? t(
                                  createAGErrors.deadline
                                    .message as string
                                )
                              : ""
                          }
                        }}
                        localeText={
                          i18n.language === Language.SK
                            ? skLocaleDateTime
                            : undefined
                        }
                        orientation="landscape"
                        format="dd/MM/yyyy HH:mm"
                        ampm={false}
                        viewRenderers={{
                          hours: renderTimeViewClock,
                          minutes: renderTimeViewClock,
                          seconds: renderTimeViewClock
                        }}
                      />
                    )}
                  />
                </LocalizationProvider>
              </DialogContent>
              <DialogActions>
                <Button
                  onClick={() => {
                    setCreateAssignmentGroupDialogVis(false)
                    resetCreateAG(getCreateAssignmentGroupDefaults())
                  }}
                >
                  {t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_CANCEL)}
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  color="success"
                  disabled={createAGDisabled}
                >
                  {t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_CREATE)}
                </Button>
              </DialogActions>
            </form>
          </Dialog>

          <DeleteDialog
            open={deleteAssignmentGroupsDialogVis}
            onClose={() => setDeleteAssignmentGroupsDialogVis(false)}
            onConfirm={handleDeleteAssignmentGroups}
            question={t(
              TranslationKey.TEACHER_ASSIGNMENT_GROUPS_DELETE_CONFIRMATION_QUESTION
            )}
            title={t(
              TranslationKey.TEACHER_ASSIGNMENT_GROUPS_DELETE_CONFIRMATION_TITLE
            )}
            label={selectedAssignmentGroups
              .map(g => g.assignmentGroupName)
              .join(", ")}
          />

          <Dialog
            open={editAssignmentGroupDialogVis}
            onClose={() => {
              setEditAssignmentGroupDialogVis(false)
            }}
            sx={{ "& .MuiDialog-paper": { width: "30vw" } }}
          >
            <form
              onSubmit={handleEditAGSubmit(handleEditAssignmentGroup)}
            >
              <DialogTitle>
                {t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_EDIT_ASSIGNMENT_GROUP)}
              </DialogTitle>
              <DialogContent>
                {assignmentGroupDetailsQuery.isLoading ? (
                  <Typography variant="body2">
                    {t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_LOADING)}
                  </Typography>
                ) : assignmentGroupDetailsQuery.isError ? (
                  <Typography
                    variant="body2"
                    color="error"
                    sx={{ mb: 2 }}
                  >
                    {t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_EDIT_ERROR)}
                  </Typography>
                ) : (
                  <>
                    <Controller
                      name="assignmentGroupName"
                      control={editAGControl}
                      rules={{
                        ...FormRules.required(),
                        ...FormRules.minLengthShort(),
                        ...FormRules.maxLengthShort(),
                        ...FormRules.patternLettersNumbersSpaces()
                      }}
                      render={({ field }) => (
                        <TextField
                          margin="dense"
                          label={t(
                            TranslationKey.TEACHER_ASSIGNMENT_GROUPS_NAME
                          )}
                          fullWidth
                          {...field}
                          error={!!editAGErrors.assignmentGroupName}
                          helperText={
                            editAGErrors.assignmentGroupName
                              ? t(
                                  editAGErrors.assignmentGroupName
                                    .message as string
                                )
                              : ""
                          }
                        />
                      )}
                    />
                    <Controller
                      name="description"
                      control={editAGControl}
                      rules={{
                        ...FormRules.maxLengthLong(),
                        ...FormRules.patternLettersNumbersSpecialSpaces()
                      }}
                      render={({ field }) => (
                        <TextField
                          margin="dense"
                          label={t(
                            TranslationKey.TEACHER_ASSIGNMENT_GROUPS_DESCRIPTION
                          )}
                          fullWidth
                          {...field}
                          error={!!editAGErrors.description}
                          helperText={
                            editAGErrors.description
                              ? t(
                                  editAGErrors.description
                                    .message as string
                                )
                              : ""
                          }
                        />
                      )}
                    />
                    <Controller
                      name="possibleAttempts"
                      control={editAGControl}
                      rules={{
                        ...FormRules.required(),
                        validate: v =>
                          v > 0 ||
                          t(TranslationKey.FORM_RULES_REQUIRED).toString()
                      }}
                      render={({ field }) => (
                        <TextField
                          margin="dense"
                          type="number"
                          label={t(
                            TranslationKey.TEACHER_ASSIGNMENT_GROUPS_POSSIBLE_ATTEMPTS
                          )}
                          fullWidth
                          {...field}
                          onChange={e =>
                            field.onChange(Number(e.target.value))
                          }
                          error={!!editAGErrors.possibleAttempts}
                          helperText={
                            editAGErrors.possibleAttempts
                              ? editAGErrors.possibleAttempts.message?.toString()
                              : ""
                          }
                        />
                      )}
                    />
                    <Controller
                      name="studentsIds"
                      control={editAGControl}
                      render={({ field }) => (
                        <FormControl fullWidth margin="dense">
                          <InputLabel>
                            {t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_STUDENTS)}
                          </InputLabel>
                          <Select
                            multiple
                            value={selectedStudentUsernames} // Display usernames
                            onChange={e => {
                              const selectedUsernames = e.target.value as string[];
                              setSelectedStudentUsernames(selectedUsernames);

                              // Map usernames back to IDs for submission
                              const selectedIds = (studentsQuery.data ?? [])
                                .filter(student => selectedUsernames.includes(student.username))
                                .map(student => student.id);
                              field.onChange(selectedIds);
                            }}
                            input={
                              <OutlinedInput
                                label={t(
                                  TranslationKey.TEACHER_ASSIGNMENT_GROUPS_STUDENTS
                                )}
                              />
                            }
                            renderValue={selected => selected.join(", ")} // Display usernames
                          >
                            {(studentsQuery.data ?? []).map(student => (
                              <MenuItem key={student.id} value={student.username}>
                                <Checkbox
                                  checked={selectedStudentUsernames.includes(student.username)}
                                />
                                <ListItemText primary={student.username} />
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      )}
                    />
                    <LocalizationProvider dateAdapter={AdapterDateFns}>
                      <Controller
                        name="startDate"
                        control={editAGControl}
                        rules={{ ...FormRules.required() }}
                        render={({ field }) => (
                          <DateTimePicker
                            label={t(
                              TranslationKey.TEACHER_ASSIGNMENT_GROUPS_START_DATE
                            )}
                            value={
                              field.value ? new Date(field.value) : null
                            }
                            onChange={date =>
                              field.onChange(
                                date ? date.toISOString() : ""
                              )
                            }
                            slotProps={{
                              textField: {
                                margin: "dense",
                                fullWidth: true,
                                InputLabelProps: { shrink: true },
                                error: !!editAGErrors.startDate,
                                helperText: editAGErrors.startDate
                                  ? t(
                                      editAGErrors.startDate
                                        .message as string
                                    )
                                  : ""
                              }
                            }}
                            localeText={
                              i18n.language === Language.SK
                                ? skLocaleDateTime
                                : undefined
                            }
                            orientation="landscape"
                            format="dd/MM/yyyy HH:mm"
                            ampm={false}
                            viewRenderers={{
                              hours: renderTimeViewClock,
                              minutes: renderTimeViewClock,
                              seconds: renderTimeViewClock
                            }}
                          />
                        )}
                      />
                      <Controller
                        name="deadline"
                        control={editAGControl}
                        rules={{
                          ...FormRules.required(),
                          validate: v => {
                            const start = new Date(
                              editWatch.startDate
                            ).getTime()
                            const end = new Date(v).getTime()
                            return (
                              end > start ||
                              t(
                                TranslationKey.FORM_RULES_REQUIRED
                              ).toString()
                            )
                          }
                        }}
                        render={({ field }) => (
                          <DateTimePicker
                            label={t(
                              TranslationKey.TEACHER_ASSIGNMENT_GROUPS_DEADLINE
                            )}
                            value={
                              field.value ? new Date(field.value) : null
                            }
                            onChange={date =>
                              field.onChange(
                                date ? date.toISOString() : ""
                              )
                            }
                            slotProps={{
                              textField: {
                                margin: "dense",
                                fullWidth: true,
                                InputLabelProps: { shrink: true },
                                error: !!editAGErrors.deadline,
                                helperText: editAGErrors.deadline
                                  ? t(
                                      editAGErrors.deadline
                                        .message as string
                                    )
                                  : ""
                              }
                            }}
                            localeText={
                              i18n.language === Language.SK
                                ? skLocaleDateTime
                                : undefined
                            }
                            orientation="landscape"
                            format="dd/MM/yyyy HH:mm"
                            ampm={false}
                            viewRenderers={{
                              hours: renderTimeViewClock,
                              minutes: renderTimeViewClock,
                              seconds: renderTimeViewClock
                            }}
                          />
                        )}
                      />
                    </LocalizationProvider>
                  </>
                )}
              </DialogContent>
              <DialogActions>
                <Button
                  onClick={() => {
                    setEditAssignmentGroupDialogVis(false)
                  }}
                >
                  {t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_CANCEL)}
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  color="success"
                  disabled={
                    editAGDisabled ||
                    assignmentGroupDetailsQuery.isLoading ||
                    assignmentGroupDetailsQuery.isError
                  }
                >
                  {t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_SAVE)}
                </Button>
              </DialogActions>
            </form>
          </Dialog>
        </>
      ) : (
        <>
          <Box
            sx={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between"
            }}
          >
            <Typography variant="h6">
              {t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_NOCLASS)}
            </Typography>
            <Button
              variant="contained"
              color="info"
              onClick={() => navigate(Routes[RouteKeys.TEACHER_MY_CLASSES])}
            >
              {t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_NOCLASS_BUTTON)}
            </Button>
          </Box>
          <Divider sx={{ mt: 4 }} />
        </>
      )}

      {alert && (
        <CustomAlert
          severity={alert.severity}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}
    </>
  )
}

export default TeacherAssignmentGroups