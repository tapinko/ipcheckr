import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { assignmentSubmitApi } from "../../utils/apiClients"
import type { ApiProblemDetails, QueryAssignmentDataForSubmitRes, SubmitAssignmentRes } from "../../dtos"
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
  DialogActions
} from "@mui/material"
import i18n, { Language, TranslationKey } from "../../utils/i18n"
import { useTranslation } from "react-i18next"
import { getParametrizedUrl, RouteKeys, RouteParams } from "../../router/routes"
import { Controller, useFieldArray, useForm } from "react-hook-form"
import FormRules from "../../utils/FormRules"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import ErrorLoading from "../../components/ErrorLoading"
import SubmissionSkeleton from "../../components/SubmissionSkeleton"
import type { AxiosError, AxiosResponse } from "axios"
import { CustomAlert, type CustomAlertState } from "../../components/CustomAlert"

type AssignmentFormRow = {
  network: string
  firstUsable: string
  lastUsable: string
  broadcast: string
}

type AssignmentFormValues = {
  rows: AssignmentFormRow[]
}

const StudentAssignmentSubmission = () => {
  const { t } = useTranslation()
  const { [RouteParams.ASSIGNMENT_ID]: assignmentId } = useParams()
  const [confirmSubmitVis, setConfirmSubmitVis] = useState(false)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [alert, setAlert] = useState<CustomAlertState | null>(null)

  const newRow = (): AssignmentFormRow => ({
    network: "",
    firstUsable: "",
    lastUsable: "",
    broadcast: ""
  })

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    // reset
  } = useForm<AssignmentFormValues>({
    defaultValues: { rows: [newRow()] },
    mode: "onChange"
  })

  const { fields, replace } = useFieldArray({
    control,
    name: "rows"
  })

  const assignmentQuery = useQuery<QueryAssignmentDataForSubmitRes | null, Error>({
    queryKey: ["assignmentSubmissionData", assignmentId],
    enabled: !!assignmentId,
    queryFn: () =>
      assignmentSubmitApi
        .assignmentSubmitQueryAssignmentDataForSubmit(Number(assignmentId))
        .then(res => res.data),
    placeholderData: prev => prev
  })

  useEffect(() => {
    if (assignmentQuery.data?.hostsPerNetwork?.length) {
      replace(
        Array.from(
          { length: assignmentQuery.data.hostsPerNetwork.length },
          () => newRow()
        )
      )
    }
  }, [assignmentQuery.data, replace])

  const submitAssignmentMutation = useMutation<
    AxiosResponse<SubmitAssignmentRes>,
    AxiosError<ApiProblemDetails>,
    AssignmentFormValues
  >({
    mutationFn: (data) =>
      assignmentSubmitApi.assignmentSubmitSubmitAssignment({
        assignmentId: Number(assignmentId),
        data: data.rows
      }),
    onSuccess: (res) => {
      setConfirmSubmitVis(false)
      queryClient.invalidateQueries({
        queryKey: ["studentAssignments"]
      })
      navigate(
        getParametrizedUrl(RouteKeys.STUDENT_ASSIGNMENT_DETAILS, {
          [RouteParams.ASSIGNMENT_ID]: assignmentId!,
          [RouteParams.ATTEMPT]: res.data.attempt.toString()
        }),
        {
          state: {
            alert: {
              severity: "success",
              message: t(TranslationKey.STUDENT_ASSIGNMENTS_SUBMISSION_SUCCESS)
            } as CustomAlertState
          }
        }
      )
    },
    onError: (error) => {
      const details = error.response?.data
      const localMessage =
        i18n.language === Language.EN
          ? details?.messageEn
          : details?.messageSk
      setAlert({
        severity: "error",
        message: `${t(TranslationKey.STUDENT_ASSIGNMENTS_SUBMISSION_ERROR)}. ${localMessage ?? ""}`,
      })
    }
  })

  const onSubmit = async (data: AssignmentFormValues) => {
    if (!assignmentId) return
    await submitAssignmentMutation.mutateAsync(data).catch(() => {})
  }

  const handleReset = () => {
    replace(fields.map(() => newRow()))
  }

  const submitting = submitAssignmentMutation.isPending
  const assignment = assignmentQuery.data
  const hostCount = assignment?.hostsPerNetwork?.length ?? 0
  const gridColumnsMd = hostCount < 3
    ? "repeat(2, minmax(0, 1fr))"
    : "repeat(3, minmax(0, 1fr))"
  const isAvailable = assignment?.isAvailableForSubmission

  if (assignmentQuery.isLoading && !assignment) {
    return <SubmissionSkeleton />
  }

  if (assignmentQuery.isError) {
    return (
      <ErrorLoading
        onRetry={() =>
          queryClient.invalidateQueries({
            queryKey: ["assignmentSubmissionData", assignmentId]
          })
        }
      />
    )
  }

  return (
    <>
      {isAvailable ? (
        <Stack
          spacing={2}
          sx={{ alignItems: "center", width: "100%" }}
          component="section"
        >
          <Box
            sx={{
              width: "100%",
              display: "flex",
              justifyContent: "center",
              position: "sticky",
              top: { xs: 16, md: 24 },
              zIndex: theme => theme.zIndex.appBar,
              backgroundColor: theme => theme.palette.background.default,
              py: 1
            }}
          >
            <Card
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                width: { xs: "100%", sm: "fit-content" },
                maxWidth: 480,
                px: { xs: 3, md: 6 }
              }}
            >
              <CardContent
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  gap: 1
                }}
              >
                <Typography align="center" variant="body2">
                  {t(TranslationKey.STUDENT_ASSIGNMENTS_SUBMISSION_NETWORK)}
                </Typography>
                <Typography align="center" variant="h6">
                  {assignment?.cidr}
                </Typography>
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
                md: hostCount === 0 ? "1fr" : gridColumnsMd
              },
              gap: 2,
              width: "100%",
              maxWidth: 1200,
              justifyContent: "center"
            }}
          >
            {assignment?.hostsPerNetwork?.map((host, index) => (
              <Card
                key={fields[index]?.id ?? index}
                sx={{ width: "100%" }}
              >
                <CardHeader
                  title={
                    <Typography
                      variant="h6"
                      sx={{ textAlign: "center" }}
                    >
                      <strong>
                        {t(
                          TranslationKey.STUDENT_ASSIGNMENTS_SUBMISSION_HOSTS
                        )}
                        :{" "}
                      </strong>
                      {host}
                    </Typography>
                  }
                  sx={{
                    "& .MuiCardHeader-content": {
                      width: "100%",
                      display: "flex",
                      justifyContent: "center"
                    }
                  }}
                />
                <Divider />
                <CardContent>
                  <Stack spacing={2}>
                    <Controller
                      name={`rows.${index}.network`}
                      control={control}
                      rules={{
                        ...FormRules.required(),
                        ...FormRules.patternCidrNotation()
                      }}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          size="small"
                          label={t(
                            TranslationKey.STUDENT_ASSIGNMENTS_SUBMISSION_NETWORK
                          )}
                          error={!!errors.rows?.[index]?.network}
                          helperText={
                            errors.rows?.[index]?.network
                              ? t(
                                  errors.rows[index]?.network
                                    ?.message as string
                                )
                              : ""
                          }
                          onChange={e =>
                            field.onChange(e.target.value.trim())
                          }
                        />
                      )}
                    />
                    <Controller
                      name={`rows.${index}.firstUsable`}
                      control={control}
                      rules={{
                        ...FormRules.required(),
                        ...FormRules.patternIpAddress()
                      }}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          size="small"
                          label={t(
                            TranslationKey.STUDENT_ASSIGNMENTS_SUBMISSION_FIRST_USABLE
                          )}
                          error={!!errors.rows?.[index]?.firstUsable}
                          helperText={
                            errors.rows?.[index]?.firstUsable
                              ? t(
                                  errors.rows[index]?.firstUsable
                                    ?.message as string
                                )
                              : ""
                          }
                          onChange={e =>
                            field.onChange(e.target.value.trim())
                          }
                        />
                      )}
                    />
                    <Controller
                      name={`rows.${index}.lastUsable`}
                      control={control}
                      rules={{
                        ...FormRules.required(),
                        ...FormRules.patternIpAddress()
                      }}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          size="small"
                          label={t(
                            TranslationKey.STUDENT_ASSIGNMENTS_SUBMISSION_LAST_USABLE
                          )}
                          error={!!errors.rows?.[index]?.lastUsable}
                          helperText={
                            errors.rows?.[index]?.lastUsable
                              ? t(
                                  errors.rows[index]?.lastUsable
                                    ?.message as string
                                )
                              : ""
                          }
                          onChange={e =>
                            field.onChange(e.target.value.trim())
                          }
                        />
                      )}
                    />
                    <Controller
                      name={`rows.${index}.broadcast`}
                      control={control}
                      rules={{
                        ...FormRules.required(),
                        ...FormRules.patternIpAddress()
                      }}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          size="small"
                          label={t(
                            TranslationKey.STUDENT_ASSIGNMENTS_SUBMISSION_BROADCAST
                          )}
                          error={!!errors.rows?.[index]?.broadcast}
                          helperText={
                            errors.rows?.[index]?.broadcast
                              ? t(
                                  errors.rows[index]?.broadcast
                                    ?.message as string
                                )
                              : ""
                          }
                          onChange={e =>
                            field.onChange(e.target.value.trim())
                          }
                        />
                      )}
                    />
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Box>

          <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
            <Button
              variant="contained"
              disabled={submitting || !isValid}
              onClick={() => setConfirmSubmitVis(true)}
            >
              {t(TranslationKey.STUDENT_ASSIGNMENTS_SUBMISSION_SUBMIT)}
            </Button>
            <Button
              variant="outlined"
              disabled={submitting}
              onClick={handleReset}
            >
              {t(TranslationKey.STUDENT_ASSIGNMENTS_SUBMISSION_RESET)}
            </Button>
          </Stack>
        </Stack>
      ) : (
        <Typography variant="h6">
          {t(TranslationKey.STUDENT_ASSIGNMENTS_SUBMISSION_NOT_AVAILABLE)}
        </Typography>
      )}

      <Dialog
        open={confirmSubmitVis}
        onClose={() => setConfirmSubmitVis(false)}
        sx={{ "& .MuiDialog-paper": { width: "30vw" } }}
      >
        <DialogTitle>
          {t(TranslationKey.STUDENT_ASSIGNMENTS_SUBMISSION_CONFIRM_TITLE)}
        </DialogTitle>
        <DialogContent
          sx={{ display: "flex", flexDirection: "column", gap: 1 }}
        >
          <Typography>
            {t(
              TranslationKey.STUDENT_ASSIGNMENTS_SUBMISSION_CONFIRM_QUESTION
            )}
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
            disabled={submitting || !isValid}
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