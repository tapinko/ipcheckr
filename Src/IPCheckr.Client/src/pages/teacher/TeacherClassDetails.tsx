import AddIcon from "@mui/icons-material/Add"
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline"
import EditOutlinedIcon from "@mui/icons-material/EditOutlined"
import {
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useParams, useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { LazyBarChart, LazyLineChart } from "../../components/charts/LazyCharts"
import { useState, useEffect } from "react"
import { Controller, useForm } from "react-hook-form"
import InsightGridSkeleton from "../../components/skeletons/InsightGridSkeleton"
import ErrorLoading from "../../components/ui/ErrorLoading"
import { TranslationKey } from "../../utils/i18n"
import { classApi, userApi } from "../../utils/apiClients"
import { AuthType, AssignmentGroupType, type AddUserRes, type LdapUserDto, type QueryClassDetailsRes, type UserDto } from "../../dtos"
import { useAppConfig } from "../../contexts/AppConfigContext"
import {
  AccessTime,
  Class,
  Groups,
  Percent,
  Quiz,
  TaskAlt,
} from "@mui/icons-material"
import { getParametrizedUrl, RouteKeys, RouteParams, Routes } from "../../router/routes"
import InsightCard from "../../components/ui/InsightCard"
import InsightGrid from "../../components/ui/InsightGrid"
import { assignmentGroupApi } from "../../utils/apiClients"
import { toAssignmentTypeParam } from "../../utils/assignmentType"
import { CustomAlert, type CustomAlertState } from "../../components/ui/CustomAlert"
import DeleteDialog from "../../components/ui/DeleteDialog"
import FormRules from "../../utils/FormRules"
import i18n, { Language } from "../../utils/i18n"
import UserRole from "../../types/UserRole"
import axiosInstance from "../../utils/axiosInstance"
import type { AxiosError, AxiosResponse } from "axios"
import type { ApiProblemDetails } from "../../dtos"

const minLdapSearchChars = 2

type AddStudentFormValues = { username: string; password: string; role: string; classIds: number[] }

const TeacherClassDetails = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { [RouteParams.CLASS_ID]: classId } = useParams()

  const [alert, setAlert] = useState<CustomAlertState | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [pendingRemove, setPendingRemove] = useState<{ id: number; username: string } | null>(null)
  const [addStudentDialogOpen, setAddStudentDialogOpen] = useState(false)

  type EditFormValues = { className: string }
  const { control: editControl, handleSubmit: handleEditSubmit, reset: resetEdit, watch: watchEdit, formState: { errors: editErrors } } =
    useForm<EditFormValues>({ defaultValues: { className: "" }, mode: "onBlur" })
  const editClassName = watchEdit("className")

  const getAddDefaults = (): AddStudentFormValues => ({ username: "", password: "", role: UserRole.STUDENT, classIds: classId ? [Number(classId)] : [] })

  const {
    control: addControl, handleSubmit: handleAddSubmit,
    reset: resetAdd, watch: watchAdd,
    setError: setAddError, clearErrors: clearAddErrors,
    formState: { errors: addErrors }
  } = useForm<AddStudentFormValues>({ defaultValues: getAddDefaults(), mode: "onTouched" })

  const addValues = watchAdd()

  const detailsQuery = useQuery<QueryClassDetailsRes, Error>({
    queryKey: ["teacherClassDetails", classId],
    enabled: !!classId,
    queryFn: () => classApi.classQueryClassDetails(Number(classId)).then(r => r.data),
    placeholderData: prev => prev
  })

  const { config } = useAppConfig()
  const isLdapAuth = config?.authType === AuthType.Ldap

  const allStudentsQuery = useQuery<UserDto[], Error>({
    queryKey: ["allStudentsForClassAdd"],
    enabled: addStudentDialogOpen && !isLdapAuth,
    queryFn: () => userApi.userQueryUsers(null, null, UserRole.STUDENT).then(r => r.data.users ?? []),
    staleTime: 30_000
  })

  const existingStudentIds = new Set((detailsQuery.data?.students ?? []).map(s => s.studentId))
  const availableStudents = (allStudentsQuery.data ?? []).filter(u => !existingStudentIds.has(u.id))
  const isExistingStudentSelected = !isLdapAuth && availableStudents.some(
    s => s.username.trim().toLowerCase() === (addValues.username ?? "").trim().toLowerCase()
  )

  const closeAddDialog = () => { setAddStudentDialogOpen(false); resetAdd(getAddDefaults()) }

  const editClassMutation = useMutation({
    mutationFn: (className: string) =>
      classApi.classEditClass({ id: Number(classId), classname: className }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacherClassDetails", classId] })
      setAlert({ severity: "success", message: t(TranslationKey.TEACHER_CLASS_DETAILS_EDIT_SUCCESS) })
      setEditDialogOpen(false)
    },
    onError: (error: any) => {
      const msg = i18n.language === Language.EN ? error?.response?.data?.messageEn : error?.response?.data?.messageSk
      setAlert({ severity: "error", message: `${t(TranslationKey.TEACHER_CLASS_DETAILS_EDIT_ERROR)}. ${msg ?? ""}` })
    }
  })

  const deleteClassMutation = useMutation({
    mutationFn: () => classApi.classDeleteClasses({ classIds: [Number(classId)] }),
    onSuccess: () => {
      navigate(Routes[RouteKeys.TEACHER_MY_CLASSES])
    },
    onError: (error: any) => {
      const msg = i18n.language === Language.EN ? error?.response?.data?.messageEn : error?.response?.data?.messageSk
      setAlert({ severity: "error", message: `${t(TranslationKey.TEACHER_CLASS_DETAILS_DELETE_ERROR)}. ${msg ?? ""}` })
      setDeleteDialogOpen(false)
    }
  })

  const removeStudentMutation = useMutation({
    mutationFn: (studentId: number) => {
      const remaining = (detailsQuery.data?.students ?? []).filter(s => s.studentId !== studentId).map(s => s.studentId)
      return classApi.classEditClass({ id: Number(classId), students: remaining })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacherClassDetails", classId] })
      setAlert({ severity: "success", message: t(TranslationKey.TEACHER_CLASS_DETAILS_REMOVE_SUCCESS) })
    },
    onError: (error: any) => {
      const msg = i18n.language === Language.EN ? error?.response?.data?.messageEn : error?.response?.data?.messageSk
      setAlert({ severity: "error", message: `${t(TranslationKey.TEACHER_CLASS_DETAILS_REMOVE_ERROR)}. ${msg ?? ""}` })
    }
  })

  const addStudentMutation = useMutation<AxiosResponse<AddUserRes>, AxiosError<ApiProblemDetails>, AddStudentFormValues>({
    mutationFn: data => {
      if (isLdapAuth || isExistingStudentSelected) {
        return axiosInstance.post<AddUserRes>("/api/classes/add-student", { username: data.username, classIds: data.classIds })
      }
      return userApi.userAddUser({ username: data.username, password: data.password, role: data.role, classIds: data.classIds })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacherClassDetails", classId] })
      setAlert({ severity: "success", message: t(TranslationKey.TEACHER_CLASS_DETAILS_ADD_SUCCESS) })
      closeAddDialog()
    },
    onError: error => {
      const msg = i18n.language === Language.EN ? error.response?.data?.messageEn : error.response?.data?.messageSk
      setAlert({ severity: "error", message: `${t(TranslationKey.TEACHER_CLASS_DETAILS_ADD_ERROR)}. ${msg ?? ""}` })
    }
  })

  const handleAddStudent = async (data: AddStudentFormValues) => {
    if (!isLdapAuth && !isExistingStudentSelected && !data.password?.trim()) {
      setAddError("password", { type: "manual", message: TranslationKey.FORM_RULES_REQUIRED as unknown as string })
      return
    }
    clearAddErrors("password")
    await addStudentMutation.mutateAsync(data).catch(() => {})
  }

  const addStudentDisabled =
    !addValues.username ||
    (!isLdapAuth && !isExistingStudentSelected && !addValues.password) ||
    addStudentMutation.isPending

  if (detailsQuery.isLoading && !detailsQuery.data) {
    return <InsightGridSkeleton count={9} columnsMax={3} />
  }

  if (detailsQuery.isError) {
    return (
      <ErrorLoading
        onRetry={() =>
          queryClient.invalidateQueries({ queryKey: ["teacherClassDetails", classId] })
        }
      />
    )
  }

  const avgStudents = detailsQuery.data?.averageSuccessRateInStudents ?? []
  const avgGroups = detailsQuery.data?.averageSuccessRateInAssignmentGroups ?? []

  const hasLastSubmitTarget =
    !!detailsQuery.data?.lastSubmitGroupId &&
    !!detailsQuery.data?.lastSubmitId &&
    !!detailsQuery.data?.lastSubmitUsername

  const handleLastSubmitNavigate = async () => {
    if (!detailsQuery.data?.lastSubmitGroupId || !detailsQuery.data?.lastSubmitId) return

    let resolvedType: AssignmentGroupType | null = null
    try {
      await assignmentGroupApi.assignmentGroupQuerySubnetAssignmentGroupDetails(detailsQuery.data.lastSubmitGroupId)
      resolvedType = AssignmentGroupType.Subnet
    } catch {
      try {
        await assignmentGroupApi.assignmentGroupQueryIdNetAssignmentGroupDetails(detailsQuery.data.lastSubmitGroupId)
        resolvedType = AssignmentGroupType.Idnet
      } catch {
        return
      }
    }

    navigate(
      getParametrizedUrl(RouteKeys.TEACHER_ASSIGNMENT_GROUPS_DETAILS_SUBMIT, {
        [RouteParams.ASSIGNMENT_GROUP_ID]: detailsQuery.data.lastSubmitGroupId.toString(),
        [RouteParams.ASSIGNMENT_ID]: detailsQuery.data.lastSubmitId.toString(),
        [RouteParams.ASSIGNMENT_GROUP_TYPE]: toAssignmentTypeParam(resolvedType)
      })
    )
  }

  const addButtonSx = {
    border: (theme: any) => `1px solid ${theme.palette.success.main}`,
    width: 20,
    height: 20,
    color: (theme: any) => theme.palette.success.dark,
    "& .MuiSvgIcon-root": { fontSize: 14 },
    mb: "1px"
  }

  return (
    <>
      {alert && <CustomAlert {...alert} onClose={() => setAlert(null)} />}
      <Stack spacing={2}>
        <Card variant="outlined" sx={{ borderColor: "divider", backgroundColor: "background.paper" }}>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
              <Class fontSize="small" color="action" />
              <Typography variant="h6" fontWeight={800} sx={{ flex: 1 }}>
                {detailsQuery.data?.className ?? "-"}
              </Typography>
              <Tooltip title={t(TranslationKey.TEACHER_CLASS_DETAILS_EDIT_TOOLTIP)}>
                <IconButton
                  size="small"
                  onClick={() => { resetEdit({ className: detailsQuery.data?.className ?? "" }); setEditDialogOpen(true) }}
                >
                  <EditOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title={t(TranslationKey.TEACHER_CLASS_DETAILS_DELETE_TOOLTIP)}>
                <IconButton size="small" onClick={() => setDeleteDialogOpen(true)}>
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          </CardContent>
        </Card>

       <InsightGrid
          spacing={1.25}
          columnsMax={3}
          items={[
            <InsightCard
              title={t(TranslationKey.TEACHER_CLASS_DETAILS_TEACHERS)}
              value={detailsQuery.data?.teachers
                && detailsQuery.data?.teachers.map(t => t.username).join(", ")}
              icon={<Groups />}
              dense
            />,
            <Tooltip
              title={t(TranslationKey.TEACHER_CLASS_DETAILS_AVERAGE_SUCCESS_RATE_TOOLTIP)}
            >
              <Box>
                <InsightCard
                  title={t(TranslationKey.TEACHER_CLASS_DETAILS_AVERAGE_SUCCESS_RATE)}
                  value={detailsQuery.data && detailsQuery.data.totalSubmits > 0 ? `${detailsQuery.data.averageSuccessRate.toFixed(2)}%` : (detailsQuery.data ? t(TranslationKey.TEACHER_ASSIGNMENT_GROUP_DETAILS_CARD_UNSUBMITTED) : "0.00%")}
                  icon={<Percent />}
                  tone="success"
                  dense
                />
              </Box>
            </Tooltip>,
            <Box
              onClick={() => {
                void handleLastSubmitNavigate()
              }}
              sx={{
                cursor: hasLastSubmitTarget ? "pointer" : "default",
                "&:hover .last-submit-link-value":
                  hasLastSubmitTarget
                    ? { textDecoration: "underline" }
                    : undefined
              }}
            >
              <InsightCard
                title={t(TranslationKey.TEACHER_CLASS_DETAILS_LAST_SUBMIT)}
                value={
                  <Box component="span" className="last-submit-link-value" sx={{ fontWeight: "inherit", fontSize: "inherit" }}>
                    {detailsQuery.data?.lastSubmitUsername ?? "-"}
                  </Box>
                }
                icon={<AccessTime />}
                dense
              />
            </Box>,
            <InsightCard
              title={t(TranslationKey.TEACHER_CLASS_DETAILS_TOTAL_SUBMITS)}
              value={detailsQuery.data?.totalSubmits ?? "-"}
              icon={<TaskAlt />}
              tone="info"
              dense
            />,
            <InsightCard
              title={t(TranslationKey.TEACHER_CLASS_DETAILS_TOTAL_ASSIGNMENT_GROUPS)}
              value={detailsQuery.data?.totalAssignmentGroups ?? "-"}
              icon={<Quiz />}
              dense
            />,
            <InsightCard
              title={t(TranslationKey.TEACHER_CLASS_DETAILS_TOTAL_UPCOMING)}
              value={detailsQuery.data?.totalUpcoming ?? "-"}
              icon={<AccessTime />}
              dense
            />,
            <InsightCard
              title={t(TranslationKey.TEACHER_CLASS_DETAILS_TOTAL_IN_PROGRESS)}
              value={detailsQuery.data?.totalInProgress ?? "-"}
              icon={<AccessTime />}
              tone="warning"
              dense
            />,
            <InsightCard
              title={t(TranslationKey.TEACHER_CLASS_DETAILS_TOTAL_ENDED)}
              value={detailsQuery.data?.totalEnded ?? "-"}
              icon={<AccessTime />}
              tone="success"
              dense
            />
          ]}
        />

        <Box>
          <Card variant="outlined">
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="overline" color="text.secondary">
                  {t(TranslationKey.TEACHER_CLASS_DETAILS_STUDENTS)}
                </Typography>
                <Tooltip title={t(TranslationKey.TEACHER_CLASS_DETAILS_ADD_STUDENT_TOOLTIP)}>
                  <IconButton size="small" onClick={() => { resetAdd(getAddDefaults()); setAddStudentDialogOpen(true) }} sx={addButtonSx}>
                    <AddIcon />
                  </IconButton>
                </Tooltip>
              </Stack>

              {detailsQuery.data?.students?.length ? (
                <Stack spacing={1} sx={{ mt: 1 }}>
                  {detailsQuery.data.students.map(s => (
                    <Stack
                      key={s.studentId}
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                      sx={{
                        border: theme => `1px solid ${theme.palette.divider}`,
                        borderRadius: 1,
                        p: 1,
                        cursor: "pointer",
                        "&:hover .student-link-value": { textDecoration: "underline" }
                      }}
                      onClick={() =>
                        navigate(
                          getParametrizedUrl(RouteKeys.TEACHER_MY_CLASSES_STUDENT_DETAILS, {
                            [RouteParams.STUDENT_ID]: s.studentId.toString()
                          })
                        )
                      }
                    >
                      <Typography variant="body2" className="student-link-value">{s.username}</Typography>
                      <IconButton
                        size="small"
                        onClick={e => { e.stopPropagation(); setPendingRemove({ id: s.studentId, username: s.username }) }}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {t(TranslationKey.TEACHER_CLASS_DETAILS_NO_STUDENTS)}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Box>

        <Stack spacing={2} direction={{ xs: "column", md: "row" }}>
          <Box sx={{ flex: { md: 3 }, width: "100%" }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="overline" color="text.secondary">
                  {t(TranslationKey.TEACHER_CLASS_DETAILS_AVERAGE_IN_STUDENTS)}
                </Typography>
                {(avgStudents.length ?? 0) > 0 ? (
                  <LazyBarChart
                    height={300}
                    xAxis={[{ scaleType: "band", data: avgStudents.map(s => s.username) }]}
                    series={[{ data: avgStudents.map(s => s.percentage), label: t(TranslationKey.TEACHER_CLASS_DETAILS_PERCENTAGE) }]}
                    yAxis={[{ min: 0, max: 100, valueFormatter: (v: number) => `${v}%` }]}
                    margin={{ left: 60, right: 80, top: 20, bottom: 40 }}
                  />
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    {t(TranslationKey.TEACHER_CLASS_DETAILS_NO_DATA)}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Box>

          <Box sx={{ flex: { md: 2 }, width: "100%" }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="overline" color="text.secondary">
                  {t(TranslationKey.TEACHER_CLASS_DETAILS_AVERAGE_IN_ASSIGNMENT_GROUPS)}
                </Typography>
                {(avgGroups.length ?? 0) > 0 ? (
                  <LazyLineChart
                    height={300}
                    xAxis={[{ scaleType: "point", data: avgGroups.map(g => g.assignmentGroupName) }]}
                    series={[{ data: avgGroups.map(g => g.percentage), label: t(TranslationKey.TEACHER_CLASS_DETAILS_PERCENTAGE), area: true }]}
                    yAxis={[{ min: 0, max: 100, valueFormatter: (v: number) => `${v}%` }]}
                    margin={{ left: 60, right: 80, top: 20, bottom: 40 }}
                  />
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    {t(TranslationKey.TEACHER_CLASS_DETAILS_NO_DATA)}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Box>
        </Stack>
      </Stack>

      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} fullWidth maxWidth="sm">
        <form onSubmit={handleEditSubmit(data => editClassMutation.mutate(data.className))}>
          <DialogTitle>{t(TranslationKey.TEACHER_CLASS_DETAILS_EDIT_CLASS)}</DialogTitle>
          <DialogContent>
            <Controller
              name="className"
              control={editControl}
              rules={{ ...FormRules.required(), ...FormRules.minLengthShort(), ...FormRules.maxLengthShort() }}
              render={({ field }) => (
                <TextField
                  {...field}
                  margin="dense"
                  fullWidth
                  label={t(TranslationKey.TEACHER_CLASS_DETAILS_CLASS_NAME)}
                  error={!!editErrors.className}
                  helperText={editErrors.className ? t(editErrors.className.message as string) : ""}
                />
              )}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialogOpen(false)}>{t(TranslationKey.TEACHER_CLASS_DETAILS_CANCEL)}</Button>
            <Button type="submit" variant="contained" color="success" disabled={!editClassName || editClassMutation.isPending}>
              {t(TranslationKey.TEACHER_CLASS_DETAILS_SAVE)}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={addStudentDialogOpen} onClose={closeAddDialog} fullWidth maxWidth="md">
        <form onSubmit={handleAddSubmit(handleAddStudent)}>
          <DialogTitle>{t(TranslationKey.TEACHER_CLASS_DETAILS_ADD_STUDENT)}</DialogTitle>
          <DialogContent>
            {isLdapAuth ? (
              <Controller
                name="username" control={addControl}
                rules={{ ...FormRules.required() }}
                render={({ field }) => (
                  <LdapUserSearch
                    onChange={field.onChange}
                    noOptionsText={t(TranslationKey.TEACHER_CLASS_DETAILS_NO_USERS_AVAILABLE)}
                    loadingText={t(TranslationKey.TEACHER_CLASS_DETAILS_LOADING)}
                    placeholder={t(TranslationKey.TEACHER_CLASS_DETAILS_LDAP_USERNAME_PLACEHOLDER, { value: minLdapSearchChars })}
                    label={t(TranslationKey.TEACHER_CLASS_DETAILS_USERNAME)}
                    error={!!addErrors.username}
                    helperText={addErrors.username ? t(addErrors.username.message as string) : ""}
                  />
                )}
              />
            ) : (
              <Controller
                name="username" control={addControl}
                rules={{ ...FormRules.required(), ...FormRules.minLengthShort(), ...FormRules.patternLettersNumbersDots() }}
                render={({ field }) => (
                  <Autocomplete
                    freeSolo
                    options={availableStudents}
                    getOptionLabel={o => typeof o === "string" ? o : o.username}
                    value={availableStudents.find(u => u.username === field.value) ?? null}
                    onChange={(_, value) => { field.onChange(typeof value === "string" ? value : value?.username ?? ""); clearAddErrors("password") }}
                    onInputChange={(_, value, reason) => { if (reason === "input" || reason === "clear") { field.onChange(value); clearAddErrors("password") } }}
                    noOptionsText={t(TranslationKey.TEACHER_CLASS_DETAILS_NO_USERS_AVAILABLE)}
                    renderInput={params => (
                      <TextField {...params} margin="dense" fullWidth
                        label={t(TranslationKey.TEACHER_CLASS_DETAILS_USERNAME)}
                        error={!!addErrors.username}
                        helperText={addErrors.username ? t(addErrors.username.message as string) : ""}
                      />
                    )}
                  />
                )}
              />
            )}
            {!isLdapAuth && (
              <Controller
                name="password" control={addControl}
                render={({ field }) => (
                  <TextField {...field} disabled={isExistingStudentSelected}
                    margin="dense" type="password" fullWidth
                    label={t(TranslationKey.TEACHER_CLASS_DETAILS_PASSWORD)}
                    error={!!addErrors.password}
                    helperText={isExistingStudentSelected ? "" : (addErrors.password ? t(addErrors.password.message as string) : "")}
                  />
                )}
              />
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={closeAddDialog}>{t(TranslationKey.TEACHER_CLASS_DETAILS_CANCEL)}</Button>
            <Button type="submit" variant="contained" color="success" disabled={addStudentDisabled}>
              {t(TranslationKey.TEACHER_CLASS_DETAILS_CONFIRM_ADD)}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <DeleteDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={() => deleteClassMutation.mutate()}
        title={t(TranslationKey.TEACHER_CLASS_DETAILS_DELETE_TITLE)}
        question={t(TranslationKey.TEACHER_CLASS_DETAILS_DELETE_QUESTION)}
        label={detailsQuery.data?.className}
      />
      <DeleteDialog
        open={!!pendingRemove}
        onClose={() => setPendingRemove(null)}
        onConfirm={() => pendingRemove && removeStudentMutation.mutate(pendingRemove.id)}
        title={t(TranslationKey.TEACHER_CLASS_DETAILS_REMOVE_STUDENT_TITLE)}
        question={t(TranslationKey.TEACHER_CLASS_DETAILS_REMOVE_STUDENT_QUESTION)}
        label={pendingRemove?.username}
      />
    </>
  )
}

type LdapUserSearchProps = {
  onChange: (val: string) => void
  noOptionsText: string
  loadingText: string
  placeholder: string
  label: string
  error?: boolean
  helperText?: string
}

const LdapUserSearch = ({ onChange, noOptionsText, loadingText, placeholder, label, error, helperText }: LdapUserSearchProps) => {
  const [options, setOptions] = useState<LdapUserDto[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const q = input.trim()
    if (!q || q.length < minLdapSearchChars) { setOptions([]); return }
    let cancelled = false
    setLoading(true)
    const timer = setTimeout(() => {
      userApi.userLdapSearchUsers(q).then(r => r.data.users)
        .then(users => { if (!cancelled) setOptions(users) })
        .finally(() => { if (!cancelled) setLoading(false) })
    }, 250)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [input])

  return (
    <Autocomplete
      loading={loading}
      options={options}
      getOptionLabel={o => o.username}
      noOptionsText={noOptionsText}
      loadingText={loadingText}
      onInputChange={(_, v) => setInput(v)}
      onChange={(_, v) => onChange(v ? (v as LdapUserDto).username : "")}
      renderInput={params => (
        <TextField
          {...params}
          margin="dense"
          fullWidth
          label={label}
          placeholder={placeholder}
          error={error}
          helperText={helperText}
        />
      )}
    />
  )
}

export default TeacherClassDetails