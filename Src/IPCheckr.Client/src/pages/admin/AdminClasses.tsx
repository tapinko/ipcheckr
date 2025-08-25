import { useState } from "react"
import { useTranslation } from "react-i18next"
import ActionPanel from "../../components/ActionPanel"
import DeleteDialog from "../../components/DeleteDialog"
import DataGridWithSearch from "../../components/DataGridWithSearch"
import { classApi, userApi } from "../../utils/apiClients"
import type { ClassDto, UserDto, ApiProblemDetails, CreateClassRes } from "../../dtos"
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
  TextField
} from "@mui/material"
import type { IClassesSelectedRows } from "../../types/ISelectedRows"
import i18n, { Language, TranslationKey } from "../../utils/i18n"
import { Controller, useForm } from "react-hook-form"
import FormRules from "../../utils/FormRules"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import TableSkeleton from "../../components/TableSkeleton"
import ErrorLoading from "../../components/ErrorLoading"
import { CustomAlert, type CustomAlertState } from "../../components/CustomAlert"
import type { AxiosError, AxiosResponse } from "axios"

type CreateClassFormValues = {
  className: string
  teacherIds: number[]
}

type EditClassFormValues = {
  className: string
  teacherIds: number[]
}

type ClassRow = ClassDto & { teacherUsernamesDisplay: string; id: number }

