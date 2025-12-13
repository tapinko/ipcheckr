import { useEffect, useState } from "react"
import {
  Box,
  Button,
  Checkbox,
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
  Typography,
  Autocomplete
} from "@mui/material"
import { useTranslation } from "react-i18next"
import type {
  AddUserRes,
  ApiProblemDetails,
  ClassDto,
  CreateClassRes,
  UserDto,
  LdapUserDto,
  IsLdapAuthRes
} from "../../dtos"
import { classApi, userApi } from "../../utils/apiClients"
import DataGridWithSearch from "../../components/DataGridWithSearch"
import ActionPanel from "../../components/ActionPanel"
import type { IUsersSelectedRows } from "../../types/ISelectedRows"
import DeleteDialog from "../../components/DeleteDialog"
import i18n, { Language, TranslationKey } from "../../utils/i18n"
import UserRole from "../../types/UserRole"
import { useAuth } from "../../contexts/AuthContext"
import SelectSearchField from "../../components/SelectSearchField"
import type ISelectedClass from "../../types/ISelectedClass"
import { useForm, Controller } from "react-hook-form"
import FormRules from "../../utils/FormRules"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import TableSkeleton from "../../components/TableSkeleton"
import ErrorLoading from "../../components/ErrorLoading"
import { AxiosError, type AxiosResponse } from "axios"
import { CustomAlert, type CustomAlertState } from "../../components/CustomAlert"
import { getParametrizedUrl, RouteKeys, RouteParams } from "../../router/routes"
import { useNavigate } from "react-router-dom"

type AddStudentFormValues = {
  username: string
  password: string
  role: string
  classIds: number[]
}

type CreateClassFormValues = {
  className: string
  teachers: number[]
}

type EditStudentFormValues = {
  username: string
  password?: string
  classIds: number[]
}

type EditClassFormValues = {
  className: string
  teachers: number[]
}

type StudentRow = UserDto & { classNamesDisplay: string }

