import { useEffect, useMemo, useRef, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import {
  Alert, Box, Button, ButtonGroup, Card, CardContent, Checkbox, Divider,
  FormControl, FormControlLabel, InputLabel, MenuItem,
  Paper, Radio, RadioGroup, Select, Snackbar, Stack, Tab, Tabs, TextField, Tooltip, Typography,
} from "@mui/material"
import {
  Language as LanguageIcon, Lock, PlayArrow, Refresh, Stop,
  Tune, ViewList,
} from "@mui/icons-material"
import { useTranslation } from "react-i18next"
import type { AppSettingDto, EditAppSettinReq, ApiProblemDetails } from "../../dtos"
import { appSettingsApi } from "../../utils/apiClients"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import AdminSettingsSkeleton from "../../components/skeletons/AdminSettingsSkeleton"
import ErrorLoading from "../../components/ui/ErrorLoading"
import { CustomAlert, type CustomAlertState } from "../../components/ui/CustomAlert"
import i18n, { Language, TranslationKey } from "../../utils/i18n"
import type { AxiosError, AxiosResponse } from "axios"
import AuthType from "../../types/AuthType"
import { RadioButtonChecked, RadioButtonUnchecked } from "@mui/icons-material"
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
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        setLogs(prev => [...prev, {
          timestampUtc: new Date().toISOString(), category: "Stream", level: "Error",
          eventId: 0, message: `Stream exception: ${e?.message || String(e)}`
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
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
            gap: 2,
            alignItems: "start",
          }}
        >
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