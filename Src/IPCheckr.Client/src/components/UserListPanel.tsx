import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline"
import EditOutlinedIcon from "@mui/icons-material/EditOutlined"
import AddIcon from "@mui/icons-material/Add"
import SearchIcon from "@mui/icons-material/Search"
import {
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
  Typography,
} from "@mui/material"
import { AxiosError, type AxiosResponse } from "axios"
import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { CustomAlert, type CustomAlertState } from "./CustomAlert"
import DeleteDialog from "./DeleteDialog"
import ErrorLoading from "./ErrorLoading"
import type { ApiProblemDetails, ClassDto, UserDto } from "../dtos"
import FormRules from "../utils/FormRules"
import i18n, { Language, TranslationKey } from "../utils/i18n"

export type UserRow = UserDto & { classNamesDisplay: string }

export type EditFormValues = {
  username: string
  password: string
  classIds: number[]
}

type UserListPanelProps = {
  title?: string

  users: UserRow[]
  isLoading?: boolean
  isError?: boolean
  onRetry?: () => void

  search: string
  onSearchChange: (v: string) => void

  addTooltip: string
  onAddClick: () => void

  isLdapAuth: boolean
  classesData?: ClassDto[]
  onEditSave: (userId: number, data: EditFormValues) => Promise<AxiosResponse>
  editSuccessMessage?: string
  editErrorMessage?: string

  onDelete: (userIds: number[]) => Promise<AxiosResponse>
  deleteQuestion: string
  deleteTitle: string
  deleteBulkTooltip?: string
  deleteSuccessMessage?: string
  deleteErrorMessage?: string

  noDataMessage?: string
  onRowClick?: (user: UserRow) => void
}

