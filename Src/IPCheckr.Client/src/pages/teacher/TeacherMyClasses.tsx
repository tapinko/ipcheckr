import AddIcon from "@mui/icons-material/Add"
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline"
import EditOutlinedIcon from "@mui/icons-material/EditOutlined"
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined"
import SchoolIcon from "@mui/icons-material/School"
import {
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Tooltip,
} from "@mui/material"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { AxiosError, type AxiosResponse } from "axios"
import { useEffect, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { CustomAlert, type CustomAlertState } from "../../components/ui/CustomAlert"
import DeleteDialog from "../../components/ui/DeleteDialog"
import ErrorLoading from "../../components/ui/ErrorLoading"
import MyClassesSkeleton from "../../components/skeletons/MyClassesSkeleton"
import UserListPanel, { type UserRow } from "../../features/users/components/UserListPanel"
import LdapAutocompleteField from "../../features/users/components/LdapAutocompleteField"
import { useAuth } from "../../contexts/AuthContext"
import { AuthType } from "../../dtos"
import type { AddUserRes, ApiProblemDetails, ClassDto, UserDto } from "../../dtos"
import { useAppConfig } from "../../contexts/AppConfigContext"
import { classApi, userApi } from "../../utils/apiClients"
import axiosInstance from "../../utils/axiosInstance"
import FormRules from "../../utils/FormRules"
import i18n, { Language, TranslationKey } from "../../utils/i18n"
import { getParametrizedUrl, RouteKeys, RouteParams } from "../../router/routes"
import UserRole from "../../types/UserRole"

type CreateClassFormValues = {
  className: string
}

type EditClassFormValues = {
  className: string
  teachers: number[]
}

type AddStudentFormValues = {
  username: string
  password: string
  role: string
  classIds: number[]
}

const minLdapSearchChars = 2

const TeacherMyClasses = () => {
  const { t } = useTranslation()
  const { userId } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [selectedClassId, setSelectedClassId] = useState<number | null>(null)
  const [createDialogVis, setCreateDialogVis] = useState(false)
  const [editClassDialogVis, setEditClassDialogVis] = useState(false)
  const [deleteClassDialogVis, setDeleteClassDialogVis] = useState(false)
  const [removeSelfDialogVis, setRemoveSelfDialogVis] = useState(false)
  const [pendingEditData, setPendingEditData] = useState<EditClassFormValues | null>(null)

  const [studentSearch, setStudentSearch] = useState("")
  const [addStudentDialogVis, setAddStudentDialogVis] = useState(false)

  const [alert, setAlert] = useState<CustomAlertState | null>(null)

  const {
    handleSubmit: handleCreateSubmit, control: createControl,
    reset: resetCreate, watch: watchCreate, formState: { errors: createErrors }
  } = useForm<CreateClassFormValues>({ defaultValues: { className: "" }, mode: "onTouched" })

  const {
    handleSubmit: handleEditClassSubmit, control: editClassControl,
    reset: resetEditClass, watch: watchEditClass, setValue: setEditClassValue,
    formState: { errors: editClassErrors }
  } = useForm<EditClassFormValues>({
    defaultValues: { className: "", teachers: userId ? [userId] : [] }, mode: "onTouched"
  })

  const getAddStudentDefaults = (): AddStudentFormValues => ({
    username: "", password: "", role: UserRole.STUDENT,
    classIds: []
  })

  const {
    handleSubmit: handleAddStudentSubmit, control: addStudentControl,
    reset: resetAddStudent, watch: watchAddStudent,
    setError: setAddStudentError, clearErrors: clearAddStudentErrors,
    formState: { errors: addStudentErrors }
  } = useForm<AddStudentFormValues>({ defaultValues: getAddStudentDefaults(), mode: "onTouched" })

  const createClassNameValue = watchCreate("className")
  const editClassNameValue = watchEditClass("className")
  const editClassTeachersValue = watchEditClass("teachers")
  const addStudentValues = watchAddStudent()

  const classesQuery = useQuery<ClassDto[], Error>({
    queryKey: ["teacherClasses", userId],
    enabled: !!userId,
    queryFn: () => classApi.classQueryClasses(null, null, userId).then(r => r.data.classes),
    placeholderData: prev => prev
  })

  const teachersQuery = useQuery<UserDto[], Error>({
    queryKey: ["teachers"],
    queryFn: () => userApi.userQueryUsers(null, null, UserRole.TEACHER).then(r => r.data.users)
  })

  const { config } = useAppConfig()
  const isLdapAuth = config?.authType === AuthType.Ldap

  const allStudentsQuery = useQuery<UserDto[], Error>({
    queryKey: ["allStudentsForClassAssign"],
    queryFn: () => userApi.userQueryUsers(null, null, UserRole.STUDENT).then(r => r.data.users ?? []),
    staleTime: 60_000
  })

  const studentsQuery = useQuery<UserDto[], Error>({
    queryKey: ["classStudents", { classId: selectedClassId, search: studentSearch }],
    enabled: !!selectedClassId,
    queryFn: () =>
      userApi.userQueryUsers(null, studentSearch || null, UserRole.STUDENT, selectedClassId!)
        .then(r => r.data.users ?? []),
    placeholderData: prev => prev
  })

  const availableStudents = (allStudentsQuery.data ?? []).filter(
    s => !selectedClassId || !(s.classIds ?? []).includes(selectedClassId)
  )
  const isExistingStudentSelected = !isLdapAuth && availableStudents.some(
    s => s.username.trim().toLowerCase() === (addStudentValues.username ?? "").trim().toLowerCase()
  )

  useEffect(() => {
    const classes = classesQuery.data ?? []
    if (classes.length && !selectedClassId) setSelectedClassId(classes[0].classId)
  }, [classesQuery.data]) // eslint-disable-line react-hooks/exhaustive-deps

  const createMutation = useMutation<{ classId: number }, unknown, CreateClassFormValues>({
    mutationFn: data =>
      classApi.classCreateClass({ className: data.className, teachers: userId ? [userId] : [] }).then(r => r.data),
    onSuccess: (res, vars) => {
      queryClient.invalidateQueries({ queryKey: ["teacherClasses"] })
      setAlert({ severity: "success", message: t(TranslationKey.TEACHER_MY_CLASSES_CREATE_CLASS_SUCCESS, { value: vars.className }) })
      setSelectedClassId(res.classId)
      closeCreateDialog()
    },
    onError: (error: unknown) => {
      const e = error as { response?: { data?: { messageEn?: string; messageSk?: string } } }
      const msg = i18n.language === Language.EN ? e?.response?.data?.messageEn : e?.response?.data?.messageSk
      setAlert({ severity: "error", message: `${t(TranslationKey.TEACHER_MY_CLASSES_CREATE_CLASS_ERROR)}. ${msg ?? ""}` })
    }
  })

  const editClassMutation = useMutation<AxiosResponse, AxiosError<ApiProblemDetails>, EditClassFormValues>({
    mutationFn: data =>
      classApi.classEditClass({ id: selectedClassId!, classname: data.className, teachers: data.teachers }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacherClasses"] })
      setAlert({ severity: "success", message: t(TranslationKey.TEACHER_MY_CLASSES_CLASSES_EDIT_SUCCESS) })
      closeEditClassDialog()
    },
    onError: error => {
      const msg = i18n.language === Language.EN ? error.response?.data?.messageEn : error.response?.data?.messageSk
      setAlert({ severity: "error", message: `${t(TranslationKey.TEACHER_MY_CLASSES_CLASSES_EDIT_ERROR)}. ${msg ?? ""}` })
    }
  })

  const deleteClassMutation = useMutation<AxiosResponse, AxiosError<ApiProblemDetails>, { classId: number }>({
    mutationFn: async ({ classId }) => classApi.classDeleteClasses({ classIds: [classId] }),
    onSuccess: () => {
      const name = (classesQuery.data ?? []).find(c => c.classId === selectedClassId)?.className ?? ""
      setSelectedClassId(null)
      queryClient.invalidateQueries({ queryKey: ["teacherClasses"] })
      setAlert({ severity: "warning", message: t(TranslationKey.TEACHER_MY_CLASSES_DELETE_CLASS_SUCCESS, { value: name }) })
    },
    onError: error => {
      const msg = i18n.language === Language.EN ? error.response?.data?.messageEn : error.response?.data?.messageSk
      setAlert({ severity: "error", message: `${t(TranslationKey.TEACHER_MY_CLASSES_DELETE_CLASS_ERROR)}. ${msg ?? ""}` })
    }
  })

  const addStudentMutation = useMutation<AxiosResponse<AddUserRes>, AxiosError<ApiProblemDetails>, AddStudentFormValues>({
    mutationFn: data => {
      if (!isLdapAuth && isExistingStudentSelected) {
        return axiosInstance.post<AddUserRes>("/api/classes/add-student", { username: data.username, classIds: data.classIds })
      }
      return userApi.userAddUser({ username: data.username, password: data.password, role: data.role, classIds: data.classIds })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classStudents"] })
      queryClient.invalidateQueries({ queryKey: ["allStudentsForClassAssign"] })
      setAlert({ severity: "success", message: t(TranslationKey.TEACHER_MY_CLASSES_ADD_STUDENT_SUCCESS, { value: addStudentValues.username }) })
      closeAddStudentDialog()
    },
    onError: error => {
      const msg = i18n.language === Language.EN ? error.response?.data?.messageEn : error.response?.data?.messageSk
      setAlert({ severity: "error", message: `${t(TranslationKey.TEACHER_MY_CLASSES_ADD_STUDENT_ERROR)}. ${msg ?? ""}` })
    }
  })

  const closeCreateDialog = () => { setCreateDialogVis(false); resetCreate() }

  const closeEditClassDialog = () => {
    setEditClassDialogVis(false)
    resetEditClass({ className: "", teachers: userId ? [userId] : [] })
  }

  const openEditClassDialog = (cls: ClassDto) => {
    setSelectedClassId(cls.classId)
    resetEditClass({ className: cls.className, teachers: cls.teachers })
    setEditClassDialogVis(true)
  }

  const openDeleteClassDialog = (classId: number) => {
    setSelectedClassId(classId)
    setDeleteClassDialogVis(true)
  }

  const handleEditClassSubmitFn = async (data: EditClassFormValues) => {
    if (userId && !data.teachers.includes(userId)) {
      setPendingEditData(data)
      setRemoveSelfDialogVis(true)
      return
    }
    await editClassMutation.mutateAsync(data).catch(() => {})
  }

  const confirmRemoveSelf = async () => {
    if (!pendingEditData) return
    await editClassMutation.mutateAsync(pendingEditData).catch(() => {})
    setRemoveSelfDialogVis(false)
    setPendingEditData(null)
  }

  const cancelRemoveSelf = () => {
    if (userId) {
      const current = editClassTeachersValue ?? []
      if (!current.includes(userId)) setEditClassValue("teachers", [...current, userId])
    }
    setRemoveSelfDialogVis(false)
    setPendingEditData(null)
  }

  const closeAddStudentDialog = () => { setAddStudentDialogVis(false); resetAddStudent(getAddStudentDefaults()) }

  const handleAddStudent = async (data: AddStudentFormValues) => {
    if (!isLdapAuth && !isExistingStudentSelected && !data.password?.trim()) {
      setAddStudentError("password", { type: "manual", message: TranslationKey.FORM_RULES_REQUIRED as unknown as string })
      return
    }
    clearAddStudentErrors("password")
    await addStudentMutation.mutateAsync(data).catch(() => {})
  }

  const addStudentDisabled =
    !addStudentValues.username ||
    (!isLdapAuth && !isExistingStudentSelected && !addStudentValues.password) ||
    addStudentMutation.isPending

  const isLoading = !userId || classesQuery.isLoading
  const isError = classesQuery.isError
  const classes = classesQuery.data ?? []
  const students = studentsQuery.data ?? []
  const studentRows: UserRow[] = students.map(s => ({ ...s, classNamesDisplay: "" }))

  const handleStudentEditSave = async (userId: number, data: { username: string; password: string; classIds: number[] }) => {
    const res = await userApi.userEditUser({
      id: userId,
      username: data.username,
      password: data.password || undefined,
      classIds: data.classIds
    })
    queryClient.invalidateQueries({ queryKey: ["classStudents"] })
    return res
  }

  const handleStudentDelete = async (userIds: number[]) => {
    const res = await classApi.classEditClass({
      id: selectedClassId!,
      students: students.filter(s => !userIds.includes(s.id)).map(s => s.id)
    })
    queryClient.invalidateQueries({ queryKey: ["classStudents"] })
    queryClient.invalidateQueries({ queryKey: ["allStudentsForClassAssign"] })
    return res
  }

  return (
    <Box display="flex" flexDirection="column" gap={3}>
      {alert && <CustomAlert {...alert} onClose={() => setAlert(null)} />}

      {isLoading ? (
        <MyClassesSkeleton />
      ) : isError ? (
        <ErrorLoading />
      ) : (
        <>
          <Card variant="outlined" sx={{ borderRadius: 1, borderColor: theme => theme.palette.divider }}>
            <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
              <Stack direction={{ xs: "column", lg: "row" }} spacing={2} alignItems={{ lg: "center" }}>
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" flex={1}>
                  {classes.map(({ classId, className }) => (
                    <Button
                      key={classId}
                      variant={selectedClassId === classId ? "contained" : "outlined"}
                      onClick={() => setSelectedClassId(classId)}
                      onMouseEnter={() => queryClient.prefetchQuery({
                        queryKey: ["teacherClassDetails", String(classId)],
                        queryFn: () => classApi.classQueryClassDetails(classId).then(r => r.data),
                        staleTime: 60_000
                      })}
                      size="small"
                      sx={{ borderRadius: 1, textTransform: "none", px: 2.5, py: 1, fontWeight: 600, minHeight: 40 }}
                    >
                      {className}
                    </Button>
                  ))}
                </Stack>

                <Stack direction="row" spacing={1.25} justifyContent={{ xs: "flex-start", lg: "flex-end" }}>
                  <Tooltip title={t(TranslationKey.TEACHER_MY_CLASSES_CLASS)}>
                    <span>
                      <IconButton
                        onClick={() => navigate(getParametrizedUrl(RouteKeys.TEACHER_MY_CLASSES_CLASS_DETAILS, { [RouteParams.CLASS_ID]: selectedClassId!.toString() }))}
                        disabled={!selectedClassId}
                        sx={{
                          border: theme => `1px solid ${theme.palette.info.main}`,
                          width: 56, height: 56, "& .MuiSvgIcon-root": { fontSize: 26 },
                          color: theme => theme.palette.info.dark,
                          "&.Mui-disabled": { color: theme => theme.palette.info.dark, borderColor: theme => theme.palette.info.main, opacity: 0.4 }
                        }}
                      >
                        <InfoOutlinedIcon />
                      </IconButton>
                    </span>
                  </Tooltip>

                  <Tooltip title={t(TranslationKey.TEACHER_MY_CLASSES_EDIT_CLASS)}>
                    <span>
                      <IconButton
                        onClick={() => { const cls = classes.find(c => c.classId === selectedClassId); if (cls) openEditClassDialog(cls) }}
                        disabled={!selectedClassId}
                        sx={{
                          border: theme => `1px solid ${theme.palette.warning.main}`,
                          width: 56, height: 56, "& .MuiSvgIcon-root": { fontSize: 26 },
                          color: theme => theme.palette.warning.dark,
                          "&.Mui-disabled": { color: theme => theme.palette.warning.dark, borderColor: theme => theme.palette.warning.main, opacity: 0.4 }
                        }}
                      >
                        <EditOutlinedIcon />
                      </IconButton>
                    </span>
                  </Tooltip>

                  <Tooltip title={t(TranslationKey.TEACHER_MY_CLASSES_CONFIRMATION_TITLE_CLASS)}>
                    <span>
                      <IconButton
                        onClick={() => { if (selectedClassId) openDeleteClassDialog(selectedClassId) }}
                        disabled={!selectedClassId}
                        sx={{
                          border: theme => `1px solid ${theme.palette.error.main}`,
                          width: 56, height: 56, "& .MuiSvgIcon-root": { fontSize: 26 },
                          color: theme => theme.palette.error.dark,
                          "&.Mui-disabled": { color: theme => theme.palette.error.dark, borderColor: theme => theme.palette.error.main, opacity: 0.4 }
                        }}
                      >
                        <DeleteOutlineIcon />
                      </IconButton>
                    </span>
                  </Tooltip>

                  <Tooltip title={t(TranslationKey.TEACHER_MY_CLASSES_CREATE_CLASS_TOOLTIP)}>
                    <span>
                      <IconButton
                        onClick={() => setCreateDialogVis(true)}
                        sx={{
                          border: theme => `1px solid ${theme.palette.success.main}`,
                          width: 56, height: 56,
                          backgroundColor: theme => theme.palette.success.light,
                          "& .MuiSvgIcon-root": { fontSize: 30 },
                          color: theme => theme.palette.success.dark,
                        }}
                      >
                        <AddIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          {selectedClassId && (
            <UserListPanel
              key={selectedClassId}
              icon={<SchoolIcon fontSize="small" />}
              users={studentRows}
              isLoading={studentsQuery.isLoading}
              isError={studentsQuery.isError}
              onRetry={() => queryClient.invalidateQueries({ queryKey: ["classStudents"] })}
              search={studentSearch}
              onSearchChange={setStudentSearch}
              addTooltip={t(TranslationKey.TEACHER_MY_CLASSES_ADD_STUDENT)}
              onAddClick={() => { resetAddStudent({ ...getAddStudentDefaults(), classIds: selectedClassId ? [selectedClassId] : [] }); setAddStudentDialogVis(true) }}
              isLdapAuth={isLdapAuth}
              classesData={classesQuery.data}
              onEditSave={handleStudentEditSave}
              editSuccessMessage={t(TranslationKey.TEACHER_MY_CLASSES_EDIT_STUDENT_SUCCESS)}
              editErrorMessage={t(TranslationKey.TEACHER_MY_CLASSES_EDIT_STUDENT_ERROR)}
              onDelete={handleStudentDelete}
              deleteQuestion={t(TranslationKey.TEACHER_MY_CLASSES_CONFIRMATION_QUESTION_STUDENTS)}
              deleteTitle={t(TranslationKey.TEACHER_MY_CLASSES_CONFIRMATION_TITLE_STUDENTS)}
              deleteBulkTooltip={t(TranslationKey.TEACHER_MY_CLASSES_CONFIRMATION_TITLE_STUDENTS)}
              deleteSuccessMessage={t(TranslationKey.TEACHER_MY_CLASSES_DELETE_STUDENTS_SUCCESS)}
              deleteErrorMessage={t(TranslationKey.TEACHER_MY_CLASSES_DELETE_STUDENTS_ERROR)}
              noDataMessage={t(TranslationKey.TEACHER_MY_CLASSES_NO_DATA)}
              onRowClick={student => navigate(getParametrizedUrl(RouteKeys.TEACHER_MY_CLASSES_STUDENT_DETAILS, { [RouteParams.STUDENT_ID]: student.id.toString() }))}
              onRowHover={student => queryClient.prefetchQuery({
                queryKey: ["teacherStudentDetails", String(student.id)],
                queryFn: () => userApi.userQueryUserDetails(student.id).then(r => r.data),
                staleTime: 60_000
              })}
            />
          )}
        </>
      )}

      <Dialog open={createDialogVis} onClose={closeCreateDialog} fullWidth maxWidth="sm">
        <form onSubmit={handleCreateSubmit(data => createMutation.mutate(data))}>
          <DialogTitle>{t(TranslationKey.TEACHER_MY_CLASSES_CREATE_CLASS)}</DialogTitle>
          <DialogContent>
            <Controller
              name="className" control={createControl}
              rules={{ ...FormRules.required(), ...FormRules.minLengthShort(), ...FormRules.maxLengthShort() }}
              render={({ field }) => (
                <TextField {...field} label={t(TranslationKey.TEACHER_MY_CLASSES_CLASS_NAME)}
                  fullWidth margin="dense"
                  error={!!createErrors.className}
                  helperText={createErrors.className ? t(createErrors.className.message as string) : ""}
                />
              )}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={closeCreateDialog}>{t(TranslationKey.TEACHER_MY_CLASSES_CANCEL)}</Button>
            <Button type="submit" variant="contained" color="success" disabled={!createClassNameValue || createMutation.isPending}>
              {t(TranslationKey.TEACHER_MY_CLASSES_CREATE)}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={editClassDialogVis} onClose={closeEditClassDialog} fullWidth maxWidth="md">
        <form onSubmit={handleEditClassSubmit(handleEditClassSubmitFn)}>
          <DialogTitle>{t(TranslationKey.TEACHER_MY_CLASSES_EDIT_CLASS)}</DialogTitle>
          <DialogContent>
            <Controller
              name="className" control={editClassControl}
              rules={{ ...FormRules.required(), ...FormRules.minLengthShort(), ...FormRules.maxLengthShort() }}
              render={({ field }) => (
                <TextField {...field} label={t(TranslationKey.TEACHER_MY_CLASSES_CLASS_NAME)}
                  fullWidth margin="dense"
                  error={!!editClassErrors.className}
                  helperText={editClassErrors.className ? t(editClassErrors.className.message as string) : ""}
                />
              )}
            />
            <Controller
              name="teachers" control={editClassControl}
              render={({ field }) => (
                <Box mt={1.5}>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {(teachersQuery.data ?? []).map(tchr => {
                      const selected = (field.value ?? []).includes(tchr.id)
                      return (
                        <Chip
                          key={tchr.id}
                          label={tchr.username}
                          variant={selected ? "filled" : "outlined"}
                          color={selected ? "primary" : "default"}
                          disabled={teachersQuery.isLoading || teachersQuery.isError}
                          onClick={() => {
                            const next = selected
                              ? field.value.filter((id: number) => id !== tchr.id)
                              : [...field.value, tchr.id]
                            field.onChange(next)
                          }}
                          clickable
                          sx={{ fontSize: "0.9rem", height: 36, px: 1 }}
                        />
                      )
                    })}
                  </Stack>
                </Box>
              )}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={closeEditClassDialog}>{t(TranslationKey.TEACHER_MY_CLASSES_CANCEL)}</Button>
            <Button type="submit" variant="contained" color="success" disabled={!editClassNameValue || editClassMutation.isPending}>
              {t(TranslationKey.TEACHER_MY_CLASSES_SAVE)}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <DeleteDialog
        open={deleteClassDialogVis}
        onClose={() => setDeleteClassDialogVis(false)}
        onConfirm={() => { if (selectedClassId) deleteClassMutation.mutate({ classId: selectedClassId }) }}
        question={t(TranslationKey.TEACHER_MY_CLASSES_CONFIRMATION_QUESTION_CLASS)}
        title={t(TranslationKey.TEACHER_MY_CLASSES_CONFIRMATION_TITLE_CLASS)}
        label={(classesQuery.data ?? []).find(c => c.classId === selectedClassId)?.className ?? ""}
      />

      <DeleteDialog
        open={removeSelfDialogVis}
        onClose={cancelRemoveSelf}
        onConfirm={confirmRemoveSelf}
        question={t(TranslationKey.TEACHER_MY_CLASSES_REMOVE_SELF_WARNING_MESSAGE)}
        title={t(TranslationKey.TEACHER_MY_CLASSES_REMOVE_SELF_WARNING_TITLE)}
        color="warning"
        confirmLabel={TranslationKey.TEACHER_MY_CLASSES_REMOVE_SELF_WARNING_CONFIRM}
      />

      <Dialog open={addStudentDialogVis} onClose={closeAddStudentDialog} fullWidth maxWidth="md">
        <form onSubmit={handleAddStudentSubmit(handleAddStudent)}>
          <DialogTitle>{t(TranslationKey.TEACHER_MY_CLASSES_ADD_STUDENT)}</DialogTitle>
          <DialogContent>
            {isLdapAuth ? (
              <Controller
                name="username" control={addStudentControl}
                rules={{ ...FormRules.required() }}
                render={({ field }) => (
                  <LdapAutocompleteField
                    field={field}
                    error={addStudentErrors.username}
                    label={t(TranslationKey.TEACHER_MY_CLASSES_USERNAME)}
                    placeholder={t(TranslationKey.TEACHER_MY_CLASSES_LDAP_USERNAME_PLACEHOLDER, { value: minLdapSearchChars })}
                    noOptionsText={t(TranslationKey.TEACHER_MY_CLASSES_NO_DATA)}
                    loadingText={t(TranslationKey.TEACHER_MY_CLASSES_LOADING)}
                    minSearchChars={minLdapSearchChars}
                  />
                )}
              />
            ) : (
              <Controller
                name="username" control={addStudentControl}
                rules={{ ...FormRules.required(), ...FormRules.minLengthShort(), ...FormRules.patternLettersNumbersDots() }}
                render={({ field }) => (
                  <Autocomplete
                    freeSolo options={availableStudents}
                    getOptionLabel={o => typeof o === "string" ? o : o.username}
                    value={availableStudents.find(u => u.username === field.value) ?? null}
                    onChange={(_, value) => { field.onChange(typeof value === "string" ? value : value?.username ?? ""); clearAddStudentErrors("password") }}
                    onInputChange={(_, value, reason) => { if (reason === "input" || reason === "clear") { field.onChange(value); clearAddStudentErrors("password") } }}
                    noOptionsText={t(TranslationKey.TEACHER_MY_CLASSES_NO_DATA)}
                    renderInput={params => (
                      <TextField {...params} margin="dense" fullWidth
                        label={t(TranslationKey.TEACHER_MY_CLASSES_USERNAME)}
                        error={!!addStudentErrors.username}
                        helperText={addStudentErrors.username ? t(addStudentErrors.username.message as string) : ""}
                      />
                    )}
                  />
                )}
              />
            )}
            {!isLdapAuth && (
              <Controller
                name="password" control={addStudentControl}
                render={({ field }) => (
                  <TextField {...field} disabled={isExistingStudentSelected}
                    margin="dense" type="password" fullWidth
                    label={t(TranslationKey.TEACHER_MY_CLASSES_PASSWORD)}
                    error={!!addStudentErrors.password}
                    helperText={isExistingStudentSelected ? "" : (addStudentErrors.password ? t(addStudentErrors.password.message as string) : "")}
                  />
                )}
              />
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={closeAddStudentDialog}>{t(TranslationKey.TEACHER_MY_CLASSES_CANCEL)}</Button>
            <Button type="submit" variant="contained" color="success" disabled={addStudentDisabled}>
              {t(TranslationKey.TEACHER_MY_CLASSES_ADD)}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  )
}

export default TeacherMyClasses