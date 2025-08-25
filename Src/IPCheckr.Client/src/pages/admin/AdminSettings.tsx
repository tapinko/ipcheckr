import { useEffect, useMemo, useState } from "react"
import { Box, Button, MenuItem, Select, TextField, Tooltip, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"
import type { AppSettingDto, EditAppSettinReq, ApiProblemDetails } from "../../dtos"
import { appSettingsApi } from "../../utils/apiClients"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import TableSkeleton from "../../components/TableSkeleton"
import ErrorLoading from "../../components/ErrorLoading"
import { CustomAlert, type CustomAlertState } from "../../components/CustomAlert"
import i18n, { Language, TranslationKey } from "../../utils/i18n"
import type { AxiosError, AxiosResponse } from "axios"

const AdminSettings = () => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const [language, setLanguage] = useState<Language | "">("")
  const [institutionName, setInstitutionName] = useState<string>("")

  const [originalLanguage, setOriginalLanguage] = useState<string | null>(null)
  const [originalInstitution, setOriginalInstitution] = useState<string | null>(null)

  const [alert, setAlert] = useState<CustomAlertState | null>(null)

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
  }, [languageSetting, institutionSetting])

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
    return list
  }, [language, institutionName, languageSetting, institutionSetting])

  const saveDisabled = changedFields.length === 0 || editMutation.isPending

  // the API accepts only one setting at a time, so this shit need to be done...
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
      <Box sx={{ maxWidth: "20vw", display: "flex", flexDirection: "column", gap: 2 }}>
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

        <Box sx={{ display: "flex", gap: 1 }}>
          <Button variant="contained" color="success" onClick={handleSave} disabled={saveDisabled}>
          {t(TranslationKey.ADMIN_SETTINGS_SAVE)}
          </Button>
          <Button
            onClick={() => {
              if (originalLanguage !== null) setLanguage((originalLanguage.toUpperCase() === Language.SK ? Language.SK : Language.EN))
              if (originalInstitution !== null) setInstitutionName(originalInstitution)
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