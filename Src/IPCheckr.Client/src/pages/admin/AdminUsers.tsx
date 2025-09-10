import { useState } from "react"
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  ListItemText,
  MenuItem,
  OutlinedInput,
  Select,
  TextField,
} from "@mui/material"
import { useTranslation } from "react-i18next"
import type { AddUserRes, ApiProblemDetails, ClassDto, UserDto } from "../../dtos"
import { classApi, userApi } from "../../utils/apiClients"
import DataGridWithSearch from "../../components/DataGridWithSearch"
import ActionPanel from "../../components/ActionPanel"
import type { IUsersSelectedRows } from "../../types/ISelectedRows"
import DeleteDialog from "../../components/DeleteDialog"
import i18n, { Language, TranslationKey } from "../../utils/i18n"
import FormRules from "../../utils/FormRules"
import { Controller, useForm } from "react-hook-form"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import TableSkeleton from "../../components/TableSkeleton"
import ErrorLoading from "../../components/ErrorLoading"
import { CustomAlert, type CustomAlertState } from "../../components/CustomAlert"
import { AxiosError, type AxiosResponse } from "axios"
import UserRole from "../../types/UserRole"
import { useNavigate } from "react-router-dom"
import { getParametrizedUrl, RouteKeys, RouteParams } from "../../router/routes"

type AddUserFormValues = {
  username: string
  password: string
  role: string
  classIds: number[]
}

type EditUserFormValues = {
  username?: string
  password?: string
  classIds?: number[]
}

type UserRow = UserDto & { classNamesDisplay: string }