const AdminClasses = () => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const createClassDefaultValues: CreateClassFormValues = {
    className: "",
    teacherIds: []
  }

  const editClassDefaultValues: EditClassFormValues = {
    className: "",
    teacherIds: []
  }

  const selectedRowsDefault: IClassesSelectedRows = {
    rowId: [],
    classId: [],
    className: []
  }

  const {
    control: createClassControl,
    handleSubmit: handleCreateClassSubmit,
    reset: resetCreateClass,
    watch: watchCreateClass,
    formState: { errors: createClassErrors }
  } = useForm<CreateClassFormValues>({
    defaultValues: createClassDefaultValues,
    mode: "onBlur"
  })

  const {
    control: editClassControl,
    handleSubmit: handleEditClassSubmit,
    reset: resetEditClass,
    watch: watchEditClass,
    formState: { errors: editClassErrors }
  } = useForm<EditClassFormValues>({
    defaultValues: editClassDefaultValues,
    mode: "onBlur"
  })

  const createWatch = watchCreateClass()
  const editWatch = watchEditClass()

  const [searchValue, setSearchValue] = useState("")
  const [selectedRows, setSelectedRows] = useState<IClassesSelectedRows>(selectedRowsDefault)

  const [createDialogVis, setCreateDialogVis] = useState(false)
  const [deleteDialogVis, setDeleteDialogvis] = useState(false)
  const [editDialogVis, setEditDialogVis] = useState(false)

  const [teacherFilterValue, setTeacherFilterValue] = useState("")
  const [descending, setDescending] = useState(false)

  const [alert, setAlert] = useState<CustomAlertState | null>(null)

  const classesQuery = useQuery<ClassRow[], Error>({
    queryKey: ["classes", { searchValue, teacherFilterValue, descending }],
    queryFn: () =>
      classApi
        .classQueryClasses(
          null,
          searchValue || null,
          teacherFilterValue ? Number(teacherFilterValue) : null,
          null,
          descending || null
        )
        .then(r =>
          (r.data.classes ?? []).map(c => ({
            ...c,
            id: c.classId,
            teacherUsernamesDisplay: (c.teacherUsernames ?? []).join(", ")
          }))
        ),
    placeholderData: prev => prev
  })

  const teachersQuery = useQuery<UserDto[], Error>({
    queryKey: ["teachers"],
    queryFn: () =>
      userApi
        .userQueryUsers(null, null, "Teacher")
        .then(r => r.data.users),
    staleTime: 5 * 60_000
  })

  const createClassMutation = useMutation<
    AxiosResponse<CreateClassRes>,
    AxiosError<ApiProblemDetails>,
    CreateClassFormValues
  >({
    mutationFn: (data) =>
      classApi.classCreateClass({
        className: data.className,
        teachers: data.teacherIds
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] })
      setAlert({
        severity: "success",
        message: t(TranslationKey.ADMIN_CLASSES_CREATE_SUCCESS, {
          value: createWatch.className
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
        message: `${t(TranslationKey.ADMIN_CLASSES_CREATE_ERROR)}. ${localMessage ?? ""}`
      })
    }
  })

  const deleteClassesMutation = useMutation<
    AxiosResponse,
    AxiosError<ApiProblemDetails>,
    IClassesSelectedRows["classId"]
  >({
    mutationFn: (classIds) =>
      classApi.classDeleteClasses({ classIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] })
      setAlert({
        severity: "warning",
        message: t(TranslationKey.ADMIN_CLASSES_DELETE_SUCCESS, {
          value: selectedRows.className.join(", ")
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
        message: `${t(TranslationKey.ADMIN_CLASSES_DELETE_ERROR)}. ${localMessage ?? ""}`
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
        id: selectedRows.classId[0],
        classname: data.className,
        teachers: data.teacherIds
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] })
      setAlert({
        severity: "success",
        message: t(TranslationKey.ADMIN_CLASSES_EDIT_SUCCESS, {
          value: editWatch.className
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
        message: `${t(TranslationKey.ADMIN_CLASSES_EDIT_ERROR)}. ${localMessage ?? ""}`
      })
    }
  })

  const columns = [
    { label: t(TranslationKey.ADMIN_CLASSES_CLASS), key: "className" },
    { label: t(TranslationKey.ADMIN_CLASSES_TEACHERS), key: "teacherUsernamesDisplay" }
  ]

  const teacherFilter = {
    label: t(TranslationKey.ADMIN_CLASSES_TEACHER),
    value: teacherFilterValue,
    setValue: setTeacherFilterValue,
    options: [
      { value: "", label: t(TranslationKey.ADMIN_CLASSES_ALL) },
      ...(teachersQuery.data
        ? teachersQuery.data.map(tchr => ({
            value: tchr.id.toString(),
            label: tchr.username
          }))
        : [])
    ]
  }

  const handleCreateClass = async (data: CreateClassFormValues) => {
    await createClassMutation.mutateAsync(data).catch(() => {})
    resetCreateClass(createClassDefaultValues)
    setCreateDialogVis(false)
  }

  const handleDeleteClasses = async () => {
    if (selectedRows.classId.length === 0) return
    await deleteClassesMutation.mutateAsync(selectedRows.classId).catch(() => {})
    setSelectedRows(selectedRowsDefault)
    setDeleteDialogvis(false)
  }

  const handleEditClass = async (data: EditClassFormValues) => {
    if (selectedRows.classId.length !== 1) return
    await editClassMutation.mutateAsync(data).catch(() => {})
    resetEditClass(editClassDefaultValues)
    setEditDialogVis(false)
  }

  const createDisabled =
    !createWatch.className || createClassMutation.isPending

  const editDisabled =
    !editWatch.className || editClassMutation.isPending

  return (
    <>
      <ActionPanel
        onAdd={() => {
          resetCreateClass(createClassDefaultValues)
            setCreateDialogVis(true)
        }}
        onEdit={() => {
          if (selectedRows.classId.length === 1) {
            const cls = classesQuery.data?.find(c => c.classId === selectedRows.classId[0])
            if (cls) {
              resetEditClass({
                className: cls.className,
                teacherIds: cls.teachers ?? []
              })
              setEditDialogVis(true)
            }
          }
        }}
        onDetails={() => {}}
        onDelete={() => setDeleteDialogvis(true)}
        disableEdit={selectedRows.classId.length !== 1}
        disableDetails={selectedRows.classId.length !== 1}
        disableDelete={
          selectedRows.classId.length === 0 || deleteClassesMutation.isPending
        }
        title={t(TranslationKey.ADMIN_CLASSES_TITLE)}
        addLabel={t(TranslationKey.ADMIN_CLASSES_CREATE_CLASS)}
      />

      {classesQuery.isLoading ? (
        <TableSkeleton />
      ) : classesQuery.isError ? (
        <ErrorLoading onRetry={() => queryClient.invalidateQueries({ queryKey: ["classes"] })} />
      ) : (
        <DataGridWithSearch
          searchValue={searchValue}
          setSearchValue={setSearchValue}
          columns={columns}
          filter1={teacherFilter}
          rows={classesQuery.data ?? []}
          selectableRows
          selectedRows={selectedRows.classId.filter((id): id is number => id !== undefined)}
          setSelectedRows={classIds => {
            const rows = classesQuery.data ?? []
            setSelectedRows({
              rowId: classIds.map(id => rows.findIndex(c => c.classId === id)),
              classId: classIds,
              className: classIds.map(id => rows.find(c => c.classId === id)?.className ?? "")
            })
          }}
          descending={descending}
          setDescending={setDescending}
        />
      )}

      <Dialog
        open={createDialogVis}
        onClose={() => setCreateDialogVis(false)}
        sx={{ "& .MuiDialog-paper": { width: "30vw" } }}
      >
        <form onSubmit={handleCreateClassSubmit(handleCreateClass)}>
          <DialogTitle>
            {t(TranslationKey.ADMIN_CLASSES_CREATE_CLASS)}
          </DialogTitle>
          <DialogContent>
            <Controller
              name="className"
              control={createClassControl}
              rules={{
                ...FormRules.required(),
                ...FormRules.minLengthShort(),
                ...FormRules.maxLengthShort(),
                ...FormRules.patternLettersNumbersSpaces()
              }}
              render={({ field }) => (
                <TextField
                  margin="dense"
                  label={t(TranslationKey.ADMIN_CLASSES_NAME)}
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
            <Controller
              name="teacherIds"
              control={createClassControl}
              render={({ field }) => (
                <FormControl fullWidth margin="dense">
                  <InputLabel>
                    {t(TranslationKey.ADMIN_CLASSES_TEACHER)}
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
                        label={t(TranslationKey.ADMIN_CLASSES_TEACHER)}
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
                    {(teachersQuery.data ?? []).map(teacher => (
                      <MenuItem key={teacher.id} value={teacher.id}>
                        <Checkbox
                          checked={
                            (field.value ?? []).indexOf(teacher.id) > -1
                          }
                        />
                        <ListItemText primary={teacher.username} />
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
                setCreateDialogVis(false)
                resetCreateClass(createClassDefaultValues)
              }}
            >
              {t(TranslationKey.ADMIN_CLASSES_CANCEL)}
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="success"
              disabled={createDisabled}
            >
              {t(TranslationKey.ADMIN_CLASSES_CREATE)}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <DeleteDialog
        open={deleteDialogVis}
        onClose={() => setDeleteDialogvis(false)}
        onConfirm={handleDeleteClasses}
        question={t(TranslationKey.ADMIN_CLASSES_DELETE_CONFIRMATION_QUESTION)}
        title={t(TranslationKey.ADMIN_CLASSES_DELETE_CONFIRMATION_TITLE)}
        label={selectedRows.className.join(", ")}
      />

      <Dialog
        open={editDialogVis}
        onClose={() => {
          setEditDialogVis(false)
          resetEditClass(editClassDefaultValues)
        }}
        sx={{ "& .MuiDialog-paper": { width: "30vw" } }}
      >
        <form onSubmit={handleEditClassSubmit(handleEditClass)}>
          <DialogTitle>
            {t(TranslationKey.ADMIN_CLASSES_EDIT_CLASS)}
          </DialogTitle>
          <DialogContent>
            <Controller
              name="className"
              control={editClassControl}
              rules={{
                ...FormRules.required(),
                ...FormRules.minLengthShort(),
                ...FormRules.maxLengthShort(),
                ...FormRules.patternLettersNumbersSpaces()
              }}
              render={({ field }) => (
                <TextField
                  margin="dense"
                  label={t(TranslationKey.ADMIN_CLASSES_NAME)}
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
              name="teacherIds"
              control={editClassControl}
              render={({ field }) => (
                <FormControl fullWidth margin="dense">
                  <InputLabel>
                    {t(TranslationKey.ADMIN_CLASSES_TEACHER)}
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
                        label={t(TranslationKey.ADMIN_CLASSES_TEACHER)}
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
                    {(teachersQuery.data ?? []).map(teacher => (
                      <MenuItem key={teacher.id} value={teacher.id}>
                        <Checkbox
                          checked={
                            (field.value ?? []).indexOf(teacher.id) > -1
                          }
                        />
                        <ListItemText primary={teacher.username} />
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
                resetEditClass(editClassDefaultValues)
              }}
            >
              {t(TranslationKey.ADMIN_CLASSES_CANCEL)}
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="success"
              disabled={editDisabled}
            >
              {t(TranslationKey.ADMIN_CLASSES_SAVE)}
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

export default AdminClasses