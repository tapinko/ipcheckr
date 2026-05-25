import { useEffect, useState } from "react"
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from "@mui/material"
import { useTranslation } from "react-i18next"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { AuthType } from "../../dtos"
import type { AddUserRes, ApiProblemDetails, ClassDto, LdapUserDto } from "../../dtos"
import { classApi, userApi } from "../../utils/apiClients"
import { useAppConfig } from "../../contexts/AppConfigContext"
import i18n, { Language, TranslationKey } from "../../utils/i18n"
import { CustomAlert, type CustomAlertState } from "../../components/CustomAlert"
import FormRules from "../../utils/FormRules"
import { Controller, useForm } from "react-hook-form"
import { AxiosError, type AxiosResponse } from "axios"
import UserRole from "../../types/UserRole"
import UserListPanel, { type UserRow, type EditFormValues } from "../../components/UserListPanel"
import { getParametrizedUrl, RouteKeys, RouteParams } from "../../router/routes"

type AddFormValues = {
  username: string
  password: string
  classIds: number[]
}

const minLdapSearchChars = 2

type RoleKey = "teacher" | "student"

const AdminUsers = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [teacherSearch, setTeacherSearch] = useState("")
  const [studentSearch, setStudentSearch] = useState("")
  const [addDialogRole, setAddDialogRole] = useState<RoleKey | null>(null)
  const [alert, setAlert] = useState<CustomAlertState | null>(null)

  const { config } = useAppConfig()
  const isLdapAuth = config?.authType === AuthType.Ldap

  const classesQuery = useQuery<ClassDto[]>({
    queryKey: ["classes"],
    queryFn: () => classApi.classQueryClasses().then(r => r.data.classes),
    staleTime: 5 * 60_000
  })

  const toRows = (data: unknown[] | undefined): UserRow[] =>
    (data ?? []).map((u: any) => ({ ...u, classNamesDisplay: (u.classNames ?? []).join(", ") }))

  const teachersQuery = useQuery({
    queryKey: ["users", UserRole.TEACHER, teacherSearch],
    queryFn: () => userApi.userQueryUsers(null, teacherSearch || null, UserRole.TEACHER, null, null, null)
      .then(r => toRows(r.data.users)),
    placeholderData: (prev) => prev
  })

  const studentsQuery = useQuery({
    queryKey: ["users", UserRole.STUDENT, studentSearch],
    queryFn: () => userApi.userQueryUsers(null, studentSearch || null, UserRole.STUDENT, null, null, null)
      .then(r => toRows(r.data.users)),
    placeholderData: (prev) => prev
  })

  const addDefaults: AddFormValues = { username: "", password: "", classIds: [] }

  const {
    control: addControl, handleSubmit: handleAddSubmit, reset: resetAdd, watch: watchAdd,
    formState: { errors: addErrors }
  } = useForm<AddFormValues>({ defaultValues: addDefaults, mode: "onBlur" })

  const addWatch = watchAdd()

  const currentRole = addDialogRole === "teacher" ? UserRole.TEACHER : UserRole.STUDENT

  useEffect(() => {
    if (addDialogRole === null) resetAdd(addDefaults)
  }, [addDialogRole]) // eslint-disable-line react-hooks/exhaustive-deps

  const addMutation = useMutation<AxiosResponse<AddUserRes>, AxiosError<ApiProblemDetails>, AddFormValues & { role: UserRole }>({
    mutationFn: data => userApi.userAddUser({ username: data.username, password: data.password, role: data.role, classIds: data.classIds }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["users", vars.role] })
      resetAdd(addDefaults)
      setAddDialogRole(null)
    },
    onError: (error) => {
      const msg = i18n.language === Language.EN ? error.response?.data?.messageEn : error.response?.data?.messageSk
      setAlert({ severity: "error", message: msg ?? t(TranslationKey.USER_LIST_PANEL_EDIT_ERROR) })
    }
  })

  const editMutation = useMutation<AxiosResponse, AxiosError<ApiProblemDetails>, EditFormValues & { id: number }>({
    mutationFn: data => userApi.userEditUser({ id: data.id, username: data.username, password: data.password || undefined, classIds: data.classIds })
  })

  const deleteMutation = useMutation<AxiosResponse, AxiosError<ApiProblemDetails>, number[]>({
    mutationFn: userIds => userApi.userDeleteUsers({ userIds })
  })

  const handleAdd = async (data: AddFormValues) => {
    await addMutation.mutateAsync({ ...data, role: currentRole }).catch(() => {})
  }

  const handleEditSave = async (userId: number, data: EditFormValues) => {
    const res = await editMutation.mutateAsync({ id: userId, ...data })
    queryClient.invalidateQueries({ queryKey: ["users"] })
    return res
  }

  const handleDelete = async (userIds: number[]) => {
    const res = await deleteMutation.mutateAsync(userIds)
    queryClient.invalidateQueries({ queryKey: ["users"] })
    return res
  }

  const addDisabled = !addWatch.username || (!isLdapAuth && !addWatch.password) || addMutation.isPending

  const addDialogTitle = addDialogRole === "teacher"
    ? t(TranslationKey.USER_LIST_PANEL_ADD_TEACHER_TITLE)
    : t(TranslationKey.USER_LIST_PANEL_ADD_STUDENT_TITLE)

  const addDialog = (
    <Dialog
      open={addDialogRole !== null}
      onClose={() => setAddDialogRole(null)}
      fullWidth maxWidth="md"
    >
      <form onSubmit={handleAddSubmit(handleAdd)}>
        <DialogTitle>{addDialogTitle}</DialogTitle>
        <DialogContent>
          {isLdapAuth ? (
            <Controller
              name="username" control={addControl}
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
                    userApi.userLdapSearchUsers(q)
                      .then(r => { if (!cancelled) setOptions(r.data.users ?? []) })
                      .finally(() => { if (!cancelled) setLoading(false) })
                  }, 250)
                  return () => { cancelled = true; clearTimeout(timer) }
                }, [input])
                return (
                  <Autocomplete
                    loading={loading} options={options} getOptionLabel={o => o.username}
                    noOptionsText={t(TranslationKey.USER_LIST_PANEL_NO_DATA)}
                    loadingText={t(TranslationKey.USER_LIST_PANEL_LOADING)}
                    onInputChange={(_, v) => setInput(v)}
                    onChange={(_, v) => field.onChange(v ? (v as LdapUserDto).username : "")}
                    renderInput={params => (
                      <TextField
                        {...params} margin="dense" fullWidth
                        label={t(TranslationKey.USER_LIST_PANEL_USERNAME)}
                        placeholder={t(TranslationKey.USER_LIST_PANEL_LDAP_PLACEHOLDER, { value: minLdapSearchChars })}
                        error={!!addErrors.username}
                        helperText={addErrors.username ? t(addErrors.username.message as string) : ""}
                      />
                    )}
                  />
                )
              }}
            />
          ) : (
            <Controller
              name="username" control={addControl}
              rules={{ ...FormRules.required(), ...FormRules.minLengthShort(), ...FormRules.patternLettersNumbersDots() }}
              render={({ field }) => (
                <TextField
                  {...field} margin="dense" fullWidth
                  label={t(TranslationKey.USER_LIST_PANEL_USERNAME)}
                  error={!!addErrors.username}
                  helperText={addErrors.username ? t(addErrors.username.message as string) : ""}
                />
              )}
            />
          )}
          {!isLdapAuth && (
            <Controller
              name="password" control={addControl}
              rules={{ ...FormRules.required(), ...FormRules.minLengthLong(), ...FormRules.maxLengthLong(), ...FormRules.patternLettersNumbersSpecial() }}
              render={({ field }) => (
                <TextField
                  {...field} margin="dense" type="password" fullWidth
                  label={t(TranslationKey.USER_LIST_PANEL_PASSWORD)}
                  error={!!addErrors.password}
                  helperText={addErrors.password ? t(addErrors.password.message as string) : ""}
                />
              )}
            />
          )}
          <Controller
            name="classIds" control={addControl}
            render={({ field }) => (
              <Box mt={1.5}>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {(classesQuery.data ?? []).map(cls => {
                    const selected = (field.value ?? []).includes(cls.classId)
                    return (
                      <Chip
                        key={cls.classId}
                        label={cls.className}
                        variant={selected ? "filled" : "outlined"}
                        color={selected ? "primary" : "default"}
                        onClick={() => {
                          const next = selected
                            ? field.value.filter((id: number) => id !== cls.classId)
                            : [...field.value, cls.classId]
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
          <Button onClick={() => setAddDialogRole(null)}>{t(TranslationKey.USER_LIST_PANEL_CANCEL)}</Button>
          <Button type="submit" variant="contained" color="success" disabled={addDisabled}>
            {t(TranslationKey.USER_LIST_PANEL_ADD)}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )

  const sharedPanelProps = {
    isLdapAuth,
    classesData: classesQuery.data,
    onEditSave: handleEditSave,
    editSuccessMessage: t(TranslationKey.USER_LIST_PANEL_EDIT_SUCCESS),
    editErrorMessage: t(TranslationKey.USER_LIST_PANEL_EDIT_ERROR),
    onDelete: handleDelete,
    deleteQuestion: t(TranslationKey.USER_LIST_PANEL_DELETE_QUESTION),
    deleteTitle: t(TranslationKey.USER_LIST_PANEL_DELETE_TITLE),
    deleteSuccessMessage: t(TranslationKey.USER_LIST_PANEL_DELETE_SUCCESS),
    deleteErrorMessage: t(TranslationKey.USER_LIST_PANEL_DELETE_ERROR),
  }

  return (
    <Box display="flex" flexDirection="column" gap={3}>
      {alert && <CustomAlert {...alert} onClose={() => setAlert(null)} />}
      {addDialog}

      <UserListPanel
        {...sharedPanelProps}
        title={t(TranslationKey.USER_LIST_PANEL_TEACHERS)}
        users={teachersQuery.data ?? []}
        isLoading={teachersQuery.isLoading}
        isError={teachersQuery.isError}
        onRetry={() => queryClient.invalidateQueries({ queryKey: ["users", UserRole.TEACHER] })}
        search={teacherSearch}
        onSearchChange={setTeacherSearch}
        addTooltip={t(TranslationKey.USER_LIST_PANEL_ADD_TEACHER)}
        onAddClick={() => setAddDialogRole("teacher")}
        onRowClick={user => navigate(getParametrizedUrl(RouteKeys.ADMIN_USER_DETAILS, { [RouteParams.USER_ID]: user.id.toString() }))}
      />

      <UserListPanel
        {...sharedPanelProps}
        title={t(TranslationKey.USER_LIST_PANEL_STUDENTS)}
        users={studentsQuery.data ?? []}
        isLoading={studentsQuery.isLoading}
        isError={studentsQuery.isError}
        onRetry={() => queryClient.invalidateQueries({ queryKey: ["users", UserRole.STUDENT] })}
        search={studentSearch}
        onSearchChange={setStudentSearch}
        addTooltip={t(TranslationKey.USER_LIST_PANEL_ADD_STUDENT)}
        onAddClick={() => setAddDialogRole("student")}
        onRowClick={user => navigate(getParametrizedUrl(RouteKeys.ADMIN_USER_DETAILS, { [RouteParams.USER_ID]: user.id.toString() }))}
      />
    </Box>
  )
}

export default AdminUsers