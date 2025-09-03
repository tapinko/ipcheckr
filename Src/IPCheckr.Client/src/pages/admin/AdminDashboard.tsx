import {
  Box,
  Chip,
  Divider,
  Grid,
  Stack,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper
} from "@mui/material"
import { TranslationKey } from "../../utils/i18n"
import { useTranslation } from "react-i18next"
import TableSkeleton from "../../components/TableSkeleton"
import CardsSkeleton from "../../components/CardsSkeleton"
import ErrorLoading from "../../components/ErrorLoading"
import StatsCard from "../../components/StatsCard"
import { AccessTime, Class, Groups, Quiz, School, TaskAlt } from "@mui/icons-material"
import { PlayArrow, Stop, Refresh } from "@mui/icons-material"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { dashboardApi } from "../../utils/apiClients"
import type { QueryAdminDashboardRes } from "../../dtos"
import { useEffect, useMemo, useRef, useState } from "react"
import getApiBase from "../../utils/getApiBase"

type LogLevel = "Trace" | "Debug" | "Information" | "Warning" | "Error" | "Critical"
type StreamLogEntry = {
  timestampUtc: string
  category: string
  level: LogLevel | string
  eventId: number
  message: string
  exception?: string | null
}

const AdminDashboard = () => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const dashboardQuery = useQuery<QueryAdminDashboardRes, Error>({
    queryKey: ["adminDashboard"],
    queryFn: () => dashboardApi.dashboardQueryAdminDashboard().then(r => r.data),
    placeholderData: prev => prev
  })

  const [minLevel, setMinLevel] = useState<LogLevel | "">("")
  const [categoryStartsWith, setCategoryStartsWith] = useState("")
  const [contains, setContains] = useState("")
  const [activeFilters, setActiveFilters] = useState<{ minLevel: string; categoryStartsWith: string; contains: string } | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [logs, setLogs] = useState<StreamLogEntry[]>([])
  const [autoScroll, setAutoScroll] = useState(true)

  const controllerRef = useRef<AbortController | null>(null)
  const bufferRef = useRef<string>("")
  const logContainerRef = useRef<HTMLDivElement | null>(null)

  const filtersDirty = useMemo(() => {
    if (!activeFilters) return true
    return (
      (minLevel || "") !== (activeFilters.minLevel || "") ||
      categoryStartsWith !== (activeFilters.categoryStartsWith || "") ||
      contains !== (activeFilters.contains || "")
    )
  }, [minLevel, categoryStartsWith, contains, activeFilters])

  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [logs, autoScroll])

  useEffect(() => {
    return () => {
      controllerRef.current?.abort()
    }
  }, [])

  const getAuthHeader = (): string | undefined => {
    const raw = sessionStorage.getItem("token")
    if (!raw) return undefined
    return raw.startsWith("Bearer ") ? raw : `Bearer ${raw}`
  }

  const buildUrl = (): string => {
    const params = new URLSearchParams()
    if (minLevel) params.set("minLevel", minLevel)
    if (categoryStartsWith) params.set("categoryStartsWith", categoryStartsWith)
    if (contains) params.set("contains", contains)
    return `${getApiBase()}/api/dashboard/stream-logs?${params.toString()}`
  }

  const parseAndDispatch: (chunk: string) => void = (chunk) => {
    const buf = (bufferRef.current + chunk).replace(/\r\n/g, "\n")
    const parts = buf.split("\n\n")
    bufferRef.current = parts.pop() || ""
    for (const block of parts) {
      let eventType = "message"
      const dataLines: string[] = []
      const lines = block.split("\n")
      for (const line of lines) {
        if (!line) continue
        if (line.startsWith(":")) continue
        if (line.startsWith("event:")) {
          eventType = line.slice(6).trim()
        } else if (line.startsWith("data:")) {
          dataLines.push(line.slice(5).trimStart())
        }
      }
      const dataStr = dataLines.join("\n")
      if (!dataStr) continue
      try {
        const payload = JSON.parse(dataStr)
        if (eventType === "log") {
          setLogs(prev => {
            const next = [...prev, payload as StreamLogEntry]
            return next.length > 500 ? next.slice(-500) : next
          })
        } else if (eventType === "error") {
          setLogs(prev => [...prev, {
            timestampUtc: new Date().toISOString(),
            category: "Stream",
            level: "Error",
            eventId: 0,
            message: `Stream error: ${payload?.Error || dataStr}`,
            exception: undefined
          }])
        }
      } catch {
        setLogs(prev => [...prev, {
          timestampUtc: new Date().toISOString(),
          category: "Stream",
          level: "Information",
          eventId: 0,
          message: dataStr,
          exception: undefined
        }])
      }
    }
  }

  const connect = async (force = false) => {
    if (!force && controllerRef.current && !controllerRef.current.signal.aborted) return
    const auth = getAuthHeader()
    setIsConnecting(true)
    setLogs([])
    bufferRef.current = ""
    const ctrl = new AbortController()
    controllerRef.current = ctrl
    try {
      const resp = await fetch(buildUrl(), {
        method: "GET",
        headers: {
          ...(auth ? { Authorization: auth } : {}),
          Accept: "text/event-stream"
        },
        signal: ctrl.signal
      })
      if (!resp.ok || !resp.body) {
        setIsConnecting(false)
        setIsConnected(false)
        setLogs(prev => [...prev, {
          timestampUtc: new Date().toISOString(),
          category: "Stream",
          level: "Error",
          eventId: 0,
          message: `Failed to connect: ${resp.status} ${resp.statusText}`,
          exception: undefined
        }])
        return
      }

      setActiveFilters({
        minLevel: minLevel || "",
        categoryStartsWith,
        contains
      })
      setIsConnected(true)
      setIsConnecting(false)

      const reader = resp.body.getReader()
      const decoder = new TextDecoder("utf-8")
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        if (value) parseAndDispatch(decoder.decode(value, { stream: true }))
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        setLogs(prev => [...prev, {
          timestampUtc: new Date().toISOString(),
          category: "Stream",
          level: "Error",
          eventId: 0,
          message: `Stream exception: ${e?.message || String(e)}`,
          exception: undefined
        }])
      }
    } finally {
      setIsConnected(false)
      setIsConnecting(false)
      controllerRef.current = null
    }
  }

  const disconnect = () => {
    controllerRef.current?.abort()
    controllerRef.current = null
    setIsConnected(false)
    setIsConnecting(false)
  }

  const reconnect = async () => {
    if (!filtersDirty && isConnected) return
    controllerRef.current?.abort()
    controllerRef.current = null
    setIsConnected(false)
    setIsConnecting(false)
    await new Promise(r => setTimeout(r, 10)) 
    connect(true)
  }

  return (
    <>
      <Box sx={{ display: "flex", alignItems: "center",mb: 2 }}>
        <Typography variant="h5">{t(TranslationKey.ADMIN_DASHBOARD_TITLE)}</Typography>
      </Box>

      <Divider sx={{ my: 2 }} />

      {dashboardQuery.isLoading ? (
        <>
          <TableSkeleton />
          <CardsSkeleton />
        </>
      ) : dashboardQuery.isError ? (
        <ErrorLoading
          onRetry={() =>
            queryClient.invalidateQueries({ queryKey: ["adminDashboard"] })
          }
        />
      ) : (<Stack spacing={2}>
        <Grid container spacing={2}>
          <Grid flex={1}>
            <Stack spacing={2}>
              <StatsCard
                title={t(TranslationKey.ADMIN_DASHBOARD_INSTITUTION_NAME)}
                value={dashboardQuery.data?.institutionName ?? "-"}
                icon={<School />}
              />
            </Stack>
          </Grid>
        </Grid>

        <Grid container spacing={2}>
          <Grid flex={1}>
            <Stack spacing={2}>
              <StatsCard
                title={t(TranslationKey.ADMIN_DASHBOARD_LAST_SUBMIT)}
                value={
                  dashboardQuery.data?.lastSubmitUsername ? (
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                      <span>{dashboardQuery.data.lastSubmitUsername}</span>
                      {dashboardQuery.data.lastSubmitAt && (
                        <Chip
                          size="small"
                          icon={<AccessTime />}
                          label={new Date(dashboardQuery.data.lastSubmitAt).toLocaleString()}
                          variant="outlined"
                        />
                      )}
                    </Stack>
                  ) : ("-")
                }
                icon={<AccessTime />}
              />
              <StatsCard
                title={t(TranslationKey.ADMIN_DASHBOARD_TOTAL_SUBMITS)}
                value={dashboardQuery.data?.totalSubmits}
                icon={<TaskAlt />}
              />
              <StatsCard
                title={t(TranslationKey.ADMIN_DASHBOARD_CLASSES)}
                value={dashboardQuery.data?.totalClasses}
                icon={<Class />}
              />
              <StatsCard
                title={t(TranslationKey.ADMIN_DASHBOARD_STUDENTS)}
                value={dashboardQuery.data?.totalStudents}
                icon={<Groups />}
              />
            </Stack>
          </Grid>

          <Grid flex={1}>
            <Stack spacing={2}>
              <StatsCard
                title={t(TranslationKey.ADMIN_DASHBOARD_TOTAL_ASSIGNMENT_GROUPS)}
                value={dashboardQuery.data?.totalAssignmentGroups}
                icon={<Quiz />}
              />
              <StatsCard
                title={t(TranslationKey.ADMIN_DASHBOARD_TOTAL_UPCOMING)}
                value={dashboardQuery.data?.totalUpcoming}
                icon={<AccessTime />}
                color="default"
              />
              <StatsCard
                title={t(TranslationKey.ADMIN_DASHBOARD_TOTAL_IN_PROGRESS)}
                value={dashboardQuery.data?.totalInProgress}
                icon={<AccessTime />}
                color="warning"
              />
              <StatsCard
                title={t(TranslationKey.ADMIN_DASHBOARD_TOTAL_ENDED)}
                value={dashboardQuery.data?.totalEnded}
                icon={<AccessTime />}
                color="success"
              />
            </Stack>
          </Grid>
        </Grid>

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack direction="row" spacing={2} alignItems="flex-end" flexWrap="wrap">
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel id="min-level-label">{t(TranslationKey.ADMIN_DASHBOARD_LOGS_MIN_LEVEL)}</InputLabel>
                <Select
                  labelId="min-level-label"
                  value={minLevel || "All"}
                  label={t(TranslationKey.ADMIN_DASHBOARD_LOGS_MIN_LEVEL)}
                  onChange={e => setMinLevel(e.target.value === "All" ? "" : (e.target.value as LogLevel))}
                >
                  <MenuItem value="All">{t(TranslationKey.ADMIN_DASHBOARD_LOGS_ALL)}</MenuItem>
                  <MenuItem value="Trace">{t(TranslationKey.ADMIN_DASHBOARD_LOGS_TRACE)}</MenuItem>
                  <MenuItem value="Debug">{t(TranslationKey.ADMIN_DASHBOARD_LOGS_DEBUG)}</MenuItem>
                  <MenuItem value="Information">{t(TranslationKey.ADMIN_DASHBOARD_LOGS_INFORMATION)}</MenuItem>
                  <MenuItem value="Warning">{t(TranslationKey.ADMIN_DASHBOARD_LOGS_WARNING)}</MenuItem>
                  <MenuItem value="Error">{t(TranslationKey.ADMIN_DASHBOARD_LOGS_ERROR)}</MenuItem>
                  <MenuItem value="Critical">{t(TranslationKey.ADMIN_DASHBOARD_LOGS_CRITICAL)}</MenuItem>
                </Select>
            </FormControl>

            <TextField
              size="small"
              label={t(TranslationKey.ADMIN_DASHBOARD_LOGS_CATEGORY_STARTS_WITH)}
              value={categoryStartsWith}
              onChange={e => setCategoryStartsWith(e.target.value)}
            />
            <TextField
              size="small"
              label={t(TranslationKey.ADMIN_DASHBOARD_LOGS_SEARCH)}
              value={contains}
              onChange={e => setContains(e.target.value)}
            />
            
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<Refresh />}
              onClick={reconnect}
              disabled={!filtersDirty}
            >
              {t(TranslationKey.ADMIN_DASHBOARD_LOGS_RECONNECT)}
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={<PlayArrow />}
              onClick={() => connect(false)}
              disabled={isConnected || isConnecting}
            >
              {t(TranslationKey.ADMIN_DASHBOARD_LOGS_CONNECT)}
            </Button>
            <Button
              variant="outlined"
              color="inherit"
              startIcon={<Stop />}
              onClick={disconnect}
              disabled={!isConnected && !isConnecting}
            >
              {t(TranslationKey.ADMIN_DASHBOARD_LOGS_DISCONNECT)}
            </Button>
          </Stack>

          <Box sx={{ mt: 2, mb: 1, display: "flex", gap: 2, alignItems: "center" }}>
            <Typography variant="body2">
              {t(TranslationKey.ADMIN_DASHBOARD_LOGS_STATUS)} {isConnecting ? "Connecting…" : isConnected ? "Connected" : "Disconnected"}
            </Typography>
            <Button size="small" onClick={() => setAutoScroll(v => !v)}>
              {autoScroll ? t(TranslationKey.ADMIN_DASHBOARD_LOGS_DISSABLE_AUTO_SCROLL) : t(TranslationKey.ADMIN_DASHBOARD_LOGS_ENABLE_AUTO_SCROLL)}
            </Button>
            <Button size="small" onClick={() => setLogs([])}>{t(TranslationKey.ADMIN_DASHBOARD_LOGS_CLEAR)}</Button>
          </Box>

          <Paper variant="outlined" sx={{ p: 1, maxHeight: 360, overflow: "auto" }} ref={logContainerRef}>
            {logs.length === 0 ? (
              <Typography variant="body2" color="text.secondary">{t(TranslationKey.ADMIN_DASHBOARD_LOGS_NO_LOGS)}</Typography>
            ) : (
              <Stack spacing={0.5}>
                {logs.map((l, idx) => (
                  <Box key={idx} sx={{ fontFamily: "monospace", whiteSpace: "pre-wrap" }}>
                    [{new Date(l.timestampUtc).toLocaleTimeString()}] {l.level} {l.category} ({l.eventId}): {l.message}
                    {l.exception ? `\n${l.exception}` : ""}
                  </Box>
                ))}
              </Stack>
            )}
          </Paper>
        </Paper>
      </Stack>)}
    </>
  )
}

export default AdminDashboard