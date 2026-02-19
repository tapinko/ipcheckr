import { useMemo, useState } from "react"
import { Box, Button, Stack } from "@mui/material"
import { useTranslation } from "react-i18next"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import axios, { type AxiosError } from "axios"
import Gns3DataGridWithSearch from "../../components/Gns3DataGridWithSearch"
import TableSkeleton from "../../components/TableSkeleton"
import { CustomAlert, type CustomAlertState } from "../../components/CustomAlert"
import { TranslationKey, Language } from "../../utils/i18n"
import { appSettingsApi, gns3Api, userApi } from "../../utils/apiClients"
import type { ApiProblemDetails, UserDto, Gns3SessionBase, StartSessionReq, StopSessionReq, ForceStopAllRes } from "../../dtos"
import { GNS3SessionStatus } from "../../dtos"
import UserRole from "../../types/UserRole"
import DeleteDialog from "../../components/DeleteDialog"

const AdminGns3AllSessions = () => {
  const { t, i18n } = useTranslation()
  const queryClient = useQueryClient()

  const [searchValue, setSearchValue] = useState("")
  const [roleFilterValue, setRoleFilterValue] = useState("")
  const [descending, setDescending] = useState(false)
  const [alert, setAlert] = useState<CustomAlertState | null>(null)
  const [forceKillOpen, setForceKillOpen] = useState(false)

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

  const usersQuery = useQuery<UserDto[]>({
    queryKey: ["gns3-users", { searchValue, roleFilterValue, descending }],
    queryFn: () =>
      userApi
        .userQueryUsers(null, searchValue || null, roleFilterValue || null, null, null, descending || null)
        .then(r => r.data.users ?? []),
    placeholderData: (prev) => prev,
    refetchInterval: 10_000,
  })

  const filteredUsers = useMemo(() => (usersQuery.data ?? []).filter(u => u.role !== UserRole.ADMIN), [usersQuery.data])
  const sortedUsers = useMemo(() => {
    const _arr = [...filteredUsers]
    _arr.sort((a, b) => descending ? b.username.localeCompare(a.username) : a.username.localeCompare(b.username))
    return _arr
  }, [filteredUsers, descending])
  const filteredUserIds = sortedUsers.map(u => u.id)

  const sessionsQuery = useQuery<Record<number, Gns3SessionBase>>({
    queryKey: ["gns3-sessions", filteredUserIds],
    enabled: filteredUserIds.length > 0,
    queryFn: async () => {
      const users = sortedUsers
      const results = await Promise.all(
        users.map(async user => {
          try {
            const res = await gns3Api.gns3QuerySession(user.id)
            return res.data
          } catch (error) {
            const base = {
              userId: user.id,
              username: user.username,
              status: GNS3SessionStatus.Stopped,
              port: 0,
              sessionStart: null,
              sessionEnd: null,
              duration: 0,
              extendedDuration: 0,
            }

            if (axios.isAxiosError(error) && error.response?.status === 404) {
              return { ...base, errorMessage: undefined }
            }

            return { ...base, errorMessage: getApiMessage(error) }
          }
        })
      )

      return results.reduce<Record<number, Gns3SessionBase>>((account, session) => {
        if (session.userId != null) {
          account[session.userId] = session
        }
        return account
      }, {})
    },
    staleTime: 15_000,
    refetchInterval: 10_000,
    refetchIntervalInBackground: true,
  })

  const defaultDurationSeconds = useMemo(() => gns3DefaultMinutes * 60, [gns3DefaultMinutes])

  const startSessionMutation = useMutation({
    mutationFn: ({ userId }: { userId: number; username: string }) => {
      const payload: StartSessionReq = { userId, duration: defaultDurationSeconds }
      return gns3Api.gns3StartSession(payload)
    },
    onSuccess: (_res, variables) => {
      queryClient.invalidateQueries({ queryKey: ["gns3-sessions"] })
      setAlert({ severity: "success", message: `${t(TranslationKey.ADMIN_GNS3_ALL_SESSIONS_START, { value: variables.username })}` })
    },
    onError: (error, variables) => {
      const message = getApiMessage(error)
      setAlert({
        severity: "error",
        message: `${variables.username}: ${message}`,
      })
    },
  })

  const stopSessionMutation = useMutation({
    mutationFn: ({ userId }: { userId: number; username: string }) => {
      const payload: StopSessionReq = { userId }
      return gns3Api.gns3StopSession(payload)
    },
    onSuccess: (_res, variables) => {
      queryClient.invalidateQueries({ queryKey: ["gns3-sessions"] })
      setAlert({ severity: "success", message: `${t(TranslationKey.ADMIN_GNS3_ALL_SESSIONS_STOP, { value: variables.username })}` })
    },
    onError: (error, variables) => {
      const message = getApiMessage(error)
      setAlert({
        severity: "error",
        message: `${variables.username}: ${message}`,
      })
    },
  })

  const extendSessionMutation = useMutation({
    mutationFn: ({ userId, minutes }: { userId: number; username: string; minutes: number }) =>
      gns3Api.gns3ExtendSession({ userId, minutes }),
    onSuccess: (_res, variables) => {
      queryClient.invalidateQueries({ queryKey: ["gns3-sessions"] })
      setAlert({
        severity: "success",
        message: `${t(TranslationKey.ADMIN_GNS3_ALL_SESSIONS_EXTEND, { value: variables.username, minutes: variables.minutes })}`,
      })
    },
    onError: (error, variables) => {
      const message = getApiMessage(error)
      setAlert({
        severity: "error",
        message: `${variables.username}: ${message}`,
      })
    },
  })

  const forceStopAllMutation = useMutation({
    mutationFn: () => gns3Api.gns3ForceStopAll(),
    onSuccess: (res) => {
      const data = (res as unknown as { data?: ForceStopAllRes }).data
      queryClient.invalidateQueries({ queryKey: ["gns3-sessions"] })
      const stopped = data?.stoppedCount ?? 0
      const failed = data?.failedCount ?? 0
      setAlert({ severity: failed > 0 ? "warning" : "success", message: t(TranslationKey.ADMIN_GNS3_ALL_SESSIONS_FORCE_KILL_SUCCESS, { stopped, failed }) })
      setForceKillOpen(false)
    },
    onError: (error) => {
      const message = getApiMessage(error)
      setAlert({ severity: "error", message })
      setForceKillOpen(false)
    },
  })

  const sessionsByUser = sessionsQuery.data ?? {}

  const handleStartSession = (user: UserDto) => startSessionMutation.mutate({ userId: user.id, username: user.username })
  const handleStopSession = (user: UserDto) => stopSessionMutation.mutate({ userId: user.id, username: user.username })
  const handleExtendSession = (user: UserDto) => extendSessionMutation.mutate({ userId: user.id, username: user.username, minutes: gns3ExtensionMinutes })
  const handleForceKillConfirm = () => forceStopAllMutation.mutate()
  const isForceKillBusy = sessionsQuery.isFetching || forceStopAllMutation.isPending


  return (
    <Stack spacing={3}>
      <Box display="flex" justifyContent="flex-end">
        <Button
          variant="outlined"
          color="error"
          size="small"
          onClick={() => setForceKillOpen(true)}
          disabled={isForceKillBusy}
        >
          {t(TranslationKey.ADMIN_GNS3_ALL_SESSIONS_FORCE_KILL_ALL)}
        </Button>
      </Box>

      {alert && <CustomAlert severity={alert.severity} message={alert.message} onClose={() => setAlert(null)} />}

      {usersQuery.isLoading ? (
        <TableSkeleton />
      ) : usersQuery.isError ? (
        <CustomAlert
          severity="error"
          message={getApiMessage(usersQuery.error)}
          onClose={() => setAlert(null)}
        />
      ) : (
        <Stack spacing={2}>
          {sessionsQuery.isError && (
            <CustomAlert
              severity="error"
              message={getApiMessage(sessionsQuery.error)}
              onClose={() => setAlert(null)}
            />
          )}

          <Gns3DataGridWithSearch
            searchValue={searchValue}
            setSearchValue={setSearchValue}
            descending={descending}
            setDescending={setDescending}
            roleFilterValue={roleFilterValue}
            setRoleFilterValue={setRoleFilterValue}
            users={sortedUsers}
            sessionsByUser={sessionsByUser}
            gns3ExtensionMinutes={gns3ExtensionMinutes}
            isUsersFetching={usersQuery.isFetching}
            startPendingUserId={startSessionMutation.isPending ? startSessionMutation.variables?.userId ?? null : null}
            stopPendingUserId={stopSessionMutation.isPending ? stopSessionMutation.variables?.userId ?? null : null}
            extendPending={extendSessionMutation.isPending}
            onStartSession={handleStartSession}
            onStopSession={handleStopSession}
            onExtendSession={handleExtendSession}
          />
        </Stack>
      )}

      <DeleteDialog
        open={forceKillOpen}
        onClose={() => setForceKillOpen(false)}
        onConfirm={handleForceKillConfirm}
        title={t(TranslationKey.ADMIN_GNS3_ALL_SESSIONS_FORCE_KILL_ALL)}
        question={t(TranslationKey.ADMIN_GNS3_ALL_SESSIONS_FORCE_KILL_ALL)}
        confirmLabel={TranslationKey.ADMIN_GNS3_ALL_SESSIONS_FORCE_KILL_ALL}
        color="error"
      />
    </Stack>
  )
}

export default AdminGns3AllSessions