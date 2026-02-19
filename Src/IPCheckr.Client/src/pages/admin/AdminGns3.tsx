import { useMemo, useState } from "react"
import {
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
} from "@mui/material"
import { Link as RouterLink } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useQuery } from "@tanstack/react-query"
import { type AxiosError } from "axios"
import TableSkeleton from "../../components/TableSkeleton"
import { CustomAlert } from "../../components/CustomAlert"
import { Language, TranslationKey } from "../../utils/i18n"
import { gns3Api, userApi } from "../../utils/apiClients"
import type { ApiProblemDetails, Gns3SessionBase, UserDto } from "../../dtos"
import { type Gns3StatusKey, getGns3StatusMap } from "../../utils/getGns3StatusMap"
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

const AdminGns3 = () => {
  const { t, i18n } = useTranslation()
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(5)
  const statusMap = useMemo(() => getGns3StatusMap(t), [t])

  const getApiMessage = (error: unknown) => {
    const apiErr = error as AxiosError<ApiProblemDetails>
    const payload = apiErr?.response?.data
    const localized = i18n.language === Language.SK ? payload?.messageSk : payload?.messageEn
    return localized || payload?.detail || t(TranslationKey.ERROR_MESSAGE)
  }

  const usersQuery = useQuery<UserDto[]>({
    queryKey: ["admin-gns3-users"],
    queryFn: () => userApi.userQueryUsers(null, null, null, null, null, null).then(r => r.data.users ?? []),
    placeholderData: prev => prev,
    refetchInterval: 20_000,
  })

  const nonAdminUsers = useMemo(() => (usersQuery.data ?? []).filter(u => u.role !== UserRole.ADMIN), [usersQuery.data])

  const recentUsersQuery = useQuery<Array<{ userId: number; username: string; role: UserRole; session: Gns3SessionBase; lastStartMs: number }>>({
    queryKey: ["admin-gns3-recent-users", nonAdminUsers.map(u => u.id)],
    enabled: nonAdminUsers.length > 0,
    queryFn: async () => {
      const results = await Promise.all(
        nonAdminUsers.map(async user => {
          try {
            const res = await gns3Api.gns3QuerySessionHistory(user.id)
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
              userId: user.id,
              username: user.username,
              role: user.role,
              session: latest,
              lastStartMs: parseDateSafe(latest.sessionStart)?.getTime() ?? 0,
            }
          } catch {
            return null
          }
        })
      )

      return results
        .filter((row): row is { userId: number; username: string; role: UserRole; session: Gns3SessionBase; lastStartMs: number } => row !== null)
        .sort((a, b) => b.lastStartMs - a.lastStartMs)
    },
    refetchInterval: 20_000,
    refetchIntervalInBackground: true,
    placeholderData: prev => prev,
  })

  const recentUsers = recentUsersQuery.data ?? []
  const pagedRecentUsers = useMemo(() => {
    const start = page * rowsPerPage
    return recentUsers.slice(start, start + rowsPerPage)
  }, [page, rowsPerPage, recentUsers])

  const handleChangePage = (_: unknown, newPage: number) => setPage(newPage)
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value, 10)
    setRowsPerPage(Number.isFinite(value) ? value : 5)
    setPage(0)
  }

  const showSkeleton = (usersQuery.isLoading && nonAdminUsers.length === 0) || (recentUsersQuery.isLoading && recentUsers.length === 0)

  return (
    <>
      {usersQuery.isError && (
        <CustomAlert
          severity="error"
          message={getApiMessage(usersQuery.error)}
          onClose={() => undefined}
        />
      )}

      {recentUsersQuery.isError && (
        <CustomAlert
          severity="error"
          message={getApiMessage(recentUsersQuery.error)}
          onClose={() => undefined}
        />
      )}

      {showSkeleton ? (
        <TableSkeleton />
      ) : (
        <Stack spacing={2}>
          <Card variant="outlined">
            <CardContent>
              <Stack spacing={2}>
                <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} gap={1}>
                  <Typography variant="h6">{t(TranslationKey.ADMIN_GNS3_USER_HISTORY_TITLE)}</Typography>
                  <Button
                    component={RouterLink}
                    to={Routes[RouteKeys.ADMIN_GNS3_ALL_SESSIONS]}
                    variant="contained"
                    size="small"
                  >
                    {t(TranslationKey.ADMIN_GNS3_OPEN_ALL_SESSIONS)}
                  </Button>
                </Stack>

                {recentUsers.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    {t(TranslationKey.ADMIN_GNS3_USERS_RECENT_EMPTY)}
                  </Typography>
                ) : (
                  <>
                    <Table size="medium">
                      <TableHead>
                        <TableRow>
                          <TableCell>{t(TranslationKey.ADMIN_GNS3_USERNAME)}</TableCell>
                          <TableCell>{t(TranslationKey.ADMIN_GNS3_ROLE)}</TableCell>
                          <TableCell>{t(TranslationKey.ADMIN_GNS3_STARTED_AT)}</TableCell>
                          <TableCell>{t(TranslationKey.ADMIN_GNS3_STOPPED_AT)}</TableCell>
                          <TableCell>{t(TranslationKey.ADMIN_GNS3_DURATION)}</TableCell>
                          <TableCell>{t(TranslationKey.ADMIN_GNS3_STATUS)}</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {pagedRecentUsers.map(row => {
                          const meta = statusMap[(row.session.status as Gns3StatusKey) ?? "UNKNOWN"] ?? statusMap.UNKNOWN
                          const roleLabel = row.role === UserRole.TEACHER
                            ? t(TranslationKey.ADMIN_GNS3_TEACHER)
                            : t(TranslationKey.ADMIN_GNS3_STUDENT)

                          return (
                            <TableRow key={`${row.userId}-${row.session.sessionStart ?? "-"}`}>
                              <TableCell>{row.username}</TableCell>
                              <TableCell>{roleLabel}</TableCell>
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
                      count={recentUsers.length}
                      page={page}
                      onPageChange={handleChangePage}
                      rowsPerPage={rowsPerPage}
                      onRowsPerPageChange={handleChangeRowsPerPage}
                      rowsPerPageOptions={[5, 10, 25]}
                      labelRowsPerPage={t(TranslationKey.ADMIN_GNS3_ROWS_PER_PAGE)}
                      labelDisplayedRows={({ from, to, count }) => {
                        const numericCount = count === -1 ? to : count
                        return t(TranslationKey.ADMIN_GNS3_PAGINATION_RANGE, { from, to, count: numericCount })
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

export default AdminGns3