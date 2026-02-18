import { useEffect, useMemo, useState } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import { assignmentSubmitApi } from "../../utils/apiClients"
import type {
  ApiProblemDetails,
  QueryIDNetAssignmentDataForSubmitRes,
  QuerySubnetAssignmentDataForSubmitRes,
  SubmitIDNetAssignmentRes,
  SubmitSubnetAssignmentRes,
  AssignmentGroupType
} from "../../dtos"
import { AssignmentGroupType as AssignmentGroupTypeValues } from "../../dtos"
import {
  Card,
  CardContent,
  CardHeader,
  Divider,
  Stack,
  Typography,
  TextField,
  Button,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip
} from "@mui/material"
import i18n, { Language, TranslationKey } from "../../utils/i18n"
import { useTranslation } from "react-i18next"
import { getParametrizedUrl, RouteKeys, RouteParams } from "../../router/routes"
import { Controller, useFieldArray, useForm } from "react-hook-form"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import ErrorLoading from "../../components/ErrorLoading"
import SubmissionSkeleton from "../../components/SubmissionSkeleton"
import type { AxiosError, AxiosResponse } from "axios"
import { CustomAlert, type CustomAlertState } from "../../components/CustomAlert"
import { alpha } from "@mui/material/styles"
import { fromAssignmentTypeParam, toAssignmentTypeParam } from "../../utils/assignmentType"

type AssignmentFormRow = {
  network: string
  idNet: string
  wildcard: string
  firstUsable: string
  lastUsable: string
  broadcast: string
}

type AssignmentFormValues = {
  rows: AssignmentFormRow[]
}

