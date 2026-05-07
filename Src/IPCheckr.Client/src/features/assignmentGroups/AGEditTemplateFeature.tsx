import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useMutation, useQuery } from "@tanstack/react-query"
import {
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  TextField,
} from "@mui/material"
import { Controller, useForm, useWatch } from "react-hook-form"
import type { AxiosError } from "axios"
import { agTemplateApi } from "../../utils/apiClients"
import {
  AssignmentGroupDifficulty,
  AssignmentGroupHostSortStrategy,
  AssignmentGroupIpCat,
  AssignmentGroupType,
  type ApiProblemDetails
} from "../../dtos"
import { Language, TranslationKey } from "../../utils/i18n"
import FormRules from "../../utils/FormRules"
import { CustomAlert, type CustomAlertState } from "../../components/CustomAlert"
import AGFormSkeleton from "../../components/ag/AGFormSkeleton"
import ErrorLoading from "../../components/ErrorLoading"
import { RouteParams } from "../../router/routes"
import AGTypeIpCatSelector from "./AGTypeIpCatSelector"
import AGTypeSpecificSettings from "./AGTypeSpecificSettings"

type TemplateFormValues = {
  name: string
  agName: string
  agDescription: string
  type: AssignmentGroupType
  numberOfRecords: number
  possibleOctets: number
  ipCat: AssignmentGroupIpCat
  difficulty: AssignmentGroupDifficulty
  hostSortStrategy: AssignmentGroupHostSortStrategy
  testWildcard: boolean
  testFirstLastBr: boolean
}

interface AGEditTemplateFeatureProps {
  onAfterSave: () => void
}