const TeacherMyClasses = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { username, userId } = useAuth()
  const queryClient = useQueryClient()

  if (!userId) {
    return <TableSkeleton />
  }

  const [selectedClass, setSelectedClass] = useState<ISelectedClass | null>(null)
  const [newClassId, setNewClassId] = useState<number | null>(null)

  const getAddStudentDefaultValues = (): AddStudentFormValues => ({
    username: "",
    password: "",
    role: UserRole.STUDENT,
    classIds: selectedClass ? [selectedClass.classId] : []
  })

  const getCreateClassDefaultValues = (): CreateClassFormValues => ({
    className: "",
    teachers: [userId] // ensure current teacher included
  })

  const selectedRowsDefault: IUsersSelectedRows = {
    rowId: [],
    userId: [],
    username: []
  }

  const {
    handleSubmit: handleAddStudentSubmit,
    control: addStudentControl,
    reset: resetAddStudent,
    watch: watchAddStudent,
    formState: { errors: addStudentErrors }
  } = useForm<AddStudentFormValues>({
    defaultValues: getAddStudentDefaultValues(),
    mode: "onBlur"
  })

  const {
    handleSubmit: handleCreateClassSubmit,
    control: createClassControl,
    reset: resetCreateClass,
    watch: watchCreateClass,
    formState: { errors: createClassErrors }
  } = useForm<CreateClassFormValues>({
    defaultValues: getCreateClassDefaultValues(),
    mode: "onBlur"
  })
  
  const {
    handleSubmit: handleEditStudentSubmit,
    control: editStudentControl,
    reset: resetEditStudent,
    watch: watchEditStudent,
    formState: { errors: editStudentErrors }
  } = useForm<EditStudentFormValues>({
    defaultValues: {
      username: "",
      password: "",
      classIds: []
    },
    mode: "onBlur"
  })

  const {
    handleSubmit: handleEditClassSubmit,
    control: editClassControl,
    reset: resetEditClass,
    watch: watchEditClass,
    formState: { errors: editClassErrors },
    setValue: setEditClassValue
  } = useForm<EditClassFormValues>({
    defaultValues: {
      className: "",
      teachers: userId ? [userId] : []
    },
    mode: "onBlur"
  })

  const addStudentWatchValues = watchAddStudent()
  const createClassWatchValues = watchCreateClass()
  const editStudentWatchValues = watchEditStudent()
  const editClassWatchValues = watchEditClass()

  const [studentsSearchValue, setStudentsSearchValue] = useState("")
  const [studentsSelectedRows, setStudentsSelectedRows] = useState<IUsersSelectedRows>(selectedRowsDefault)

  const [addStudentDialogVis, setAddStudentDialogVis] = useState(false)
  const [deleteStudentsDialogVis, setDeleteStudentsDialogvis] = useState(false)
  const [createClassDialogVis, setCreateClassDialogVis] = useState(false)
  const [deleteClassDialogVis, setDeleteClassDialogvis] = useState(false)
  const [editStudentDialogVis, setEditStudentDialogVis] = useState(false)
  const [editClassDialogVis, setEditClassDialogVis] = useState(false)
  const [removeSelfDialogVis, setRemoveSelfDialogVis] = useState(false)
  const [pendingEditClassData, setPendingEditClassData] = useState<EditClassFormValues | null>(null)

  const [deleteStudents, setDeleteStudents] = useState(true)
  const [studentsDescending, setStudentsDescending] = useState(false)

  const [alert, setAlert] = useState<CustomAlertState | null>(null)
  const minLdapSearchChars = 2

  const studentsColumns = [
    { label: t(TranslationKey.TEACHER_MY_CLASSES_USERNAME), key: "username" }
  ]

  const classesQuery = useQuery<ClassDto[], Error>({
    queryKey: ["teacherClasses", userId],
    enabled: !!userId,
    queryFn: () =>
      classApi
        .classQueryClasses(null, null, userId)
        .then(r => r.data.classes),
    placeholderData: prev => prev
  })

  const teachersQuery = useQuery<UserDto[], Error>({
    queryKey: ["teachers"],
    queryFn: () =>
      userApi
        .userQueryUsers(null, null, UserRole.TEACHER)
        .then(r => r.data.users)
  })

  const ldapAuthQuery = useQuery<IsLdapAuthRes>({
    queryKey: ["isLdapAuth"],
    queryFn: async () => userApi.userIsLdapAuth().then(r => r.data),
    staleTime: 5 * 60_000
  })
  const isLdapAuth = ldapAuthQuery.data?.isLdapAuth === true

  const studentsQuery = useQuery<StudentRow[], Error>({
    queryKey: [ 
      "classStudents",
      {
        classId: selectedClass?.classId,
        search: studentsSearchValue,
        descending: studentsDescending
      }
    ],
    enabled: !!selectedClass,
    queryFn: () =>
      userApi
        .userQueryUsers(
          null,
          studentsSearchValue || null,
          UserRole.STUDENT,
          selectedClass!.classId,
          null,
          studentsDescending || null
        )
        .then(r =>
          (r.data.users ?? []).map(u => ({
            ...u,
            classNamesDisplay: (u.classNames ?? []).join(", ")
          }))
        ),
    placeholderData: prev => prev
  })

  const addStudentMutation = useMutation<
    AxiosResponse<AddUserRes>,
    AxiosError<ApiProblemDetails>,
    AddStudentFormValues
  >({
    mutationFn: (data) =>
      userApi.userAddUser({
        username: data.username,
        password: data.password,
        role: data.role,
        classIds: data.classIds
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classStudents"] })
      setAlert({
        severity: "success",
        message: t(TranslationKey.TEACHER_MY_CLASSES_ADD_STUDENT_SUCCESS, { value: addStudentWatchValues.username })
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
        message: `${t(TranslationKey.TEACHER_MY_CLASSES_ADD_STUDENT_ERROR)}. ${localMessage ?? ""}`,
      })
    }
  })

  const createClassMutation = useMutation<
    AxiosResponse<CreateClassRes>,
    AxiosError<ApiProblemDetails>,
    CreateClassFormValues
  >({
    mutationFn: (data) =>
      classApi.classCreateClass({
        className: data.className,
        teachers: data.teachers
      }),
    onSuccess: (res) => {
      setNewClassId(res.data.classId)
      queryClient.invalidateQueries({ queryKey: ["teacherClasses"] })
      setAlert({
        severity: "success",
        message: t(TranslationKey.TEACHER_MY_CLASSES_CREATE_CLASS_SUCCESS, { value: createClassWatchValues.className })
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
        message: `${t(TranslationKey.TEACHER_MY_CLASSES_CREATE_CLASS_ERROR)}. ${localMessage ?? ""}`,
      })
    }
  })

  const deleteStudentsMutation = useMutation<
    AxiosResponse,
    AxiosError<ApiProblemDetails>,
    IUsersSelectedRows["userId"]
  >({
    mutationFn: (userIds) =>
      userApi.userDeleteUsers({ userIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classStudents"] })
      setAlert({
        severity: "warning",
        message: t(TranslationKey.TEACHER_MY_CLASSES_DELETE_STUDENTS_SUCCESS, {
          value: studentsSelectedRows.username.join(", ")
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
        message: `${t(TranslationKey.TEACHER_MY_CLASSES_DELETE_STUDENTS_ERROR)}. ${localMessage ?? ""}`,
      })
    }
  })

  const deleteClassMutation = useMutation<
    AxiosResponse,
    AxiosError<ApiProblemDetails>,
    { classId: number; deleteStudentsFirst: boolean }
  >({
    mutationFn: async ({ classId, deleteStudentsFirst }) => {
      if (deleteStudentsFirst) {
        const res = await userApi.userQueryUsers(
          null,
          null,
          UserRole.STUDENT,
          classId
        )
        const studentIds = res.data.users.map((u: UserDto) => u.id)
        if (studentIds.length) {
          await userApi.userDeleteUsers({ userIds: studentIds })
        }
      }
      return classApi.classDeleteClasses({ classIds: [classId] })
    },
    onSuccess: () => {
      setSelectedClass(null)
      queryClient.invalidateQueries({ queryKey: ["teacherClasses"] })
      queryClient.invalidateQueries({ queryKey: ["classStudents"] })
      setAlert({
        severity: "warning",
        message: t(TranslationKey.TEACHER_MY_CLASSES_DELETE_CLASS_SUCCESS, {
          value: selectedClass?.className || ""
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
        message: `${t(TranslationKey.TEACHER_MY_CLASSES_DELETE_CLASS_ERROR)}. ${localMessage ?? ""}`,
      })
    }
  })

  const editStudentMutation = useMutation<
    AxiosResponse,
    AxiosError<ApiProblemDetails>,
    EditStudentFormValues
  >({
    mutationFn: (data) =>
      userApi.userEditUser({
        id: studentsSelectedRows.userId[0],
        username: data.username,
        password: data.password ? data.password : undefined,
        classIds: data.classIds
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classStudents"] })
      setAlert({
        severity: "success",
        message: t(TranslationKey.TEACHER_MY_CLASSES_EDIT_STUDENT_SUCCESS, { value: editStudentWatchValues.username })
      })
    },
    onError: (error) => {
      const details = error.response?.data
      const localMessage =
        i18n.language === Language.EN ? details?.messageEn : details?.messageSk
      setAlert({
        severity: "error",
        message: `${t(TranslationKey.TEACHER_MY_CLASSES_EDIT_STUDENT_ERROR)}. ${localMessage ?? ""}`
      })
    }
  })

  const editClassMutation = useMutation<
    AxiosResponse,
    AxiosError<ApiProblemDetails>,
    EditClassFormValues
  >({
    mutationFn: (data) =>
      classApi.classEditClass({
        id: selectedClass!.classId,
        classname: data.className,
        teachers: data.teachers
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacherClasses"] })
      setAlert({
        severity: "success",
        message: t(TranslationKey.TEACHER_MY_CLASSES_CLASSES_EDIT_SUCCESS, {
          value: editClassWatchValues.className
        })
      })
    },
    onError: (error) => {
      const details = error.response?.data
      const localMessage =
        i18n.language === Language.EN ? details?.messageEn : details?.messageSk
      setAlert({
        severity: "error",
        message: `${t(TranslationKey.TEACHER_MY_CLASSES_CLASSES_EDIT_ERROR)}. ${localMessage ?? ""}`
      })
    }
  })

  useEffect(() => {
    const classes = classesQuery.data
    if (!classes || classes.length === 0) {
      setSelectedClass(null)
      return
    }
    if (newClassId !== null) {
      const created = classes.find(c => c.classId === newClassId)
      if (created) {
        setSelectedClass(created)
        setNewClassId(null)
        return
      }
    }
    if (!selectedClass) {
      // finding a class that matches first 3 letters of username
      const uname = (username ?? "").toLowerCase()
      const prefix = uname.slice(0, 3)
      const preferred =
        classes.find(c => c.className.toLowerCase().includes(prefix)) ||
        classes[0]
      setSelectedClass(preferred)
    } else {
      const still = classes.find(c => c.classId === selectedClass.classId)
      if (!still) setSelectedClass(classes[0])
    }
  }, [classesQuery.data, newClassId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddStudent = async (data: AddStudentFormValues) => {
    await addStudentMutation.mutateAsync(data).catch(() => {})
    resetAddStudent(getAddStudentDefaultValues())
    setAddStudentDialogVis(false)
  }


  const handleCreateClass = async (data: CreateClassFormValues) => {
    await createClassMutation
      .mutateAsync({
        ...data,
        teachers: data.teachers?.length ? data.teachers : [userId]
      })
      .catch(() => {})
    resetCreateClass(getCreateClassDefaultValues())
    setCreateClassDialogVis(false)
  }

  const handleDeleteStudents = async () => {
    if (studentsSelectedRows.userId.length === 0) return
    await deleteStudentsMutation
      .mutateAsync(studentsSelectedRows.userId)
      .catch(() => {})
    setStudentsSelectedRows(selectedRowsDefault)
    setDeleteStudentsDialogvis(false)
  }

  const handleDeleteClass = async () => {
    if (!selectedClass) return
    await deleteClassMutation
      .mutateAsync({
        classId: selectedClass.classId,
        deleteStudentsFirst: deleteStudents
      })
      .catch(() => {})
    setDeleteClassDialogvis(false)
  }

  const handleEditStudent = async (data: EditStudentFormValues) => {
    await editStudentMutation.mutateAsync(data).catch(() => {})
    resetEditStudent({
      username: "",
      password: "",
      classIds: []
    })
    setEditStudentDialogVis(false)
  }

  const handleEditClass = async (data: EditClassFormValues) => {
    if (!selectedClass) return
    // show warning dialog when the teacher wants to remove themselves from the class
    if (userId && !data.teachers.includes(userId)) {
      setPendingEditClassData(data)
      setRemoveSelfDialogVis(true)
      return
    }
    await editClassMutation.mutateAsync(data).catch(() => {})
    resetEditClass({
      className: "",
      teachers: userId ? [userId] : []
    })
    setEditClassDialogVis(false)
  }

  const confirmRemoveSelfAndEditClass = async () => {
    if (!pendingEditClassData || !selectedClass) return
    await editClassMutation.mutateAsync(pendingEditClassData).catch(() => {})
    resetEditClass({
      className: "",
      teachers: userId ? [userId] : []
    })
    setEditClassDialogVis(false)
    setRemoveSelfDialogVis(false)
    setPendingEditClassData(null)
  }

  const cancelRemoveSelf = () => {
    if (userId) {
      const current = editClassWatchValues.teachers ?? []
      if (!current.includes(userId)) {
        setEditClassValue("teachers", [...current, userId])
      }
    }
    setRemoveSelfDialogVis(false)
    setPendingEditClassData(null)
  }

  const addStudentDisabled =
    !addStudentWatchValues.username ||
    (!isLdapAuth && !addStudentWatchValues.password) ||
    (addStudentWatchValues.classIds?.length ?? 0) === 0 ||
    addStudentMutation.isPending

  const createClassDisabled =
    !createClassWatchValues.className || createClassMutation.isPending

  const editStudentDisabled =
    !editStudentWatchValues.username || editStudentMutation.isPending

  const editClassDisabled =
    !editClassWatchValues.className || editClassMutation.isPending

  const getSelectedClassTeachers = () =>
    classesQuery.data?.find(c => c.classId === selectedClass?.classId)?.teachers ??
    (userId ? [userId] : [])
  
  return (
    <>
      {selectedClass ? (
        <>
          <ActionPanel
            onAdd={() => {
              resetCreateClass(getCreateClassDefaultValues())
              setCreateClassDialogVis(true)
            }}
            onEdit={() => {
              if (selectedClass) {
                resetEditClass({
                  className: selectedClass.className,
                  teachers: getSelectedClassTeachers()
                })
                setEditClassDialogVis(true)
              }
            }}
            onDetails={() => {
              navigate(
                getParametrizedUrl(RouteKeys.TEACHER_MY_CLASSES_CLASS_DETAILS, {
                  [RouteParams.CLASS_ID]:
                    selectedClass.classId.toString() || ""
                })
              )
            }}
            onDelete={() => setDeleteClassDialogvis(true)}
            disableEdit={!selectedClass}
            disableDetails={!selectedClass}
            disableDelete={!selectedClass || deleteClassMutation.isPending}
            addLabel={t(TranslationKey.TEACHER_MY_CLASSES_CREATE_CLASS)}
            children={
              classesQuery.isLoading ? (
                <TableSkeleton />
              ) : classesQuery.isError ? (
                <ErrorLoading
                  onRetry={() =>
                    queryClient.invalidateQueries({
                      queryKey: ["teacherClasses"]
                    })
                  }
                />
              ) : (
                <SelectSearchField
                  label={t(TranslationKey.TEACHER_MY_CLASSES_CLASS)}
                  items={classesQuery.data ?? []}
                  value={selectedClass.classId}
                  onChange={item => setSelectedClass(item as ISelectedClass)}
                  valueKey="classId"
                  labelKey="className"
                  sx={{ width: { xs: "100%", md: "30vw" } }}
                />
              )
            }
          />

          <Divider sx={{ my: 2 }} />

            <ActionPanel
              onAdd={() => {
                resetAddStudent(getAddStudentDefaultValues())
                setAddStudentDialogVis(true)
              }}
              onEdit={() => {
                if (studentsSelectedRows.userId.length === 1) {
                  const student = studentsQuery.data?.find(
                    s => s.id === studentsSelectedRows.userId[0]
                  )
                  if (student) {
                    resetEditStudent({
                      username: student.username,
                      password: "",
                      classIds: student.classIds ?? []
                    })
                    setEditStudentDialogVis(true)
                  }
                }
              }}
              onDetails={() => {
                navigate(
                  getParametrizedUrl(RouteKeys.TEACHER_MY_CLASSES_STUDENT_DETAILS, {
                    [RouteParams.STUDENT_ID]:
                      studentsSelectedRows.userId.toString() || ""
                  })
                )
              }}
              onDelete={() => setDeleteStudentsDialogvis(true)}
              disableEdit={studentsSelectedRows.userId.length !== 1}
              disableDetails={studentsSelectedRows.userId.length !== 1}
              disableDelete={
                studentsSelectedRows.userId.length === 0 ||
                deleteStudentsMutation.isPending
              }
              addLabel={t(TranslationKey.TEACHER_MY_CLASSES_ADD_STUDENT)}
              title={t(
                TranslationKey.TEACHER_MY_CLASSES_STUDENTS_IN_THIS_CLASS
              )}
            />

          {studentsQuery.isLoading ? (
            <TableSkeleton />
          ) : studentsQuery.isError ? (
            <ErrorLoading
              onRetry={() =>
                queryClient.invalidateQueries({
                  queryKey: ["classStudents"]
                })
              }
            />
          ) : (
            <DataGridWithSearch
              searchValue={studentsSearchValue}
              setSearchValue={setStudentsSearchValue}
              columns={studentsColumns}
              rows={studentsQuery.data ?? []}
              selectableRows
              selectedRows={studentsSelectedRows.userId.filter(
                (id): id is number => id !== undefined
              )}
              setSelectedRows={userIds => {
                const rows = studentsQuery.data ?? []
                setStudentsSelectedRows({
                  rowId: userIds.map(id => rows.findIndex(u => u.id === id)),
                  userId: userIds,
                  username: userIds.map(
                    id => rows.find(u => u.id === id)?.username ?? ""
                  )
                })
              }}
              descending={studentsDescending}
              setDescending={setStudentsDescending}
            />
          )}
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
              {t(TranslationKey.TEACHER_MY_CLASSES_NOCLASS)}
            </Typography>
            <Button
              variant="contained"
              color="success"
              onClick={() => {
                resetCreateClass(getCreateClassDefaultValues())
                setCreateClassDialogVis(true)
              }}
            >
              {t(TranslationKey.TEACHER_MY_CLASSES_CREATE_CLASS)}
            </Button>
          </Box>
          <Divider sx={{ mt: 4 }} />
        </>
      )}

      {/* Add Student Dialog */}
      <Dialog
        open={addStudentDialogVis}
        onClose={() => {
          setAddStudentDialogVis(false)
          resetAddStudent(getAddStudentDefaultValues())
        }}
        fullWidth
        maxWidth="md"
      >
        <form onSubmit={handleAddStudentSubmit(handleAddStudent)}>
          <DialogTitle>
            {t(TranslationKey.TEACHER_MY_CLASSES_ADD_STUDENT)}
          </DialogTitle>
          <DialogContent>
            {isLdapAuth ? (
              <Controller
                name="username"
                control={addStudentControl}
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
                      userApi
                        .userLdapSearchUsers(q)
                        .then(res => res.data.users)
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
                      noOptionsText={t(TranslationKey.TEACHER_MY_CLASSES_NO_DATA)}
                      loadingText={t(TranslationKey.TEACHER_MY_CLASSES_LOADING)}
                      onInputChange={(_, v) => setInput(v)}
                      onChange={(_, v) => field.onChange(v ? (v as LdapUserDto).username : "")}
                      renderInput={params => (
                        <TextField
                          {...params}
                          margin="dense"
                          label={t(TranslationKey.TEACHER_MY_CLASSES_USERNAME)}
                          placeholder={t(TranslationKey.TEACHER_MY_CLASSES_LDAP_USERNAME_PLACEHOLDER, { value: minLdapSearchChars })}
                          fullWidth
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
                name="username"
                control={addStudentControl}
                rules={{
                  ...FormRules.required(),
                  ...FormRules.minLengthShort(),
                  ...FormRules.maxLengthShort(),
                  ...FormRules.patternLettersNumbersDots()
                }}
                render={({ field }) => (
                  <TextField
                    margin="dense"
                    label={t(TranslationKey.TEACHER_MY_CLASSES_USERNAME)}
                    fullWidth
                    {...field}
                    error={!!addStudentErrors.username}
                    helperText={
                      addStudentErrors.username
                        ? t(addStudentErrors.username.message as string)
                        : ""
                    }
                  />
                )}
              />
            )}
            <Controller
              name="password"
              control={addStudentControl}
              rules={isLdapAuth ? {} : {
                ...FormRules.required(),
                ...FormRules.minLengthLong(),
                ...FormRules.maxLengthLong(),
                ...FormRules.patternLettersNumbersSpecial()
              }}
              render={({ field }) => (
                <TextField
                  disabled={isLdapAuth}
                  margin="dense"
                  label={t(TranslationKey.TEACHER_MY_CLASSES_PASSWORD)}
                  fullWidth
                  type="password"
                  {...field}
                  error={!!addStudentErrors.password}
                  helperText={isLdapAuth ? "" : (addStudentErrors.password ? t(addStudentErrors.password.message as string) : "")}
                />
              )}
            />
            <Controller
              name="classIds"
              control={addStudentControl}
              rules={{
                validate: v =>
                  (v && v.length > 0) ||
                  t(TranslationKey.FORM_RULES_REQUIRED).toString()
              }}
              render={({ field }) => (
                <FormControl
                  fullWidth
                  margin="dense"
                  error={!!addStudentErrors.classIds}
                >
                  <InputLabel id="add-student-classes-label">
                    {t(TranslationKey.TEACHER_MY_CLASSES_CLASSES)}
                  </InputLabel>
                  <Select
                    multiple
                    labelId="add-student-classes-label"
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
                        label={t(TranslationKey.TEACHER_MY_CLASSES_CLASSES)}
                      />
                    }
                    renderValue={selected =>
                      (classesQuery.data ?? [])
                        .filter(c =>
                          (selected as (number | string)[]).includes(c.classId)
                        )
                        .map(c => c.className)
                        .join(", ")
                    }
                  >
                    {(classesQuery.data ?? []).map(_class => (
                      <MenuItem key={_class.classId} value={_class.classId}>
                        <Checkbox
                          checked={field.value.indexOf(_class.classId) > -1}
                        />
                        <ListItemText primary={_class.className} />
                      </MenuItem>
                    ))}
                  </Select>
                  {addStudentErrors.classIds && (
                    <Typography variant="caption" color="error">
                      {addStudentErrors.classIds.message?.toString()}
                    </Typography>
                  )}
                </FormControl>
              )}
            />
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                setAddStudentDialogVis(false)
                resetAddStudent(getAddStudentDefaultValues())
              }}
            >
              {t(TranslationKey.TEACHER_MY_CLASSES_CANCEL)}
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="success"
              disabled={addStudentDisabled || addStudentMutation.isPending}
            >
              {t(TranslationKey.TEACHER_MY_CLASSES_ADD)}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Create Class Dialog */}
      <Dialog
        open={createClassDialogVis}
        onClose={() => {
          setCreateClassDialogVis(false)
          resetCreateClass(getCreateClassDefaultValues())
        }}
        fullWidth
        maxWidth="sm"
      >
        <form onSubmit={handleCreateClassSubmit(handleCreateClass)}>
          <DialogTitle>
            {t(TranslationKey.TEACHER_MY_CLASSES_CREATE_CLASS)}
          </DialogTitle>
          <DialogContent>
            <Controller
              name="className"
              control={createClassControl}
              rules={{
                ...FormRules.required(),
                ...FormRules.minLengthShort(),
                ...FormRules.maxLengthShort(),
                ...FormRules.patternLettersNumbersSpecial()
              }}
              render={({ field }) => (
                <TextField
                  margin="dense"
                  label={t(
                    TranslationKey.TEACHER_MY_CLASSES_CLASS_NAME
                  )}
                  fullWidth
                  {...field}
                  error={!!createClassErrors.className}
                  helperText={
                    createClassErrors.className
                      ? t(createClassErrors.className.message as string)
                      : ""
                  }
                />
              )}
            />
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                setCreateClassDialogVis(false)
                resetCreateClass(getCreateClassDefaultValues())
              }}
            >
              {t(TranslationKey.TEACHER_MY_CLASSES_CANCEL)}
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="success"
              disabled={
                createClassDisabled || createClassMutation.isPending
              }
            >
              {t(TranslationKey.TEACHER_MY_CLASSES_CREATE)}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Students Dialog */}
      <DeleteDialog
        open={deleteStudentsDialogVis}
        onClose={() => setDeleteStudentsDialogvis(false)}
        onConfirm={handleDeleteStudents}
        question={t(
          TranslationKey.TEACHER_MY_CLASSES_CONFIRMATION_QUESTION_STUDENTS
        )}
        title={t(
          TranslationKey.TEACHER_MY_CLASSES_CONFIRMATION_TITLE_STUDENTS
        )}
        label={studentsSelectedRows.username.join(", ")}
      />

      {/* Delete Class Dialog */}
      <DeleteDialog
        open={deleteClassDialogVis}
        onClose={() => setDeleteClassDialogvis(false)}
        onConfirm={handleDeleteClass}
        question={t(
          TranslationKey.TEACHER_MY_CLASSES_CONFIRMATION_QUESTION_CLASS
        )}
        title={t(
          TranslationKey.TEACHER_MY_CLASSES_CONFIRMATION_TITLE_CLASS
        )}
        label={selectedClass?.className || ""}
        checkboxLabel={t(
          TranslationKey.TEACHER_MY_CLASSES_DELETE_STUDENTS_CHECKBOX
        )}
        checked={deleteStudents}
        setChecked={setDeleteStudents}
      />

      {/* Edit Student Dialog */}
      <Dialog
        open={editStudentDialogVis}
        onClose={() => {
          setEditStudentDialogVis(false)
          resetEditStudent({
            username: "",
            password: "",
            classIds: []
          })
        }}
        fullWidth
        maxWidth="md"
      >
        <form onSubmit={handleEditStudentSubmit(handleEditStudent)}>
          <DialogTitle>
            {t(TranslationKey.TEACHER_MY_CLASSES_EDIT_STUDENT)}
          </DialogTitle>
          <DialogContent>
            <Controller
              name="username"
              control={editStudentControl}
              rules={{
                ...FormRules.required(),
                ...FormRules.minLengthShort(),
                ...FormRules.maxLengthShort(),
                ...FormRules.patternLettersNumbersDots()
              }}
              render={({ field }) => (
                <TextField
                  disabled={isLdapAuth}
                  margin="dense"
                  label={t(TranslationKey.TEACHER_MY_CLASSES_USERNAME)}
                  fullWidth
                  {...field}
                  error={!!editStudentErrors.username}
                  helperText={
                    editStudentErrors.username
                      ? t(editStudentErrors.username.message as string)
                      : ""
                  }
                />
              )}
            />
            <Controller
              name="password"
              control={editStudentControl}
              rules={{
                ...FormRules.minLengthLong(),
                ...FormRules.maxLengthLong(),
                ...FormRules.patternLettersNumbersSpecial()
              }}
              render={({ field }) => (
                <TextField
                  disabled={isLdapAuth}
                  margin="dense"
                  type="password"
                  label={t(TranslationKey.TEACHER_MY_CLASSES_PASSWORD)}
                  fullWidth
                  {...field}
                  error={!!editStudentErrors.password}
                  helperText={isLdapAuth ? "" : (editStudentErrors.password ? t(editStudentErrors.password.message as string) : "")}
                />
              )}
            />
            <Controller
              name="classIds"
              control={editStudentControl}
              render={({ field }) => (
                <FormControl fullWidth margin="dense">
                  <InputLabel id="edit-student-classes-label">
                    {t(TranslationKey.TEACHER_MY_CLASSES_CLASSES)}
                  </InputLabel>
                  <Select
                    multiple
                    labelId="edit-student-classes-label"
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
                        label={t(TranslationKey.TEACHER_MY_CLASSES_CLASSES)}
                      />
                    }
                    renderValue={selected =>
                      (classesQuery.data ?? [])
                        .filter(c =>
                          (selected as (number | string)[]).includes(c.classId)
                        )
                        .map(c => c.className)
                        .join(", ")
                    }
                  >
                    {(classesQuery.data ?? []).map(_class => (
                      <MenuItem key={_class.classId} value={_class.classId}>
                        <Checkbox
                          checked={(field.value ?? []).includes(_class.classId)}
                        />
                        <ListItemText primary={_class.className} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            />
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                setEditStudentDialogVis(false)
                resetEditStudent({
                  username: "",
                  password: "",
                  classIds: []
                })
              }}
            >
              {t(TranslationKey.TEACHER_MY_CLASSES_CANCEL)}
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="success"
              disabled={editStudentDisabled}
            >
              {t(TranslationKey.TEACHER_MY_CLASSES_EDIT_STUDENT_SAVE)}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Edit Class Dialog */}
      <Dialog
        open={editClassDialogVis}
        onClose={() => {
          setEditClassDialogVis(false)
          resetEditClass({
            className: "",
            teachers: userId ? [userId] : []
          })
        }}
        fullWidth
        maxWidth="md"
      >
        <form onSubmit={handleEditClassSubmit(handleEditClass)}>
          <DialogTitle>
            {t(TranslationKey.TEACHER_MY_CLASSES_EDIT_CLASS)}
          </DialogTitle>
          <DialogContent>
            <Controller
              name="className"
              control={editClassControl}
              rules={{
                ...FormRules.required(),
                ...FormRules.minLengthShort(),
                ...FormRules.maxLengthShort(),
                ...FormRules.patternLettersNumbersSpecial()
              }}
              render={({ field }) => (
                <TextField
                  margin="dense"
                  label={t(
                    TranslationKey.TEACHER_MY_CLASSES_CLASS_NAME
                  )}
                  fullWidth
                  {...field}
                  error={!!editClassErrors.className}
                  helperText={
                    editClassErrors.className
                      ? t(editClassErrors.className.message as string)
                      : ""
                  }
                />
              )}
            />
            <Controller
              name="teachers"
              control={editClassControl}
              render={({ field }) => (
                <FormControl
                  fullWidth
                  margin="dense"
                  disabled={teachersQuery.isLoading || teachersQuery.isError}
                >
                  <InputLabel id="edit-class-teachers-label">
                    {t(TranslationKey.TEACHER_MY_CLASSES_TEACHERS)}
                  </InputLabel>
                  <Select
                    multiple
                    labelId="edit-class-teachers-label"
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
                        label={t(TranslationKey.TEACHER_MY_CLASSES_TEACHERS)}
                      />
                    }
                    renderValue={selected =>
                      (teachersQuery.data ?? [])
                        .filter(t =>
                          (selected as (number | string)[]).includes(t.id)
                        )
                        .map(t => t.username)
                        .join(", ")
                    }
                  >
                    {(teachersQuery.data ?? []).map(tchr => (
                      <MenuItem key={tchr.id} value={tchr.id}>
                        <Checkbox
                          checked={(field.value ?? []).includes(tchr.id)}
                        />
                        <ListItemText primary={tchr.username} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            />
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                setEditClassDialogVis(false)
                resetEditClass({
                  className: "",
                  teachers: userId ? [userId] : []
                })
              }}
            >
              {t(TranslationKey.TEACHER_MY_CLASSES_CANCEL)}
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="success"
              disabled={editClassDisabled}
            >
              {t(TranslationKey.TEACHER_MY_CLASSES_SAVE)}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Warning Dialog */}
      <DeleteDialog
        open={removeSelfDialogVis}
        onClose={cancelRemoveSelf}
        onConfirm={confirmRemoveSelfAndEditClass}
        question={t(TranslationKey.TEACHER_MY_CLASSES_REMOVE_SELF_WARNING_MESSAGE)}
        title={t(TranslationKey.TEACHER_MY_CLASSES_REMOVE_SELF_WARNING_TITLE)}
        color="warning"
        confirmLabel={t(TranslationKey.TEACHER_MY_CLASSES_REMOVE_SELF_WARNING_CONFIRM)}
      />

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

export default TeacherMyClasses