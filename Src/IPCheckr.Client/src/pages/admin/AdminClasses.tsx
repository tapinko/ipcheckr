import AddIcon from "@mui/icons-material/Add"
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline"
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
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { AxiosError, AxiosResponse } from "axios"
import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import ClassCard from "../../components/ClassCard"
import { CustomAlert, type CustomAlertState } from "../../components/CustomAlert"
import DeleteDialog from "../../components/DeleteDialog"
import ErrorLoading from "../../components/ErrorLoading"
import type { ApiProblemDetails, ClassDto, CreateClassRes, UserDto } from "../../dtos"
import { getParametrizedUrl, RouteKeys, RouteParams } from "../../router/routes"
import UserRole from "../../types/UserRole"
import { classApi, userApi } from "../../utils/apiClients"
import FormRules from "../../utils/FormRules"
import i18n, { Language, TranslationKey } from "../../utils/i18n"

type CreateFormValues = { className: string; teacherIds: number[] }
type EditFormValues = { className: string; teacherIds: number[] }

const AdminClasses = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [search, setSearch] = useState("")
  const [teacherFilter, setTeacherFilter] = useState<number | null>(null)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [createDialogVis, setCreateDialogVis] = useState(false)
  const [editingClass, setEditingClass] = useState<ClassDto | null>(null)
  const [deletingIds, setDeletingIds] = useState<number[]>([])
  const [deleteDialogVis, setDeleteDialogVis] = useState(false)
  const [alert, setAlert] = useState<CustomAlertState | null>(null)

  const createDefaults: CreateFormValues = { className: "", teacherIds: [] }
  const {
    control: createControl, handleSubmit: handleCreateSubmit, reset: resetCreate, watch: watchCreate,
    formState: { errors: createErrors }
  } = useForm<CreateFormValues>({ defaultValues: createDefaults, mode: "onBlur" })
  const createClassName = watchCreate("className")

  const editDefaults: EditFormValues = { className: "", teacherIds: [] }
  const {
    control: editControl, handleSubmit: handleEditSubmit, reset: resetEdit, watch: watchEdit,
    formState: { errors: editErrors }
  } = useForm<EditFormValues>({ defaultValues: editDefaults, mode: "onBlur" })
  const editClassName = watchEdit("className")

  const classesQuery = useQuery<ClassDto[], Error>({
    queryKey: ["classes", search, teacherFilter],
    queryFn: () => classApi.classQueryClasses(null, search || null, teacherFilter).then(r => r.data.classes),
    placeholderData: prev => prev,
  })

  const teachersQuery = useQuery<UserDto[], Error>({
    queryKey: ["teachers"],
    queryFn: () => userApi.userQueryUsers(null, null, UserRole.TEACHER).then(r => r.data.users),
    staleTime: 5 * 60_000,
  })

  const createMutation = useMutation<AxiosResponse<CreateClassRes>, AxiosError<ApiProblemDetails>, CreateFormValues>({
    mutationFn: data => classApi.classCreateClass({ className: data.className, teachers: data.teacherIds }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["classes"] })
      setAlert({ severity: "success", message: t(TranslationKey.ADMIN_CLASSES_CREATE_SUCCESS, { value: vars.className }) })
    },
    onError: error => {
      const msg = i18n.language === Language.EN ? error.response?.data?.messageEn : error.response?.data?.messageSk
      setAlert({ severity: "error", message: `${t(TranslationKey.ADMIN_CLASSES_CREATE_ERROR)}. ${msg ?? ""}` })
    },
  })

  const editMutation = useMutation<AxiosResponse, AxiosError<ApiProblemDetails>, EditFormValues & { id: number }>({
    mutationFn: data => classApi.classEditClass({ id: data.id, classname: data.className, teachers: data.teacherIds }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["classes"] })
      setAlert({ severity: "success", message: t(TranslationKey.ADMIN_CLASSES_EDIT_SUCCESS, { value: vars.className }) })
    },
    onError: error => {
      const msg = i18n.language === Language.EN ? error.response?.data?.messageEn : error.response?.data?.messageSk
      setAlert({ severity: "error", message: `${t(TranslationKey.ADMIN_CLASSES_EDIT_ERROR)}. ${msg ?? ""}` })
    },
  })

  const deleteMutation = useMutation<AxiosResponse, AxiosError<ApiProblemDetails>, number[]>({
    mutationFn: classIds => classApi.classDeleteClasses({ classIds }),
    onSuccess: (_, classIds) => {
      queryClient.invalidateQueries({ queryKey: ["classes"] })
      setSelectedIds(prev => prev.filter(id => !classIds.includes(id)))
      const names = (classesQuery.data ?? []).filter(c => classIds.includes(c.classId)).map(c => c.className).join(", ")
      setAlert({ severity: "warning", message: t(TranslationKey.ADMIN_CLASSES_DELETE_SUCCESS, { value: names }) })
    },
    onError: error => {
      const msg = i18n.language === Language.EN ? error.response?.data?.messageEn : error.response?.data?.messageSk
      setAlert({ severity: "error", message: `${t(TranslationKey.ADMIN_CLASSES_DELETE_ERROR)}. ${msg ?? ""}` })
    },
  })

  const toggleSelect = (id: number) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const openEdit = (classId: number) => {
    const cls = (classesQuery.data ?? []).find(c => c.classId === classId)
    if (!cls) return
    setEditingClass(cls)
    resetEdit({ className: cls.className, teacherIds: cls.teachers ?? [] })
  }

  const openDelete = (classIds: number[]) => {
    setDeletingIds(classIds)
    setDeleteDialogVis(true)
  }

  const handleCreate = async (data: CreateFormValues) => {
    await createMutation.mutateAsync(data).catch(() => {})
    resetCreate(createDefaults)
    setCreateDialogVis(false)
  }

  const handleEdit = async (data: EditFormValues) => {
    if (!editingClass) return
    await editMutation.mutateAsync({ ...data, id: editingClass.classId }).catch(() => {})
    resetEdit(editDefaults)
    setEditingClass(null)
  }

  const handleDelete = async () => {
    await deleteMutation.mutateAsync(deletingIds).catch(() => {})
    setDeleteDialogVis(false)
    setDeletingIds([])
  }

  const classes = classesQuery.data ?? []
  const deletingNames = classes.filter(c => deletingIds.includes(c.classId)).map(c => c.className).join(", ")

  const teacherSelect = (control: any, _errors: any, name: "teacherIds") => (
    <Controller
      name={name} control={control}
      render={({ field }) => (
        <FormControl fullWidth margin="dense">
          <InputLabel>{t(TranslationKey.ADMIN_CLASSES_TEACHER)}</InputLabel>
          <Select
            multiple value={field.value}
            onChange={e => field.onChange(Array.isArray(e.target.value) ? e.target.value.map(Number) : [])}
            input={<OutlinedInput label={t(TranslationKey.ADMIN_CLASSES_TEACHER)} />}
            renderValue={selected =>
              (teachersQuery.data ?? []).filter(tc => (selected as number[]).includes(tc.id)).map(tc => tc.username).join(", ")
            }
          >
            {(teachersQuery.data ?? []).map(tc => (
              <MenuItem key={tc.id} value={tc.id}>
                <Checkbox checked={(field.value ?? []).includes(tc.id)} />
                <ListItemText primary={tc.username} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}
    />
  )

  return (
    <Box display="flex" flexDirection="column" gap={3}>
      {alert && <CustomAlert {...alert} onClose={() => setAlert(null)} />}

      {/* Toolbar */}
      <Card variant="outlined" sx={{ borderRadius: 1, borderColor: theme => theme.palette.divider }}>
        <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
            <TextField
              fullWidth value={search} onChange={e => setSearch(e.target.value)}
              placeholder={t(TranslationKey.ADMIN_CLASSES_SEARCH)}
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
              <Tooltip title={t(TranslationKey.ADMIN_CLASSES_DELETE_SELECTED)}>
                <span>
                  <IconButton
                    onClick={() => openDelete(selectedIds)}
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
            <Tooltip title={t(TranslationKey.ADMIN_CLASSES_ADD_TOOLTIP)}>
              <span>
                <IconButton
                  onClick={() => { resetCreate(createDefaults); setCreateDialogVis(true) }}
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

          {(teachersQuery.data ?? []).length > 0 && (
            <>
              <Divider sx={{ my: 1.75 }} />
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                <Button
                  variant={teacherFilter === null ? "contained" : "outlined"}
                  onClick={() => setTeacherFilter(null)}
                  size="small"
                  sx={{ borderRadius: 1, textTransform: "none", px: 2, fontWeight: 600, minHeight: 32 }}
                >
                  {t(TranslationKey.ADMIN_CLASSES_ALL)}
                </Button>
                {(teachersQuery.data ?? []).map(tc => (
                  <Button
                    key={tc.id}
                    variant={teacherFilter === tc.id ? "contained" : "outlined"}
                    onClick={() => setTeacherFilter(tc.id)}
                    size="small"
                    sx={{ borderRadius: 1, textTransform: "none", px: 2, fontWeight: 600, minHeight: 32 }}
                  >
                    {tc.username}
                  </Button>
                ))}
              </Stack>
            </>
          )}
        </CardContent>
      </Card>

      {/* Grid */}
      {classesQuery.isError ? (
        <ErrorLoading onRetry={() => queryClient.invalidateQueries({ queryKey: ["classes"] })} />
      ) : classes.length === 0 && !classesQuery.isLoading ? (
        <Box sx={{ py: 6, textAlign: "center" }}>
          <Typography color="text.secondary">{t(TranslationKey.ADMIN_CLASSES_NO_DATA)}</Typography>
        </Box>
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, 1fr)",
              md: "repeat(3, 1fr)",
              lg: "repeat(4, 1fr)",
            },
            gap: 2,
          }}
        >
          {classes.map(cls => (
            <ClassCard
              key={cls.classId}
              classId={cls.classId}
              className={cls.className}
              teacherUsernames={cls.teacherUsernames ?? []}
              studentCount={cls.studentCount}
              selected={selectedIds.includes(cls.classId)}
              onSelect={toggleSelect}
              onEdit={openEdit}
              onDelete={id => openDelete([id])}
              onClick={id => navigate(getParametrizedUrl(RouteKeys.ADMIN_CLASS_DETAILS, { [RouteParams.CLASS_ID]: id.toString() }))}
            />
          ))}
        </Box>
      )}

      {/* Create dialog */}
      <Dialog open={createDialogVis} onClose={() => { setCreateDialogVis(false); resetCreate(createDefaults) }} fullWidth maxWidth="sm">
        <form onSubmit={handleCreateSubmit(handleCreate)}>
          <DialogTitle>{t(TranslationKey.ADMIN_CLASSES_CREATE_CLASS)}</DialogTitle>
          <DialogContent>
            <Controller
              name="className" control={createControl}
              rules={{ ...FormRules.required(), ...FormRules.minLengthShort(), ...FormRules.maxLengthShort(), ...FormRules.patternLettersNumbersSpaces() }}
              render={({ field }) => (
                <TextField
                  {...field} margin="dense" fullWidth label={t(TranslationKey.ADMIN_CLASSES_NAME)}
                  error={!!createErrors.className}
                  helperText={createErrors.className ? t(createErrors.className.message as string) : ""}
                />
              )}
            />
            {teacherSelect(createControl, createErrors, "teacherIds")}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setCreateDialogVis(false); resetCreate(createDefaults) }}>
              {t(TranslationKey.ADMIN_CLASSES_CANCEL)}
            </Button>
            <Button type="submit" variant="contained" color="success" disabled={!createClassName || createMutation.isPending}>
              {t(TranslationKey.ADMIN_CLASSES_CREATE)}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editingClass} onClose={() => { setEditingClass(null); resetEdit(editDefaults) }} fullWidth maxWidth="sm">
        <form onSubmit={handleEditSubmit(handleEdit)}>
          <DialogTitle>{t(TranslationKey.ADMIN_CLASSES_EDIT_CLASS)}</DialogTitle>
          <DialogContent>
            <Controller
              name="className" control={editControl}
              rules={{ ...FormRules.required(), ...FormRules.minLengthShort(), ...FormRules.maxLengthShort(), ...FormRules.patternLettersNumbersSpaces() }}
              render={({ field }) => (
                <TextField
                  {...field} margin="dense" fullWidth label={t(TranslationKey.ADMIN_CLASSES_NAME)}
                  error={!!editErrors.className}
                  helperText={editErrors.className ? t(editErrors.className.message as string) : ""}
                />
              )}
            />
            {teacherSelect(editControl, editErrors, "teacherIds")}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setEditingClass(null); resetEdit(editDefaults) }}>
              {t(TranslationKey.ADMIN_CLASSES_CANCEL)}
            </Button>
            <Button type="submit" variant="contained" color="success" disabled={!editClassName || editMutation.isPending}>
              {t(TranslationKey.ADMIN_CLASSES_SAVE)}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete dialog */}
      <DeleteDialog
        open={deleteDialogVis}
        onClose={() => { setDeleteDialogVis(false); setDeletingIds([]) }}
        onConfirm={handleDelete}
        question={t(TranslationKey.ADMIN_CLASSES_DELETE_CONFIRMATION_QUESTION)}
        title={t(TranslationKey.ADMIN_CLASSES_DELETE_CONFIRMATION_TITLE)}
        label={deletingNames}
      />
    </Box>
  )
}

export default AdminClasses