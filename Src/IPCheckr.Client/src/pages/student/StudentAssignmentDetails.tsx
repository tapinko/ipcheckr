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
  Pagination,
  Stack,
  Typography
} from "@mui/material"
import { TranslationKey } from "../../utils/i18n"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import ErrorLoading from "../../components/ErrorLoading"
import SubmissionSkeleton from "../../components/SubmissionSkeleton"
import { CustomAlert, type CustomAlertState } from "../../components/CustomAlert"
import { useEffect, useMemo, useState } from "react"
import CardSingleDetail from "../../components/AssignmentCardSingleDetail"
import StatsCard from "../../components/StatsCard"
import { AccessTime, Category, Percent, Person, PlaylistAddCheck, TaskAlt } from "@mui/icons-material"
import { getIpCatLabel } from "../../utils/getIpCatLabel"
import ResponsiveStatsSection from "../../components/ResponsiveStatsSection"

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

  const correctStats = useMemo(() => {
    const results = detailsQuery.data?.results
    if (!results || results.length === 0) return null
    const fields = ["network", "firstUsable", "lastUsable", "broadcast"] as const
    let total = results.length * fields.length
    let correct = 0
    for (const r of results) {
      for (const f of fields) {
        const submitted = r[f].submitted
        const expected = r[f].correct
        if (submitted !== undefined && submitted !== null && submitted !== "" && submitted === expected) {
          correct++
        }
      }
    }
    return { correct, total }
  }, [detailsQuery.data])

  if (detailsQuery.isLoading && !detailsQuery.data) {
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

  const isSingleResult = (detailsQuery.data?.results.length ?? 0) === 1

  return (
    <>
      <Stack spacing={2}>
        <ResponsiveStatsSection
          highlight={
            <StatsCard
              title={t(TranslationKey.STUDENT_ASSIGNMENT_DETAILS_ASSIGNMENT_GROUP_NAME)}
              value={detailsQuery.data?.assignmentGroupName ?? "-"}
              icon={<Person />}
            />
          }
          leftColumn={[
            <StatsCard
              title={t(TranslationKey.STUDENT_ASSIGNMENT_DETAILS_DESCRIPTION)}
              value={detailsQuery.data?.description === ""
                ? "-" : detailsQuery.data?.description}
              icon={<Percent />}
            />,
            <StatsCard
              title={t(TranslationKey.STUDENT_ASSIGNMENT_DETAILS_SUCCESS_RATE)}
              value={detailsQuery.data?.successRate}
              icon={<Percent />}
            />,
            <StatsCard
              title={t(TranslationKey.STUDENT_ASSIGNMENT_DETAILS_ATTEMPT)}
              value={attempt}
              icon={<PlaylistAddCheck />}
              actions={
                detailsQuery.data?.numberOfSubmits ? (
                  <Pagination
                    count={detailsQuery.data.numberOfSubmits}
                    page={attempt ? Number(attempt) : 1}
                    onChange={(_, attempt) =>
                      navigate(
                        getParametrizedUrl(
                          RouteKeys.STUDENT_ASSIGNMENT_DETAILS,
                          {
                            [RouteParams.ASSIGNMENT_ID]: assignmentId?.toString(),
                            [RouteParams.ATTEMPT]: attempt.toString()
                          }
                        )
                      )
                    }
                    siblingCount={0}
                    boundaryCount={0}
                    size="small"
                  />
                ) : null
              }
            />
          ]}
          rightColumn={[
            <StatsCard
              title={t(TranslationKey.STUDENT_ASSIGNMENT_DETAILS_IP_CATEGORY)}
              value={
                detailsQuery.data?.assignmentGroupIpCat
                  ? getIpCatLabel(detailsQuery.data.assignmentGroupIpCat, t)
                  : "-"
              }
              icon={<Category />}
            />,
            <StatsCard
              title={t(TranslationKey.STUDENT_ASSIGNMENT_DETAILS_SUBMITTED_AT)}
              value={detailsQuery.data?.submittedAt
                ? new Date(detailsQuery.data.submittedAt).toLocaleString() : "-"}
              icon={<AccessTime />}
            />,
            <StatsCard
              title={t(TranslationKey.STUDENT_ASSIGNMENT_DETAILS_CORRECT)}
              value={
                correctStats ? `${correctStats.correct}/${correctStats.total}` : "-"
              }
              icon={<TaskAlt />}
            />
          ]}
        />
      </Stack>

      <Divider sx={{ my: 2 }} />

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            md: isSingleResult ? "1fr" : "repeat(2, 1fr)"
          },
          gap: 2,
          width: "100%",
          maxWidth: 1200,
          justifyContent: "center",
          justifyItems: isSingleResult ? "center" : "stretch"
        }}
      >
        {detailsQuery.data &&
          detailsQuery.data.results.map((result, index) => (
            <Card
              key={index}
              sx={{
                width: (detailsQuery.data?.results.length ?? 0) === 1 ? "50%" : "100%"
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