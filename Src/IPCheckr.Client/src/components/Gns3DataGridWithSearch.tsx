import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  Box,
  Button,
  Chip,
  IconButton,
  LinearProgress,
  Menu,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material"
import MoreVertIcon from "@mui/icons-material/MoreVert"
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown"
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp"
import PlayArrowIcon from "@mui/icons-material/PlayArrow"
import StopIcon from "@mui/icons-material/Stop"
import { useQuery } from "@tanstack/react-query"
import { type AxiosError } from "axios"
import DataGridWithSearch from "./DataGridWithSearch"
import { TranslationKey, Language } from "../utils/i18n"
import UserRole from "../types/UserRole"
import type { ApiProblemDetails, Gns3SessionBase, UserDto } from "../dtos"
import { GNS3SessionStatus } from "../dtos"
import type { Gns3StatusKey } from "../utils/getGns3StatusMap"
import { getGns3StatusMap } from "../utils/getGns3StatusMap"
import { gns3Api } from "../utils/apiClients"

type DataGridFilter = {
  label: string
  value: string
  setValue: (val: string) => void
  options: { value: string; label: string }[]
}

type Gns3SessionWithDuration = Gns3SessionBase & {
  duration?: number
  extendedDuration?: number
}

const parseDateSafe = (value?: string | null) => {
  if (!value) return null
  const hasZone = /[zZ]|[+-]\d\d:\d\d$/.test(value)
  return new Date(hasZone ? value : `${value}Z`)
}

const formatDateParts = (value?: string | null) => {
  const _date = parseDateSafe(value)
  if (!_date) return { date: "-", time: "" }
  return {
    date: _date.toLocaleDateString(),
    time: _date.toLocaleTimeString()
  }
}

const formatDuration = (start?: string | null, end?: number | string | null) => {
  const startDate = parseDateSafe(start)
  if (!startDate) return "-"
  const endMs = typeof end === "number" ? end : parseDateSafe(end)?.getTime() ?? Date.now()
  const diffSeconds = Math.max(0, Math.floor((endMs - startDate.getTime()) / 1000))
  const hours = Math.floor(diffSeconds / 3600)
  const minutes = Math.floor((diffSeconds % 3600) / 60)
  const seconds = diffSeconds % 60
  const pad = (n: number) => n.toString().padStart(2, "0")
  if (hours > 0) return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
  return `${pad(minutes)}:${pad(seconds)}`
}

interface IGns3DataGridWithSearchProps {
  users: UserDto[]
  sessionsByUser: Record<number, Gns3SessionBase>
  searchValue: string
  setSearchValue: (val: string) => void
  descending: boolean
  setDescending: (val: boolean) => void
  roleFilterValue: string
  setRoleFilterValue: (val: string) => void
  gns3ExtensionMinutes: number
  isUsersFetching?: boolean
  startPendingUserId?: number | null
  stopPendingUserId?: number | null
  extendPending?: boolean
  onStartSession: (user: UserDto) => void
  onStopSession: (user: UserDto) => void
  onExtendSession: (user: UserDto) => void
  showRoleFilter?: boolean
  showPortColumn?: boolean
  filter1?: DataGridFilter
  filter2?: DataGridFilter
}

