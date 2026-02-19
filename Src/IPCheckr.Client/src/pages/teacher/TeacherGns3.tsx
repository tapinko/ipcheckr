import { useEffect, useMemo, useState } from "react"
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Stack,
} from "@mui/material"
import PlayArrowIcon from "@mui/icons-material/PlayArrow"
import StopIcon from "@mui/icons-material/Stop"
import { Link as RouterLink } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import axios, { type AxiosError } from "axios"
import TableSkeleton from "../../components/TableSkeleton"
import { CustomAlert, type CustomAlertState } from "../../components/CustomAlert"
import { TranslationKey, Language } from "../../utils/i18n"
import { appSettingsApi, classApi, gns3Api, userApi } from "../../utils/apiClients"
import type { ApiProblemDetails, ClassDto, Gns3SessionBase, StartSessionReq, StopSessionReq, UserDto } from "../../dtos"
import { GNS3SessionStatus } from "../../dtos"
import { useAuth } from "../../contexts/AuthContext"
import { getGns3StatusMap, type Gns3StatusKey } from "../../utils/getGns3StatusMap"
import { RouteKeys, Routes } from "../../router/routes"
import UserRole from "../../types/UserRole"

const parseDateSafe = (value?: string | null) => {
  if (!value) return null
  const hasZone = /[zZ]|[+-]\d\d:\d\d$/.test(value)
  return new Date(hasZone ? value : `${value}Z`)
}

const formatDateTime = (value?: string | null) => {
  const date = parseDateSafe(value)
  return date ? date.toLocaleString() : "-"
}

