import { useCallback, useEffect, useMemo, useState } from "react"
import { Box, Button, Stack, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import axios, { type AxiosError } from "axios"
import Gns3DataGridWithSearch from "../../components/Gns3DataGridWithSearch"
import TableSkeleton from "../../components/TableSkeleton"
import { CustomAlert, type CustomAlertState } from "../../components/CustomAlert"
import ActionPanel from "../../components/ActionPanel"
import { TranslationKey, Language } from "../../utils/i18n"
import { appSettingsApi, classApi, gns3Api, userApi } from "../../utils/apiClients"
import type { ApiProblemDetails, UserDto, Gns3SessionBase, StartSessionReq, StopSessionReq, ClassDto } from "../../dtos"
import { GNS3SessionStatus } from "../../dtos"
import UserRole from "../../types/UserRole"
import { useAuth } from "../../contexts/AuthContext"
import { useNavigate } from "react-router-dom"
import { RouteKeys, Routes } from "../../router/routes"

const TeacherGns3 = () => {
  const { t, i18n } = useTranslation()
  const { userId } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [searchValue, setSearchValue] = useState("")
  const [classFilterValue, setClassFilterValue] = useState("")
  const [descending, setDescending] = useState(false)
  const [alert, setAlert] = useState<CustomAlertState | null>(null)

  const handleRoleFilterChange = useCallback((_val: string) => {}, [])

  if (!userId) {
    return <TableSkeleton />
  }

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

  const classesQuery = useQuery<ClassDto[]>({
    queryKey: ["teacher-classes", userId],
    enabled: !!userId,
    queryFn: () =>
      classApi
        .classQueryClasses(null, null, userId)
        .then(r => r.data.classes ?? []),
    placeholderData: prev => prev,
  })

  useEffect(() => {
    const classIds = (classesQuery.data ?? []).map(c => c.classId.toString())
    if (classIds.length === 0) {
      setClassFilterValue("")
      return
    }
    if (classFilterValue && !classIds.includes(classFilterValue)) {
      setClassFilterValue("")
    }
  }, [classFilterValue, classesQuery.data])

  const selectedClassId = useMemo(() => {
    if (!classFilterValue) return null
    const parsed = parseInt(classFilterValue, 10)
    return Number.isFinite(parsed) ? parsed : null
  }, [classFilterValue])

  const allowedClassIds = useMemo(() => new Set((classesQuery.data ?? []).map(c => c.classId)), [classesQuery.data])

  const usersQuery = useQuery<UserDto[]>({
    queryKey: ["teacher-gns3-users", { searchValue, classFilterValue, descending }],
    enabled: (classesQuery.data?.length ?? 0) > 0,
    queryFn: () => {
      const classIdForQuery = classFilterValue ? selectedClassId : null
      return userApi
        .userQueryUsers(null, searchValue || null, UserRole.STUDENT, classIdForQuery, null, descending || null)
        .then(r => r.data.users ?? [])
    },
    placeholderData: prev => prev,
    refetchInterval: 10_000,
  })

  const filteredUsers = useMemo(() => {
    const list = usersQuery.data ?? []
    if (!classFilterValue) {
      return list.filter(u => u.role === UserRole.STUDENT && (u.classIds ?? []).some(id => allowedClassIds.has(id)))
    }
    if (!selectedClassId) return []
    return list.filter(u => u.role === UserRole.STUDENT && (u.classIds ?? []).includes(selectedClassId) && (u.classIds ?? []).some(id => allowedClassIds.has(id)))
  }, [allowedClassIds, classFilterValue, selectedClassId, usersQuery.data])

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
      setAlert({ severity: "success", message: `${t(TranslationKey.TEACHER_GNS3_START, { value: variables.username })}` })
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
      setAlert({ severity: "success", message: `${t(TranslationKey.TEACHER_GNS3_STOP, { value: variables.username })}` })
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
        message: `${t(TranslationKey.TEACHER_GNS3_EXTEND, { value: variables.username, minutes: variables.minutes })}`,
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

  const sessionsByUser = sessionsQuery.data ?? {}

  const handleStartSession = (user: UserDto) => startSessionMutation.mutate({ userId: user.id, username: user.username })
  const handleStopSession = (user: UserDto) => stopSessionMutation.mutate({ userId: user.id, username: user.username })
  const handleExtendSession = (user: UserDto) => extendSessionMutation.mutate({ userId: user.id, username: user.username, minutes: gns3ExtensionMinutes })

  const classFilter = useMemo(() => {
    if (!classesQuery.data || classesQuery.data.length === 0) return undefined
    return {
      label: t(TranslationKey.TEACHER_GNS3_CLASS_FILTER),
      value: classFilterValue,
      setValue: setClassFilterValue,
      options: [
        { value: "", label: t(TranslationKey.TEACHER_GNS3_ALL_CLASSES) },
        ...classesQuery.data.map(c => ({ value: c.classId.toString(), label: c.className })),
      ],
    }
  }, [classFilterValue, classesQuery.data, t])

  const showNoClassAlert = !classesQuery.isLoading && !classesQuery.isError && (classesQuery.data?.length ?? 0) === 0

  return (
    <>
      {alert && <CustomAlert severity={alert.severity} message={alert.message} onClose={() => setAlert(null)} />}

      {classesQuery.isLoading ? (
        <TableSkeleton />
      ) : classesQuery.isError ? (
        <CustomAlert
          severity="error"
          message={getApiMessage(classesQuery.error)}
          onClose={() => setAlert(null)}
        />
      ) : showNoClassAlert ? (
        <>
          <Box
            sx={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between"
            }}
          >
            <Typography variant="h6">
              {t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_NOCLASS)}
            </Typography>
            <Button
              variant="contained"
              color="info"
              onClick={() => navigate(Routes[RouteKeys.TEACHER_MY_CLASSES])}
            >
              {t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_NOCLASS_BUTTON)}
            </Button>
          </Box>
          <Box sx={{ mt: 4 }} />
        </>
      ) : usersQuery.isLoading ? (
        <TableSkeleton />
      ) : usersQuery.isError ? (
        <CustomAlert
          severity="error"
          message={getApiMessage(usersQuery.error)}
          onClose={() => setAlert(null)}
        />
      ) : (
        <Stack spacing={2}>
          <ActionPanel
            title={t(TranslationKey.TEACHER_GNS3_TITLE)}
            hideActions
          />

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
            roleFilterValue={""}
            setRoleFilterValue={handleRoleFilterChange}
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
            showRoleFilter={false}
            filter1={classFilter}
            showPortColumn={false}
          />
        </Stack>
      )}
    </>
  )
}

export default TeacherGns3