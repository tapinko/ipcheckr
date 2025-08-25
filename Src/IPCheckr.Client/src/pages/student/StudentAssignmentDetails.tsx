import { useTranslation } from "react-i18next"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import { getParametrizedUrl, RouteKeys, RouteParams } from "../../router/routes"
import { assignmentApi } from "../../utils/apiClients"
import type { QueryAssignmentSubmitDetailsFullRes } from "../../dtos"
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Stack,
  Typography
} from "@mui/material"
import { TranslationKey } from "../../utils/i18n"
import SelectSearchField from "../../components/SelectSearchField"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import ErrorLoading from "../../components/ErrorLoading"
import SubmissionSkeleton from "../../components/SubmissionSkeleton"
import { CustomAlert, type CustomAlertState } from "../../components/CustomAlert"
import { useEffect, useState } from "react"
import CardSingleDetail from "../../components/AssignmentCardSingleDetail"

const StudentAssignmentDetails = () => {
  const { t } = useTranslation()
  const {
    [RouteParams.ASSIGNMENT_ID]: assignmentId,
    [RouteParams.ATTEMPT]: attempt
  } = useParams()

  const navigate = useNavigate()
  const location = useLocation()
  const [alert, setAlert] = useState<CustomAlertState | null>(
    () => (location.state as any)?.alert ?? null
  )

  useEffect(() => {
    // clear alert from state when the component mounts
    if ((location.state as any)?.alert) {
      navigate(location.pathname.replace(/\/+$/, ""), {
        replace: true
      })
    }
  }, [location.state, location.pathname, navigate])

  const queryClient = useQueryClient()

  const detailsQuery = useQuery<QueryAssignmentSubmitDetailsFullRes, Error>({
    queryKey: ["studentAssignmentDetails", assignmentId, attempt],
    enabled: !!assignmentId && !!attempt,
    queryFn: () =>
      assignmentApi
        .assignmentQueryAssignmentSubmitDetailsFull(
          Number(assignmentId),
          Number(attempt)
        )
        .then(r => r.data),
    placeholderData: prev => prev,
    refetchInterval: 15000
  })
  const data = detailsQuery.data

  if (detailsQuery.isLoading && !data) {
    return <SubmissionSkeleton />
  }

  if (detailsQuery.isError) {
    return (
      <ErrorLoading
        onRetry={() =>
          queryClient.invalidateQueries({
            queryKey: ["studentAssignmentDetails", assignmentId, attempt]
          })
        }
      />
    )
  }

  return (
    <>
      <Box sx={{ display: "flex", justifyContent: "center" }}>
        <SelectSearchField
          label={`${t(
            TranslationKey.STUDENT_ASSIGNMENT_DETAILS_ATTEMPT
          )} (${attempt ?? "?"}/${data?.numberOfSubmits ?? 0})`}
          items={
            data
              ? Array.from({ length: data.numberOfSubmits }, (_, i) => ({
                  attempt: i + 1
                }))
              : []
          }
          value={attempt ? Number(attempt) : undefined}
          valueKey="attempt"
          labelKey="attempt"
          onChange={sel =>
            navigate(
              getParametrizedUrl(RouteKeys.STUDENT_ASSIGNMENT_DETAILS, {
                [RouteParams.ASSIGNMENT_ID]: assignmentId?.toString(),
                [RouteParams.ATTEMPT]: sel.attempt.toString()
              })
            )
          }
          sx={{ mb: 2, width: 220 }}
        />
      </Box>

      <Box
        sx={{
          display: (data?.results.length ?? 0) === 1 ? "flex" : "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 2,
          width: "100%",
          maxWidth: 1200,
          justifyContent: "center"
        }}
      >
        {data &&
          data.results.map((result, index) => (
            <Card
              key={index}
              sx={{
                width: (data?.results.length ?? 0) === 1 ? "50%" : "100%"
              }}
            >
              <CardHeader
                title={
                  <Typography variant="h6" sx={{ textAlign: "center" }}>
                    <strong>
                      {t(TranslationKey.STUDENT_ASSIGNMENT_DETAILS_HOSTS)}:{" "}
                    </strong>
                    {result.hosts}
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
                  <CardSingleDetail
                    title={t(TranslationKey.STUDENT_ASSIGNMENT_DETAILS_NETWORK)}
                    submitted={result.network.submitted || ""}
                    correct={result.network.correct}
                  />
                  <CardSingleDetail
                    title={t(
                      TranslationKey.STUDENT_ASSIGNMENT_DETAILS_FIRST_USABLE
                    )}
                    submitted={result.firstUsable.submitted || ""}
                    correct={result.firstUsable.correct}
                  />
                  <CardSingleDetail
                    title={t(
                      TranslationKey.STUDENT_ASSIGNMENT_DETAILS_LAST_USABLE
                    )}
                    submitted={result.lastUsable.submitted || ""}
                    correct={result.lastUsable.correct}
                  />
                  <CardSingleDetail
                    title={t(TranslationKey.STUDENT_ASSIGNMENT_DETAILS_BROADCAST)}
                    submitted={result.broadcast.submitted || ""}
                    correct={result.broadcast.correct}
                  />
                </Stack>
              </CardContent>
            </Card>
          ))}
      </Box>

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

export default StudentAssignmentDetails