const UserListPanel = ({
  title,
  users,
  isLoading,
  isError,
  onRetry,
  search,
  onSearchChange,
  addTooltip,
  onAddClick,
  isLdapAuth,
  classesData,
  onEditSave,
  editSuccessMessage,
  editErrorMessage,
  onDelete,
  deleteQuestion,
  deleteTitle,
  deleteBulkTooltip,
  deleteSuccessMessage,
  deleteErrorMessage,
  noDataMessage,
  onRowClick,
}: UserListPanelProps) => {
  const { t } = useTranslation()

  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [editDialogVis, setEditDialogVis] = useState(false)
  const [singleDeleteDialogVis, setSingleDeleteDialogVis] = useState(false)
  const [bulkDeleteDialogVis, setBulkDeleteDialogVis] = useState(false)
  const [editingUser, setEditingUser] = useState<UserDto | null>(null)
  const [deletingUser, setDeletingUser] = useState<UserRow | null>(null)
  const [alert, setAlert] = useState<CustomAlertState | null>(null)

  const editDefaults: EditFormValues = { username: "", password: "", classIds: [] }

  const {
    control: editControl, handleSubmit: handleEditSubmit, reset: resetEdit, watch: watchEdit,
    formState: { errors: editErrors }
  } = useForm<EditFormValues>({ defaultValues: editDefaults, mode: "onBlur" })

  const editUsernameValue = watchEdit("username")

  const openEditDialog = (user: UserDto) => {
    setEditingUser(user)
    resetEdit({ username: user.username, password: "", classIds: user.classIds ?? [] })
    setEditDialogVis(true)
  }

  const closeEditDialog = () => {
    setEditDialogVis(false)
    resetEdit(editDefaults)
    setEditingUser(null)
  }

  const handleEdit = async (data: EditFormValues) => {
    try {
      await onEditSave(editingUser!.id, data)
      setAlert({ severity: "success", message: editSuccessMessage ?? t(TranslationKey.USER_LIST_PANEL_EDIT_SUCCESS) })
    } catch (error) {
      const e = error as AxiosError<ApiProblemDetails>
      const msg = i18n.language === Language.EN ? e.response?.data?.messageEn : e.response?.data?.messageSk
      setAlert({ severity: "error", message: `${editErrorMessage ?? t(TranslationKey.USER_LIST_PANEL_EDIT_ERROR)}. ${msg ?? ""}` })
    }
    closeEditDialog()
  }

  const handleDelete = async (userIds: number[]) => {
    try {
      await onDelete(userIds)
      setSelectedIds(prev => prev.filter(id => !userIds.includes(id)))
      setAlert({ severity: "warning", message: deleteSuccessMessage ?? t(TranslationKey.USER_LIST_PANEL_DELETE_SUCCESS) })
    } catch (error) {
      const e = error as AxiosError<ApiProblemDetails>
      const msg = i18n.language === Language.EN ? e.response?.data?.messageEn : e.response?.data?.messageSk
      setAlert({ severity: "error", message: `${deleteErrorMessage ?? t(TranslationKey.USER_LIST_PANEL_DELETE_ERROR)}. ${msg ?? ""}` })
    }
  }

  const toggleSelect = (id: number) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const editDisabled = !editUsernameValue
  const selectedUsers = users.filter(u => selectedIds.includes(u.id))

  return (
    <Box>
      {alert && <CustomAlert {...alert} onClose={() => setAlert(null)} />}

      <Card variant="outlined" sx={{ borderRadius: 1, borderColor: theme => theme.palette.divider }}>
        {isLoading ? (
          <>
            <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
                {title && <Skeleton variant="rounded" height={32} sx={{ borderRadius: 1, flexShrink: 0, width: 90 }} />}
                <Skeleton variant="rounded" height={56} sx={{ flex: 1, borderRadius: 1 }} />
                <Skeleton variant="circular" width={56} height={56} sx={{ flexShrink: 0 }} />
              </Stack>
            </CardContent>

            <Divider />

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
          </>
        ) : (
          <>
            <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
                {title && (
                  <Typography variant="subtitle1" fontWeight={600} sx={{ flexShrink: 0, minWidth: 90 }}>
                    {title}
                  </Typography>
                )}
                <TextField
                  fullWidth
                  value={search}
                  onChange={e => onSearchChange(e.target.value)}
                  placeholder={t(TranslationKey.USER_LIST_PANEL_SEARCH)}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon fontSize="small" />
                        </InputAdornment>
                      )
                    }
                  }}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: 1, bgcolor: "background.paper" } }}
                />
                {selectedIds.length >= 2 && (
                  <Tooltip title={deleteBulkTooltip ?? t(TranslationKey.USER_LIST_PANEL_DELETE_SELECTED)}>
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
                <Tooltip title={addTooltip}>
                  <span>
                    <IconButton
                      onClick={onAddClick}
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

            {isError ? (
              <Box sx={{ p: 2 }}>
                <ErrorLoading onRetry={onRetry} />
              </Box>
            ) : users.length === 0 ? (
              <Box sx={{ px: 3, py: 4, textAlign: "center" }}>
                <Typography color="text.secondary">
                  {noDataMessage ?? t(TranslationKey.USER_LIST_PANEL_NO_DATA)}
                </Typography>
              </Box>
            ) : (
              <Box>
                {users.map((user, index) => (
                  <Box
                    key={user.id}
                    onClick={() => onRowClick?.(user)}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      px: 1,
                      py: 0.5,
                      borderBottom: index < users.length - 1 ? "1px solid" : "none",
                      borderColor: "divider",
                      cursor: onRowClick ? "pointer" : "default",
                      "&:hover": onRowClick ? { bgcolor: "action.hover" } : undefined,
                      "&:hover .user-name": onRowClick ? { textDecoration: "underline" } : undefined,
                    }}
                  >
                    <Checkbox
                      size="small"
                      checked={selectedIds.includes(user.id)}
                      onChange={() => toggleSelect(user.id)}
                      onClick={e => e.stopPropagation()}
                    />
                    <Typography className="user-name" sx={{ flex: 1, fontWeight: 500, ml: 0.5 }}>
                      {user.username}
                    </Typography>
                    {user.classNamesDisplay && (
                      <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                        {user.classNamesDisplay}
                      </Typography>
                    )}
                    <Stack direction="row" onClick={e => e.stopPropagation()}>
                      <IconButton size="small" onClick={() => openEditDialog(user)}>
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => { setDeletingUser(user); setSingleDeleteDialogVis(true) }}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Box>
                ))}
              </Box>
            )}
          </>
        )}
      </Card>

      <Dialog open={editDialogVis} onClose={closeEditDialog} fullWidth maxWidth="md">
        <form onSubmit={handleEditSubmit(handleEdit)}>
          <DialogTitle>{t(TranslationKey.USER_LIST_PANEL_EDIT_USER)}</DialogTitle>
          <DialogContent>
            <Controller
              name="username" control={editControl}
              rules={{ ...FormRules.required(), ...FormRules.minLengthShort(), ...FormRules.patternLettersNumbersDots() }}
              render={({ field }) => (
                <TextField
                  {...field} disabled={isLdapAuth} margin="dense" fullWidth
                  label={t(TranslationKey.USER_LIST_PANEL_USERNAME)}
                  error={!!editErrors.username}
                  helperText={editErrors.username ? t(editErrors.username.message as string) : ""}
                />
              )}
            />
            <Controller
              name="password" control={editControl}
              rules={{ ...FormRules.minLengthLong(), ...FormRules.maxLengthLong(), ...FormRules.patternLettersNumbersSpecial() }}
              render={({ field }) => (
                <TextField
                  {...field} disabled={isLdapAuth} margin="dense" type="password" fullWidth
                  label={t(TranslationKey.USER_LIST_PANEL_PASSWORD)}
                  error={!!editErrors.password}
                  helperText={isLdapAuth ? "" : (editErrors.password ? t(editErrors.password.message as string) : "")}
                />
              )}
            />
            <Controller
              name="classIds" control={editControl}
              render={({ field }) => (
                <FormControl fullWidth margin="dense">
                  <InputLabel>{t(TranslationKey.USER_LIST_PANEL_CLASS)}</InputLabel>
                  <Select
                    multiple value={field.value}
                    onChange={e => field.onChange(Array.isArray(e.target.value) ? e.target.value.map(Number) : [])}
                    input={<OutlinedInput label={t(TranslationKey.USER_LIST_PANEL_CLASS)} />}
                    renderValue={selected =>
                      (classesData ?? []).filter(c => (selected as number[]).includes(c.classId)).map(c => c.className).join(", ")
                    }
                  >
                    {(classesData ?? []).map(cls => (
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
            <Button onClick={closeEditDialog}>{t(TranslationKey.USER_LIST_PANEL_CANCEL)}</Button>
            <Button type="submit" variant="contained" color="success" disabled={editDisabled}>
              {t(TranslationKey.USER_LIST_PANEL_SAVE)}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <DeleteDialog
        open={singleDeleteDialogVis}
        onClose={() => { setSingleDeleteDialogVis(false); setDeletingUser(null) }}
        onConfirm={async () => {
          if (deletingUser) await handleDelete([deletingUser.id])
          setSingleDeleteDialogVis(false)
          setDeletingUser(null)
        }}
        question={deleteQuestion}
        title={deleteTitle}
        label={deletingUser?.username ?? ""}
      />

      <DeleteDialog
        open={bulkDeleteDialogVis}
        onClose={() => setBulkDeleteDialogVis(false)}
        onConfirm={async () => {
          await handleDelete(selectedIds)
          setBulkDeleteDialogVis(false)
        }}
        question={deleteQuestion}
        title={deleteTitle}
        label={selectedUsers.map(u => u.username).join(", ")}
      />
    </Box>
  )
}

export default UserListPanel