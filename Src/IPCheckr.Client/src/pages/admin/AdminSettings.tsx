import { useEffect, useMemo, useState } from "react"
import { Box, Button, MenuItem, Select, TextField, Tooltip, Typography, FormControlLabel, Checkbox, Divider } from "@mui/material"
import { useTranslation } from "react-i18next"
import type { AppSettingDto, EditAppSettinReq, ApiProblemDetails } from "../../dtos"
import { appSettingsApi } from "../../utils/apiClients"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import TableSkeleton from "../../components/TableSkeleton"
import ErrorLoading from "../../components/ErrorLoading"
import { CustomAlert, type CustomAlertState } from "../../components/CustomAlert"
import i18n, { Language, TranslationKey } from "../../utils/i18n"
import type { AxiosError, AxiosResponse } from "axios"
import AuthType from "../../types/AuthType"

const AdminSettings = () => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const [language, setLanguage] = useState<Language | "">("")
  const [institutionName, setInstitutionName] = useState<string>("")
  const [authType, setAuthType] = useState<AuthType | "">("")

  const [originalLanguage, setOriginalLanguage] = useState<string | null>(null)
  const [originalInstitution, setOriginalInstitution] = useState<string | null>(null)
  const [originalAuth, setOriginalAuth] = useState<string | null>(null)

  const [alert, setAlert] = useState<CustomAlertState | null>(null)
  
  const [ldapEnabled, setLdapEnabled] = useState<boolean>(false)
  const [ldapHost, setLdapHost] = useState<string>("")
  const [ldapPort, setLdapPort] = useState<string>("389")
  const [ldapUseSsl, setLdapUseSsl] = useState<boolean>(false)
  const [ldapStartTls, setLdapStartTls] = useState<boolean>(false)
  const [ldapDomain, setLdapDomain] = useState<string>("")
  const [ldapBindMode, setLdapBindMode] = useState<string>("UpnOrDomain")
  const [ldapUserDnTemplate, setLdapUserDnTemplate] = useState<string>("")
  const [ldapSearchBase, setLdapSearchBase] = useState<string>("")
  const [ldapUsernameAttr, setLdapUsernameAttr] = useState<string>("sAMAccountName")
  const [ldapGroupAttr, setLdapGroupAttr] = useState<string>("memberOf")
  const [ldapStudentGroupDn, setLdapStudentGroupDn] = useState<string>("")
  const [ldapTeacherGroupDn, setLdapTeacherGroupDn] = useState<string>("")
  const [ldapValidateCert, setLdapValidateCert] = useState<boolean>(true)
  const [ldapTimeoutSec, setLdapTimeoutSec] = useState<string>("10")

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
  const ldapSettings = useMemo(() => ({
    enabled: findSettingByName("Ldap_Enabled"),
    host: findSettingByName("Ldap_Host"),
    port: findSettingByName("Ldap_Port"),
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
    validateCert: findSettingByName("Ldap_ValidateServerCertificate"),
    timeoutSec: findSettingByName("Ldap_ConnectTimeoutSeconds"),
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
    if (ldapSettings.enabled) setLdapEnabled(bool(ldapSettings.enabled.value, false)); else setLdapEnabled(false)
    if (ldapSettings.host) setLdapHost(ldapSettings.host.value ?? ""); else setLdapHost("")
    if (ldapSettings.port) setLdapPort(numStr(ldapSettings.port.value, "389")); else setLdapPort("389")
    if (ldapSettings.useSsl) setLdapUseSsl(bool(ldapSettings.useSsl.value, false)); else setLdapUseSsl(false)
    if (ldapSettings.startTls) setLdapStartTls(bool(ldapSettings.startTls.value, false)); else setLdapStartTls(false)
    if (ldapSettings.domain) setLdapDomain(ldapSettings.domain.value ?? ""); else setLdapDomain("")
    if (ldapSettings.bindMode) setLdapBindMode(ldapSettings.bindMode.value ?? "UpnOrDomain"); else setLdapBindMode("UpnOrDomain")
    if (ldapSettings.userDnTemplate) setLdapUserDnTemplate(ldapSettings.userDnTemplate.value ?? ""); else setLdapUserDnTemplate("")
    if (ldapSettings.searchBase) setLdapSearchBase(ldapSettings.searchBase.value ?? ""); else setLdapSearchBase("")
    if (ldapSettings.usernameAttr) setLdapUsernameAttr(ldapSettings.usernameAttr.value ?? "sAMAccountName"); else setLdapUsernameAttr("sAMAccountName")
    if (ldapSettings.groupAttr) setLdapGroupAttr(ldapSettings.groupAttr.value ?? "memberOf"); else setLdapGroupAttr("memberOf")
    if (ldapSettings.studentGroupDn) setLdapStudentGroupDn(ldapSettings.studentGroupDn.value ?? ""); else setLdapStudentGroupDn("")
    if (ldapSettings.teacherGroupDn) setLdapTeacherGroupDn(ldapSettings.teacherGroupDn.value ?? ""); else setLdapTeacherGroupDn("")
    if (ldapSettings.validateCert) setLdapValidateCert(bool(ldapSettings.validateCert.value, true)); else setLdapValidateCert(true)
    if (ldapSettings.timeoutSec) setLdapTimeoutSec(numStr(ldapSettings.timeoutSec.value, "10")); else setLdapTimeoutSec("10")
  }, [languageSetting, institutionSetting, authSetting, ldapSettings])

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

  const isLoading = settingsQuery.isLoading
  const isError = settingsQuery.isError

  const changedFields = useMemo(() => {
    const list: EditAppSettinReq[] = []
    if (languageSetting && (languageSetting.value ?? "") !== (language ?? "")) {
      list.push({
        id: languageSetting.id,
        name: languageSetting.name,
        value: language ?? ""
      })
    }
    if (institutionSetting && (institutionSetting.value ?? "") !== institutionName) {
      list.push({
        id: institutionSetting.id,
        name: institutionSetting.name,
        value: institutionName
      })
    }
    if (authSetting && ((authSetting.value ?? "").toUpperCase() !== (authType ?? "").toUpperCase())) {
      list.push({
        id: authSetting.id,
        name: authSetting.name,
        value: authType ?? ""
      })
    }

    const pushIfChanged = (setting: AppSettingDto | null, current: string | boolean) => {
      if (!setting) return
      const original = (setting.value ?? "").trim()
      const currentStr = typeof current === "boolean" ? (current ? "true" : "false") : (current ?? "")
      if (original !== currentStr) {
        list.push({ id: setting.id, name: setting.name, value: currentStr })
      }
    }
    pushIfChanged(ldapSettings.enabled, ldapEnabled)
    pushIfChanged(ldapSettings.host, ldapHost)
    pushIfChanged(ldapSettings.port, ldapPort)
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
    pushIfChanged(ldapSettings.validateCert, ldapValidateCert)
    pushIfChanged(ldapSettings.timeoutSec, ldapTimeoutSec)
    return list
  }, [language, institutionName, languageSetting, institutionSetting, authType, authSetting,
      ldapEnabled, ldapHost, ldapPort, ldapUseSsl, ldapStartTls, ldapDomain, ldapBindMode,
      ldapUserDnTemplate, ldapSearchBase, ldapUsernameAttr, ldapGroupAttr, ldapStudentGroupDn,
      ldapTeacherGroupDn, ldapValidateCert, ldapTimeoutSec, ldapSettings])

  const saveDisabled = changedFields.length === 0 || editMutation.isPending

  const handleSave = async () => {
    if (changedFields.length === 0) return
    try {
      for (const req of changedFields) {
        await editMutation.mutateAsync(req)
      }
      setAlert({
        severity: "success",
        message: t(TranslationKey.ADMIN_SETTINGS_SUCCESS)
      })
      setOriginalLanguage(languageSetting ? (language ?? "") : originalLanguage)
      setOriginalInstitution(institutionSetting ? institutionName : originalInstitution)
      setOriginalAuth(authSetting ? (authType ?? "") : originalAuth)
    } catch (err) {
      const apiErr = err as AxiosError<ApiProblemDetails>
      const details = apiErr.response?.data
      const localMessage = i18n.language === Language.EN ? details?.messageEn : details?.messageSk
      setAlert({
        severity: "error",
        message: t(TranslationKey.ADMIN_SETTINGS_ERROR, { value: localMessage })
      })
    }
  }

  if (isLoading) return <TableSkeleton />
  if (isError) return <ErrorLoading onRetry={() => queryClient.invalidateQueries({ queryKey: ["appsettings"] })} />

  return (
    <>
      <Box sx={{ maxWidth: "50vw", display: "flex", flexDirection: "column", gap: 2 }}>
        <Typography variant="h5">{t(TranslationKey.ADMIN_SETTINGS_TITLE)}</Typography>

        <Typography variant="body2">{t(TranslationKey.ADMIN_SETTINGS_LANGUAGE)}</Typography>
        <Select
          value={language ?? ""}
          onChange={(e) => setLanguage(e.target.value as Language)}
        >
          <MenuItem value={Language.EN}>{t(TranslationKey.ADMIN_SETTINGS_EN)}</MenuItem>
          <MenuItem value={Language.SK}>{t(TranslationKey.ADMIN_SETTINGS_SK)}</MenuItem>
        </Select>

        <Typography variant="body2">{t(TranslationKey.ADMIN_SETTINGS_INSTITUTION_NAME)}</Typography>
        <Tooltip title={t(TranslationKey.ADMIN_SETTINGS_INSTITUTION_NAME_TOOLTIP)} arrow>
          <TextField
            value={institutionName}
            onChange={(e) => setInstitutionName(e.target.value)}
            fullWidth
          />
        </Tooltip>

        <Typography variant="body2">{t(TranslationKey.ADMIN_SETTINGS_AUTH_TYPE)}</Typography>
        <Select
          value={authType ?? ""}
          onChange={(e) => {
            const v = e.target.value as AuthType
            setAuthType(v)
            setLdapEnabled(v === AuthType.LDAP)
          }}
          fullWidth
        >
          <MenuItem value={AuthType.LOCAL}>{t(TranslationKey.ADMIN_SETTINGS_AUTH_TYPE_LOCAL)}</MenuItem>
          <MenuItem value={AuthType.LDAP}>{t(TranslationKey.ADMIN_SETTINGS_AUTH_TYPE_LDAP)}</MenuItem>
        </Select>

        {authType === AuthType.LDAP && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
            <Divider textAlign="left">{t(TranslationKey.ADMIN_SETTINGS_AUTH_LDAP)}</Divider>
            

            <Typography variant="body2">{t(TranslationKey.ADMIN_SETTINGS_AUTH_LDAP_HOST)}</Typography>
            <TextField value={ldapHost} onChange={(e) => setLdapHost(e.target.value)} fullWidth />

            <Typography variant="body2">{t(TranslationKey.ADMIN_SETTINGS_AUTH_LDAP_PORT)}</Typography>
            <TextField value={ldapPort} onChange={(e) => setLdapPort(e.target.value.replace(/[^0-9]/g, ""))} fullWidth />

            <Box sx={{ display: "flex", gap: 3 }}>
              <FormControlLabel control={<Checkbox checked={ldapUseSsl} onChange={(e) => { setLdapUseSsl(e.target.checked); if (e.target.checked) setLdapStartTls(false) }} />} label={t(TranslationKey.ADMIN_SETTINGS_AUTH_LDAP_USE_SSL)} />
              <FormControlLabel control={<Checkbox checked={ldapStartTls} onChange={(e) => { setLdapStartTls(e.target.checked); if (e.target.checked) setLdapUseSsl(false) }} />} label={t(TranslationKey.ADMIN_SETTINGS_AUTH_LDAP_USE_STARTTLS)} />
              <FormControlLabel control={<Checkbox checked={ldapValidateCert} onChange={(e) => setLdapValidateCert(e.target.checked)} />} label={t(TranslationKey.ADMIN_SETTINGS_AUTH_LDAP_VALIDATE_CERT)} />
            </Box>

            <Divider textAlign="left">{t(TranslationKey.ADMIN_SETTINGS_AUTH_LDAP_BIND_MODE)}</Divider>
            <Typography variant="body2">{t(TranslationKey.ADMIN_SETTINGS_AUTH_LDAP_BIND_MODE)}</Typography>
            <Select value={ldapBindMode} onChange={(e) => setLdapBindMode(e.target.value)} fullWidth>
              <MenuItem value="UpnOrDomain">{t(TranslationKey.ADMIN_SETTINGS_AUTH_LDAP_BIND_MODE_UPN_OR_DOMAIN)}</MenuItem>
              <MenuItem value="DistinguishedNameTemplate">{t(TranslationKey.ADMIN_SETTINGS_AUTH_LDAP_BIND_MODE_DISTINGUISHED_NAME_TEMPLATE)}</MenuItem>
            </Select>

            {ldapBindMode === "UpnOrDomain" ? (
              <>
                <Typography variant="body2">{t(TranslationKey.ADMIN_SETTINGS_AUTH_LDAP_BIND_MODE_UPN_OR_DOMAIN_DESCRIPTION)}</Typography>
                <TextField value={ldapDomain} onChange={(e) => setLdapDomain(e.target.value)} fullWidth />
              </>
            ) : (
              <>
                <Typography variant="body2">{t(TranslationKey.ADMIN_SETTINGS_AUTH_LDAP_BIND_MODE_DISTINGUISHED_NAME_TEMPLATE_DESCRIPTION)}</Typography>
                <TextField value={ldapUserDnTemplate} onChange={(e) => setLdapUserDnTemplate(e.target.value)} fullWidth />
              </>
            )}

            <Typography variant="body2">{t(TranslationKey.ADMIN_SETTINGS_AUTH_LDAP_SEARCH_BASE)}</Typography>
            <TextField value={ldapSearchBase} onChange={(e) => setLdapSearchBase(e.target.value)} fullWidth />

            <Typography variant="body2">{t(TranslationKey.ADMIN_SETTINGS_AUTH_LDAP_USERNAME_ATTR)}</Typography>
            <TextField value={ldapUsernameAttr} onChange={(e) => setLdapUsernameAttr(e.target.value)} fullWidth />

            <Typography variant="body2">{t(TranslationKey.ADMIN_SETTINGS_AUTH_LDAP_GROUP_ATTR)}</Typography>
            <TextField value={ldapGroupAttr} onChange={(e) => setLdapGroupAttr(e.target.value)} fullWidth />

            <Divider textAlign="left">{t(TranslationKey.ADMIN_SETTINGS_AUTH_LDAP_ROLE_MAPPING)}</Divider>
            <Typography variant="body2">{t(TranslationKey.ADMIN_SETTINGS_AUTH_LDAP_TEACHER_GROUP_DN)}</Typography>
            <TextField value={ldapTeacherGroupDn} onChange={(e) => setLdapTeacherGroupDn(e.target.value)} fullWidth />

            <Typography variant="body2">{t(TranslationKey.ADMIN_SETTINGS_AUTH_LDAP_STUDENT_GROUP_DN)}</Typography>
            <TextField value={ldapStudentGroupDn} onChange={(e) => setLdapStudentGroupDn(e.target.value)} fullWidth />

            <Typography variant="body2">{t(TranslationKey.ADMIN_SETTINGS_AUTH_LDAP_CONNECT_TIMEOUT)}</Typography>
            <TextField value={ldapTimeoutSec} onChange={(e) => setLdapTimeoutSec(e.target.value.replace(/[^0-9]/g, ""))} fullWidth />
          </Box>
        )}

        <Box sx={{ display: "flex", gap: 1 }}>
          <Button variant="contained" color="success" onClick={handleSave} disabled={saveDisabled}>
          {t(TranslationKey.ADMIN_SETTINGS_SAVE)}
          </Button>
          <Button
            onClick={() => {
              if (originalLanguage !== null) setLanguage((originalLanguage.toUpperCase() === Language.SK ? Language.SK : Language.EN))
              if (originalInstitution !== null) setInstitutionName(originalInstitution)
              if (originalAuth !== null) {
                const resetAuth = ( (originalAuth ?? "").toUpperCase() === "LDAP" ? AuthType.LDAP : AuthType.LOCAL)
                setAuthType(resetAuth)
                setLdapEnabled(resetAuth === AuthType.LDAP)
              }
            }}
          >
            {t(TranslationKey.ADMIN_SETTINGS_RESET)}
          </Button>
        </Box>
      </Box>

      {alert && (
        <CustomAlert severity={alert.severity} message={alert.message} onClose={() => setAlert(null)} />
      )}
    </>
  )
}

export default AdminSettings