const AdminUsers = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const addUserDefaultValues: AddUserFormValues = {
    username: "",
    password: "",
    role: "",
    classIds: []
  }

  const editUserDefaultValues: Partial<AddUserFormValues> = {
    username: "",
    password: "",
    classIds: []
  }

  const selectedRowsDefault: IUsersSelectedRows = {
    rowId: [],
    userId: [],
    username: []
  }

  const {
    control: addUserControl,
    handleSubmit: handleAddUserSubmit,
    reset: resetAddUser,
    watch: watchAddUser,
    formState: { errors: addUserErrors }
  } = useForm<AddUserFormValues>({
    defaultValues: addUserDefaultValues,
    mode: "onBlur"
  })

  const {
    control: editUserControl,
    handleSubmit: handleEditUserSubmit,
    reset: resetEditUser,
    watch: watchEditUser,
    formState: { errors: editUserErrors }
  } = useForm<Partial<AddUserFormValues>>({
    defaultValues: editUserDefaultValues,
    mode: "onBlur"
  })

  const addWatch = watchAddUser()
  const editWatch = watchEditUser()

  const [searchValue, setSearchValue] = useState("")
  const [selectedRows, setSelectedRows] = useState<IUsersSelectedRows>(selectedRowsDefault)

  const [addDialogVis, setAddDialogVis] = useState(false)
  const [deleteDialogVis, setDeleteDialogvis] = useState(false)
  const [editDialogVis, setEditDialogVis] = useState(false)

  const [roleFilterValue, setRoleFilterValue] = useState("")
  const [classFilterValue, setClassFilterValue] = useState("")
  const [descending, setDescending] = useState(false)

  const [alert, setAlert] = useState<CustomAlertState | null>(null)

  const usersQuery = useQuery<UserRow[], Error>({
    queryKey: ["users", { searchValue, roleFilterValue, classFilterValue, descending }],
    queryFn: () =>
      userApi
        .userQueryUsers(
          null,
          searchValue || null,
          roleFilterValue || null,
          null,
          classFilterValue || null,
          descending || null
        )
        .then(r =>
          (r.data.users ?? []).map(u => ({
            ...u,
            classNamesDisplay: (u.classNames ?? []).join(", ")
          }))
        ),
    placeholderData: (prev) => prev
  })

  const classesQuery = useQuery<ClassDto[]>({
    queryKey: ["classes"],
    queryFn: () => classApi.classQueryClasses().then(r => r.data.classes),
    staleTime: 5 * 60_000
  })

  const addUserMutation = useMutation<
    AxiosResponse<AddUserRes>,
    AxiosError<ApiProblemDetails>,
    AddUserFormValues
  >({
    mutationFn: (data) =>
      userApi.userAddUser({
        username: data.username,
        password: data.password,
        role: data.role,
        classIds: data.classIds
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
      setAlert({
        severity: "success",
        message: t(TranslationKey.ADMIN_USER_ADD_SUCCESS, { value: addWatch.username })
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
        message: `${t(TranslationKey.ADMIN_USER_ADD_ERROR)}. ${localMessage ?? ""}`,
      })
    }
  })

  const deleteUsersMutation = useMutation<
    AxiosResponse,
    AxiosError<ApiProblemDetails>,
    IUsersSelectedRows["userId"]
  >({
    mutationFn: (userIds) =>
      userApi.userDeleteUsers({ userIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
      setAlert({
        severity: "warning",
        message: t(TranslationKey.ADMIN_USER_DELETE_SUCCESS)
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
        message: `${t(TranslationKey.ADMIN_USER_DELETE_ERROR)}. ${localMessage ?? ""}`,
      })
    }
  })

  const editUserMutation = useMutation<
    AxiosResponse,
    AxiosError<ApiProblemDetails>,
    EditUserFormValues
  >({
    mutationFn: (data) =>
      userApi.userEditUser({
        id: selectedRows.userId[0],
        username: data.username,
        password: data.password,
        classIds: data.classIds
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
      setAlert({
        severity: "success",
        message: t(TranslationKey.ADMIN_USER_EDIT_SUCCESS, { value: editWatch.username })
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
        message: `${t(TranslationKey.ADMIN_USER_EDIT_ERROR)}. ${localMessage ?? ""}`,
      })
    }
  })

  const columns = [
    { label: t(TranslationKey.ADMIN_USERS_USERNAME), key: "username" },
    { label: t(TranslationKey.ADMIN_USERS_ROLE), key: "role" },
    { label: t(TranslationKey.ADMIN_USERS_CLASSES), key: "classNamesDisplay" }
  ]

  const roleFilter = {
    label: t(TranslationKey.ADMIN_USERS_ROLE),
    value: roleFilterValue,
    setValue: setRoleFilterValue,
    options: [
      { value: "", label: t(TranslationKey.ADMIN_USERS_ALL) },
      { value: "Student", label: t(TranslationKey.ADMIN_USERS_STUDENT) },
      { value: "Teacher", label: t(TranslationKey.ADMIN_USERS_TEACHER) }
    ]
  }

  const classFilter = {
    label: t(TranslationKey.ADMIN_USERS_CLASS),
    value: classFilterValue,
    setValue: setClassFilterValue,
    options: [
      { value: "", label: t(TranslationKey.ADMIN_USERS_ALL) },
      ...(classesQuery.data
        ? classesQuery.data.map(c => ({
            value: c.className,
            label: c.className
          }))
        : [])
    ]
  }

  const handleAddUser = async (data: AddUserFormValues) => {
    await addUserMutation.mutateAsync(data).catch(() => {})
    resetAddUser(addUserDefaultValues)
    setAddDialogVis(false)
  }

  const handleDeleteUsers = async () => {
    if (selectedRows.userId.length === 0) return
    await deleteUsersMutation.mutateAsync(selectedRows.userId).catch(() => {})
    setSelectedRows(selectedRowsDefault)
    setDeleteDialogvis(false)
  }

  const handleEditUser = async (data: EditUserFormValues) => {
    await editUserMutation.mutateAsync(data).catch(() => {})
    resetEditUser(editUserDefaultValues)
    setEditDialogVis(false)
  }

  const addDisabled =
    !addWatch.username ||
    !addWatch.password ||
    !addWatch.role ||
    addUserMutation.isPending

  const editDisabled =
    !editWatch.username ||
    editUserMutation.isPending

  const hasAdminSelected = usersQuery.data
    ? usersQuery.data.some(
        u => selectedRows.userId.includes(u.id) && (u.role === UserRole.ADMIN)
      )
    : false

  return (
    <>
      <ActionPanel
        onAdd={() => {
          resetAddUser(addUserDefaultValues)
          setAddDialogVis(true)
        }}
        onEdit={() => {
          const user = usersQuery.data?.find(u => u.id === selectedRows.userId[0])
          if (user) {
            resetEditUser({
              username: user.username,
              classIds: user.classIds ?? []
            })
            setEditDialogVis(true)
          }
        }}
        onDetails={() => {
          navigate(
            getParametrizedUrl(RouteKeys.ADMIN_USER_DETAILS, {
              [RouteParams.USER_ID]:
                String(selectedRows.userId[0])
            })
          )
        }}
        onDelete={() => setDeleteDialogvis(true)}
        disableEdit={selectedRows.userId.length !== 1}
        disableDetails={selectedRows.userId.length !== 1 || hasAdminSelected}
        disableDelete={selectedRows.userId.length === 0 || hasAdminSelected}
        addLabel={t(TranslationKey.ADMIN_USERS_ADD_USER)}
        title={t(TranslationKey.ADMIN_USERS_TITLE)}
      />

      {usersQuery.isLoading ? (
        <TableSkeleton />
      ) : usersQuery.isError ? (
        <ErrorLoading onRetry={() => queryClient.invalidateQueries({ queryKey: ["users"] })} />
      ) : (
        <DataGridWithSearch
          searchValue={searchValue}
            setSearchValue={setSearchValue}
          columns={columns}
          filter1={roleFilter}
          filter2={classFilter}
          rows={usersQuery.data ?? []}
          selectableRows
          selectedRows={selectedRows.userId.filter((id): id is number => id !== undefined)}
          setSelectedRows={userIds => {
            const rows = usersQuery.data ?? []
            setSelectedRows({
              rowId: userIds.map(id => rows.findIndex(u => u.id === id)),
              userId: userIds,
              username: userIds.map(id => rows.find(u => u.id === id)?.username ?? "")
            })
          }}
          descending={descending}
          setDescending={setDescending}
        />
      )}

      <Dialog
        open={addDialogVis}
        onClose={() => {
          setAddDialogVis(false)
          resetAddUser(addUserDefaultValues)
        }}
        sx={{ "& .MuiDialog-paper": { width: "30vw" } }}
      >
        <form onSubmit={handleAddUserSubmit(handleAddUser)}>
          <DialogTitle>{t(TranslationKey.ADMIN_USERS_ADD_USER)}</DialogTitle>
          <DialogContent>
            <Controller
              name="username"
              control={addUserControl}
              rules={{
                ...FormRules.required(),
                ...FormRules.minLengthShort(),
                ...FormRules.maxLengthShort(),
                ...FormRules.patternLettersNumbersDots()
              }}
              render={({ field }) => (
                <TextField
                  margin="dense"
                  label={t(TranslationKey.ADMIN_USERS_USERNAME)}
                  fullWidth
                  {...field}
                  error={!!addUserErrors.username}
                  helperText={
                    addUserErrors.username
                      ? t(addUserErrors.username.message as string)
                      : ""
                  }
                />
              )}
            />
            <Controller
              name="password"
              control={addUserControl}
              rules={{
                ...FormRules.required(),
                ...FormRules.minLengthLong(),
                ...FormRules.maxLengthLong(),
                ...FormRules.patternLettersNumbersSpecial()
              }}
              render={({ field }) => (
                <TextField
                  margin="dense"
                  label={t(TranslationKey.ADMIN_USERS_PASSWORD)}
                  type="password"
                  fullWidth
                  {...field}
                  error={!!addUserErrors.password}
                  helperText={
                    addUserErrors.password
                      ? t(addUserErrors.password.message as string)
                      : ""
                  }
                />
              )}
            />
            <Controller
              name="role"
              control={addUserControl}
              rules={{ ...FormRules.required() }}
              render={({ field }) => (
                <TextField
                  margin="dense"
                  label={t(TranslationKey.ADMIN_USERS_ROLE)}
                  select
                  fullWidth
                  {...field}
                  error={!!addUserErrors.role}
                  helperText={
                    addUserErrors.role
                      ? t(addUserErrors.role.message as string)
                      : ""
                  }
                >
                  <MenuItem value="Teacher">
                    {t(TranslationKey.ADMIN_USERS_TEACHER)}
                  </MenuItem>
                  <MenuItem value="Student">
                    {t(TranslationKey.ADMIN_USERS_STUDENT)}
                  </MenuItem>
                </TextField>
              )}
            />
            <Controller
              name="classIds"
              control={addUserControl}
              render={({ field }) => (
                <FormControl fullWidth margin="dense">
                  <InputLabel>{t(TranslationKey.ADMIN_USERS_CLASS)}</InputLabel>
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
                        label={t(TranslationKey.ADMIN_USERS_CLASS)}
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
                          checked={
                            (field.value ?? []).indexOf(_class.classId) > -1
                          }
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
                setAddDialogVis(false)
                resetAddUser(addUserDefaultValues)
              }}
            >
              {t(TranslationKey.ADMIN_USERS_CANCEL)}
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="success"
              disabled={addDisabled}
            >
              {t(TranslationKey.ADMIN_USERS_ADD)}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <DeleteDialog
        open={deleteDialogVis}
        onClose={() => setDeleteDialogvis(false)}
        onConfirm={handleDeleteUsers}
        question={t(
          TranslationKey.ADMIN_USERS_DELETE_CONFIRMATION_QUESTION
        )}
        title={t(TranslationKey.ADMIN_USERS_DELETE_CONFIRMATION_TITLE)}
        label={selectedRows.username.join(", ")}
      />

      <Dialog
        open={editDialogVis}
        onClose={() => {
          setEditDialogVis(false)
          resetEditUser(editUserDefaultValues)
        }}
        sx={{ "& .MuiDialog-paper": { width: "30vw" } }}
      >
        <form onSubmit={handleEditUserSubmit(handleEditUser)}>
          <DialogTitle>{t(TranslationKey.ADMIN_USERS_EDIT_USER)}</DialogTitle>
          <DialogContent>
            <Controller
              name="username"
              control={editUserControl}
              rules={{
                ...FormRules.required(),
                ...FormRules.minLengthShort(),
                ...FormRules.maxLengthShort(),
                ...FormRules.patternLettersNumbersDots()
              }}
              render={({ field }) => (
                <TextField
                  disabled={hasAdminSelected}
                  margin="dense"
                  label={t(TranslationKey.ADMIN_USERS_USERNAME)}
                  fullWidth
                  {...field}
                  error={!!editUserErrors.username}
                  helperText={
                    editUserErrors.username
                      ? t(editUserErrors.username.message as string)
                      : ""
                  }
                />
              )}
            />
            <Controller
              name="password"
              control={editUserControl}
              rules={{
                ...FormRules.minLengthLong(),
                ...FormRules.maxLengthLong(),
                ...FormRules.patternLettersNumbersSpecial()
              }}
              render={({ field }) => (
                <TextField
                  margin="dense"
                  label={t(TranslationKey.ADMIN_USERS_PASSWORD)}
                  type="password"
                  fullWidth
                  {...field}
                  error={!!editUserErrors.password}
                  helperText={
                    editUserErrors.password
                      ? t(editUserErrors.password.message as string)
                      : ""
                  }
                />
              )}
            />
            <Controller
              name="classIds"
              control={editUserControl}
              render={({ field }) => (
                <FormControl fullWidth margin="dense">
                  <InputLabel>{t(TranslationKey.ADMIN_USERS_CLASS)}</InputLabel>
                  <Select
                    disabled={hasAdminSelected}
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
                        label={t(TranslationKey.ADMIN_USERS_CLASS)}
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
                          checked={
                            (field.value ?? []).indexOf(_class.classId) > -1
                          }
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
                setEditDialogVis(false)
                resetEditUser(editUserDefaultValues)
              }}
            >
              {t(TranslationKey.ADMIN_USERS_CANCEL)}
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="success"
              disabled={editDisabled}
            >
              {t(TranslationKey.ADMIN_USERS_SAVE)}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

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

export default AdminUsers