const StudentAssignmentSubmission = () => {
  const { t } = useTranslation()
  const {
    [RouteParams.ASSIGNMENT_ID]: assignmentId,
    [RouteParams.ASSIGNMENT_GROUP_TYPE]: assignmentTypeParam
  } = useParams()
  const assignmentIdNum = Number(assignmentId)
  const location = useLocation()
  const [confirmSubmitVis, setConfirmSubmitVis] = useState(false)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [alert, setAlert] = useState<CustomAlertState | null>(null)
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [assignmentType, setAssignmentType] = useState<AssignmentGroupType | null>(
    () => fromAssignmentTypeParam(assignmentTypeParam) ?? (location.state as any)?.assignmentType ?? null
  )

  const newRow = (): AssignmentFormRow => ({
    network: "",
    idNet: "",
    wildcard: "",
    firstUsable: "",
    lastUsable: "",
    broadcast: ""
  })

  const {
    control,
    handleSubmit,
    formState: { errors }
  } = useForm<AssignmentFormValues>({
    defaultValues: { rows: [newRow()] },
    mode: "onChange"
  })

  const { fields, replace } = useFieldArray({
    control,
    name: "rows"
  })

  const subnetSubmissionQuery = useQuery<QuerySubnetAssignmentDataForSubmitRes | null, Error>({
    queryKey: ["assignmentSubmissionData", "subnet", assignmentIdNum],
    enabled: !!assignmentIdNum && (!assignmentType || assignmentType === AssignmentGroupTypeValues.Subnet),
    queryFn: () =>
      assignmentSubmitApi
        .assignmentSubmitQuerySubnetAssignmentDataForSubmit(assignmentIdNum)
        .then(res => res.data),
    retry: false,
    placeholderData: prev => prev
  })

  const idNetSubmissionQuery = useQuery<QueryIDNetAssignmentDataForSubmitRes | null, Error>({
    queryKey: ["assignmentSubmissionData", "idnet", assignmentIdNum],
    enabled: !!assignmentIdNum && (!assignmentType || assignmentType === AssignmentGroupTypeValues.Idnet),
    queryFn: () =>
      assignmentSubmitApi
        .assignmentSubmitQueryIdNetAssignmentDataForSubmit(assignmentIdNum)
        .then(res => res.data),
    retry: false,
    placeholderData: prev => prev
  })

  useEffect(() => {
    if (assignmentType) return
    if (subnetSubmissionQuery.data) {
      setAssignmentType(AssignmentGroupTypeValues.Subnet)
      return
    }
    if (idNetSubmissionQuery.data) {
      setAssignmentType(AssignmentGroupTypeValues.Idnet)
    }
  }, [assignmentType, subnetSubmissionQuery.data, idNetSubmissionQuery.data])

  const subnetData = assignmentType === AssignmentGroupTypeValues.Subnet ? subnetSubmissionQuery.data : null
  const idNetData = assignmentType === AssignmentGroupTypeValues.Idnet ? idNetSubmissionQuery.data : null

  const rowCount = useMemo(() => {
    if (assignmentType === AssignmentGroupTypeValues.Subnet) {
      return subnetData?.hostsPerNetwork?.length ?? 0
    }
    if (assignmentType === AssignmentGroupTypeValues.Idnet) {
      return idNetData?.addresses?.length ?? 0
    }
    return 0
  }, [assignmentType, subnetData, idNetData])

  useEffect(() => {
    if (rowCount > 0) {
      replace(Array.from({ length: rowCount }, () => newRow()))
    }
  }, [rowCount, replace])

  const submitAssignmentMutation = useMutation<
    AxiosResponse<SubmitSubnetAssignmentRes | SubmitIDNetAssignmentRes>,
    AxiosError<ApiProblemDetails>,
    AssignmentFormValues
  >({
    mutationFn: data => {
      if (!assignmentIdNum || !assignmentType) {
        throw new Error("Missing assignment context")
      }

      if (assignmentType === AssignmentGroupTypeValues.Idnet) {
        const includeWildcard = !!idNetData?.testWildcard
        const includeFlb = !!idNetData?.testFirstLastBr
        return assignmentSubmitApi.assignmentSubmitSubmitIdNetAssignment({
          assignmentId: assignmentIdNum,
          data: data.rows.map(r => ({
            idNet: r.idNet,
            wildcard: includeWildcard ? r.wildcard : null,
            firstUsable: includeFlb ? r.firstUsable : null,
            lastUsable: includeFlb ? r.lastUsable : null,
            broadcast: includeFlb ? r.broadcast : null
          }))
        })
      }

      return assignmentSubmitApi.assignmentSubmitSubmitSubnetAssignment({
        assignmentId: assignmentIdNum,
        data: data.rows.map(r => ({
          network: r.network,
          firstUsable: r.firstUsable,
          lastUsable: r.lastUsable,
          broadcast: r.broadcast
        }))
      })
    },
    onSuccess: () => {
      setConfirmSubmitVis(false)
      queryClient.invalidateQueries({
        queryKey: ["studentAssignments"]
      })
      navigate(
        getParametrizedUrl(RouteKeys.STUDENT_ASSIGNMENT_DETAILS, {
          [RouteParams.ASSIGNMENT_ID]: assignmentId!,
          [RouteParams.ASSIGNMENT_GROUP_TYPE]: toAssignmentTypeParam(assignmentType!)
        }),
        {
          state: {
            assignmentType,
            alert: {
              severity: "success",
              message: t(TranslationKey.STUDENT_ASSIGNMENTS_SUBMISSION_SUCCESS)
            } as CustomAlertState
          }
        }
      )
    },
    onError: error => {
      const details = error.response?.data
      const localMessage =
        i18n.language === Language.EN
          ? details?.messageEn
          : details?.messageSk
      setAlert({
        severity: "error",
        message: `${t(TranslationKey.STUDENT_ASSIGNMENTS_SUBMISSION_ERROR)}. ${localMessage ?? ""}`
      })
    }
  })

  const onSubmit = async (data: AssignmentFormValues) => {
    if (!assignmentIdNum || !assignmentType) return
    await submitAssignmentMutation.mutateAsync(data).catch(() => {})
  }

  const handleReset = () => {
    const target = rowCount > 0 ? rowCount : Math.max(fields.length, 1)
    replace(Array.from({ length: target }, () => newRow()))
  }

  const submitting = submitAssignmentMutation.isPending
  const isAvailable = subnetData?.isAvailableForSubmission ?? idNetData?.isAvailableForSubmission
  const assignmentMeta = subnetData ?? idNetData ?? null

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const countdownText = useMemo(() => {
    if (!assignmentMeta?.deadline) return "--:--:--"

    const totalSeconds = Math.max(0, Math.floor((new Date(assignmentMeta.deadline).getTime() - nowMs) / 1000))
    const days = Math.floor(totalSeconds / 86400)
    const hours = Math.floor((totalSeconds % 86400) / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    if (days > 0) {
      return `${days}d ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    }

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
  }, [assignmentMeta?.deadline, nowMs])

  const isDeterminingType = !assignmentType && (subnetSubmissionQuery.isLoading || idNetSubmissionQuery.isLoading)
  const typeDetectError = !assignmentType && subnetSubmissionQuery.isError && idNetSubmissionQuery.isError

  const isLoading =
    assignmentType === AssignmentGroupTypeValues.Subnet
      ? subnetSubmissionQuery.isLoading
      : assignmentType === AssignmentGroupTypeValues.Idnet
        ? idNetSubmissionQuery.isLoading
        : false

  const hasError =
    assignmentType === AssignmentGroupTypeValues.Subnet
      ? subnetSubmissionQuery.isError
      : assignmentType === AssignmentGroupTypeValues.Idnet
        ? idNetSubmissionQuery.isError
        : false

  const gridColumnsMd = rowCount < 3
    ? "repeat(2, minmax(0, 1fr))"
    : "repeat(3, minmax(0, 1fr))"

  const ipRegex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
  const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/([0-9]|[1-2][0-9]|3[0-2])$/

  const optionalIpRules = {
    validate: (value: string) =>
      !value?.trim() || ipRegex.test(value.trim()) || TranslationKey.FORM_RULES_PATTERN_IP_ADDRESS
  }

  const optionalCidrRules = {
    validate: (value: string) =>
      !value?.trim() || cidrRegex.test(value.trim()) || TranslationKey.FORM_RULES_PATTERN_CIDR_NOTATION
  }

  if (isDeterminingType || (isLoading && !(subnetData || idNetData))) {
    return <SubmissionSkeleton />
  }

  if (typeDetectError || hasError) {
    return (
      <ErrorLoading
        onRetry={() => {
          queryClient.invalidateQueries({ queryKey: ["assignmentSubmissionData", "subnet", assignmentIdNum] })
          queryClient.invalidateQueries({ queryKey: ["assignmentSubmissionData", "idnet", assignmentIdNum] })
        }}
      />
    )
  }

  if (!assignmentType) {
    return (
      <Typography variant="h6">
        {t(TranslationKey.STUDENT_ASSIGNMENTS_SUBMISSION_NOT_AVAILABLE)}
      </Typography>
    )
  }

  const renderSubnetCard = (host: number, index: number) => (
    <Card
      key={fields[index]?.id ?? index}
      variant="outlined"
      sx={{
        width: "100%",
        borderWidth: 2,
        borderColor: "divider",
        borderRadius: 1,
        boxShadow: 0,
        background: "transparent"
      }}
    >
      <CardHeader
        title={
          <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap">
            <Chip
              color="primary"
              variant="filled"
              label={`${t(TranslationKey.STUDENT_ASSIGNMENTS_SUBMISSION_HOSTS)}: ${host}`}
              sx={{
                fontWeight: 800,
                fontSize: { xs: 16, md: 18 },
                height: { xs: 36, md: 42 }
              }}
            />
          </Stack>
        }
        sx={{
          "& .MuiCardHeader-content": {
            width: "100%",
            display: "flex",
            justifyContent: "center",
            flexDirection: "column"
          }
        }}
      />
      <Divider />
      <CardContent>
        <Stack spacing={2}>
          <Controller
            name={`rows.${index}.network`}
            control={control}
            rules={optionalCidrRules}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                size="small"
                label={t(TranslationKey.STUDENT_ASSIGNMENTS_SUBMISSION_NETWORK)}
                error={!!errors.rows?.[index]?.network}
                helperText={errors.rows?.[index]?.network ? t(errors.rows[index]?.network?.message as string) : ""}
                onChange={e => field.onChange(e.target.value.trim())}
              />
            )}
          />
          <Controller
            name={`rows.${index}.firstUsable`}
            control={control}
            rules={optionalIpRules}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                size="small"
                label={t(TranslationKey.STUDENT_ASSIGNMENTS_SUBMISSION_FIRST_USABLE)}
                error={!!errors.rows?.[index]?.firstUsable}
                helperText={errors.rows?.[index]?.firstUsable ? t(errors.rows[index]?.firstUsable?.message as string) : ""}
                onChange={e => field.onChange(e.target.value.trim())}
              />
            )}
          />
          <Controller
            name={`rows.${index}.lastUsable`}
            control={control}
            rules={optionalIpRules}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                size="small"
                label={t(TranslationKey.STUDENT_ASSIGNMENTS_SUBMISSION_LAST_USABLE)}
                error={!!errors.rows?.[index]?.lastUsable}
                helperText={errors.rows?.[index]?.lastUsable ? t(errors.rows[index]?.lastUsable?.message as string) : ""}
                onChange={e => field.onChange(e.target.value.trim())}
              />
            )}
          />
          <Controller
            name={`rows.${index}.broadcast`}
            control={control}
            rules={optionalIpRules}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                size="small"
                label={t(TranslationKey.STUDENT_ASSIGNMENTS_SUBMISSION_BROADCAST)}
                error={!!errors.rows?.[index]?.broadcast}
                helperText={errors.rows?.[index]?.broadcast ? t(errors.rows[index]?.broadcast?.message as string) : ""}
                onChange={e => field.onChange(e.target.value.trim())}
              />
            )}
          />
        </Stack>
      </CardContent>
    </Card>
  )

  const renderIdNetCard = (address: string, index: number) => {
    const includeWildcard = !!idNetData?.testWildcard
    const includeFlb = !!idNetData?.testFirstLastBr

    return (
      <Card
        key={fields[index]?.id ?? index}
        variant="outlined"
        sx={{
          width: "100%",
          borderWidth: 2,
          borderColor: "divider",
          borderRadius: 1,
          boxShadow: 0,
          background: "transparent"
        }}
      >
        <CardHeader
          title={
            <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap">
              <Chip
                color="secondary"
                variant="filled"
                label={address}
                sx={{
                  fontWeight: 800,
                  fontSize: { xs: 16, md: 18 },
                  height: { xs: 36, md: 42 }
                }}
              />
            </Stack>
          }
          sx={{
            "& .MuiCardHeader-content": {
              width: "100%",
              display: "flex",
              justifyContent: "center",
              flexDirection: "column"
            }
          }}
        />
        <Divider />
        <CardContent>
          <Stack spacing={2}>
            <Controller
              name={`rows.${index}.idNet`}
              control={control}
              rules={optionalIpRules}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  size="small"
                  label={t(TranslationKey.STUDENT_ASSIGNMENTS_SUBMISSION_NETWORK)}
                  error={!!errors.rows?.[index]?.idNet}
                  helperText={errors.rows?.[index]?.idNet ? t(errors.rows[index]?.idNet?.message as string) : ""}
                  onChange={e => field.onChange(e.target.value.trim().split("/")[0])}
                />
              )}
            />

            {includeWildcard ? (
              <Controller
                name={`rows.${index}.wildcard`}
                control={control}
                rules={optionalIpRules}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    size="small"
                    label={t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_CHIP_WILDCARD)}
                    error={!!errors.rows?.[index]?.wildcard}
                    helperText={errors.rows?.[index]?.wildcard ? t(errors.rows[index]?.wildcard?.message as string) : ""}
                    onChange={e => field.onChange(e.target.value.trim())}
                  />
                )}
              />
            ) : null}

            {includeFlb ? (
              <>
                <Controller
                  name={`rows.${index}.firstUsable`}
                  control={control}
                  rules={optionalIpRules}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      size="small"
                      label={t(TranslationKey.STUDENT_ASSIGNMENTS_SUBMISSION_FIRST_USABLE)}
                      error={!!errors.rows?.[index]?.firstUsable}
                      helperText={errors.rows?.[index]?.firstUsable ? t(errors.rows[index]?.firstUsable?.message as string) : ""}
                      onChange={e => field.onChange(e.target.value.trim())}
                    />
                  )}
                />
                <Controller
                  name={`rows.${index}.lastUsable`}
                  control={control}
                  rules={optionalIpRules}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      size="small"
                      label={t(TranslationKey.STUDENT_ASSIGNMENTS_SUBMISSION_LAST_USABLE)}
                      error={!!errors.rows?.[index]?.lastUsable}
                      helperText={errors.rows?.[index]?.lastUsable ? t(errors.rows[index]?.lastUsable?.message as string) : ""}
                      onChange={e => field.onChange(e.target.value.trim())}
                    />
                  )}
                />
                <Controller
                  name={`rows.${index}.broadcast`}
                  control={control}
                  rules={optionalIpRules}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      size="small"
                      label={t(TranslationKey.STUDENT_ASSIGNMENTS_SUBMISSION_BROADCAST)}
                      error={!!errors.rows?.[index]?.broadcast}
                      helperText={errors.rows?.[index]?.broadcast ? t(errors.rows[index]?.broadcast?.message as string) : ""}
                      onChange={e => field.onChange(e.target.value.trim())}
                    />
                  )}
                />
              </>
            ) : null}
          </Stack>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      {isAvailable ? (
        <Stack spacing={2} sx={{ alignItems: "center", width: "100%" }} component="section">
          <Box
            sx={{
              width: "100%",
              display: "flex",
              justifyContent: "center",
              position: "sticky",
              top: { xs: 16, md: 24 },
              zIndex: theme => theme.zIndex.appBar,
              py: 1,
              backgroundColor: theme => alpha(theme.palette.background.default, 0.96),
              backdropFilter: "blur(4px)"
            }}
          >
            <Card
              variant="outlined"
              sx={{
                display: "flex",
                flexDirection: "column",
                width: "100%",
                maxWidth: 1200,
                px: { xs: 2, md: 3 },
                py: { xs: 1.25, md: 1.5 },
                borderWidth: 2,
                borderRadius: 1,
                bgcolor: "background.paper",
                boxShadow: 0
              }}
            >
              <CardContent sx={{ p: "8px !important" }}>
                <Box
                  sx={{
                    display: "grid",
                    alignItems: "center",
                    gap: { xs: 1, md: 2 },
                    gridTemplateColumns: { xs: "1fr", md: "1.3fr 1fr 1fr 1fr 1.2fr 1.2fr" }
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.2 }}>
                      {t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_NAME)}
                    </Typography>
                    <Typography variant="h5" fontWeight={800} noWrap title={assignmentMeta?.assignmentName ?? ""}>
                      {assignmentMeta?.assignmentName ?? "-"}
                    </Typography>
                  </Box>

                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.2 }}>
                      {t(TranslationKey.ADMIN_CLASSES_TEACHER)}
                    </Typography>
                    <Typography variant="body1" fontWeight={600} noWrap title={assignmentMeta?.teacherUsername ?? ""}>
                      {assignmentMeta?.teacherUsername ?? "-"}
                    </Typography>
                  </Box>

                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.2 }}>
                      {t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_CLASS)}
                    </Typography>
                    <Typography variant="body1" fontWeight={600} noWrap title={assignmentMeta?.className ?? ""}>
                      {assignmentMeta?.className ?? "-"}
                    </Typography>
                  </Box>

                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.2 }}>
                      {t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_TYPE)}
                    </Typography>
                    <Typography variant="body1" fontWeight={600} noWrap>
                      {assignmentType === AssignmentGroupTypeValues.Subnet
                        ? t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_TYPE_SUBNET)
                        : t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_TYPE_IDNET)}
                    </Typography>
                  </Box>

                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.2 }}>
                      {t(TranslationKey.STUDENT_ASSIGNMENTS_SUBMISSION_NETWORK)}
                    </Typography>
                    <Typography variant="body1" fontWeight={600} noWrap title={assignmentType === AssignmentGroupTypeValues.Subnet ? subnetData?.cidr ?? "" : ""}>
                      {assignmentType === AssignmentGroupTypeValues.Subnet ? subnetData?.cidr ?? "-" : "-"}
                    </Typography>
                  </Box>

                  <Box>
                    <Stack direction="row" justifyContent="center" sx={{ mt: 0.25 }}>
                      <Chip
                        label={countdownText}
                        color="warning"
                        variant="outlined"
                        sx={{
                          fontWeight: 800,
                          fontSize: { xs: 16, md: 18 },
                          px: 0.5,
                          height: { xs: 34, md: 38 }
                        }}
                      />
                    </Stack>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>

          <Divider sx={{ width: "100%", maxWidth: 1200 }} />

          <Box
            component="form"
            onSubmit={e => {
              e.preventDefault()
              setConfirmSubmitVis(true)
            }}
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                md: rowCount === 0 ? "1fr" : gridColumnsMd
              },
              gap: 2,
              width: "100%",
              maxWidth: 1200,
              justifyContent: "center"
            }}
          >
            {assignmentType === AssignmentGroupTypeValues.Subnet
              ? (subnetData?.hostsPerNetwork ?? []).map((host, index) => renderSubnetCard(host, index))
              : (idNetData?.addresses ?? []).map((address, index) => renderIdNetCard(address, index))}
          </Box>

          <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
            <Button variant="contained" disabled={submitting} onClick={() => setConfirmSubmitVis(true)}>
              {t(TranslationKey.STUDENT_ASSIGNMENTS_SUBMISSION_SUBMIT)}
            </Button>
            <Button variant="outlined" disabled={submitting} onClick={handleReset}>
              {t(TranslationKey.STUDENT_ASSIGNMENTS_SUBMISSION_RESET)}
            </Button>
          </Stack>
        </Stack>
      ) : (
        <Typography variant="h6">
          {t(TranslationKey.STUDENT_ASSIGNMENTS_SUBMISSION_NOT_AVAILABLE)}
        </Typography>
      )}

      <Dialog open={confirmSubmitVis} onClose={() => setConfirmSubmitVis(false)} fullWidth maxWidth="xs">
        <DialogTitle>{t(TranslationKey.STUDENT_ASSIGNMENTS_SUBMISSION_CONFIRM_TITLE)}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <Typography>
            {t(TranslationKey.STUDENT_ASSIGNMENTS_SUBMISSION_CONFIRM_QUESTION)}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmSubmitVis(false)}>
            {t(TranslationKey.STUDENT_ASSIGNMENTS_SUBMISSION_CANCEL)}
          </Button>
          <Button
            onClick={handleSubmit(onSubmit)}
            color="warning"
            variant="contained"
            disabled={submitting}
          >
            {t(TranslationKey.STUDENT_ASSIGNMENTS_SUBMISSION_SUBMIT)}
          </Button>
        </DialogActions>
      </Dialog>

      {alert && (
        <CustomAlert
          severity={alert.severity}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}
    </>
  )
}

export default StudentAssignmentSubmission