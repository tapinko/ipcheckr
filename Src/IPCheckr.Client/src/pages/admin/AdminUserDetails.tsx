import AddIcon from "@mui/icons-material/Add"
import {
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
  Tooltip,
  Typography
} from "@mui/material"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate, useParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { LazyLineChart, LazyRadarChart } from "../../components/charts/LazyCharts"
import { AccessTime, MoreTime, Percent, Person, Quiz, TaskAlt } from "@mui/icons-material"
import InsightGridSkeleton from "../../components/skeletons/InsightGridSkeleton"
import ErrorLoading from "../../components/ui/ErrorLoading"
import { TranslationKey } from "../../utils/i18n"
import type { ClassDto, QueryUserDetailsRes, QueryUsersRes } from "../../dtos"
import { classApi, userApi } from "../../utils/apiClients"
import { getParametrizedUrl, RouteKeys, RouteParams } from "../../router/routes"
import UserRole from "../../types/UserRole"
import InsightCard from "../../components/ui/InsightCard"
import InsightGrid from "../../components/ui/InsightGrid"
import { useState } from "react"
import axiosInstance from "../../utils/axiosInstance"
import i18n, { Language } from "../../utils/i18n"
import { CustomAlert, type CustomAlertState } from "../../components/ui/CustomAlert"
import DeleteDialog from "../../components/ui/DeleteDialog"

