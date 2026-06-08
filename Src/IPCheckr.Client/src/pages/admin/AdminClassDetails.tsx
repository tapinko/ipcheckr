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
import type { Theme } from "@mui/material/styles"
import { LazyBarChart, LazyLineChart } from "../../components/charts/LazyCharts"
import { useState, useEffect } from "react"
import { Controller, useForm } from "react-hook-form"
import FormRules from "../../utils/FormRules"
import InsightGridSkeleton from "../../components/skeletons/InsightGridSkeleton"
import ErrorLoading from "../../components/ui/ErrorLoading"
import { TranslationKey } from "../../utils/i18n"
import { classApi, userApi } from "../../utils/apiClients"
import { AuthType } from "../../dtos"
import type { LdapUserDto, QueryClassDetailsRes, UserDto } from "../../dtos"
import { useAppConfig } from "../../contexts/AppConfigContext"
import AccessTime from "@mui/icons-material/AccessTime"
import AccountCircle from "@mui/icons-material/AccountCircle"
import Class from "@mui/icons-material/Class"
import Groups from "@mui/icons-material/Groups"
import Percent from "@mui/icons-material/Percent"
import Quiz from "@mui/icons-material/Quiz"
import TaskAlt from "@mui/icons-material/TaskAlt"
import { getParametrizedUrl, RouteKeys, RouteParams, Routes } from "../../router/routes"
import InsightCard from "../../components/ui/InsightCard"
import InsightGrid from "../../components/ui/InsightGrid"
import { CustomAlert, type CustomAlertState } from "../../components/ui/CustomAlert"
import DeleteDialog from "../../components/ui/DeleteDialog"
import axiosInstance from "../../utils/axiosInstance"
import i18n, { Language } from "../../utils/i18n"
import UserRole from "../../types/UserRole"

const minLdapSearchChars = 2

type AddUserDialogRole = "student" | "teacher"