const AGEditTemplateFeature = ({ onAfterSave }: AGEditTemplateFeatureProps) => {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const params = useParams()
  const templateId = params[RouteParams.TEMPLATE_ID] ? Number(params[RouteParams.TEMPLATE_ID]) : null
  const isEdit = templateId !== null

  const [alert, setAlert] = useState<CustomAlertState | null>(null)
  const [initialized, setInitialized] = useState(!isEdit)

  const {
    control,
    handleSubmit,
    setValue,
    reset,
    formState: { errors }
  } = useForm<TemplateFormValues>({
    defaultValues: {
      name: "",
      agName: "",
      agDescription: "",
      type: AssignmentGroupType.Idnet,
      numberOfRecords: 6,
      possibleOctets: 3,
      ipCat: AssignmentGroupIpCat.Abc,
      difficulty: AssignmentGroupDifficulty.Medium,
      hostSortStrategy: AssignmentGroupHostSortStrategy.Descending,
      testWildcard: false,
      testFirstLastBr: false
    },
    mode: "onBlur"
  })

  const selectedType = useWatch({ control, name: "type" })
  const selectedIpCat = useWatch({ control, name: "ipCat" })
  const nameValue = useWatch({ control, name: "name" })

  const templateQuery = useQuery({
    queryKey: ["agTemplate", templateId],
    enabled: isEdit,
    queryFn: () => agTemplateApi.aGTemplateQueryAGTemplates().then(r => {
      const found = (r.data.templates ?? []).find(tmpl => tmpl.id === templateId)
      if (!found) throw new Error("Template not found")
      return found
    })
  })

  useEffect(() => {
    if (!templateQuery.data || initialized) return
    const template = templateQuery.data
    reset({
      name: template.name ?? "",
      agName: template.agName ?? "",
      agDescription: template.agDescription ?? "",
      type: template.type ?? AssignmentGroupType.Idnet,
      numberOfRecords: template.numberOfRecords ?? 6,
      possibleOctets: template.possibleOctets ?? 3,
      ipCat: template.ipCat ?? AssignmentGroupIpCat.Abc,
      difficulty: template.difficulty ?? AssignmentGroupDifficulty.Medium,
      hostSortStrategy: template.hostSortStrategy ?? AssignmentGroupHostSortStrategy.Descending,
      testWildcard: template.testWildcard ?? false,
      testFirstLastBr: template.testFirstLastBr ?? false
    })
    setInitialized(true)
  }, [templateQuery.data, initialized, reset])

  const saveMutation = useMutation<void, AxiosError<ApiProblemDetails>, TemplateFormValues>({
    mutationFn: async data => {
      const payload = {
        name: data.name,
        agName: data.agName || null,
        agDescription: data.agDescription || null,
        type: data.type,
        ipCat: data.ipCat,
        numberOfRecords: data.numberOfRecords,
        difficulty: data.type === AssignmentGroupType.Subnet ? data.difficulty : null,
        hostSortStrategy: data.type === AssignmentGroupType.Subnet ? data.hostSortStrategy : null,
        possibleOctets: data.type === AssignmentGroupType.Idnet ? data.possibleOctets : null,
        testWildcard: data.type === AssignmentGroupType.Idnet ? data.testWildcard : false,
        testFirstLastBr: data.type === AssignmentGroupType.Idnet ? data.testFirstLastBr : false
      }
      if (isEdit) {
        await agTemplateApi.aGTemplateEditAGTemplate(templateId!, payload)
      } else {
        await agTemplateApi.aGTemplateCreateAGTemplate(payload)
      }
    },
    onSuccess: () => {
      setAlert({
        severity: "success",
        message: t(isEdit ? TranslationKey.AG_TEMPLATE_SAVE_SUCCESS : TranslationKey.AG_TEMPLATE_CREATE_SUCCESS)
      })
      setTimeout(() => onAfterSave(), 800)
    },
    onError: error => {
      const details = error.response?.data
      const msg = i18n.language === Language.EN ? details?.messageEn : details?.messageSk
      setAlert({ severity: "error", message: msg ?? t(TranslationKey.AG_TEMPLATE_ERROR) })
    }
  })

  if (isEdit && templateQuery.isLoading) return <AGFormSkeleton />
  if (isEdit && templateQuery.isError) return <ErrorLoading onRetry={() => templateQuery.refetch()} />

  const canSubmit = !!nameValue?.trim() && !saveMutation.isPending

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {alert && <CustomAlert severity={alert.severity} message={alert.message} onClose={() => setAlert(null)} />}

      <Card variant="outlined">
        <CardContent>
          <Box
            component="form"
            onSubmit={handleSubmit(data => saveMutation.mutate(data))}
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 3,
              "& .MuiToggleButton-root": { textTransform: "none" },
              "& .MuiButton-root": { textTransform: "none" }
            }}
          >
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Controller
                  name="name"
                  control={control}
                  rules={{
                    ...FormRules.required(),
                    ...FormRules.minLengthShort(),
                    ...FormRules.maxLengthShort(),
                    ...FormRules.patternLettersNumbersSpaces()
                  }}
                  render={({ field }) => (
                    <TextField
                      label={t(TranslationKey.AG_TEMPLATE_NAME)}
                      fullWidth
                      {...field}
                      error={!!errors.name}
                      helperText={errors.name ? t(errors.name.message as string) : ""}
                    />
                  )}
                />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Controller
                  name="agName"
                  control={control}
                  rules={{ ...FormRules.maxLengthShort() }}
                  render={({ field }) => (
                    <TextField
                      label={t(TranslationKey.AG_TEMPLATE_AG_NAME)}
                      fullWidth
                      {...field}
                      error={!!errors.agName}
                      helperText={errors.agName ? t(errors.agName.message as string) : ""}
                    />
                  )}
                />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Controller
                  name="agDescription"
                  control={control}
                  rules={{ ...FormRules.maxLengthLong() }}
                  render={({ field }) => (
                    <TextField
                      label={t(TranslationKey.AG_TEMPLATE_AG_DESCRIPTION)}
                      fullWidth
                      {...field}
                      error={!!errors.agDescription}
                      helperText={errors.agDescription ? t(errors.agDescription.message as string) : ""}
                    />
                  )}
                />
              </Box>
            </Stack>

            <AGTypeIpCatSelector
              selectedType={selectedType}
              selectedIpCat={selectedIpCat}
              onTypeChange={type => setValue("type", type)}
              onIpCatChange={cat => setValue("ipCat", cat)}
              labels={{
                typeLabel: t(TranslationKey.AG_CREATE_ASSIGNMENT_GROUP_TYPE),
                subnet: t(TranslationKey.AG_CREATE_ASSIGNMENT_GROUP_TYPE_SUBNET),
                idnet: t(TranslationKey.AG_CREATE_ASSIGNMENT_GROUP_TYPE_IDNET),
                ipCatLabel: t(TranslationKey.AG_CREATE_ASSIGNMENT_GROUP_IP_CATEGORY),
                ipCatAbc: t(TranslationKey.AG_CREATE_ASSIGNMENT_GROUP_IP_CAT_ABC),
                ipCatAll: t(TranslationKey.AG_CREATE_ASSIGNMENT_GROUP_IP_CAT_ALL),
                ipCatLocal: t(TranslationKey.AG_CREATE_ASSIGNMENT_GROUP_IP_CAT_LOCAL)
              }}
            />

            <AGTypeSpecificSettings
              control={control}
              selectedType={selectedType}
              numberOfRecordsError={errors.numberOfRecords}
              possibleOctetsError={errors.possibleOctets}
              labels={{
                numberOfRecords: t(TranslationKey.AG_CREATE_ASSIGNMENT_GROUP_NUMBER_OF_RECORDS),
                numberOfRecordsRange: t(TranslationKey.AG_CREATE_ASSIGNMENT_GROUP_NUMBER_OF_RECORDS_RANGE),
                increaseNumberOfRecords: t(TranslationKey.AG_CREATE_ASSIGNMENT_GROUP_NUMBER_FIELD_INCREASE),
                decreaseNumberOfRecords: t(TranslationKey.AG_CREATE_ASSIGNMENT_GROUP_NUMBER_FIELD_DECREASE),
                difficulty: t(TranslationKey.AG_CREATE_ASSIGNMENT_GROUP_DIFFICULTY),
                difficultyTooltip: t(TranslationKey.AG_CREATE_ASSIGNMENT_GROUP_DIFFICULTY_TOOLTIP),
                easy: t(TranslationKey.AG_CREATE_ASSIGNMENT_GROUP_DIFFICULTY_EASY),
                medium: t(TranslationKey.AG_CREATE_ASSIGNMENT_GROUP_DIFFICULTY_MEDIUM),
                hard: t(TranslationKey.AG_CREATE_ASSIGNMENT_GROUP_DIFFICULTY_HARD),
                hostSort: t(TranslationKey.AG_CREATE_ASSIGNMENT_GROUP_HOST_SORT),
                random: t(TranslationKey.AG_CREATE_ASSIGNMENT_GROUP_HOST_SORT_RANDOM),
                ascending: t(TranslationKey.AG_CREATE_ASSIGNMENT_GROUP_HOST_SORT_ASCENDING),
                descending: t(TranslationKey.AG_CREATE_ASSIGNMENT_GROUP_HOST_SORT_DESCENDING),
                possibleOctets: t(TranslationKey.AG_CREATE_ASSIGNMENT_GROUP_POSSIBLE_OCTETS),
                possibleOctetsRange: t(TranslationKey.AG_CREATE_ASSIGNMENT_GROUP_POSSIBLE_OCTETS_RANGE),
                testWildcard: t(TranslationKey.AG_CREATE_ASSIGNMENT_GROUP_TEST_WILDCARD),
                testFirstLastBr: t(TranslationKey.AG_CREATE_ASSIGNMENT_GROUP_TEST_FIRST_LAST_BR)
              }}
            />

            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Button onClick={() => navigate(-1)}>
                {t(TranslationKey.AG_TEMPLATE_CANCEL)}
              </Button>
              <Button type="submit" variant="contained" color="success" disabled={!canSubmit}>
                {saveMutation.isPending
                  ? t(TranslationKey.AG_TEMPLATE_LOADING)
                  : t(isEdit ? TranslationKey.AG_TEMPLATE_SAVE : TranslationKey.AG_TEMPLATE_CREATE)}
              </Button>
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}

export default AGEditTemplateFeature