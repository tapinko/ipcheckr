import AddIcon from "@mui/icons-material/Add"
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline"
import EditOutlinedIcon from "@mui/icons-material/EditOutlined"
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined"
import SearchIcon from "@mui/icons-material/Search"
import {
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  ListItemText,
  MenuItem,
  OutlinedInput,
  Select,
  Skeleton,
  Stack,
  TextField,
  Tooltip,
  Typography
} from "@mui/material"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { AxiosError, type AxiosResponse } from "axios"
import { useEffect, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { CustomAlert, type CustomAlertState } from "../../components/CustomAlert"
import DeleteDialog from "../../components/DeleteDialog"
import ErrorLoading from "../../components/ErrorLoading"
import MyClassesSkeleton from "../../components/MyClassesSkeleton"
import { useAuth } from "../../contexts/AuthContext"
import type { AddUserRes, ApiProblemDetails, ClassDto, IsLdapAuthRes, LdapUserDto, UserDto } from "../../dtos"
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

type EditStudentFormValues = {
  username: string
  password: string
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
  const [deleteStudentsWithClass, setDeleteStudentsWithClass] = useState(true)
  const [pendingEditData, setPendingEditData] = useState<EditClassFormValues | null>(null)

  const [studentSearch, setStudentSearch] = useState("")
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([])
  const [addStudentDialogVis, setAddStudentDialogVis] = useState(false)
  const [editStudentDialogVis, setEditStudentDialogVis] = useState(false)
  const [deleteStudentDialogVis, setDeleteStudentDialogVis] = useState(false)
  const [bulkDeleteDialogVis, setBulkDeleteDialogVis] = useState(false)
  const [editingStudentId, setEditingStudentId] = useState<number | null>(null)
  const [deletingStudentId, setDeletingStudentId] = useState<number | null>(null)

  const [alert, setAlert] = useState<CustomAlertState | null>(null)

  const {
    handleSubmit: handleCreateSubmit, control: createControl,
    reset: resetCreate, watch: watchCreate, formState: { errors: createErrors }
  } = useForm<CreateClassFormValues>({ defaultValues: { className: "" }, mode: "onBlur" })

  const {
    handleSubmit: handleEditClassSubmit, control: editClassControl,
    reset: resetEditClass, watch: watchEditClass, setValue: setEditClassValue,
    formState: { errors: editClassErrors }
  } = useForm<EditClassFormValues>({
    defaultValues: { className: "", teachers: userId ? [userId] : [] }, mode: "onBlur"
  })

  const getAddStudentDefaults = (): AddStudentFormValues => ({
    username: "", password: "", role: UserRole.STUDENT,
    classIds: selectedClassId ? [selectedClassId] : []
  })

  const {
    handleSubmit: handleAddStudentSubmit, control: addStudentControl,
    reset: resetAddStudent, watch: watchAddStudent,
    setError: setAddStudentError, clearErrors: clearAddStudentErrors,
    formState: { errors: addStudentErrors }
  } = useForm<AddStudentFormValues>({ defaultValues: getAddStudentDefaults(), mode: "onBlur" })

  const {
    handleSubmit: handleEditStudentSubmit, control: editStudentControl,
    reset: resetEditStudent, watch: watchEditStudent,
    formState: { errors: editStudentErrors }
  } = useForm<EditStudentFormValues>({
    defaultValues: { username: "", password: "", classIds: [] }, mode: "onBlur"
  })

  const createClassNameValue = watchCreate("className")
  const editClassNameValue = watchEditClass("className")
  const editClassTeachersValue = watchEditClass("teachers")
  const addStudentValues = watchAddStudent()
  const editStudentUsernameValue = watchEditStudent("username")

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

  const ldapAuthQuery = useQuery<IsLdapAuthRes>({
    queryKey: ["isLdapAuth"],
    queryFn: () => userApi.userIsLdapAuth().then(r => r.data),
    staleTime: 5 * 60_000
  })
  const isLdapAuth = ldapAuthQuery.data?.isLdapAuth === true

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

  useEffect(() => {
    setSelectedStudentIds([])
  }, [selectedClassId])

  const createMutation = useMutation<{ classId: number }, unknown, CreateClassFormValues>({
    mutationFn: data =>
      classApi.classCreateClass({ className: data.className, teachers: userId ? [userId] : [] }).then(r => r.data),
    onSuccess: (res, vars) => {
      queryClient.invalidateQueries({ queryKey: ["teacherClasses"] })
      setAlert({ severity: "success", message: t(TranslationKey.TEACHER_MY_CLASSES_CREATE_CLASS_SUCCESS, { value: vars.className }) })
      setSelectedClassId(res.classId)
      closeCreateDialog()
    },
    onError: (error: any) => {
      const msg = i18n.language === Language.EN ? error?.response?.data?.messageEn : error?.response?.data?.messageSk
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

  const deleteClassMutation = useMutation<AxiosResponse, AxiosError<ApiProblemDetails>, { classId: number; deleteStudentsFirst: boolean }>({
    mutationFn: async ({ classId, deleteStudentsFirst }) => {
      if (deleteStudentsFirst) {
        const res = await userApi.userQueryUsers(null, null, UserRole.STUDENT, classId)
        const ids = res.data.users.map((u: UserDto) => u.id)
        if (ids.length) await userApi.userDeleteUsers({ userIds: ids })
      }
      return classApi.classDeleteClasses({ classIds: [classId] })
    },
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

  const editStudentMutation = useMutation<AxiosResponse, AxiosError<ApiProblemDetails>, EditStudentFormValues>({
    mutationFn: data =>
      userApi.userEditUser({
        id: editingStudentId!,
        username: data.username,
        password: data.password || undefined,
        classIds: data.classIds
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classStudents"] })
      setAlert({ severity: "success", message: t(TranslationKey.TEACHER_MY_CLASSES_EDIT_STUDENT_SUCCESS, { value: editStudentUsernameValue }) })
      closeEditStudentDialog()
    },
    onError: error => {
      const msg = i18n.language === Language.EN ? error.response?.data?.messageEn : error.response?.data?.messageSk
      setAlert({ severity: "error", message: `${t(TranslationKey.TEACHER_MY_CLASSES_EDIT_STUDENT_ERROR)}. ${msg ?? ""}` })
    }
  })

  const deleteStudentMutation = useMutation<AxiosResponse, AxiosError<ApiProblemDetails>, number>({
    mutationFn: id => userApi.userDeleteUsers({ userIds: [id] }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classStudents"] })
      queryClient.invalidateQueries({ queryKey: ["allStudentsForClassAssign"] })
      setAlert({ severity: "warning", message: t(TranslationKey.TEACHER_MY_CLASSES_DELETE_STUDENTS_SUCCESS) })
    },
    onError: error => {
      const msg = i18n.language === Language.EN ? error.response?.data?.messageEn : error.response?.data?.messageSk
      setAlert({ severity: "error", message: `${t(TranslationKey.TEACHER_MY_CLASSES_DELETE_STUDENTS_ERROR)}. ${msg ?? ""}` })
    }
  })

  const bulkDeleteMutation = useMutation<AxiosResponse, AxiosError<ApiProblemDetails>, number[]>({
    mutationFn: ids => userApi.userDeleteUsers({ userIds: ids }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classStudents"] })
      queryClient.invalidateQueries({ queryKey: ["allStudentsForClassAssign"] })
      setSelectedStudentIds([])
      setAlert({ severity: "warning", message: t(TranslationKey.TEACHER_MY_CLASSES_DELETE_STUDENTS_SUCCESS) })
    },
    onError: error => {
      const msg = i18n.language === Language.EN ? error.response?.data?.messageEn : error.response?.data?.messageSk
      setAlert({ severity: "error", message: `${t(TranslationKey.TEACHER_MY_CLASSES_DELETE_STUDENTS_ERROR)}. ${msg ?? ""}` })
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

  const closeEditStudentDialog = () => {
    setEditStudentDialogVis(false)
    resetEditStudent({ username: "", password: "", classIds: [] })
    setEditingStudentId(null)
  }

  const openEditStudentDialog = (student: UserDto) => {
    setEditingStudentId(student.id)
    resetEditStudent({ username: student.username, password: "", classIds: student.classIds ?? [] })
    setEditStudentDialogVis(true)
  }

  const openDeleteStudentDialog = (id: number) => {
    setDeletingStudentId(id)
    setDeleteStudentDialogVis(true)
  }

  const handleAddStudent = async (data: AddStudentFormValues) => {
    if (!isLdapAuth && !isExistingStudentSelected && !data.password?.trim()) {
      setAddStudentError("password", { type: "manual", message: TranslationKey.FORM_RULES_REQUIRED as unknown as string })
      return
    }
    clearAddStudentErrors("password")
    await addStudentMutation.mutateAsync(data).catch(() => {})
  }

  const toggleStudent = (id: number) =>
    setSelectedStudentIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const addStudentDisabled =
    !addStudentValues.username ||
    (!isLdapAuth && !isExistingStudentSelected && !addStudentValues.password) ||
    (addStudentValues.classIds?.length ?? 0) === 0 ||
    addStudentMutation.isPending

  const isLoading = !userId || classesQuery.isLoading
  const isError = classesQuery.isError
  const classes = classesQuery.data ?? []
  const students = studentsQuery.data ?? []
  const deletingStudent = students.find(s => s.id === deletingStudentId)

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
            <Card variant="outlined" sx={{ borderRadius: 1, borderColor: theme => theme.palette.divider }}>
              <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
                  <TextField
                    fullWidth
                    value={studentSearch}
                    onChange={e => setStudentSearch(e.target.value)}
                    placeholder={t(TranslationKey.TEACHER_MY_CLASSES_SEARCH)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon fontSize="small" />
                        </InputAdornment>
                      )
                    }}
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 1, bgcolor: "background.paper" } }}
                  />
                  {selectedStudentIds.length >= 2 && (
                    <Tooltip title={t(TranslationKey.TEACHER_MY_CLASSES_CONFIRMATION_TITLE_STUDENTS)}>
                      <span>
                        <IconButton
                          onClick={() => setBulkDeleteDialogVis(true)}
                          sx={{
                            border: theme => `1px solid ${theme.palette.error.main}`,
                            width: 56, height: 56,
                            "& .MuiSvgIcon-root": { fontSize: 26 },
                            color: theme => theme.palette.error.dark,
                            flexShrink: 0
                          }}
                        >
                          <DeleteOutlineIcon />
                        </IconButton>
                      </span>
                    </Tooltip>
                  )}
                  <Tooltip title={t(TranslationKey.TEACHER_MY_CLASSES_ADD_STUDENT)}>
                    <span>
                      <IconButton
                        onClick={() => { resetAddStudent(getAddStudentDefaults()); setAddStudentDialogVis(true) }}
                        sx={{
                          border: theme => `1px solid ${theme.palette.success.main}`,
                          width: 56, height: 56,
                          backgroundColor: theme => theme.palette.success.light,
                          "& .MuiSvgIcon-root": { fontSize: 30 },
                          color: theme => theme.palette.success.dark,
                          flexShrink: 0
                        }}
                      >
                        <AddIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Stack>
              </CardContent>

              <Divider />

              {studentsQuery.isLoading ? (
                <Box>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Box
                      key={i}
                      sx={{
                        display: "flex", alignItems: "center", px: 1, py: 0.5,
                        borderBottom: i < 5 ? "1px solid" : "none", borderColor: "divider"
                      }}
                    >
                      <Skeleton variant="rounded" width={24} height={24} sx={{ borderRadius: 0.5, flexShrink: 0 }} />
                      <Skeleton variant="text" sx={{ flex: 1, mx: 1.5, fontSize: "1rem" }} />
                      <Stack direction="row" spacing={0.5}>
                        <Skeleton variant="circular" width={28} height={28} />
                        <Skeleton variant="circular" width={28} height={28} />
                      </Stack>
                    </Box>
                  ))}
                </Box>
              ) : studentsQuery.isError ? (
                <Box sx={{ p: 2 }}>
                  <ErrorLoading onRetry={() => queryClient.invalidateQueries({ queryKey: ["classStudents"] })} />
                </Box>
              ) : students.length === 0 ? (
                <Box sx={{ px: 3, py: 4, textAlign: "center" }}>
                  <Typography color="text.secondary">{t(TranslationKey.TEACHER_MY_CLASSES_NO_DATA)}</Typography>
                </Box>
              ) : (
                <Box>
                  {students.map((student, index) => (
                    <Box
                      key={student.id}
                      onClick={() => navigate(getParametrizedUrl(RouteKeys.TEACHER_MY_CLASSES_STUDENT_DETAILS, { [RouteParams.STUDENT_ID]: student.id.toString() }))}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        px: 1,
                        py: 0.5,
                        borderBottom: index < students.length - 1 ? "1px solid" : "none",
                        borderColor: "divider",
                        cursor: "pointer",
                        "&:hover": { bgcolor: "action.hover" },
                        "&:hover .student-name": { textDecoration: "underline" }
                      }}
                    >
                      <Checkbox
                        size="small"
                        checked={selectedStudentIds.includes(student.id)}
                        onChange={() => toggleStudent(student.id)}
                        onClick={e => e.stopPropagation()}
                      />

                      <Typography className="student-name" sx={{ flex: 1, fontWeight: 500, ml: 0.5 }}>
                        {student.username}
                      </Typography>

                      <Stack direction="row" onClick={e => e.stopPropagation()}>
                        <IconButton
                          size="small"
                          onClick={() => openDeleteStudentDialog(student.id)}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => openEditStudentDialog(student)}
                        >
                          <EditOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </Box>
                  ))}
                </Box>
              )}
            </Card>
          )}
        </>
      )}

      <Dialog open={createDialogVis} onClose={closeCreateDialog} fullWidth maxWidth="sm">
        <form onSubmit={handleCreateSubmit(data => createMutation.mutate(data))}>
          <DialogTitle>{t(TranslationKey.TEACHER_MY_CLASSES_CREATE_CLASS)}</DialogTitle>
          <DialogContent>
            <Controller
              name="className" control={createControl}
              rules={{ ...FormRules.required(), ...FormRules.minLengthShort(), ...FormRules.maxLengthShort(), ...FormRules.patternLettersNumbersSpecial() }}
              render={({ field }) => (
                <TextField {...field} label={t(TranslationKey.TEACHER_MY_CLASSES_CLASS_NAME)}
                  fullWidth margin="dense" autoFocus
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
              rules={{ ...FormRules.required(), ...FormRules.minLengthShort(), ...FormRules.maxLengthShort(), ...FormRules.patternLettersNumbersSpecial() }}
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
                <FormControl fullWidth margin="dense" disabled={teachersQuery.isLoading || teachersQuery.isError}>
                  <InputLabel id="edit-class-teachers-label">{t(TranslationKey.TEACHER_MY_CLASSES_TEACHERS)}</InputLabel>
                  <Select multiple labelId="edit-class-teachers-label" value={field.value}
                    onChange={e => field.onChange(Array.isArray(e.target.value) ? e.target.value.map(Number) : [])}
                    input={<OutlinedInput label={t(TranslationKey.TEACHER_MY_CLASSES_TEACHERS)} />}
                    renderValue={selected =>
                      (teachersQuery.data ?? []).filter(tchr => (selected as number[]).includes(tchr.id)).map(tchr => tchr.username).join(", ")
                    }
                  >
                    {(teachersQuery.data ?? []).map(tchr => (
                      <MenuItem key={tchr.id} value={tchr.id}>
                        <Checkbox checked={(field.value ?? []).includes(tchr.id)} />
                        <ListItemText primary={tchr.username} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
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
        onConfirm={() => { if (selectedClassId) deleteClassMutation.mutate({ classId: selectedClassId, deleteStudentsFirst: deleteStudentsWithClass }) }}
        question={t(TranslationKey.TEACHER_MY_CLASSES_CONFIRMATION_QUESTION_CLASS)}
        title={t(TranslationKey.TEACHER_MY_CLASSES_CONFIRMATION_TITLE_CLASS)}
        label={(classesQuery.data ?? []).find(c => c.classId === selectedClassId)?.className ?? ""}
        checkboxLabel={t(TranslationKey.TEACHER_MY_CLASSES_DELETE_STUDENTS_CHECKBOX)}
        checked={deleteStudentsWithClass}
        setChecked={setDeleteStudentsWithClass}
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
                render={({ field }) => {
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
                      loading={loading} options={options} getOptionLabel={o => o.username}
                      noOptionsText={t(TranslationKey.TEACHER_MY_CLASSES_NO_DATA)}
                      loadingText={t(TranslationKey.TEACHER_MY_CLASSES_LOADING)}
                      onInputChange={(_, v) => setInput(v)}
                      onChange={(_, v) => field.onChange(v ? (v as LdapUserDto).username : "")}
                      renderInput={params => (
                        <TextField {...params} margin="dense" fullWidth
                          label={t(TranslationKey.TEACHER_MY_CLASSES_USERNAME)}
                          placeholder={t(TranslationKey.TEACHER_MY_CLASSES_LDAP_USERNAME_PLACEHOLDER, { value: minLdapSearchChars })}
                          error={!!addStudentErrors.username}
                          helperText={addStudentErrors.username ? t(addStudentErrors.username.message as string) : ""}
                        />
                      )}
                    />
                  )
                }}
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
            <Controller
              name="password" control={addStudentControl}
              render={({ field }) => (
                <TextField {...field} disabled={isLdapAuth || isExistingStudentSelected}
                  margin="dense" type="password" fullWidth
                  label={t(TranslationKey.TEACHER_MY_CLASSES_PASSWORD)}
                  error={!!addStudentErrors.password}
                  helperText={isLdapAuth || isExistingStudentSelected ? "" : (addStudentErrors.password ? t(addStudentErrors.password.message as string) : "")}
                />
              )}
            />
            <Controller
              name="classIds" control={addStudentControl}
              rules={{ validate: value => (value && value.length > 0) || t(TranslationKey.FORM_RULES_REQUIRED).toString() }}
              render={({ field }) => (
                <FormControl fullWidth margin="dense" error={!!addStudentErrors.classIds}>
                  <InputLabel id="add-student-classes-label">{t(TranslationKey.TEACHER_MY_CLASSES_CLASSES)}</InputLabel>
                  <Select multiple labelId="add-student-classes-label" value={field.value}
                    onChange={e => field.onChange(Array.isArray(e.target.value) ? e.target.value.map(Number) : [])}
                    input={<OutlinedInput label={t(TranslationKey.TEACHER_MY_CLASSES_CLASSES)} />}
                    renderValue={selected =>
                      (classesQuery.data ?? []).filter(c => (selected as number[]).includes(c.classId)).map(c => c.className).join(", ")
                    }
                  >
                    {(classesQuery.data ?? []).map(cls => (
                      <MenuItem key={cls.classId} value={cls.classId}>
                        <Checkbox checked={field.value.indexOf(cls.classId) > -1} />
                        <ListItemText primary={cls.className} />
                      </MenuItem>
                    ))}
                  </Select>
                  {addStudentErrors.classIds && (
                    <Typography variant="caption" color="error">{addStudentErrors.classIds.message?.toString()}</Typography>
                  )}
                </FormControl>
              )}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={closeAddStudentDialog}>{t(TranslationKey.TEACHER_MY_CLASSES_CANCEL)}</Button>
            <Button type="submit" variant="contained" color="success" disabled={addStudentDisabled}>
              {t(TranslationKey.TEACHER_MY_CLASSES_ADD)}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={editStudentDialogVis} onClose={closeEditStudentDialog} fullWidth maxWidth="md">
        <form onSubmit={handleEditStudentSubmit(data => editStudentMutation.mutate(data))}>
          <DialogTitle>{t(TranslationKey.TEACHER_MY_CLASSES_EDIT_STUDENT)}</DialogTitle>
          <DialogContent>
            <Controller
              name="username" control={editStudentControl}
              rules={{ ...FormRules.required(), ...FormRules.minLengthShort(), ...FormRules.patternLettersNumbersDots() }}
              render={({ field }) => (
                <TextField {...field} disabled={isLdapAuth} margin="dense" fullWidth
                  label={t(TranslationKey.TEACHER_MY_CLASSES_USERNAME)}
                  error={!!editStudentErrors.username}
                  helperText={editStudentErrors.username ? t(editStudentErrors.username.message as string) : ""}
                />
              )}
            />
            <Controller
              name="password" control={editStudentControl}
              rules={{ ...FormRules.minLengthLong(), ...FormRules.maxLengthLong(), ...FormRules.patternLettersNumbersSpecial() }}
              render={({ field }) => (
                <TextField {...field} disabled={isLdapAuth} margin="dense" type="password" fullWidth
                  label={t(TranslationKey.TEACHER_MY_CLASSES_PASSWORD)}
                  error={!!editStudentErrors.password}
                  helperText={isLdapAuth ? "" : (editStudentErrors.password ? t(editStudentErrors.password.message as string) : "")}
                />
              )}
            />
            <Controller
              name="classIds" control={editStudentControl}
              render={({ field }) => (
                <FormControl fullWidth margin="dense">
                  <InputLabel id="edit-student-classes-label">{t(TranslationKey.TEACHER_MY_CLASSES_CLASSES)}</InputLabel>
                  <Select multiple labelId="edit-student-classes-label" value={field.value}
                    onChange={e => field.onChange(Array.isArray(e.target.value) ? e.target.value.map(Number) : [])}
                    input={<OutlinedInput label={t(TranslationKey.TEACHER_MY_CLASSES_CLASSES)} />}
                    renderValue={selected =>
                      (classesQuery.data ?? []).filter(c => (selected as number[]).includes(c.classId)).map(c => c.className).join(", ")
                    }
                  >
                    {(classesQuery.data ?? []).map(cls => (
                      <MenuItem key={cls.classId} value={cls.classId}>
                        <Checkbox checked={(field.value ?? []).includes(cls.classId)} />
                        <ListItemText primary={cls.className} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={closeEditStudentDialog}>{t(TranslationKey.TEACHER_MY_CLASSES_CANCEL)}</Button>
            <Button type="submit" variant="contained" color="success" disabled={!editStudentUsernameValue || editStudentMutation.isPending}>
              {t(TranslationKey.TEACHER_MY_CLASSES_SAVE)}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <DeleteDialog
        open={deleteStudentDialogVis}
        onClose={() => setDeleteStudentDialogVis(false)}
        onConfirm={() => { if (deletingStudentId) deleteStudentMutation.mutate(deletingStudentId) }}
        question={t(TranslationKey.TEACHER_MY_CLASSES_CONFIRMATION_QUESTION_STUDENTS)}
        title={t(TranslationKey.TEACHER_MY_CLASSES_CONFIRMATION_TITLE_STUDENTS)}
        label={deletingStudent?.username ?? ""}
      />

      <DeleteDialog
        open={bulkDeleteDialogVis}
        onClose={() => setBulkDeleteDialogVis(false)}
        onConfirm={() => bulkDeleteMutation.mutate(selectedStudentIds)}
        question={t(TranslationKey.TEACHER_MY_CLASSES_CONFIRMATION_QUESTION_STUDENTS)}
        title={t(TranslationKey.TEACHER_MY_CLASSES_CONFIRMATION_TITLE_STUDENTS)}
        label={students.filter(s => selectedStudentIds.includes(s.id)).map(s => s.username).join(", ")}
      />
    </Box>
  )
}

export default TeacherMyClasses