const AdminUserDetails = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { [RouteParams.USER_ID]: userId } = useParams()

  const roleQuery = useQuery<QueryUsersRes, Error>({
    queryKey: ["adminUserRole", userId],
    enabled: !!userId,
    queryFn: () => userApi.userQueryUsers(Number(userId)).then(r => r.data),
    placeholderData: prev => prev
  })

  const detailsQuery = useQuery<QueryUserDetailsRes, Error>({
    queryKey: ["adminUserDetails", userId],
    enabled: !!userId,
    queryFn: () => userApi.userQueryUserDetails(Number(userId)).then(r => r.data),
    placeholderData: prev => prev
  })

  const [addClassDialogVis, setAddClassDialogVis] = useState(false)
  const [selectedClassIds, setSelectedClassIds] = useState<number[]>([])
  const [alert, setAlert] = useState<CustomAlertState | null>(null)

  const role = roleQuery.data?.users?.[0]?.role
  const isTeacher = role === UserRole.TEACHER
  const username = detailsQuery.data?.username

  const allClassesQuery = useQuery<ClassDto[], Error>({
    queryKey: ["allClasses"],
    queryFn: () => classApi.classQueryClasses().then(r => r.data.classes),
    enabled: addClassDialogVis,
    staleTime: 30_000
  })

  const assignedClassIds = new Set((detailsQuery.data?.classes ?? []).map(c => c.id))
  const availableClasses = (allClassesQuery.data ?? []).filter(c => !assignedClassIds.has(c.classId))

  const addClassMutation = useMutation({
    mutationFn: (classIds: number[]) => {
      const endpoint = isTeacher ? "/api/classes/add-teacher" : "/api/classes/add-student"
      return axiosInstance.post(endpoint, { username, classIds })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminUserDetails", userId] })
      setAlert({ severity: "success", message: t(TranslationKey.ADMIN_USER_DETAILS_ADD_CLASS_SUCCESS) })
      closeAddClassDialog()
    },
    onError: (error: any) => {
      const msg = i18n.language === Language.EN ? error?.response?.data?.messageEn : error?.response?.data?.messageSk
      setAlert({ severity: "error", message: `${t(TranslationKey.ADMIN_USER_DETAILS_ADD_CLASS_ERROR)}. ${msg ?? ""}` })
    }
  })

  const closeAddClassDialog = () => { setAddClassDialogVis(false); setSelectedClassIds([]) }

  const [pendingDeleteClass, setPendingDeleteClass] = useState<{ id: number; name: string } | null>(null)

  const removeFromClassMutation = useMutation({
    mutationFn: async (classId: number) => {
      const userIdNum = Number(userId)
      if (isTeacher) {
        const teachers = await userApi.userQueryUsers(null, null, UserRole.TEACHER, classId).then(r => r.data.users ?? [])
        const remaining = teachers.filter(t => t.id !== userIdNum).map(t => t.id)
        return classApi.classEditClass({ id: classId, teachers: remaining })
      } else {
        const students = await userApi.userQueryUsers(null, null, UserRole.STUDENT, classId).then(r => r.data.users ?? [])
        const remaining = students.filter(s => s.id !== userIdNum).map(s => s.id)
        return classApi.classEditClass({ id: classId, students: remaining })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminUserDetails", userId] })
      setAlert({ severity: "success", message: t(TranslationKey.ADMIN_USER_DETAILS_REMOVE_FROM_CLASS_SUCCESS) })
    },
    onError: (error: any) => {
      const msg = i18n.language === Language.EN ? error?.response?.data?.messageEn : error?.response?.data?.messageSk
      setAlert({ severity: "error", message: `${t(TranslationKey.ADMIN_USER_DETAILS_REMOVE_FROM_CLASS_ERROR)}. ${msg ?? ""}` })
    }
  })

  const avgNetwork = detailsQuery.data?.averageNetwork ?? 0
  const avgFirst = detailsQuery.data?.averageFirst ?? 0
  const avgLast = detailsQuery.data?.averageLast ?? 0
  const avgBroadcast = detailsQuery.data?.averageBroadcast ?? 0
  const hasAnyAverage =
    [
      detailsQuery.data?.averageNetwork,
      detailsQuery.data?.averageFirst,
      detailsQuery.data?.averageLast,
      detailsQuery.data?.averageBroadcast
    ]
      .some(v => typeof v === "number")

  if ((detailsQuery.isLoading || roleQuery.isLoading) && !detailsQuery.data) {
    return <InsightGridSkeleton count={8} columnsMax={3} />
  }

  if (detailsQuery.isError || roleQuery.isError) {
    return (
      <ErrorLoading
        onRetry={() => {
          queryClient.invalidateQueries({ queryKey: ["adminUserDetails", userId] })
          queryClient.invalidateQueries({ queryKey: ["adminUserRole", userId] })
        }}
      />
    )
  }

  const removeFromClassDialog = (
    <DeleteDialog
      open={!!pendingDeleteClass}
      onClose={() => setPendingDeleteClass(null)}
      onConfirm={() => pendingDeleteClass && removeFromClassMutation.mutate(pendingDeleteClass.id)}
      title={t(TranslationKey.ADMIN_USER_DETAILS_REMOVE_FROM_CLASS_TITLE)}
      question={t(TranslationKey.ADMIN_USER_DETAILS_REMOVE_FROM_CLASS_QUESTION)}
      label={pendingDeleteClass?.name}
    />
  )

  const addClassDialog = (
    <Dialog open={addClassDialogVis} onClose={closeAddClassDialog} fullWidth maxWidth="sm">
      <DialogTitle>{t(TranslationKey.ADMIN_USER_DETAILS_ADD_CLASS)}</DialogTitle>
      <DialogContent>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {availableClasses.map(cls => {
            const selected = selectedClassIds.includes(cls.classId)
            return (
              <Chip
                key={cls.classId}
                label={cls.className}
                variant={selected ? "filled" : "outlined"}
                color={selected ? "primary" : "default"}
                onClick={() => {
                  setSelectedClassIds(prev =>
                    selected ? prev.filter(id => id !== cls.classId) : [...prev, cls.classId]
                  )
                }}
                clickable
                sx={{ fontSize: "0.9rem", height: 36, px: 1 }}
              />
            )
          })}
          {availableClasses.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              {t(TranslationKey.ADMIN_USER_DETAILS_NO_CLASSES_AVAILABLE)}
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={closeAddClassDialog}>{t(TranslationKey.TEACHER_MY_CLASSES_CANCEL)}</Button>
        <Button
          variant="contained"
          color="success"
          disabled={selectedClassIds.length === 0 || addClassMutation.isPending}
          onClick={() => addClassMutation.mutate(selectedClassIds)}
        >
          {t(TranslationKey.TEACHER_MY_CLASSES_ADD)}
        </Button>
      </DialogActions>
    </Dialog>
  )

  const classesCard = (
    <Box>
      <Card variant="outlined">
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="overline" color="text.secondary">
              {t(TranslationKey.ADMIN_USER_DETAILS_CLASSES)}
            </Typography>
            <Tooltip title={t(TranslationKey.ADMIN_USER_DETAILS_ADD_CLASS_TOOLTIP)}>
              <IconButton
                size="small"
                onClick={() => setAddClassDialogVis(true)}
                sx={{
                  border: theme => `1px solid ${theme.palette.success.main}`,
                  width: 20, height: 20,
                  color: theme => theme.palette.success.dark,
                  "& .MuiSvgIcon-root": { fontSize: 14 },
                  mb: "1px"
                }}
              >
                <AddIcon />
              </IconButton>
            </Tooltip>
          </Stack>

          {detailsQuery.data?.classes?.length ? (
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
              {detailsQuery.data.classes.map(c => (
                <Chip
                  key={c.id}
                  label={c.name}
                  variant="outlined"
                  clickable
                  onClick={() =>
                    navigate(
                      getParametrizedUrl(RouteKeys.ADMIN_CLASS_DETAILS, {
                        [RouteParams.CLASS_ID]: c.id.toString()
                      })
                    )
                  }
                  onDelete={() => setPendingDeleteClass({ id: c.id, name: c.name })}
                  sx={{ fontSize: "0.9rem", height: 36, px: 1 }}
                />
              ))}
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {t(TranslationKey.ADMIN_USER_DETAILS_NO_CLASSES)}
            </Typography>
          )}
        </CardContent>
      </Card>
    </Box>
  )

  if (isTeacher) {
    return (
      <>
        {alert && <CustomAlert {...alert} onClose={() => setAlert(null)} />}
        <Stack spacing={2}>
          <Card variant="outlined" sx={{ borderColor: "divider", backgroundColor: "background.paper" }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                <Person fontSize="small" color="action" />
                <Typography variant="h6" fontWeight={800}>
                  {detailsQuery.data?.username ?? "-"}
                </Typography>
              </Stack>
            </CardContent>
          </Card>

          <InsightGrid
            spacing={1.25}
            columnsMax={3}
            items={[
              <InsightCard
                title={t(TranslationKey.ADMIN_USER_DETAILS_CREATED_AT)}
                value={detailsQuery.data?.createdAt ? new Date(detailsQuery.data.createdAt).toLocaleDateString() : "-"}
                icon={<MoreTime />}
                dense
              />,
              <InsightCard
                title={t(TranslationKey.ADMIN_USER_DETAILS_TOTAL_UPCOMING)}
                value={detailsQuery.data?.totalUpcoming ?? "-"}
                icon={<AccessTime />}
                dense
              />,
              <InsightCard
                title={t(TranslationKey.ADMIN_USER_DETAILS_TOTAL_IN_PROGRESS)}
                value={detailsQuery.data?.totalInProgress ?? "-"}
                icon={<AccessTime />}
                tone="warning"
                dense
              />,
              <InsightCard
                title={t(TranslationKey.ADMIN_USER_DETAILS_TOTAL_ENDED)}
                value={detailsQuery.data?.totalEnded ?? "-"}
                icon={<AccessTime />}
                tone="success"
                dense
              />
            ]}
          />

          {classesCard}
        </Stack>
        {addClassDialog}
        {removeFromClassDialog}
      </>
    )
  }

  return (
    <>
      {alert && <CustomAlert {...alert} onClose={() => setAlert(null)} />}
      <Stack spacing={2}>
      <Card variant="outlined" sx={{ borderColor: "divider", backgroundColor: "background.paper" }}>
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
            <Person fontSize="small" color="action" />
            <Typography variant="h6" fontWeight={800}>
              {detailsQuery.data?.username ?? "-"}
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      <InsightGrid
        spacing={1.25}
        columnsMax={3}
        items={[
          <InsightCard
            title={t(TranslationKey.ADMIN_USER_DETAILS_TOTAL_ASSIGNMENT_GROUPS)}
            value={detailsQuery.data?.totalAssignmentGroups ?? "-"}
            icon={<Quiz />}
            dense
          />,
          <InsightCard
            title={t(TranslationKey.ADMIN_USER_DETAILS_TOTAL_UPCOMING)}
            value={detailsQuery.data?.totalUpcoming ?? "-"}
            icon={<AccessTime />}
            dense
          />,
          <InsightCard
            title={t(TranslationKey.ADMIN_USER_DETAILS_TOTAL_IN_PROGRESS)}
            value={detailsQuery.data?.totalInProgress ?? "-"}
            icon={<AccessTime />}
            tone="warning"
            dense
          />,
          <InsightCard
            title={t(TranslationKey.ADMIN_USER_DETAILS_TOTAL_ENDED)}
            value={detailsQuery.data?.totalEnded ?? "-"}
            icon={<AccessTime />}
            tone="success"
            dense
          />,
          <InsightCard
            title={t(TranslationKey.ADMIN_USER_DETAILS_CREATED_AT)}
            value={detailsQuery.data?.createdAt ? new Date(detailsQuery.data.createdAt).toLocaleDateString() : "-"}
            icon={<MoreTime />}
            dense
          />,
          <InsightCard
            title={t(TranslationKey.ADMIN_USER_DETAILS_TOTAL_SUBMITS)}
            value={detailsQuery.data?.totalSubmits ?? "-"}
            icon={<TaskAlt />}
            tone="info"
            dense
          />,
          <InsightCard
            title={t(TranslationKey.ADMIN_USER_DETAILS_LAST_SUBMIT)}
            value={detailsQuery.data?.lastSubmitAt ? new Date(detailsQuery.data.lastSubmitAt).toLocaleString() : "-"}
            icon={<AccessTime />}
            dense
          />,
          <Tooltip title={t(TranslationKey.ADMIN_USER_DETAILS_AVERAGE_SUCCESS_RATE_TOOLTIP)}>
            <Box>
              <InsightCard
                title={t(TranslationKey.ADMIN_USER_DETAILS_AVERAGE_SUCCESS_RATE)}
                value={`${(detailsQuery.data?.averageTotal ?? 0).toFixed(2)}%`}
                icon={<Percent />}
                tone="success"
                dense
              />
            </Box>
          </Tooltip>
        ]}
      />

      {classesCard}

      <Stack spacing={2} direction={{ xs: "column", md: "row" }}>
        <Box sx={{ flex: 1, width: "100%" }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="overline" color="text.secondary">
                {t(TranslationKey.ADMIN_USER_DETAILS_AVERAGES)}
              </Typography>

              {hasAnyAverage ? (
                <LazyRadarChart
                  shape="circular"
                  divisions={4}
                  height={320}
                  series={[
                    {
                      data: [avgNetwork, avgFirst, avgLast, avgBroadcast],
                      label: t(TranslationKey.ADMIN_USER_DETAILS_PERCENTAGE),
                      fillArea: true,
                      valueFormatter: (v: number) => `${v.toFixed(2)}%`,
                    }
                  ]}
                  radar={{
                    max: 100,
                    metrics: [
                      t(TranslationKey.ADMIN_USER_DETAILS_NETWORK),
                      t(TranslationKey.ADMIN_USER_DETAILS_FIRST),
                      t(TranslationKey.ADMIN_USER_DETAILS_LAST),
                      t(TranslationKey.ADMIN_USER_DETAILS_BROADCAST)
                    ],
                  }}
                />
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {t(TranslationKey.ADMIN_USER_DETAILS_NO_DATA)}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ flex: 1, width: "100%" }} height="100%">
          <Card variant="outlined">
            <CardContent>
              <Typography variant="overline" color="text.secondary">
                {t(TranslationKey.ADMIN_USER_DETAILS_AVERAGE_SUCCESS_RATE)}
              </Typography>
              {(detailsQuery.data?.successRate?.length ?? 0) > 0 ? (
                <LazyLineChart
                  height={320}
                  xAxis={[
                    {
                      scaleType: "point",
                      data: detailsQuery.data!.successRate!.map(d => d.date),
                      label: t(TranslationKey.ADMIN_USER_DETAILS_DATE),
                    },
                  ]}
                  series={[
                    {
                      data: detailsQuery.data!.successRate!.map(d => d.percentage),
                      label: t(TranslationKey.ADMIN_USER_DETAILS_PERCENTAGE),
                      area: true,
                    },
                  ]}
                  yAxis={[
                    {
                      min: 0,
                      max: 100,
                      valueFormatter: (v: number) => `${v.toFixed(2)}%`,
                    },
                  ]}
                  margin={{ left: 60, right: 80, top: 20, bottom: 40 }}
                />
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {t(TranslationKey.ADMIN_USER_DETAILS_NO_DATA)}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Box>
      </Stack>
      </Stack>
      {addClassDialog}
      {removeFromClassDialog}
    </>
  )
}

export default AdminUserDetails