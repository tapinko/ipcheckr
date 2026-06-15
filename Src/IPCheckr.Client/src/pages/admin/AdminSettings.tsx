import { useEffect, useMemo, useRef, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import {
  Alert, Box, Button, ButtonGroup, Card, CardContent, Checkbox, Collapse, Divider,
  FormControl, FormControlLabel, IconButton, InputLabel, MenuItem,
  Paper, Radio, RadioGroup, Select, Snackbar, Stack, Tab, Tabs, TextField, Tooltip, Typography,
} from "@mui/material"
import LanguageIcon from "@mui/icons-material/Language"
import Lock from "@mui/icons-material/Lock"
import PlayArrow from "@mui/icons-material/PlayArrow"
import Refresh from "@mui/icons-material/Refresh"
import Settings from "@mui/icons-material/Settings"
import Stop from "@mui/icons-material/Stop"
import SystemUpdateAlt from "@mui/icons-material/SystemUpdateAlt"
import Tune from "@mui/icons-material/Tune"
import ViewList from "@mui/icons-material/ViewList"
import { useTranslation } from "react-i18next"
import type { AppSettingDto, EditAppSettinReq, ApiProblemDetails, UpdaterVersionInfoRes, VersionEntry } from "../../dtos"
import { UpdaterApiAxiosParamCreator } from "../../dtos/api"
import { appSettingsApi, configuration, updaterApi, userApi } from "../../utils/apiClients"
import { useAuth } from "../../contexts/AuthContext"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import AdminSettingsSkeleton from "../../components/skeletons/AdminSettingsSkeleton"
import ErrorLoading from "../../components/ui/ErrorLoading"
import { CustomAlert, type CustomAlertState } from "../../components/ui/CustomAlert"
import CustomDialog from "../../components/ui/CustomDialog"
import i18n, { Language, TranslationKey } from "../../utils/i18n"
import type { AxiosError, AxiosResponse } from "axios"
import AuthType from "../../types/AuthType"
import RadioButtonChecked from "@mui/icons-material/RadioButtonChecked"
import RadioButtonUnchecked from "@mui/icons-material/RadioButtonUnchecked"
import getApiBase from "../../utils/getApiBase"
import Chip from "@mui/material/Chip"

type LogLevel = "Trace" | "Debug" | "Information" | "Warning" | "Error" | "Critical"
type StreamLogEntry = {
  timestampUtc: string
  category: string
  level: LogLevel | string
  eventId: number
  message: string
  exception?: string | null
}

type SettingsTab = "general" | "auth" | "logs"

const SettingField = ({ label, tooltip, children }: { label: string; tooltip?: string; children: React.ReactNode }) => (
  <Box>
    {tooltip ? (
      <Tooltip title={tooltip} arrow placement="top-start">
        <Typography variant="body2" color="text.secondary" gutterBottom sx={{ cursor: "help" }}>
          {label}
        </Typography>
      </Tooltip>
    ) : (
      <Typography variant="body2" color="text.secondary" gutterBottom>
        {label}
      </Typography>
    )}
    {children}
  </Box>
)

const SectionCard = ({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) => (
  <Card variant="outlined" sx={{ borderRadius: 1 }}>
    <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
      <Stack direction="row" spacing={1} alignItems="center" mb={2}>
        <Box sx={{ color: "text.secondary", display: "flex" }}>{icon}</Box>
        <Typography variant="subtitle1" fontWeight={700}>{title}</Typography>
      </Stack>
      <Stack spacing={2}>
        {children}
      </Stack>
    </CardContent>
  </Card>
)

const AdminSettings = () => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { userId } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const hashToTab = (hash: string): SettingsTab => {
    if (hash === "#authType") return "auth"
    if (hash === "#logs") return "logs"
    return "general"
  }

  const tabToHash = (tab: SettingsTab): string => {
    if (tab === "auth") return "#authType"
    if (tab === "logs") return "#logs"
    return "#general"
  }

  const activeTab = hashToTab(location.hash)

  useEffect(() => {
    if (!["#general", "#authType", "#logs"].includes(location.hash)) {
      navigate("#general", { replace: true })
    }
  }, [location.hash])

  const [language, setLanguage] = useState<Language | "">("")
  const [institutionName, setInstitutionName] = useState<string>("")
  const [authType, setAuthType] = useState<AuthType | "">("")

  const [originalLanguage, setOriginalLanguage] = useState<string | null>(null)
  const [originalInstitution, setOriginalInstitution] = useState<string | null>(null)
  const [originalAuth, setOriginalAuth] = useState<string | null>(null)

  const [alert, setAlert] = useState<CustomAlertState | null>(null)

  const [gns3Enabled, setGns3Enabled] = useState<boolean>(false)
  const [gns3DefaultMinutes, setGns3DefaultMinutes] = useState<string>("120")
  const [gns3ExtensionMinutes, setGns3ExtensionMinutes] = useState<string>("30")

  const [ldapEnabled, setLdapEnabled] = useState<boolean>(false)
  const [ldapHost, setLdapHost] = useState<string>("")
  const [ldapPort, setLdapPort] = useState<string>("")
  const [ldapAllowSelfSignUp, setLdapAllowSelfSignUp] = useState<boolean>(false)
  const [ldapUseSsl, setLdapUseSsl] = useState<boolean>(false)
  const [ldapStartTls, setLdapStartTls] = useState<boolean>(false)
  const [ldapDomain, setLdapDomain] = useState<string>("")
  const [ldapBindMode, setLdapBindMode] = useState<string>("")
  const [ldapUserDnTemplate, setLdapUserDnTemplate] = useState<string>("")
  const [ldapSearchBase, setLdapSearchBase] = useState<string>("")
  const [ldapUsernameAttr, setLdapUsernameAttr] = useState<string>("")
  const [ldapGroupAttr, setLdapGroupAttr] = useState<string>("")
  const [ldapStudentGroupDn, setLdapStudentGroupDn] = useState<string>("")
  const [ldapTeacherGroupDn, setLdapTeacherGroupDn] = useState<string>("")
  const [ldapTimeoutSec, setLdapTimeoutSec] = useState<string>("")
  const [ldapBindDn, setLdapBindDn] = useState<string>("")
  const [ldapBindPassword, setLdapBindPassword] = useState<string>("")

  // Log viewer state
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

  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [changePasswordAlert, setChangePasswordAlert] = useState<CustomAlertState | null>(null)

  type UpdateState = "idle" | "running" | "restarting" | "done" | "error"
  const [updateState, setUpdateState] = useState<UpdateState>("idle")
  const [updateLines, setUpdateLines] = useState<string[]>([])
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false)
  const [updateAdvancedOpen, setUpdateAdvancedOpen] = useState(false)
  const [updateTargetTag, setUpdateTargetTag] = useState("")
  const updateControllerRef = useRef<AbortController | null>(null)
  const updateContainerRef = useRef<HTMLDivElement | null>(null)

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
    return () => { controllerRef.current?.abort() }
  }, [])

  useEffect(() => {
    return () => { updateControllerRef.current?.abort() }
  }, [])

  useEffect(() => {
    if (updateContainerRef.current) {
      updateContainerRef.current.scrollTop = updateContainerRef.current.scrollHeight
    }
  }, [updateLines])

  useEffect(() => {
    if (updateState === "restarting") setAlert({ severity: "info", message: t(TranslationKey.ADMIN_SETTINGS_UPDATE_RESTARTING) })
    else if (updateState === "done") setAlert({ severity: "success", message: t(TranslationKey.ADMIN_SETTINGS_UPDATE_DONE) })
    else if (updateState === "error") setAlert({ severity: "error", message: t(TranslationKey.ADMIN_SETTINGS_UPDATE_ERROR) })
  }, [updateState])

  const startUpdate = async () => {
    updateControllerRef.current?.abort()
    setUpdateLines([])
    setUpdateState("running")

    const token = sessionStorage.getItem("token")
    const auth = token ? (token.startsWith("Bearer ") ? token : `Bearer ${token}`) : undefined
    const ctrl = new AbortController()
    updateControllerRef.current = ctrl

    const trimmedTag = updateTargetTag.trim()
    const reqArgs = await UpdaterApiAxiosParamCreator(configuration).updaterStreamUpdate()
    const streamUrl = new URL(reqArgs.url, configuration.basePath)
    if (trimmedTag) streamUrl.searchParams.set("tag", trimmedTag)

    try {
      const resp = await fetch(streamUrl.toString(), {
        method: "GET",
        headers: { ...(auth ? { Authorization: auth } : {}), Accept: "text/event-stream" },
        signal: ctrl.signal,
      })

      if (!resp.ok || !resp.body) {
        setUpdateState("error")
        setUpdateLines([`ERR HTTP ${resp.status} ${resp.statusText}`])
        return
      }

      const reader = resp.body.getReader()
      const decoder = new TextDecoder("utf-8")
      let buf = ""

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const parts = buf.split("\n\n")
        buf = parts.pop() ?? ""
        for (const block of parts) {
          for (const line of block.split("\n")) {
            if (!line.startsWith("data:")) continue
            const msg = line.slice(5).trimStart()
            if (!msg) continue
            setUpdateLines(prev => [...prev, msg])
            if (msg.startsWith("OK ")) setUpdateState("done")
            else if (msg.startsWith("ERR ")) setUpdateState("error")
          }
        }
      }

      // connection dropped without OK/ERR — container was killed (self-update restart)
      setUpdateState(prev => prev === "running" ? "restarting" : prev)
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") return
      // connection reset = container restarted
      setUpdateState(prev => prev === "running" ? "restarting" : prev)
    }
  }

  const getAuthHeader = (): string | undefined => {
    const raw = sessionStorage.getItem("token")
    if (!raw) return undefined
    return raw.startsWith("Bearer ") ? raw : `Bearer ${raw}`
  }

  const buildLogUrl = (): string => {
    const params = new URLSearchParams()
    if (minLevel) params.set("minLevel", minLevel)
    if (categoryStartsWith) params.set("categoryStartsWith", categoryStartsWith)
    if (contains) params.set("contains", contains)
    return `${getApiBase()}/api/dashboard/stream-logs?${params.toString()}`
  }

  const parseAndDispatch = (chunk: string) => {
    const buf = (bufferRef.current + chunk).replace(/\r\n/g, "\n")
    const parts = buf.split("\n\n")
    bufferRef.current = parts.pop() || ""
    for (const block of parts) {
      let eventType = "message"
      const dataLines: string[] = []
      for (const line of block.split("\n")) {
        if (!line || line.startsWith(":")) continue
        if (line.startsWith("event:")) eventType = line.slice(6).trim()
        else if (line.startsWith("data:")) dataLines.push(line.slice(5).trimStart())
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
            timestampUtc: new Date().toISOString(), category: "Stream", level: "Error",
            eventId: 0, message: `Stream error: ${payload?.Error || dataStr}`
          }])
        }
      } catch {
        setLogs(prev => [...prev, {
          timestampUtc: new Date().toISOString(), category: "Stream", level: "Information",
          eventId: 0, message: dataStr
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
      const resp = await fetch(buildLogUrl(), {
        method: "GET",
        headers: { ...(auth ? { Authorization: auth } : {}), Accept: "text/event-stream" },
        signal: ctrl.signal
      })
      if (!resp.ok || !resp.body) {
        setIsConnecting(false)
        setIsConnected(false)
        setLogs(prev => [...prev, {
          timestampUtc: new Date().toISOString(), category: "Stream", level: "Error",
          eventId: 0, message: `Failed to connect: ${resp.status} ${resp.statusText}`
        }])
        return
      }
      setActiveFilters({ minLevel: minLevel || "", categoryStartsWith, contains })
      setIsConnected(true)
      setIsConnecting(false)
      const reader = resp.body.getReader()
      const decoder = new TextDecoder("utf-8")
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        if (value) parseAndDispatch(decoder.decode(value, { stream: true }))
      }
    } catch (e: unknown) {
      if (!(e instanceof Error) || e.name !== "AbortError") {
        setLogs(prev => [...prev, {
          timestampUtc: new Date().toISOString(), category: "Stream", level: "Error",
          eventId: 0, message: `Stream exception: ${e instanceof Error ? e.message : String(e)}`
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

  const settingsQuery = useQuery({
    queryKey: ["appsettings"],
    queryFn: () => appSettingsApi.appSettingsQueryAppSettings(),
  })

  const versionQuery = useQuery<UpdaterVersionInfoRes>({
    queryKey: ["updater-version-info"],
    queryFn: () => updaterApi.updaterGetVersionInfo().then(r => r.data),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  const languageSetting = useMemo(() => {
    const list: AppSettingDto[] = settingsQuery.data?.data?.appSettings ?? []
    return list.find(s => s.name?.toLowerCase().includes("lang") || s.name?.toLowerCase().includes("language")) ?? null
  }, [settingsQuery.data])

  const institutionSetting = useMemo(() => {
    const list: AppSettingDto[] = settingsQuery.data?.data?.appSettings ?? []
    return list.find(s =>
      s.name?.toLowerCase().includes("institution") ||
      s.name?.toLowerCase().includes("school") ||
      s.name?.toLowerCase().includes("institutionname")
    ) ?? null
  }, [settingsQuery.data])

  const authSetting = useMemo(() => {
    const list: AppSettingDto[] = settingsQuery.data?.data?.appSettings ?? []
    return list.find(s =>
      s.name?.toLowerCase().includes("auth") ||
      s.name?.toLowerCase().includes("authentication") ||
      s.name?.toLowerCase().includes("authtype")
    ) ?? null
  }, [settingsQuery.data])

  const findSettingByName = (name: string) => {
    const list: AppSettingDto[] = settingsQuery.data?.data?.appSettings ?? []
    return list.find(s => s.name === name) ?? null
  }
  const gns3Setting = useMemo(() => findSettingByName("Gns3_Enabled"), [settingsQuery.data])
  const gns3DefaultSetting = useMemo(() => findSettingByName("Gns3_DefaultSessionMinutes"), [settingsQuery.data])
  const gns3ExtensionSetting = useMemo(() => findSettingByName("Gns3_ExtendedMinutes"), [settingsQuery.data])

  const ldapSettings = useMemo(() => ({
    enabled: findSettingByName("Ldap_Enabled"),
    host: findSettingByName("Ldap_Host"),
    port: findSettingByName("Ldap_Port"),
    allowSelfSignUp: findSettingByName("Ldap_AllowSelfSignUp"),
    useSsl: findSettingByName("Ldap_UseSsl"),
    startTls: findSettingByName("Ldap_StartTls"),
    domain: findSettingByName("Ldap_Domain"),
    bindMode: findSettingByName("Ldap_BindMode"),
    userDnTemplate: findSettingByName("Ldap_UserDnTemplate"),
    searchBase: findSettingByName("Ldap_SearchBase"),
    usernameAttr: findSettingByName("Ldap_UsernameAttribute"),
    groupAttr: findSettingByName("Ldap_GroupMembershipAttribute"),
    studentGroupDn: findSettingByName("Ldap_StudentGroupDn"),
    teacherGroupDn: findSettingByName("Ldap_TeacherGroupDn"),
    timeoutSec: findSettingByName("Ldap_ConnectTimeoutSeconds"),
    bindDn: findSettingByName("Ldap_BindDn"),
    bindPassword: findSettingByName("Ldap_BindPassword"),
  }), [settingsQuery.data])

  useEffect(() => {
    if (languageSetting) {
      const v = (languageSetting.value ?? "").toUpperCase()
      setLanguage(v === Language.SK ? Language.SK : Language.EN)
      setOriginalLanguage(languageSetting.value ?? "")
    } else {
      setLanguage(i18n.language as Language)
      setOriginalLanguage(null)
    }
    if (institutionSetting) {
      setInstitutionName(institutionSetting.value ?? "")
      setOriginalInstitution(institutionSetting.value ?? "")
    } else {
      setInstitutionName("")
      setOriginalInstitution(null)
    }
    if (authSetting) {
      const v = (authSetting.value ?? "").toUpperCase()
      setAuthType(v === "LDAP" ? AuthType.LDAP : AuthType.LOCAL)
      setOriginalAuth(authSetting.value ?? "")
    } else {
      setAuthType(AuthType.LOCAL)
      setOriginalAuth(null)
    }

    const bool = (v?: string | null, fallback = false) => {
      const x = (v ?? "").trim().toLowerCase()
      return x === "true" ? true : x === "false" ? false : fallback
    }
    const numStr = (v?: string | null, fallback = "") => {
      const s = (v ?? "").trim()
      return s.length ? s : fallback
    }

    if (gns3Setting) setGns3Enabled(bool(gns3Setting.value, false)); else setGns3Enabled(false)
    if (gns3DefaultSetting) setGns3DefaultMinutes(numStr(gns3DefaultSetting.value, "120")); else setGns3DefaultMinutes("120")
    if (gns3ExtensionSetting) setGns3ExtensionMinutes(numStr(gns3ExtensionSetting.value, "30")); else setGns3ExtensionMinutes("30")

    if (ldapSettings.enabled) setLdapEnabled(bool(ldapSettings.enabled.value, false)); else setLdapEnabled(false)
    if (ldapSettings.host) setLdapHost(ldapSettings.host.value ?? ""); else setLdapHost("")
    if (ldapSettings.port) setLdapPort(numStr(ldapSettings.port.value, "636")); else setLdapPort("636")
    if (ldapSettings.allowSelfSignUp) setLdapAllowSelfSignUp(bool(ldapSettings.allowSelfSignUp.value, false)); else setLdapAllowSelfSignUp(false)
    if (ldapSettings.useSsl) setLdapUseSsl(bool(ldapSettings.useSsl.value, false)); else setLdapUseSsl(true)
    if (ldapSettings.startTls) setLdapStartTls(bool(ldapSettings.startTls.value, false)); else setLdapStartTls(false)
    if (ldapSettings.domain) setLdapDomain(ldapSettings.domain.value ?? ""); else setLdapDomain("")
    if (ldapSettings.bindMode) setLdapBindMode(ldapSettings.bindMode.value ?? "UpnOrDomain"); else setLdapBindMode("UpnOrDomain")
    if (ldapSettings.userDnTemplate) setLdapUserDnTemplate(ldapSettings.userDnTemplate.value ?? ""); else setLdapUserDnTemplate("")
    if (ldapSettings.searchBase) setLdapSearchBase(ldapSettings.searchBase.value ?? ""); else setLdapSearchBase("")
    if (ldapSettings.usernameAttr) setLdapUsernameAttr(ldapSettings.usernameAttr.value ?? "sAMAccountName"); else setLdapUsernameAttr("sAMAccountName")
    if (ldapSettings.groupAttr) setLdapGroupAttr(ldapSettings.groupAttr.value ?? "memberOf"); else setLdapGroupAttr("memberOf")
    if (ldapSettings.studentGroupDn) setLdapStudentGroupDn(ldapSettings.studentGroupDn.value ?? ""); else setLdapStudentGroupDn("")
    if (ldapSettings.teacherGroupDn) setLdapTeacherGroupDn(ldapSettings.teacherGroupDn.value ?? ""); else setLdapTeacherGroupDn("")
    if (ldapSettings.timeoutSec) setLdapTimeoutSec(numStr(ldapSettings.timeoutSec.value, "10")); else setLdapTimeoutSec("10")
    if (ldapSettings.bindDn) setLdapBindDn(ldapSettings.bindDn.value ?? ""); else setLdapBindDn("")
    setLdapBindPassword("")
  }, [languageSetting, institutionSetting, authSetting, gns3Setting, gns3DefaultSetting, gns3ExtensionSetting, ldapSettings])

  const editMutation = useMutation<
    AxiosResponse<void>,
    AxiosError<ApiProblemDetails>,
    EditAppSettinReq
  >({
    mutationFn: (req) => appSettingsApi.appSettingsEditAppSetting(req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appsettings"] })
    }
  })

  const changedFields = useMemo(() => {
    const list: EditAppSettinReq[] = []
    if (languageSetting && (languageSetting.value ?? "") !== (language ?? "")) {
      list.push({ id: languageSetting.id, name: languageSetting.name, value: language ?? "" })
    }
    if (institutionSetting && (institutionSetting.value ?? "") !== institutionName) {
      list.push({ id: institutionSetting.id, name: institutionSetting.name, value: institutionName })
    }
    if (authSetting && ((authSetting.value ?? "").toUpperCase() !== (authType ?? "").toUpperCase())) {
      list.push({ id: authSetting.id, name: authSetting.name, value: authType ?? "" })
    }

    const pushIfChanged = (setting: AppSettingDto | null, current: string | boolean) => {
      if (!setting) return
      const original = (setting.value ?? "").trim()
      const currentStr = typeof current === "boolean" ? (current ? "true" : "false") : (current ?? "")
      if (original !== currentStr) {
        list.push({ id: setting.id, name: setting.name, value: currentStr })
      }
    }
    pushIfChanged(gns3Setting, gns3Enabled)
    pushIfChanged(gns3DefaultSetting, gns3DefaultMinutes)
    pushIfChanged(gns3ExtensionSetting, gns3ExtensionMinutes)
    pushIfChanged(ldapSettings.enabled, ldapEnabled)
    pushIfChanged(ldapSettings.host, ldapHost)
    pushIfChanged(ldapSettings.port, ldapPort)
    pushIfChanged(ldapSettings.allowSelfSignUp, ldapAllowSelfSignUp)
    pushIfChanged(ldapSettings.useSsl, ldapUseSsl)
    pushIfChanged(ldapSettings.startTls, ldapStartTls)
    pushIfChanged(ldapSettings.domain, ldapDomain)
    pushIfChanged(ldapSettings.bindMode, ldapBindMode)
    pushIfChanged(ldapSettings.userDnTemplate, ldapUserDnTemplate)
    pushIfChanged(ldapSettings.searchBase, ldapSearchBase)
    pushIfChanged(ldapSettings.usernameAttr, ldapUsernameAttr)
    pushIfChanged(ldapSettings.groupAttr, ldapGroupAttr)
    pushIfChanged(ldapSettings.studentGroupDn, ldapStudentGroupDn)
    pushIfChanged(ldapSettings.teacherGroupDn, ldapTeacherGroupDn)
    pushIfChanged(ldapSettings.timeoutSec, ldapTimeoutSec)
    pushIfChanged(ldapSettings.bindDn, ldapBindDn)
    if (ldapSettings.bindPassword && (ldapBindPassword ?? "").trim().length > 0) {
      list.push({ id: ldapSettings.bindPassword.id, name: ldapSettings.bindPassword.name, value: ldapBindPassword })
    }
    return list
  }, [language, institutionName, languageSetting, institutionSetting, authType, authSetting,
    gns3Enabled, gns3Setting, gns3DefaultMinutes, gns3ExtensionMinutes, ldapEnabled, ldapHost, ldapPort,
    ldapAllowSelfSignUp, ldapUseSsl, ldapStartTls, ldapDomain, ldapBindMode, ldapUserDnTemplate,
    ldapSearchBase, ldapUsernameAttr, ldapGroupAttr, ldapStudentGroupDn, ldapTeacherGroupDn,
    ldapTimeoutSec, ldapSettings, ldapBindDn, ldapBindPassword])

  const hasChanges = changedFields.length > 0
  const saveDisabled = !hasChanges || editMutation.isPending

  const handleSave = async () => {
    if (changedFields.length === 0) return
    try {
      for (const req of changedFields) {
        await editMutation.mutateAsync(req)
      }
      setAlert({ severity: "success", message: t(TranslationKey.ADMIN_SETTINGS_SUCCESS) })
      setOriginalLanguage(languageSetting ? (language ?? "") : originalLanguage)
      setOriginalInstitution(institutionSetting ? institutionName : originalInstitution)
      setOriginalAuth(authSetting ? (authType ?? "") : originalAuth)
    } catch (err) {
      const apiErr = err as AxiosError<ApiProblemDetails>
      const details = apiErr.response?.data
      const localMessage = i18n.language === Language.EN ? details?.messageEn : details?.messageSk
      setAlert({ severity: "error", message: t(TranslationKey.ADMIN_SETTINGS_ERROR, { value: localMessage }) })
    }
  }

  const handleReset = () => {
    if (originalLanguage !== null) setLanguage(originalLanguage.toUpperCase() === Language.SK ? Language.SK : Language.EN)
    if (originalInstitution !== null) setInstitutionName(originalInstitution)
    if (originalAuth !== null) {
      const resetAuth = (originalAuth ?? "").toUpperCase() === "LDAP" ? AuthType.LDAP : AuthType.LOCAL
      setAuthType(resetAuth)
      setLdapEnabled(resetAuth === AuthType.LDAP)
    }
  }

  const changePasswordMutation = useMutation({
    mutationFn: (newPassword: string) =>
      userApi.userEditUser({ id: userId!, password: newPassword }),
    onSuccess: () => {
      setChangePasswordAlert({ severity: "success", message: t(TranslationKey.ADMIN_SETTINGS_CHANGE_PASSWORD_SUCCESS) })
      setNewPassword("")
      setConfirmPassword("")
    },
    onError: (err: AxiosError<ApiProblemDetails>) => {
      const details = err.response?.data
      const localMessage = i18n.language === Language.EN ? details?.messageEn : details?.messageSk
      setChangePasswordAlert({ severity: "error", message: localMessage ?? t(TranslationKey.ADMIN_SETTINGS_CHANGE_PASSWORD_ERROR) })
    },
  })

  const handleChangePassword = () => {
    if (newPassword !== confirmPassword) {
      setChangePasswordAlert({ severity: "error", message: t(TranslationKey.ADMIN_SETTINGS_CHANGE_PASSWORD_MISMATCH) })
      return
    }
    changePasswordMutation.mutate(newPassword)
  }

  const logStatusText = isConnecting ? "Connecting…" : isConnected ? "Connected" : "Disconnected"

  if (settingsQuery.isLoading) return <AdminSettingsSkeleton />
  if (settingsQuery.isError) return <ErrorLoading onRetry={() => queryClient.invalidateQueries({ queryKey: ["appsettings"] })} />

  return (
    <Box display="flex" flexDirection="column" gap={3}>
      {alert && <CustomAlert severity={alert.severity} message={alert.message} onClose={() => setAlert(null)} />}
      <Snackbar
        open={hasChanges}
        autoHideDuration={null}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity="warning" variant="filled" sx={{ alignItems: "center", boxShadow: 3 }}>
          {t(TranslationKey.ADMIN_SETTINGS_UNSAVED_CHANGES)}
        </Alert>
      </Snackbar>

      <CustomDialog
        open={updateDialogOpen}
        onClose={() => setUpdateDialogOpen(false)}
        onConfirm={startUpdate}
        title={t(TranslationKey.ADMIN_SETTINGS_UPDATE)}
        question={t(TranslationKey.ADMIN_SETTINGS_UPDATE_CONFIRM)}
        color="warning"
        confirmLabel={t(TranslationKey.ADMIN_SETTINGS_UPDATE_BUTTON)}
      />

      <Card variant="outlined" sx={{ borderRadius: 1 }}>
        <Stack direction="row" alignItems="center">
          <Tabs
            value={activeTab}
            onChange={(_, v) => navigate(tabToHash(v as SettingsTab), { replace: true })}
            sx={{ px: 1, flex: 1 }}
          >
            <Tab
              value="general"
              label={t(TranslationKey.ADMIN_SETTINGS_TAB_GENERAL)}
              icon={<Tune fontSize="small" />}
              iconPosition="start"
              sx={{ textTransform: "none", fontWeight: 600, minHeight: 48 }}
            />
            <Tab
              value="auth"
              label={t(TranslationKey.ADMIN_SETTINGS_TAB_AUTH)}
              icon={<Lock fontSize="small" />}
              iconPosition="start"
              sx={{ textTransform: "none", fontWeight: 600, minHeight: 48 }}
            />
            <Tab
              value="logs"
              label={t(TranslationKey.ADMIN_SETTINGS_TAB_LOGS)}
              icon={<ViewList fontSize="small" />}
              iconPosition="start"
              sx={{ textTransform: "none", fontWeight: 600, minHeight: 48 }}
            />
          </Tabs>

          {(activeTab === "general" || activeTab === "auth") && hasChanges && (
            <Stack direction="row" spacing={1} sx={{ px: 2, flexShrink: 0 }}>
              <Button size="small" onClick={handleReset}>
                {t(TranslationKey.ADMIN_SETTINGS_RESET)}
              </Button>
              <Button size="small" variant="contained" color="success" onClick={handleSave} disabled={saveDisabled}>
                {t(TranslationKey.ADMIN_SETTINGS_SAVE)}
              </Button>
            </Stack>
          )}
        </Stack>
      </Card>

      {activeTab === "general" && (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2, alignItems: "start" }}>
          <Stack spacing={2}>
            <SectionCard icon={<LanguageIcon />} title={t(TranslationKey.ADMIN_SETTINGS_TAB_GENERAL)}>
              <SettingField label={t(TranslationKey.ADMIN_SETTINGS_LANGUAGE)}>
                <ButtonGroup size="small">
                  <Button
                    variant={language === Language.EN ? "contained" : "outlined"}
                    onClick={() => setLanguage(Language.EN)}
                    sx={{ px: 3, py: 1 }}
                  >
                    {t(TranslationKey.ADMIN_SETTINGS_EN)}
                  </Button>
                  <Button
                    variant={language === Language.SK ? "contained" : "outlined"}
                    onClick={() => setLanguage(Language.SK)}
                    sx={{ px: 3, py: 1 }}
                  >
                    {t(TranslationKey.ADMIN_SETTINGS_SK)}
                  </Button>
                </ButtonGroup>
              </SettingField>
              <SettingField
                label={t(TranslationKey.ADMIN_SETTINGS_INSTITUTION_NAME)}
                tooltip={t(TranslationKey.ADMIN_SETTINGS_INSTITUTION_NAME_TOOLTIP)}
              >
                <TextField
                  value={institutionName}
                  onChange={(e) => setInstitutionName(e.target.value)}
                  fullWidth
                  size="small"
                />
              </SettingField>
            </SectionCard>

            <SectionCard icon={<SystemUpdateAlt fontSize="small" />} title={t(TranslationKey.ADMIN_SETTINGS_UPDATE)}>
              <Box sx={{ mb: 2 }}>
                {versionQuery.isLoading && (
                  <Typography variant="body2" color="text.secondary">
                    {t(TranslationKey.ADMIN_SETTINGS_UPDATE_VERSION_LOADING)}
                  </Typography>
                )}
                {versionQuery.isError && (
                  <Typography variant="body2" color="error">
                    {t(TranslationKey.ADMIN_SETTINGS_UPDATE_VERSION_ERROR)}
                  </Typography>
                )}
                {versionQuery.data && (() => {
                  const isReal = (v: string | null | undefined) => !!v && v.startsWith("v")
                  const releaseHref = (v: string | null | undefined) => isReal(v) ? `${__GIT_REPO_URL__}/releases/tag/${v}` : undefined
                  const branchHref  = (b: string | null | undefined) => b ? `${__GIT_REPO_URL__}/tree/${b}` : undefined

                  const VersionChip = ({ entry }: { entry: VersionEntry | null | undefined }) => {
                    const href = branchHref(entry?.branch)
                    return entry?.branch ? (
                      <Chip
                        {...(href ? { component: "a", href, target: "_blank", rel: "noopener noreferrer", clickable: true } : {})}
                        label={entry.branch}
                        size="small"
                        variant="outlined"
                        icon={<span style={{ fontSize: "0.7rem", paddingLeft: 4 }}>⎇</span>}
                      />
                    ) : null
                  }

                  const VersionText = ({ entry }: { entry: VersionEntry | null | undefined }) => {
                    const v = entry?.version ?? null
                    const href = releaseHref(v)
                    return href ? (
                      <Typography
                        variant="body2"
                        fontFamily="monospace"
                        component="a"
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ color: "inherit", textDecorationColor: "currentColor" }}
                      >
                        {v}
                      </Typography>
                    ) : (
                      <Typography variant="body2" fontFamily="monospace">{v ?? "—"}</Typography>
                    )
                  }

                  return (
                    <Stack spacing={0.75}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="body2" color="text.secondary" sx={{ minWidth: 140 }}>
                          {t(TranslationKey.ADMIN_SETTINGS_UPDATE_CURRENT_VERSION)}
                        </Typography>
                        <VersionText entry={versionQuery.data.current} />
                        <VersionChip entry={versionQuery.data.current} />
                      </Stack>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="body2" color="text.secondary" sx={{ minWidth: 140 }}>
                          {t(TranslationKey.ADMIN_SETTINGS_UPDATE_LATEST_VERSION)}
                        </Typography>
                        <VersionText entry={versionQuery.data.latest} />
                        <VersionChip entry={versionQuery.data.latest} />
                        {versionQuery.data.updateAvailable ? (
                          <Chip label={t(TranslationKey.ADMIN_SETTINGS_UPDATE_AVAILABLE)} size="small" color="warning" />
                        ) : versionQuery.data.latest?.version ? (
                          <Chip label={t(TranslationKey.ADMIN_SETTINGS_UPDATE_UP_TO_DATE)} size="small" color="success" />
                        ) : null}
                      </Stack>
                    </Stack>
                  )
                })()}
              </Box>
              <Stack spacing={1} mb={updateLines.length > 0 || updateState !== "idle" ? 2 : 0}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Button
                    variant="contained"
                    color="warning"
                    startIcon={<SystemUpdateAlt />}
                    onClick={() => setUpdateDialogOpen(true)}
                    disabled={updateState === "running" || !versionQuery.data?.updaterEnabled || (!updateTargetTag.trim() && versionQuery.data?.updateAvailable === false)}
                  >
                    {t(TranslationKey.ADMIN_SETTINGS_UPDATE_BUTTON)}
                  </Button>
                  <Tooltip title="Advanced">
                    <IconButton
                      size="small"
                      onClick={() => setUpdateAdvancedOpen(prev => !prev)}
                      color={updateAdvancedOpen ? "primary" : "default"}
                    >
                      <Settings fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {!versionQuery.data?.updaterEnabled && versionQuery.data !== undefined && (
                    <Typography variant="body2" color="text.secondary">
                      {t(TranslationKey.ADMIN_SETTINGS_UPDATE_DISABLED)}
                    </Typography>
                  )}
                  {updateLines.length > 0 && (
                    <Button size="small" onClick={() => { setUpdateLines([]); setUpdateState("idle") }}>
                      {t(TranslationKey.ADMIN_SETTINGS_UPDATE_CLEAR)}
                    </Button>
                  )}
                </Stack>
                <Collapse in={updateAdvancedOpen}>
                  <TextField
                    size="small"
                    label={t(TranslationKey.ADMIN_SETTINGS_UPDATE_TAG)}
                    value={updateTargetTag}
                    onChange={e => setUpdateTargetTag(e.target.value)}
                    placeholder="v1.2.3"
                    sx={{ width: 220 }}
                  />
                </Collapse>
              </Stack>
              {updateLines.length > 0 && (
                <Paper variant="outlined" sx={{ p: 1, maxHeight: 280, overflow: "auto" }} ref={updateContainerRef}>
                  <Stack spacing={0}>
                    {updateLines.map((line, idx) => (
                      <Box
                        key={idx}
                        sx={{
                          fontFamily: "monospace",
                          fontSize: "0.75rem",
                          whiteSpace: "pre-wrap",
                          color: line.startsWith("ERR") ? "error.main" : line.startsWith("OK") ? "success.main" : "text.primary",
                        }}
                      >
                        {line}
                      </Box>
                    ))}
                  </Stack>
                </Paper>
              )}
            </SectionCard>
          </Stack>

          <Stack spacing={2}>
          <SectionCard icon={<Tune fontSize="small" />} title={t(TranslationKey.ADMIN_SETTINGS_GNS3)}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={gns3Enabled}
                  onChange={(e) => setGns3Enabled(e.target.checked)}
                  icon={<RadioButtonUnchecked />}
                  checkedIcon={<RadioButtonChecked />}
                />
              }
              label={t(TranslationKey.ADMIN_SETTINGS_GNS3_ENABLE)}
            />
            {gns3Enabled && (
              <>
                <SettingField label={t(TranslationKey.ADMIN_SETTINGS_GNS3_DEFAULT_DURATION_MIN)}>
                  <TextField
                    value={gns3DefaultMinutes}
                    onChange={(e) => setGns3DefaultMinutes(e.target.value.replace(/[^0-9]/g, ""))}
                    fullWidth
                    size="small"
                    placeholder="120"
                    inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
                  />
                </SettingField>
                <SettingField label={t(TranslationKey.ADMIN_SETTINGS_GNS3_EXTENSION_MIN)}>
                  <TextField
                    value={gns3ExtensionMinutes}
                    onChange={(e) => setGns3ExtensionMinutes(e.target.value.replace(/[^0-9]/g, ""))}
                    fullWidth
                    size="small"
                    placeholder="30"
                    inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
                  />
                </SettingField>
              </>
            )}
          </SectionCard>

            <SectionCard icon={<Lock fontSize="small" />} title={t(TranslationKey.ADMIN_SETTINGS_CHANGE_PASSWORD)}>
              {changePasswordAlert && (
                <CustomAlert
                  severity={changePasswordAlert.severity}
                  message={changePasswordAlert.message}
                  onClose={() => setChangePasswordAlert(null)}
                />
              )}
              <SettingField label={t(TranslationKey.ADMIN_SETTINGS_CHANGE_PASSWORD_NEW)}>
                <TextField
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  fullWidth
                  size="small"
                  autoComplete="new-password"
                />
              </SettingField>
              <SettingField label={t(TranslationKey.ADMIN_SETTINGS_CHANGE_PASSWORD_CONFIRM)}>
                <TextField
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  fullWidth
                  size="small"
                  autoComplete="new-password"
                  error={confirmPassword.length > 0 && newPassword !== confirmPassword}
                  helperText={confirmPassword.length > 0 && newPassword !== confirmPassword
                    ? t(TranslationKey.ADMIN_SETTINGS_CHANGE_PASSWORD_MISMATCH)
                    : undefined}
                />
              </SettingField>
              <Box>
                <Button
                  variant="contained"
                  onClick={handleChangePassword}
                  disabled={!newPassword || changePasswordMutation.isPending}
                >
                  {t(TranslationKey.ADMIN_SETTINGS_CHANGE_PASSWORD_SUBMIT)}
                </Button>
              </Box>
            </SectionCard>
          </Stack>
        </Box>
      )}

      {activeTab === "auth" && (
        <Stack spacing={2}>
          <SectionCard icon={<Lock fontSize="small" />} title={t(TranslationKey.ADMIN_SETTINGS_AUTH_TYPE)}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
              <RadioGroup
                row
                value={authType ?? ""}
                onChange={(e) => {
                  const v = e.target.value as AuthType
                  setAuthType(v)
                  setLdapEnabled(v === AuthType.LDAP)
                }}
              >
                <FormControlLabel value={AuthType.LOCAL} control={<Radio size="small" />} label={t(TranslationKey.ADMIN_SETTINGS_AUTH_TYPE_LOCAL)} />
                <FormControlLabel value={AuthType.LDAP} control={<Radio size="small" />} label={t(TranslationKey.ADMIN_SETTINGS_AUTH_TYPE_LDAP)} />
              </RadioGroup>
              {authType === AuthType.LDAP && (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={ldapAllowSelfSignUp}
                      onChange={(e) => setLdapAllowSelfSignUp(e.target.checked)}
                      icon={<RadioButtonUnchecked />}
                      checkedIcon={<RadioButtonChecked />}
                    />
                  }
                  label={t(TranslationKey.ADMIN_SETTINGS_AUTH_LDAP_ALLOW_SELF_SIGN_UP)}
                />
              )}
            </Stack>
          </SectionCard>

          {authType === AuthType.LDAP && (
            <Box
              sx={{
                columnCount: { xs: 1, md: 2 },
                columnGap: "16px",
                "& > *": { breakInside: "avoid", mb: 2 },
              }}
            >
              <SectionCard icon={<Lock fontSize="small" />} title={t(TranslationKey.ADMIN_SETTINGS_AUTH_LDAP)}>
                <SettingField label={t(TranslationKey.ADMIN_SETTINGS_AUTH_LDAP_HOST)}>
                  <TextField value={ldapHost} onChange={(e) => setLdapHost(e.target.value)} fullWidth size="small" />
                </SettingField>

                <SettingField label={t(TranslationKey.ADMIN_SETTINGS_AUTH_LDAP_PORT)}>
                  <TextField
                    value={ldapPort}
                    onChange={(e) => setLdapPort(e.target.value.replace(/[^0-9]/g, ""))}
                    fullWidth size="small"
                  />
                </SettingField>

                <Divider />

                <Stack direction="column" spacing={0}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={ldapUseSsl}
                        onChange={(e) => { setLdapUseSsl(e.target.checked); if (e.target.checked) setLdapStartTls(false) }}
                        icon={<RadioButtonUnchecked />}
                        checkedIcon={<RadioButtonChecked />}
                      />
                    }
                    label={t(TranslationKey.ADMIN_SETTINGS_AUTH_LDAP_USE_SSL)}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={ldapStartTls}
                        onChange={(e) => { setLdapStartTls(e.target.checked); if (e.target.checked) setLdapUseSsl(false) }}
                        icon={<RadioButtonUnchecked />}
                        checkedIcon={<RadioButtonChecked />}
                      />
                    }
                    label={t(TranslationKey.ADMIN_SETTINGS_AUTH_LDAP_USE_STARTTLS)}
                  />
                </Stack>
              </SectionCard>

              <SectionCard icon={<Lock fontSize="small" />} title={t(TranslationKey.ADMIN_SETTINGS_AUTH_LDAP_BIND_MODE)}>
                <RadioGroup
                  value={ldapBindMode}
                  onChange={(e) => setLdapBindMode(e.target.value)}
                >
                  <FormControlLabel value="UpnOrDomain" control={<Radio size="small" />} label={t(TranslationKey.ADMIN_SETTINGS_AUTH_LDAP_BIND_MODE_UPN_OR_DOMAIN)} />
                  <FormControlLabel value="DistinguishedNameTemplate" control={<Radio size="small" />} label={t(TranslationKey.ADMIN_SETTINGS_AUTH_LDAP_BIND_MODE_DISTINGUISHED_NAME_TEMPLATE)} />
                </RadioGroup>

                {ldapBindMode === "UpnOrDomain" ? (
                  <SettingField label={t(TranslationKey.ADMIN_SETTINGS_AUTH_LDAP_BIND_MODE_UPN_OR_DOMAIN_DESCRIPTION)}>
                    <TextField value={ldapDomain} onChange={(e) => setLdapDomain(e.target.value)} fullWidth size="small" />
                  </SettingField>
                ) : (
                  <SettingField label={t(TranslationKey.ADMIN_SETTINGS_AUTH_LDAP_BIND_MODE_DISTINGUISHED_NAME_TEMPLATE_DESCRIPTION)}>
                    <TextField value={ldapUserDnTemplate} onChange={(e) => setLdapUserDnTemplate(e.target.value)} fullWidth size="small" />
                  </SettingField>
                )}
              </SectionCard>

              <SectionCard icon={<Lock fontSize="small" />} title="Directory">
                <SettingField label={t(TranslationKey.ADMIN_SETTINGS_AUTH_LDAP_SEARCH_BASE)}>
                  <TextField value={ldapSearchBase} onChange={(e) => setLdapSearchBase(e.target.value)} fullWidth size="small" />
                </SettingField>
                <SettingField label={t(TranslationKey.ADMIN_SETTINGS_AUTH_LDAP_USERNAME_ATTR)}>
                  <TextField value={ldapUsernameAttr} onChange={(e) => setLdapUsernameAttr(e.target.value)} fullWidth size="small" />
                </SettingField>
                <SettingField label={t(TranslationKey.ADMIN_SETTINGS_AUTH_LDAP_GROUP_ATTR)}>
                  <TextField value={ldapGroupAttr} onChange={(e) => setLdapGroupAttr(e.target.value)} fullWidth size="small" />
                </SettingField>
              </SectionCard>

              <SectionCard icon={<Lock fontSize="small" />} title={t(TranslationKey.ADMIN_SETTINGS_AUTH_LDAP_ROLE_MAPPING)}>
                <SettingField label={t(TranslationKey.ADMIN_SETTINGS_AUTH_LDAP_TEACHER_GROUP_DN)}>
                  <TextField value={ldapTeacherGroupDn} onChange={(e) => setLdapTeacherGroupDn(e.target.value)} fullWidth size="small" />
                </SettingField>
                <SettingField label={t(TranslationKey.ADMIN_SETTINGS_AUTH_LDAP_STUDENT_GROUP_DN)}>
                  <TextField value={ldapStudentGroupDn} onChange={(e) => setLdapStudentGroupDn(e.target.value)} fullWidth size="small" />
                </SettingField>
              </SectionCard>

              <SectionCard icon={<Lock fontSize="small" />} title={t(TranslationKey.ADMIN_SETTINGS_AUTH_LDAP_SERVICE_ACCOUNT)}>
                <SettingField label={t(TranslationKey.ADMIN_SETTINGS_AUTH_LDAP_BIND_DN)}>
                  <TextField value={ldapBindDn} onChange={(e) => setLdapBindDn(e.target.value)} fullWidth size="small" />
                </SettingField>
                <SettingField label={t(TranslationKey.ADMIN_SETTINGS_AUTH_LDAP_BIND_PASSWORD)}>
                  <TextField
                    value={ldapBindPassword}
                    onChange={(e) => setLdapBindPassword(e.target.value)}
                    type="password"
                    fullWidth
                    size="small"
                    placeholder={t(TranslationKey.ADMIN_SETTINGS_AUTH_LDAP_BIND_PASSWORD_PLACEHOLDER)}
                  />
                </SettingField>
                <SettingField label={t(TranslationKey.ADMIN_SETTINGS_AUTH_LDAP_CONNECT_TIMEOUT)}>
                  <TextField
                    value={ldapTimeoutSec}
                    onChange={(e) => setLdapTimeoutSec(e.target.value.replace(/[^0-9]/g, ""))}
                    fullWidth size="small"
                  />
                </SettingField>
              </SectionCard>
            </Box>
          )}
        </Stack>
      )}

      {activeTab === "logs" && (
        <Card variant="outlined" sx={{ borderRadius: 1 }}>
          <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
            <Stack direction="row" spacing={2} alignItems="flex-end" flexWrap="wrap" useFlexGap>
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel id="log-min-level-label">{t(TranslationKey.ADMIN_SETTINGS_LOGS_MIN_LEVEL)}</InputLabel>
                <Select
                  labelId="log-min-level-label"
                  value={minLevel || "All"}
                  label={t(TranslationKey.ADMIN_SETTINGS_LOGS_MIN_LEVEL)}
                  onChange={e => setMinLevel(e.target.value === "All" ? "" : (e.target.value as LogLevel))}
                >
                  <MenuItem value="All">{t(TranslationKey.ADMIN_SETTINGS_LOGS_ALL)}</MenuItem>
                  <MenuItem value="Trace">{t(TranslationKey.ADMIN_SETTINGS_LOGS_TRACE)}</MenuItem>
                  <MenuItem value="Debug">{t(TranslationKey.ADMIN_SETTINGS_LOGS_DEBUG)}</MenuItem>
                  <MenuItem value="Information">{t(TranslationKey.ADMIN_SETTINGS_LOGS_INFORMATION)}</MenuItem>
                  <MenuItem value="Warning">{t(TranslationKey.ADMIN_SETTINGS_LOGS_WARNING)}</MenuItem>
                  <MenuItem value="Error">{t(TranslationKey.ADMIN_SETTINGS_LOGS_ERROR)}</MenuItem>
                  <MenuItem value="Critical">{t(TranslationKey.ADMIN_SETTINGS_LOGS_CRITICAL)}</MenuItem>
                </Select>
              </FormControl>

              <TextField
                size="small"
                label={t(TranslationKey.ADMIN_SETTINGS_LOGS_CATEGORY_STARTS_WITH)}
                value={categoryStartsWith}
                onChange={e => setCategoryStartsWith(e.target.value)}
              />
              <TextField
                size="small"
                label={t(TranslationKey.ADMIN_SETTINGS_LOGS_SEARCH)}
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
                {t(TranslationKey.ADMIN_SETTINGS_LOGS_RECONNECT)}
              </Button>
              <Button
                variant="contained"
                color="primary"
                startIcon={<PlayArrow />}
                onClick={() => connect(false)}
                disabled={isConnected || isConnecting}
              >
                {t(TranslationKey.ADMIN_SETTINGS_LOGS_CONNECT)}
              </Button>
              <Button
                variant="outlined"
                color="inherit"
                startIcon={<Stop />}
                onClick={disconnect}
                disabled={!isConnected && !isConnecting}
              >
                {t(TranslationKey.ADMIN_SETTINGS_LOGS_DISCONNECT)}
              </Button>
            </Stack>

            <Box sx={{ mt: 2, mb: 1, display: "flex", gap: 2, alignItems: "center" }}>
              <Typography variant="body2">
                {t(TranslationKey.ADMIN_SETTINGS_LOGS_STATUS)} {logStatusText}
              </Typography>
              <Button size="small" onClick={() => setAutoScroll(v => !v)}>
                {autoScroll
                  ? t(TranslationKey.ADMIN_SETTINGS_LOGS_DISABLE_AUTO_SCROLL)
                  : t(TranslationKey.ADMIN_SETTINGS_LOGS_ENABLE_AUTO_SCROLL)}
              </Button>
              <Button size="small" onClick={() => setLogs([])}>{t(TranslationKey.ADMIN_SETTINGS_LOGS_CLEAR)}</Button>
            </Box>

            <Paper variant="outlined" sx={{ p: 1, maxHeight: 420, overflow: "auto" }} ref={logContainerRef}>
              {logs.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  {t(TranslationKey.ADMIN_SETTINGS_LOGS_NO_LOGS)}
                </Typography>
              ) : (
                <Stack spacing={0.5}>
                  {logs.map((l, idx) => (
                    <Box key={idx} sx={{ fontFamily: "monospace", fontSize: "0.8rem", whiteSpace: "pre-wrap" }}>
                      [{new Date(l.timestampUtc).toLocaleTimeString()}] {l.level} {l.category} ({l.eventId}): {l.message}
                      {l.exception ? `\n${l.exception}` : ""}
                    </Box>
                  ))}
                </Stack>
              )}
            </Paper>
          </CardContent>
        </Card>
      )}

    </Box>
  )
}

export default AdminSettings