const AdminClassDetails = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { [RouteParams.CLASS_ID]: classId } = useParams()

  const [addUserDialogRole, setAddUserDialogRole] = useState<AddUserDialogRole | null>(null)
  const [selectedUser, setSelectedUser] = useState<UserDto | null>(null)
  const [alert, setAlert] = useState<CustomAlertState | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  type EditFormValues = { className: string }
  const { control: editControl, handleSubmit: handleEditSubmit, reset: resetEdit, watch: watchEdit, formState: { errors: editErrors } } =
    useForm<EditFormValues>({ defaultValues: { className: "" }, mode: "onBlur" })
  const editClassName = watchEdit("className")

  const detailsQuery = useQuery<QueryClassDetailsRes, Error>({
    queryKey: ["teacherClassDetails", classId],
    enabled: !!classId,
    queryFn: () => classApi.classQueryClassDetails(Number(classId)).then(r => r.data),
    placeholderData: prev => prev
  })

  const { config } = useAppConfig()
  const isLdapAuth = config?.authType === AuthType.Ldap

  const allUsersQuery = useQuery<UserDto[], Error>({
    queryKey: ["allUsersForClassAdd", addUserDialogRole],
    enabled: !!addUserDialogRole && !isLdapAuth,
    queryFn: () => {
      const role = addUserDialogRole === "teacher" ? UserRole.TEACHER : UserRole.STUDENT
      return userApi.userQueryUsers(null, null, role).then(r => r.data.users ?? [])
    },
    staleTime: 30_000
  })

  const existingIds = new Set(
    addUserDialogRole === "teacher"
      ? (detailsQuery.data?.teachers ?? []).map(t => t.teacherId)
      : (detailsQuery.data?.students ?? []).map(s => s.studentId)
  )
  const availableUsers = (allUsersQuery.data ?? []).filter(u => !existingIds.has(u.id))

  const addUserMutation = useMutation({
    mutationFn: (username: string) => {
      const endpoint = addUserDialogRole === "teacher"
        ? "/api/classes/add-teacher"
        : "/api/classes/add-student"
      return axiosInstance.post(endpoint, { username, classIds: [Number(classId)] })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacherClassDetails", classId] })
      setAlert({ severity: "success", message: t(TranslationKey.ADMIN_CLASS_DETAILS_ADD_SUCCESS) })
      closeDialog()
    },
    onError: (error: unknown) => {
      const e = error as { response?: { data?: { messageEn?: string; messageSk?: string } } }
      const msg = i18n.language === Language.EN ? e?.response?.data?.messageEn : e?.response?.data?.messageSk
      setAlert({ severity: "error", message: `${t(TranslationKey.ADMIN_CLASS_DETAILS_ADD_ERROR)}. ${msg ?? ""}` })
    }
  })

  const closeDialog = () => {
    setAddUserDialogRole(null)
    setSelectedUser(null)
  }

  const [pendingDelete, setPendingDelete] = useState<{ id: number; username: string; role: "student" | "teacher" } | null>(null)

  const removeMutation = useMutation({
    mutationFn: ({ id, role }: { id: number; role: "student" | "teacher" }) => {
      if (role === "student") {
        const remaining = (detailsQuery.data?.students ?? []).filter(s => s.studentId !== id).map(s => s.studentId)
        return classApi.classEditClass({ id: Number(classId), students: remaining })
      } else {
        const remaining = (detailsQuery.data?.teachers ?? []).filter(t => t.teacherId !== id).map(t => t.teacherId)
        return classApi.classEditClass({ id: Number(classId), teachers: remaining })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacherClassDetails", classId] })
      setAlert({ severity: "success", message: t(TranslationKey.ADMIN_CLASS_DETAILS_REMOVE_SUCCESS) })
    },
    onError: (error: unknown) => {
      const e = error as { response?: { data?: { messageEn?: string; messageSk?: string } } }
      const msg = i18n.language === Language.EN ? e?.response?.data?.messageEn : e?.response?.data?.messageSk
      setAlert({ severity: "error", message: `${t(TranslationKey.ADMIN_CLASS_DETAILS_REMOVE_ERROR)}. ${msg ?? ""}` })
    }
  })

  const editClassMutation = useMutation({
    mutationFn: (className: string) =>
      classApi.classEditClass({ id: Number(classId), classname: className }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacherClassDetails", classId] })
      setAlert({ severity: "success", message: t(TranslationKey.ADMIN_CLASS_DETAILS_EDIT_SUCCESS) })
      setEditDialogOpen(false)
    },
    onError: (error: unknown) => {
      const e = error as { response?: { data?: { messageEn?: string; messageSk?: string } } }
      const msg = i18n.language === Language.EN ? e?.response?.data?.messageEn : e?.response?.data?.messageSk
      setAlert({ severity: "error", message: `${t(TranslationKey.ADMIN_CLASS_DETAILS_EDIT_ERROR)}. ${msg ?? ""}` })
    }
  })

  const deleteClassMutation = useMutation({
    mutationFn: () => classApi.classDeleteClasses({ classIds: [Number(classId)] }),
    onSuccess: () => {
      navigate(Routes[RouteKeys.ADMIN_CLASSES])
    },
    onError: (error: unknown) => {
      const e = error as { response?: { data?: { messageEn?: string; messageSk?: string } } }
      const msg = i18n.language === Language.EN ? e?.response?.data?.messageEn : e?.response?.data?.messageSk
      setAlert({ severity: "error", message: `${t(TranslationKey.ADMIN_CLASS_DETAILS_DELETE_ERROR)}. ${msg ?? ""}` })
      setDeleteDialogOpen(false)
    }
  })

  if (detailsQuery.isLoading && !detailsQuery.data) {
    return <InsightGridSkeleton count={8} columnsMax={3} />
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

  const addButtonSx = {
    border: (theme: Theme) =>`1px solid ${theme.palette.success.main}`,
    width: 20,
    height: 20,
    color: (theme: Theme) => theme.palette.success.dark,
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
              <Tooltip title={t(TranslationKey.ADMIN_CLASS_DETAILS_EDIT_TOOLTIP)}>
                <IconButton
                  size="small"
                  onClick={() => { resetEdit({ className: detailsQuery.data?.className ?? "" }); setEditDialogOpen(true) }}
                >
                  <EditOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title={t(TranslationKey.ADMIN_CLASS_DETAILS_DELETE_TOOLTIP)}>
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
              title={t(TranslationKey.ADMIN_CLASS_DETAILS_TOTAL_ASSIGNMENT_GROUPS)}
              value={detailsQuery.data?.totalAssignmentGroups ?? "-"}
              icon={<Quiz />}
              dense
            />,
            <InsightCard
              title={t(TranslationKey.ADMIN_CLASS_DETAILS_TOTAL_UPCOMING)}
              value={detailsQuery.data?.totalUpcoming ?? "-"}
              icon={<AccessTime />}
              dense
            />,
            <InsightCard
              title={t(TranslationKey.ADMIN_CLASS_DETAILS_TOTAL_IN_PROGRESS)}
              value={detailsQuery.data?.totalInProgress ?? "-"}
              icon={<AccessTime />}
              tone="warning"
              dense
            />,
            <InsightCard
              title={t(TranslationKey.ADMIN_CLASS_DETAILS_TOTAL_ENDED)}
              value={detailsQuery.data?.totalEnded ?? "-"}
              icon={<AccessTime />}
              tone="success"
              dense
            />,
            <InsightCard
              title={t(TranslationKey.ADMIN_CLASS_DETAILS_CREATED_AT)}
              value={detailsQuery.data?.createdAt ? new Date(detailsQuery.data.createdAt).toLocaleString() : "-"}
              icon={<Groups />}
              dense
            />,
            <Tooltip title={t(TranslationKey.ADMIN_CLASS_DETAILS_AVERAGE_SUCCESS_RATE_TOOLTIP)}>
              <Box>
                <InsightCard
                  title={t(TranslationKey.ADMIN_CLASS_DETAILS_AVERAGE_SUCCESS_RATE)}
                  value={detailsQuery.data && detailsQuery.data.totalSubmits > 0 ? `${detailsQuery.data.averageSuccessRate.toFixed(2)}%` : (detailsQuery.data ? t(TranslationKey.ADMIN_CLASS_DETAILS_CARD_UNSUBMITTED) : "0.00%")}
                  icon={<Percent />}
                  tone="success"
                  dense
                />
              </Box>
            </Tooltip>,
            <InsightCard
              title={t(TranslationKey.ADMIN_CLASS_DETAILS_LAST_SUBMIT)}
              value={detailsQuery.data?.lastSubmitUsername ?? "-"}
              icon={<AccessTime />}
              dense
            />,
            <InsightCard
              title={t(TranslationKey.ADMIN_CLASS_DETAILS_TOTAL_SUBMITS)}
              value={detailsQuery.data?.totalSubmits ?? "-"}
              icon={<TaskAlt />}
              tone="info"
              dense
            />
          ]}
        />

        <Stack spacing={2} direction={{ xs: "column", md: "row" }}>
          <Box sx={{ flex: 1, width: "100%" }}>
            <Card variant="outlined">
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography variant="overline" color="text.secondary">
                    {t(TranslationKey.ADMIN_CLASS_DETAILS_STUDENTS)}
                  </Typography>
                  <Tooltip title={t(TranslationKey.ADMIN_CLASS_DETAILS_ADD_STUDENT_TOOLTIP)}>
                    <IconButton size="small" onClick={() => setAddUserDialogRole("student")} sx={addButtonSx}>
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
                          border: (theme: Theme) => `1px solid ${theme.palette.divider}`,
                          borderRadius: 1,
                          p: 1,
                          cursor: "pointer",
                          "&:hover .admin-student-link": { textDecoration: "underline" }
                        }}
                        onMouseEnter={() => {
                          const id = s.studentId.toString()
                          queryClient.prefetchQuery({ queryKey: ["adminUserRole", id], queryFn: () => userApi.userQueryUsers(s.studentId).then(r => r.data), staleTime: 60_000 })
                          queryClient.prefetchQuery({ queryKey: ["adminUserDetails", id], queryFn: () => userApi.userQueryUserDetails(s.studentId).then(r => r.data), staleTime: 60_000 })
                        }}
                        onClick={() =>
                          navigate(
                            getParametrizedUrl(RouteKeys.ADMIN_USER_DETAILS, {
                              [RouteParams.USER_ID]: s.studentId.toString()
                            })
                          )
                        }
                      >
                        <Stack direction="row" alignItems="center" spacing={0.75}>
                          <AccountCircle fontSize="small" sx={{ color: "text.disabled", flexShrink: 0 }} />
                          <Typography variant="body2" className="admin-student-link">{s.username}</Typography>
                        </Stack>
                        <IconButton
                          size="small"
                          onClick={e => { e.stopPropagation(); setPendingDelete({ id: s.studentId, username: s.username, role: "student" }) }}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {t(TranslationKey.ADMIN_CLASS_DETAILS_NO_STUDENTS)}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Box>

          <Box sx={{ flex: 1, width: "100%" }}>
            <Card variant="outlined">
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography variant="overline" color="text.secondary">
                    {t(TranslationKey.ADMIN_CLASS_DETAILS_TEACHERS)}
                  </Typography>
                  <Tooltip title={t(TranslationKey.ADMIN_CLASS_DETAILS_ADD_TEACHER_TOOLTIP)}>
                    <IconButton size="small" onClick={() => setAddUserDialogRole("teacher")} sx={addButtonSx}>
                      <AddIcon />
                    </IconButton>
                  </Tooltip>
                </Stack>

                {detailsQuery.data?.teachers?.length ? (
                  <Stack spacing={1} sx={{ mt: 1 }}>
                    {detailsQuery.data.teachers.map(te => (
                      <Stack
                        key={te.teacherId}
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                        sx={{
                          border: (theme: Theme) => `1px solid ${theme.palette.divider}`,
                          borderRadius: 1,
                          p: 1,
                          cursor: "pointer",
                          "&:hover .admin-teacher-link": { textDecoration: "underline" }
                        }}
                        onMouseEnter={() => {
                          const id = te.teacherId.toString()
                          queryClient.prefetchQuery({ queryKey: ["adminUserRole", id], queryFn: () => userApi.userQueryUsers(te.teacherId).then(r => r.data), staleTime: 60_000 })
                          queryClient.prefetchQuery({ queryKey: ["adminUserDetails", id], queryFn: () => userApi.userQueryUserDetails(te.teacherId).then(r => r.data), staleTime: 60_000 })
                        }}
                        onClick={() =>
                          navigate(
                            getParametrizedUrl(RouteKeys.ADMIN_USER_DETAILS, {
                              [RouteParams.USER_ID]: te.teacherId.toString()
                            })
                          )
                        }
                      >
                        <Stack direction="row" alignItems="center" spacing={0.75}>
                          <AccountCircle fontSize="small" sx={{ color: "text.disabled", flexShrink: 0 }} />
                          <Typography variant="body2" className="admin-teacher-link">{te.username}</Typography>
                        </Stack>
                        <IconButton
                          size="small"
                          onClick={e => { e.stopPropagation(); setPendingDelete({ id: te.teacherId, username: te.username, role: "teacher" }) }}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {t(TranslationKey.ADMIN_CLASS_DETAILS_NO_TEACHERS)}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Box>
        </Stack>

        <Stack spacing={2} direction={{ xs: "column", md: "row" }}>
          <Box sx={{ flex: { md: 3 }, width: "100%" }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="overline" color="text.secondary">
                  {t(TranslationKey.ADMIN_CLASS_DETAILS_AVERAGE_IN_STUDENTS)}
                </Typography>
                {(avgStudents.length ?? 0) > 0 ? (
                  <LazyBarChart
                    height={300}
                    xAxis={[
                      {
                        scaleType: "band",
                        data: avgStudents.map(s => s.username),
                      },
                    ]}
                    series={[
                      {
                        data: avgStudents.map(s => s.percentage),
                        label: t(TranslationKey.ADMIN_CLASS_DETAILS_PERCENTAGE),
                        valueFormatter: (v: number | null) => `${v?.toFixed(2)}%`
                      },
                    ]}
                    yAxis={[
                      {
                        min: 0,
                        max: 100,
                        valueFormatter: (v: number) => `${v}%`,
                      },
                    ]}
                    margin={{ left: 60, right: 80, top: 20, bottom: 40 }}
                  />
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    {t(TranslationKey.ADMIN_CLASS_DETAILS_NO_DATA)}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Box>

          <Box sx={{ flex: { md: 2 }, width: "100%" }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="overline" color="text.secondary">
                  {t(TranslationKey.ADMIN_CLASS_DETAILS_AVERAGE_IN_ASSIGNMENT_GROUPS)}
                </Typography>
                {(avgGroups.length ?? 0) > 0 ? (
                  <LazyLineChart
                    height={300}
                    xAxis={[
                      {
                        scaleType: "point",
                        data: avgGroups.map(g => g.assignmentGroupName),
                      },
                    ]}
                    series={[
                      {
                        data: avgGroups.map(g => g.percentage),
                        label: t(TranslationKey.ADMIN_CLASS_DETAILS_PERCENTAGE),
                        area: true,
                        valueFormatter: (v: number | null) => `${v?.toFixed(2)}%`
                      },
                    ]}
                    yAxis={[
                      {
                        min: 0,
                        max: 100,
                        valueFormatter: (v: number) => `${v}%`,
                      },
                    ]}
                    margin={{ left: 60, right: 80, top: 20, bottom: 40 }}
                  />
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    {t(TranslationKey.ADMIN_CLASS_DETAILS_NO_DATA)}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Box>
        </Stack>
      </Stack>

      <Dialog open={!!addUserDialogRole} onClose={closeDialog} fullWidth maxWidth="sm">
        <DialogTitle>
          {addUserDialogRole === "teacher"
            ? t(TranslationKey.ADMIN_CLASS_DETAILS_ADD_TEACHER)
            : t(TranslationKey.ADMIN_CLASS_DETAILS_ADD_STUDENT)}
        </DialogTitle>
        <DialogContent>
          {isLdapAuth ? (
            <LdapUserSearch
              onSelect={setSelectedUser}
              noOptionsText={t(TranslationKey.ADMIN_CLASS_DETAILS_NO_USERS_AVAILABLE)}
              loadingText={t(TranslationKey.ADMIN_CLASS_DETAILS_LOADING)}
              placeholder={t(TranslationKey.ADMIN_CLASS_DETAILS_LDAP_USERNAME_PLACEHOLDER, { value: minLdapSearchChars })}
              label={t(TranslationKey.ADMIN_CLASS_DETAILS_USERNAME)}
            />
          ) : (
            <Autocomplete
              options={availableUsers}
              getOptionLabel={o => o.username}
              loading={allUsersQuery.isLoading}
              noOptionsText={t(TranslationKey.ADMIN_CLASS_DETAILS_NO_USERS_AVAILABLE)}
              value={selectedUser}
              onChange={(_, v) => setSelectedUser(v)}
              renderInput={params => (
                <TextField
                  {...params}
                  margin="dense"
                  fullWidth
                  label={t(TranslationKey.ADMIN_CLASS_DETAILS_USERNAME)}
                />
              )}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>{t(TranslationKey.ADMIN_CLASS_DETAILS_CANCEL)}</Button>
          <Button
            variant="contained"
            color="success"
            disabled={!selectedUser || addUserMutation.isPending}
            onClick={() => selectedUser && addUserMutation.mutate(selectedUser.username)}
          >
            {t(TranslationKey.ADMIN_CLASS_DETAILS_CONFIRM_ADD)}
          </Button>
        </DialogActions>
      </Dialog>

      <DeleteDialog
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && removeMutation.mutate({ id: pendingDelete.id, role: pendingDelete.role })}
        title={pendingDelete?.role === "teacher"
          ? t(TranslationKey.ADMIN_CLASS_DETAILS_REMOVE_TEACHER_TITLE)
          : t(TranslationKey.ADMIN_CLASS_DETAILS_REMOVE_STUDENT_TITLE)}
        question={pendingDelete?.role === "teacher"
          ? t(TranslationKey.ADMIN_CLASS_DETAILS_REMOVE_TEACHER_QUESTION)
          : t(TranslationKey.ADMIN_CLASS_DETAILS_REMOVE_STUDENT_QUESTION)}
        label={pendingDelete?.username}
      />

      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} fullWidth maxWidth="sm">
        <form onSubmit={handleEditSubmit(data => editClassMutation.mutate(data.className))}>
          <DialogTitle>{t(TranslationKey.ADMIN_CLASS_DETAILS_EDIT_CLASS)}</DialogTitle>
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
                  label={t(TranslationKey.ADMIN_CLASS_DETAILS_CLASS_NAME)}
                  error={!!editErrors.className}
                  helperText={editErrors.className ? t(editErrors.className.message as string) : ""}
                />
              )}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialogOpen(false)}>{t(TranslationKey.ADMIN_CLASS_DETAILS_CANCEL)}</Button>
            <Button type="submit" variant="contained" color="success" disabled={!editClassName || editClassMutation.isPending}>
              {t(TranslationKey.ADMIN_CLASS_DETAILS_SAVE)}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <DeleteDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={() => deleteClassMutation.mutate()}
        title={t(TranslationKey.ADMIN_CLASS_DETAILS_DELETE_TITLE)}
        question={t(TranslationKey.ADMIN_CLASS_DETAILS_DELETE_QUESTION)}
        label={detailsQuery.data?.className}
      />
    </>
  )
}

type LdapUserSearchProps = {
  onSelect: (user: UserDto | null) => void
  noOptionsText: string
  loadingText: string
  placeholder: string
  label: string
}

const LdapUserSearch = ({ onSelect, noOptionsText, loadingText, placeholder, label }: LdapUserSearchProps) => {
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
      onChange={(_, v) => onSelect(v ? ({ id: 0, username: (v as LdapUserDto).username } as UserDto) : null)}
      renderInput={params => (
        <TextField
          {...params}
          margin="dense"
          fullWidth
          label={label}
          placeholder={placeholder}
        />
      )}
    />
  )
}

export default AdminClassDetails