const Gns3DataGridWithSearch = ({
  users,
  sessionsByUser,
  searchValue,
  setSearchValue,
  descending,
  setDescending,
  roleFilterValue,
  setRoleFilterValue,
  gns3ExtensionMinutes,
  isUsersFetching,
  startPendingUserId,
  stopPendingUserId,
  extendPending,
  onStartSession,
  onStopSession,
  onExtendSession,
  showRoleFilter = true,
  showPortColumn = true,
  filter1,
  filter2,
}: IGns3DataGridWithSearchProps) => {
  const { t, i18n } = useTranslation()
  const statusMap = useMemo(() => getGns3StatusMap(t), [t])
  const [expandedUserId, setExpandedUserId] = useState<number | null>(null)
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null)
  const [menuUser, setMenuUser] = useState<UserDto | null>(null)
  const [nowTs, setNowTs] = useState(() => Date.now())

  const closeMenu = () => {
    setMenuAnchor(null)
    setMenuUser(null)
  }

  useEffect(() => {
    const interval = setInterval(() => setNowTs(Date.now()), 1_000)
    return () => clearInterval(interval)
  }, [])

  const roleFilter = useMemo(() => {
    if (!showRoleFilter) return undefined
    return {
      label: t(TranslationKey.GNS3_DATA_GRID_ROLE),
      value: roleFilterValue,
      setValue: setRoleFilterValue,
      options: [
        { value: "", label: t(TranslationKey.GNS3_DATA_GRID_ALL) },
        { value: UserRole.STUDENT, label: t(TranslationKey.GNS3_DATA_GRID_STUDENT) },
        { value: UserRole.TEACHER, label: t(TranslationKey.GNS3_DATA_GRID_TEACHER) },
      ],
    }
  }, [roleFilterValue, setRoleFilterValue, showRoleFilter, t])

  const primaryFilter = useMemo(() => filter1 ?? (showRoleFilter ? roleFilter : undefined), [filter1, roleFilter, showRoleFilter])

  const displayUsers = useMemo(() => users ?? [], [users])

  const historyQuery = useQuery<{ sessions: Gns3SessionBase[] }>({
    queryKey: ["gns3-history", expandedUserId],
    enabled: expandedUserId != null,
    queryFn: async () => {
      if (!expandedUserId) return { sessions: [] }
      const res = await gns3Api.gns3QuerySessionHistory(expandedUserId)
      const data = res.data as { sessions?: Gns3SessionBase[]; Sessions?: Gns3SessionBase[] }
      return { sessions: data.sessions ?? data.Sessions ?? [] }
    },
    refetchInterval: expandedUserId ? 10_000 : false,
    refetchIntervalInBackground: true,
  })

  const historyErrorMessage = historyQuery.isError ? (() => {
    const apiErr = historyQuery.error as AxiosError<ApiProblemDetails>
    const payload = apiErr?.response?.data
    const localized = i18n.language === Language.SK ? payload?.messageSk : payload?.messageEn
    return localized || payload?.detail || t(TranslationKey.ERROR_MESSAGE)
  })() : undefined

  const columns = useMemo(() => {
    const cols = [
      { label: t(TranslationKey.GNS3_DATA_GRID_USERNAME), key: "username", width: 130 },
      { label: t(TranslationKey.GNS3_DATA_GRID_ROLE), key: "role", width: 120, hideOnMobile: true },
      { label: t(TranslationKey.GNS3_DATA_GRID_STATUS), key: "status", width: 120 },
      { label: t(TranslationKey.GNS3_DATA_GRID_PORT), key: "port", width: 90, hideOnMobile: true },
      { label: t(TranslationKey.GNS3_DATA_GRID_STARTED_AT), key: "sessionStart", width: 160, hideOnMobile: true },
      { label: t(TranslationKey.GNS3_DATA_GRID_DURATION), key: "duration", width: 120 },
      { label: t(TranslationKey.GNS3_DATA_GRID_STOPPED_AT), key: "sessionEnd", width: 160, hideOnMobile: true },
      { label: "", key: "actions", width: 140, hideOnMobile: true },
    ]

    return showPortColumn ? cols : cols.filter(c => c.key !== "port")
  }, [showPortColumn, t])

  const minWidth = useMemo(() => columns.reduce((sum, c) => sum + (Number(c.width) || 0), 0), [columns])

  // 
  /**
   *
   * Parses the provided start timestamp (using parseDateSafe) and computes elapsed seconds
   * relative to the outer-scope nowTs. If inputs are missing, invalid, or the duration
   * has elapsed, returns "-". Otherwise returns a zero-padded "MM:SS" string, or
   * "HH:MM:SS" when the remaining time includes hours.
   *
   * @param start
   * @param totalSeconds
   * @returns formatted countdown string or "-"
   */
  const formatCountdown = (start?: string | null, totalSeconds?: number) => {
    if (!start || !totalSeconds || totalSeconds <= 0) return "-"
    const startDate = parseDateSafe(start)
    if (!startDate) return "-"
    const elapsed = Math.max(0, Math.floor((nowTs - startDate.getTime()) / 1000))
    const remaining = Math.max(0, totalSeconds - elapsed)
    const hours = Math.floor(remaining / 3600)
    const minutes = Math.floor((remaining % 3600) / 60)
    const seconds = remaining % 60
    const pad = (n: number) => n.toString().padStart(2, "0")
    if (hours > 0) return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    return `${pad(minutes)}:${pad(seconds)}`
  }

  const rows = useMemo(() => {
    return displayUsers.map(user => {
      const session = sessionsByUser[user.id]
      const running = session?.status === GNS3SessionStatus.Running
      const stopped = session?.status === GNS3SessionStatus.Stopped
      const isAdmin = user.role === UserRole.ADMIN
      const durationInfo = (session as Gns3SessionWithDuration | undefined)
      const totalDurationSeconds = (durationInfo?.duration ?? 0) + (durationInfo?.extendedDuration ?? 0)

      const isExpanded = expandedUserId === user.id

      const actionButtons = (
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{ width: "100%", justifyContent: "flex-start" }}
        >
          {running ? (
            <Button
              size="small"
              variant="outlined"
              color="warning"
              onClick={() => onStopSession(user)}
              disabled={!running || stopPendingUserId === user.id || isUsersFetching || isAdmin}
            >
              <StopIcon fontSize="small" />
            </Button>
          ) : (
            <Button
              size="small"
              variant="contained"
              onClick={() => onStartSession(user)}
              disabled={running || startPendingUserId === user.id || isUsersFetching || isAdmin}
            >
              <PlayArrowIcon fontSize="small" />
            </Button>
          )}
          <Stack direction="row" spacing={0.5} alignItems="center">
            <IconButton
              size="small"
              onClick={(e) => {
                setMenuAnchor(e.currentTarget)
                setMenuUser(user)
              }}
              disabled={isAdmin}
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => setExpandedUserId(prev => (prev === user.id ? null : user.id))}
              sx={{ display: { xs: "none", md: "inline-flex" } }}
            >
              {isExpanded ? <KeyboardArrowUpIcon fontSize="small" /> : <KeyboardArrowDownIcon fontSize="small" />}
            </IconButton>
          </Stack>
        </Stack>
      )

      const statusKey: Gns3StatusKey = session?.errorMessage ? "ERROR" : session?.status ?? GNS3SessionStatus.Stopped
      const status = statusMap[statusKey]
      const showSessionDetails = session?.status === GNS3SessionStatus.Running || !!session?.errorMessage

      return {
        id: user.id,
        username: (
          <Stack spacing={0.5} sx={{ maxWidth: 130 }}>
            <Box sx={{ maxWidth: "100%", overflow: "auto", whiteSpace: "nowrap" }}>
              {user.username}
            </Box>
            <Box
              sx={{
                display: { xs: "flex", sm: "flex", md: "none" },
                alignItems: "center",
                gap: 0.75,
              }}
            >
              {actionButtons}
            </Box>
          </Stack>
        ),
        role: user.role,
        status: status ? <Chip size="small" color={status.color} label={status.label} /> : "-",
        port: showSessionDetails ? <Typography variant="body2" sx={{ textAlign: "left" }}>{session?.port ?? "-"}</Typography> : "-",
        sessionStart: showSessionDetails ? (() => {
          const parts = formatDateParts(session?.sessionStart)
          return (
            <Stack spacing={0.25} alignItems="flex-start" sx={{ py: 0.25 }}>
              <Typography variant="body2">{parts.date}</Typography>
              {parts.time && <Typography variant="body2">{parts.time}</Typography>}
            </Stack>
          )
        })() : "-",
        sessionEnd: showSessionDetails && stopped ? (() => {
          const parts = formatDateParts(session?.sessionEnd)
          return (
            <Stack spacing={0.25} alignItems="flex-start" sx={{ py: 0.25 }}>
              <Typography variant="body2">{parts.date}</Typography>
              {parts.time && <Typography variant="body2">{parts.time}</Typography>}
            </Stack>
          )
        })() : "-",
        duration: running
          ? formatCountdown(session?.sessionStart, totalDurationSeconds)
          : session?.status === GNS3SessionStatus.Stopped
            ? "00:00"
            : formatDuration(session?.sessionStart, session?.sessionEnd),
        actions: (
          <Box sx={{ ml: -1.25, pr: 0, display: { xs: "none", sm: "none", md: "block" } }}>
            {actionButtons}
          </Box>
        ),
      }
    })
  }, [displayUsers, expandedUserId, isUsersFetching, nowTs, sessionsByUser, startPendingUserId, statusMap, stopPendingUserId, onStartSession, onStopSession])

  const renderExpandedRow = (_row: any) => {
    const colByKey = Object.fromEntries(columns.map(c => [c.key, c]))

    if (historyQuery.isLoading) return <LinearProgress />
    if (historyErrorMessage) return <Typography variant="body2" color="error">{historyErrorMessage}</Typography>

    const sessions = historyQuery.data?.sessions ?? []
    if (sessions.length === 0) return <Typography variant="body2" color="text.secondary">{t(TranslationKey.GNS3_DATA_GRID_NO_DATA)}</Typography>

    return (
      <Box sx={{ width: "100%", overflowX: "auto" }}>
        <Table size="small" sx={{ tableLayout: "fixed", minWidth }}>
          <TableBody>
            {sessions.map((s, idx) => {
              const statusKey: Gns3StatusKey = s.errorMessage ? "ERROR" : s.status ?? "UNKNOWN"
              const status = statusMap?.[statusKey]
              const startParts = formatDateParts(s.sessionStart)
              const endParts = formatDateParts(s.sessionEnd)
              return (
                <TableRow key={`${s.userId}-${idx}-${s.sessionStart ?? idx}`}>
                  <TableCell sx={{ width: colByKey.username?.width }} />
                  <TableCell sx={{ width: colByKey.role?.width, display: colByKey.role?.hideOnMobile ? { xs: "none", md: "table-cell" } : undefined }} />
                  <TableCell sx={{ width: colByKey.status?.width, textAlign: "left" }}>
                    {status ? <Chip size="small" color={status.color} label={status.label} /> : "-"}
                  </TableCell>
                  <TableCell sx={{ width: colByKey.port?.width, textAlign: "left", display: colByKey.port?.hideOnMobile ? { xs: "none", md: "table-cell" } : undefined }}>{s.port ?? "-"}</TableCell>
                  <TableCell sx={{ width: colByKey.sessionStart?.width, display: colByKey.sessionStart?.hideOnMobile ? { xs: "none", md: "table-cell" } : undefined }}>
                    <Stack spacing={0.25} alignItems="flex-start" sx={{ py: 0.25 }}>
                      <Typography variant="body2" noWrap>{startParts.date}</Typography>
                      {startParts.time && <Typography variant="body2" noWrap>{startParts.time}</Typography>}
                    </Stack>
                  </TableCell>
                  <TableCell sx={{ width: colByKey.duration?.width, textAlign: "left" }}>{formatDuration(s.sessionStart, s.sessionEnd ?? nowTs)}</TableCell>
                  <TableCell sx={{ width: colByKey.sessionEnd?.width, display: colByKey.sessionEnd?.hideOnMobile ? { xs: "none", md: "table-cell" } : undefined }}>
                    {s.sessionEnd ? (
                      <Stack spacing={0.25} alignItems="flex-start" sx={{ py: 0.25 }}>
                        <Typography variant="body2" noWrap>{endParts.date}</Typography>
                        {endParts.time && <Typography variant="body2" noWrap>{endParts.time}</Typography>}
                      </Stack>
                    ) : (
                      <Typography variant="body2" align="left" noWrap>-</Typography>
                    )}
                  </TableCell>
                  <TableCell sx={{ width: colByKey.actions?.width, display: colByKey.actions?.hideOnMobile ? { xs: "none", md: "table-cell" } : undefined }} />
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Box>
    )
  }

  return (
    <>
      <DataGridWithSearch
        filter1={primaryFilter}
        filter2={filter2}
        searchValue={searchValue}
        setSearchValue={setSearchValue}
        descending={descending}
        setDescending={setDescending}
        columns={columns}
        rows={rows}
        expandedRowId={expandedUserId ?? null}
        renderExpandedRow={renderExpandedRow}
      />

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor) && Boolean(menuUser)}
        onClose={closeMenu}
      >
        <MenuItem
          onClick={() => {
            if (!menuUser) return
            onExtendSession(menuUser)
            closeMenu()
          }}
          disabled={!menuUser || sessionsByUser[menuUser.id]?.status !== GNS3SessionStatus.Running || gns3ExtensionMinutes <= 0 || extendPending} // only allow extending running sessions
        >
          {t(TranslationKey.GNS3_DATA_GRID_EXTEND)} +{gns3ExtensionMinutes}m
        </MenuItem>
        {menuUser && sessionsByUser[menuUser.id]?.errorMessage && (
          <MenuItem disabled>
            <Tooltip title={sessionsByUser[menuUser.id]?.errorMessage} placement="left" arrow>
              <Typography variant="body2" noWrap>{sessionsByUser[menuUser.id]?.errorMessage}</Typography>
            </Tooltip>
          </MenuItem>
        )}
      </Menu>
    </>
  )
}

export default Gns3DataGridWithSearch