const formatSeconds = (seconds?: number) => {
  if (!seconds || seconds <= 0) return "-"
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  const pad = (n: number) => n.toString().padStart(2, "0")
  if (hours > 0) return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`
  return `${pad(minutes)}:${pad(secs)}`
}

const formatCountdown = (start?: string | null, totalSeconds?: number, now?: number) => {
  if (!start || !totalSeconds || totalSeconds <= 0 || !now) return "-"
  const startDate = parseDateSafe(start)
  if (!startDate) return "-"
  const elapsed = Math.max(0, Math.floor((now - startDate.getTime()) / 1000))
  const remaining = Math.max(0, totalSeconds - elapsed)
  const hours = Math.floor(remaining / 3600)
  const minutes = Math.floor((remaining % 3600) / 60)
  const seconds = remaining % 60
  const pad = (n: number) => n.toString().padStart(2, "0")
  if (hours > 0) return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
  return `${pad(minutes)}:${pad(seconds)}`
}

const formatDuration = (start?: string | null, end?: string | null) => {
  const startDate = parseDateSafe(start)
  const endDate = parseDateSafe(end)
  if (!startDate || !endDate) return "-"
  const diffSeconds = Math.max(0, Math.floor((endDate.getTime() - startDate.getTime()) / 1000))
  const hours = Math.floor(diffSeconds / 3600)
  const minutes = Math.floor((diffSeconds % 3600) / 60)
  const seconds = diffSeconds % 60
  const pad = (n: number) => n.toString().padStart(2, "0")
  if (hours > 0) return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
  return `${pad(minutes)}:${pad(seconds)}`
}

const TeacherGns3 = () => {
  const { t, i18n } = useTranslation()
  const { userId } = useAuth()
  const queryClient = useQueryClient()
  const [alert, setAlert] = useState<CustomAlertState | null>(null)
  const [nowTs, setNowTs] = useState(() => Date.now())

  useEffect(() => {
    const interval = setInterval(() => setNowTs(Date.now()), 1_000)
    return () => clearInterval(interval)
  }, [])

  const getApiMessage = (error: unknown) => {
    const apiErr = error as AxiosError<ApiProblemDetails>
    const payload = apiErr?.response?.data
    const localized = i18n.language === Language.SK ? payload?.messageSk : payload?.messageEn
    return localized || payload?.detail || t(TranslationKey.ERROR_MESSAGE)
  }

  const settingsQuery = useQuery({
    queryKey: ["appsettings"],
    queryFn: () => appSettingsApi.appSettingsQueryAppSettings(),
  })

  const gns3DefaultMinutes = useMemo(() => {
    const list = settingsQuery.data?.data?.appSettings ?? []
    const setting = list.find(s => s.name === "Gns3_DefaultSessionMinutes")
    const value = parseInt((setting?.value ?? "").trim(), 10)
    return Number.isFinite(value) && value > 0 ? value : 120
  }, [settingsQuery.data])

  const gns3ExtensionMinutes = useMemo(() => {
    const list = settingsQuery.data?.data?.appSettings ?? []
    const setting = list.find(s => s.name === "Gns3_ExtendedMinutes")
    const value = parseInt((setting?.value ?? "").trim(), 10)
    return Number.isFinite(value) && value > 0 ? value : 30
  }, [settingsQuery.data])

  const defaultDurationSeconds = useMemo(() => gns3DefaultMinutes * 60, [gns3DefaultMinutes])

  const sessionQuery = useQuery<Gns3SessionBase>({
    queryKey: ["teacher-gns3-session", userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) throw new Error("Missing user id")
      try {
        const res = await gns3Api.gns3QuerySession(userId)
        return res.data
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          return {
            userId,
            username: "",
            status: GNS3SessionStatus.Stopped,
            port: 0,
            sessionStart: null,
            sessionEnd: null,
            duration: 0,
            extendedDuration: 0,
          }
        }
        throw error
      }
    },
    refetchInterval: 5_000,
    refetchIntervalInBackground: true,
    placeholderData: prev => prev,
  })

  const historyQuery = useQuery<Gns3SessionBase[]>({
    queryKey: ["teacher-gns3-history", userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return []
      const res = await gns3Api.gns3QuerySessionHistory(userId)
      const data = res.data as { sessions?: Gns3SessionBase[]; Sessions?: Gns3SessionBase[] }
      return data.sessions ?? data.Sessions ?? []
    },
    refetchInterval: 15_000,
    refetchIntervalInBackground: true,
    placeholderData: prev => prev,
  })

  const classesQuery = useQuery<ClassDto[]>({
    queryKey: ["teacher-gns3-classes", userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return []
      const res = await classApi.classQueryClasses(null, null, userId)
      return res.data.classes ?? []
    },
    placeholderData: prev => prev,
  })

  const studentsQuery = useQuery<UserDto[]>({
    queryKey: ["teacher-gns3-students", userId],
    enabled: !!userId,
    queryFn: () => userApi.userQueryUsers(null, null, UserRole.STUDENT, null, null, null).then(r => r.data.users ?? []),
    placeholderData: prev => prev,
    refetchInterval: 20_000,
  })

  const startSessionMutation = useMutation({
    mutationFn: () => {
      if (!userId) throw new Error("Missing user id")
      const payload: StartSessionReq = { userId, duration: defaultDurationSeconds }
      return gns3Api.gns3StartSession(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-gns3-session"] })
      setAlert({ severity: "success", message: t(TranslationKey.TEACHER_GNS3_START_SUCCESS) })
    },
    onError: error => {
      setAlert({ severity: "error", message: getApiMessage(error) })
    },
  })

  const stopSessionMutation = useMutation({
    mutationFn: () => {
      if (!userId) throw new Error("Missing user id")
      const payload: StopSessionReq = { userId }
      return gns3Api.gns3StopSession(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-gns3-session"] })
      setAlert({ severity: "success", message: t(TranslationKey.TEACHER_GNS3_STOP_SUCCESS) })
    },
    onError: error => {
      setAlert({ severity: "error", message: getApiMessage(error) })
    },
  })

  const extendSessionMutation = useMutation({
    mutationFn: () => {
      if (!userId) throw new Error("Missing user id")
      return gns3Api.gns3ExtendSession({ userId, minutes: gns3ExtensionMinutes })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-gns3-session"] })
      queryClient.invalidateQueries({ queryKey: ["teacher-gns3-history"] })
      setAlert({ severity: "success", message: t(TranslationKey.TEACHER_GNS3_EXTEND_SUCCESS, { minutes: gns3ExtensionMinutes }) })
    },
    onError: error => {
      setAlert({ severity: "error", message: getApiMessage(error) })
    },
  })

  const session = sessionQuery.data
  const historyData = historyQuery.data
  const statusMap = useMemo(() => getGns3StatusMap(t), [t])
  const statusKey: Gns3StatusKey = session?.status ?? "UNKNOWN"
  const statusMeta = statusMap[statusKey] ?? statusMap.UNKNOWN

  const allowedClassIds = useMemo(() => new Set((classesQuery.data ?? []).map(c => c.classId)), [classesQuery.data])
  const teacherStudents = useMemo(() => {
    const students = studentsQuery.data ?? []
    return students.filter(s => (s.classIds ?? []).some(classId => allowedClassIds.has(classId)))
  }, [allowedClassIds, studentsQuery.data])

  const recentStudentsQuery = useQuery<Array<{ userId: number; username: string; session: Gns3SessionBase; lastStartMs: number }>>({
    queryKey: ["teacher-gns3-recent-students", teacherStudents.map(s => s.id)],
    enabled: teacherStudents.length > 0,
    queryFn: async () => {
      const results = await Promise.all(
        teacherStudents.map(async student => {
          try {
            const res = await gns3Api.gns3QuerySessionHistory(student.id)
            const data = res.data as { sessions?: Gns3SessionBase[]; Sessions?: Gns3SessionBase[] }
            const sessions = data.sessions ?? data.Sessions ?? []
            const sorted = [...sessions].sort((a, b) => {
              const aMs = parseDateSafe(a.sessionStart)?.getTime() ?? 0
              const bMs = parseDateSafe(b.sessionStart)?.getTime() ?? 0
              return bMs - aMs
            })
            const latest = sorted[0]
            if (!latest?.sessionStart) return null
            return {
              userId: student.id,
              username: student.username,
              session: latest,
              lastStartMs: parseDateSafe(latest.sessionStart)?.getTime() ?? 0,
            }
          } catch {
            return null
          }
        })
      )

      return results
        .filter((row): row is { userId: number; username: string; session: Gns3SessionBase; lastStartMs: number } => row !== null)
        .sort((a, b) => b.lastStartMs - a.lastStartMs)
    },
    refetchInterval: 20_000,
    refetchIntervalInBackground: true,
    placeholderData: prev => prev,
  })

  const isRunning = session?.status === GNS3SessionStatus.Running
  const totalDurationSeconds = (session?.duration ?? 0) + (session?.extendedDuration ?? 0)
  const durationLabel = isRunning
    ? formatSeconds(totalDurationSeconds)
    : "-"
  const remainingLabel = isRunning
    ? formatCountdown(session?.sessionStart, totalDurationSeconds, nowTs)
    : "-"
  const startedAtLabel = isRunning ? formatDateTime(session?.sessionStart) : "-"

  const sortedHistory = useMemo(() => {
    const list = historyData ?? []
    return [...list].sort((a, b) => {
      const aDate = parseDateSafe(a.sessionStart)?.getTime() ?? 0
      const bDate = parseDateSafe(b.sessionStart)?.getTime() ?? 0
      return bDate - aDate
    })
  }, [historyData])

  const [historyPage, setHistoryPage] = useState(0)
  const [historyRowsPerPage, setHistoryRowsPerPage] = useState(5)
  const [studentsPage, setStudentsPage] = useState(0)
  const [studentsRowsPerPage, setStudentsRowsPerPage] = useState(5)

  const pagedHistory = useMemo(() => {
    const start = historyPage * historyRowsPerPage
    return sortedHistory.slice(start, start + historyRowsPerPage)
  }, [historyPage, historyRowsPerPage, sortedHistory])

  const recentStudents = recentStudentsQuery.data ?? []
  const pagedRecentStudents = useMemo(() => {
    const start = studentsPage * studentsRowsPerPage
    return recentStudents.slice(start, start + studentsRowsPerPage)
  }, [recentStudents, studentsPage, studentsRowsPerPage])

  const handleHistoryChangePage = (_: unknown, newPage: number) => setHistoryPage(newPage)
  const handleHistoryChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value, 10)
    setHistoryRowsPerPage(Number.isFinite(value) ? value : 5)
    setHistoryPage(0)
  }

  const handleStudentsChangePage = (_: unknown, newPage: number) => setStudentsPage(newPage)
  const handleStudentsChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value, 10)
    setStudentsRowsPerPage(Number.isFinite(value) ? value : 5)
    setStudentsPage(0)
  }

  const showSkeleton = sessionQuery.isLoading && !session
  const showHistorySkeleton = historyQuery.isLoading && ((historyData?.length ?? 0) === 0)
  const showRecentStudentsSkeleton = recentStudentsQuery.isLoading && (recentStudents.length === 0)
  const actionPending = startSessionMutation.isPending || stopSessionMutation.isPending || extendSessionMutation.isPending
  const handleStartSession = () => startSessionMutation.mutate()
  const handleStopSession = () => stopSessionMutation.mutate()
  const handleExtendSession = () => extendSessionMutation.mutate()

  if (!userId) {
    return <TableSkeleton />
  }

  return (
    <>
      {alert && (
        <CustomAlert severity={alert.severity} message={alert.message} onClose={() => setAlert(null)} />
      )}

      {sessionQuery.isError && (
        <CustomAlert
          severity="error"
          message={getApiMessage(sessionQuery.error)}
          onClose={() => setAlert(null)}
        />
      )}

      {historyQuery.isError && (
        <CustomAlert
          severity="error"
          message={getApiMessage(historyQuery.error)}
          onClose={() => setAlert(null)}
        />
      )}

      {classesQuery.isError && (
        <CustomAlert
          severity="error"
          message={getApiMessage(classesQuery.error)}
          onClose={() => setAlert(null)}
        />
      )}

      {studentsQuery.isError && (
        <CustomAlert
          severity="error"
          message={getApiMessage(studentsQuery.error)}
          onClose={() => setAlert(null)}
        />
      )}

      {recentStudentsQuery.isError && (
        <CustomAlert
          severity="error"
          message={getApiMessage(recentStudentsQuery.error)}
          onClose={() => setAlert(null)}
        />
      )}

      {showSkeleton ? (
        <TableSkeleton />
      ) : (
        <Stack spacing={2}>
          <Card variant="outlined">
            <CardContent>
              <Stack spacing={2}>
                <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} gap={2}>
                  <Stack spacing={1}>
                    <Typography variant="h6">{t(TranslationKey.TEACHER_GNS3_LIVE_SESSION)}</Typography>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Typography variant="body2" color="text.secondary">
                        {t(TranslationKey.TEACHER_GNS3_STATUS)}:
                      </Typography>
                      <Chip label={statusMeta.label} color={statusMeta.color} size="small" />
                    </Stack>
                  </Stack>

                  <Stack direction="row" spacing={1}>
                    {isRunning ? (
                      <>
                        <Button
                          size="small"
                          variant="outlined"
                          color="warning"
                          aria-label={t(TranslationKey.TEACHER_GNS3_STOP)}
                          title={t(TranslationKey.TEACHER_GNS3_STOP)}
                          disabled={!isRunning || actionPending}
                          onClick={handleStopSession}
                        >
                          <StopIcon fontSize="small" />
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          color="info"
                          aria-label={t(TranslationKey.TEACHER_GNS3_EXTEND, { minutes: gns3ExtensionMinutes })}
                          title={t(TranslationKey.TEACHER_GNS3_EXTEND, { minutes: gns3ExtensionMinutes })}
                          disabled={!isRunning || actionPending}
                          onClick={handleExtendSession}
                        >
                          +{gns3ExtensionMinutes}m
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="small"
                        variant="contained"
                        color="primary"
                        aria-label={t(TranslationKey.TEACHER_GNS3_START)}
                        title={t(TranslationKey.TEACHER_GNS3_START)}
                        disabled={isRunning || actionPending}
                        onClick={handleStartSession}
                      >
                        <PlayArrowIcon fontSize="small" />
                      </Button>
                    )}
                  </Stack>
                </Stack>

                {sessionQuery.isFetching && <LinearProgress />}

                <Stack direction={{ xs: "column", sm: "row" }} spacing={3}>
                  <Stack spacing={0.5}>
                    <Typography variant="body2" color="text.secondary">
                      {t(TranslationKey.TEACHER_GNS3_STARTED_AT)}
                    </Typography>
                    <Typography variant="body1">{startedAtLabel}</Typography>
                  </Stack>

                  <Stack spacing={0.5}>
                    <Typography variant="body2" color="text.secondary">
                      {t(TranslationKey.TEACHER_GNS3_REMAINING)}
                    </Typography>
                    <Typography variant="body1">{remainingLabel}</Typography>
                  </Stack>

                  <Stack spacing={0.5}>
                    <Typography variant="body2" color="text.secondary">
                      {t(TranslationKey.TEACHER_GNS3_DURATION)}
                    </Typography>
                    <Typography variant="body1">{durationLabel}</Typography>
                  </Stack>
                </Stack>

                {session?.errorMessage && (
                  <CustomAlert
                    severity="warning"
                    message={session.errorMessage}
                    onClose={() => setAlert(null)}
                  />
                )}
              </Stack>
            </CardContent>
          </Card>

          <Card variant="outlined">
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h6">{t(TranslationKey.TEACHER_GNS3_MY_HISTORY_TITLE)}</Typography>
                {showHistorySkeleton ? (
                  <TableSkeleton />
                ) : (historyData?.length ?? 0) === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    {t(TranslationKey.TEACHER_GNS3_HISTORY_EMPTY)}
                  </Typography>
                ) : (
                  <>
                    <Table size="medium">
                      <TableHead>
                        <TableRow>
                          <TableCell>{t(TranslationKey.TEACHER_GNS3_STARTED_AT)}</TableCell>
                          <TableCell>{t(TranslationKey.TEACHER_GNS3_STOPPED_AT)}</TableCell>
                          <TableCell>{t(TranslationKey.TEACHER_GNS3_DURATION)}</TableCell>
                          <TableCell>{t(TranslationKey.TEACHER_GNS3_STATUS)}</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {pagedHistory.map(s => {
                          const meta = statusMap[(s.status as Gns3StatusKey) ?? "UNKNOWN"] ?? statusMap.UNKNOWN
                          return (
                            <TableRow key={`${s.sessionStart ?? "-"}-${s.sessionEnd ?? "-"}-${s.port}`}>
                              <TableCell>{formatDateTime(s.sessionStart)}</TableCell>
                              <TableCell>{formatDateTime(s.sessionEnd)}</TableCell>
                              <TableCell>{formatDuration(s.sessionStart, s.sessionEnd ?? null)}</TableCell>
                              <TableCell>
                                <Chip label={meta.label} color={meta.color} size="small" />
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                    <TablePagination
                      component="div"
                      count={sortedHistory.length}
                      page={historyPage}
                      onPageChange={handleHistoryChangePage}
                      rowsPerPage={historyRowsPerPage}
                      onRowsPerPageChange={handleHistoryChangeRowsPerPage}
                      rowsPerPageOptions={[5, 10, 25]}
                      labelRowsPerPage={t(TranslationKey.TEACHER_GNS3_ROWS_PER_PAGE)}
                      labelDisplayedRows={({ from, to, count }) => {
                        const numericCount = count === -1 ? to : count
                        return t(TranslationKey.TEACHER_GNS3_PAGINATION_RANGE, { from, to, count: numericCount })
                      }}
                    />
                  </>
                )}
              </Stack>
            </CardContent>
          </Card>

          <Card variant="outlined">
            <CardContent>
              <Stack spacing={2}>
                <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} gap={1}>
                  <Typography variant="h6">{t(TranslationKey.TEACHER_GNS3_STUDENT_HISTORY_TITLE)}</Typography>
                  <Button
                    component={RouterLink}
                    to={Routes[RouteKeys.TEACHER_GNS3_ALL_SESSIONS]}
                    variant="contained"
                    size="small"
                  >
                    {t(TranslationKey.TEACHER_GNS3_OPEN_ALL_SESSIONS)}
                  </Button>
                </Stack>

                {showRecentStudentsSkeleton ? (
                  <TableSkeleton />
                ) : recentStudents.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    {t(TranslationKey.TEACHER_GNS3_STUDENTS_RECENT_EMPTY)}
                  </Typography>
                ) : (
                  <>
                    <Table size="medium">
                      <TableHead>
                        <TableRow>
                          <TableCell>{t(TranslationKey.TEACHER_GNS3_USERNAME)}</TableCell>
                          <TableCell>{t(TranslationKey.TEACHER_GNS3_STARTED_AT)}</TableCell>
                          <TableCell>{t(TranslationKey.TEACHER_GNS3_STOPPED_AT)}</TableCell>
                          <TableCell>{t(TranslationKey.TEACHER_GNS3_DURATION)}</TableCell>
                          <TableCell>{t(TranslationKey.TEACHER_GNS3_STATUS)}</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {pagedRecentStudents.map(row => {
                          const meta = statusMap[(row.session.status as Gns3StatusKey) ?? "UNKNOWN"] ?? statusMap.UNKNOWN
                          return (
                            <TableRow key={`${row.userId}-${row.session.sessionStart ?? "-"}`}>
                              <TableCell>{row.username}</TableCell>
                              <TableCell>{formatDateTime(row.session.sessionStart)}</TableCell>
                              <TableCell>{formatDateTime(row.session.sessionEnd)}</TableCell>
                              <TableCell>{formatDuration(row.session.sessionStart, row.session.sessionEnd ?? null)}</TableCell>
                              <TableCell>
                                <Chip label={meta.label} color={meta.color} size="small" />
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                    <TablePagination
                      component="div"
                      count={recentStudents.length}
                      page={studentsPage}
                      onPageChange={handleStudentsChangePage}
                      rowsPerPage={studentsRowsPerPage}
                      onRowsPerPageChange={handleStudentsChangeRowsPerPage}
                      rowsPerPageOptions={[5, 10, 25]}
                      labelRowsPerPage={t(TranslationKey.TEACHER_GNS3_ROWS_PER_PAGE)}
                      labelDisplayedRows={({ from, to, count }) => {
                        const numericCount = count === -1 ? to : count
                        return t(TranslationKey.TEACHER_GNS3_PAGINATION_RANGE, { from, to, count: numericCount })
                      }}
                    />
                  </>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      )}
    </>
  )
}

export default TeacherGns3