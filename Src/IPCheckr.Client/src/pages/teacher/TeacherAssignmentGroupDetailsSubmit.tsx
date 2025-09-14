import { useTranslation } from "react-i18next"
import { useNavigate, useParams } from "react-router-dom"
import { getParametrizedUrl, RouteKeys, RouteParams } from "../../router/routes"
import { assignmentApi } from "../../utils/apiClients"
import type { QueryAssignmentSubmitDetailsFullRes } from "../../dtos"
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Grid,
  Pagination,
  Stack,
  Typography
} from "@mui/material"
import { TranslationKey } from "../../utils/i18n"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import ErrorLoading from "../../components/ErrorLoading"
import SubmissionSkeleton from "../../components/SubmissionSkeleton"
import CardSingleDetail from "../../components/AssignmentCardSingleDetail"
import StatsCard from "../../components/StatsCard"
import { AccessTime, Percent, Person, PlaylistAddCheck, TaskAlt } from "@mui/icons-material"
import { useMemo } from "react"

const TeacherAssignmentGroupDetailsSubmit = () => {
  const { t } = useTranslation()
  const {
    [RouteParams.ASSIGNMENT_GROUP_ID]: assignmentGroupId,
    [RouteParams.ASSIGNMENT_ID]: assignmentId,
    [RouteParams.ATTEMPT]: attempt
  } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const detailsQuery = useQuery<QueryAssignmentSubmitDetailsFullRes, Error>({
    queryKey: ["teacherAssignmentSubmitDetails", assignmentId, attempt],
    enabled: !!assignmentId && !!attempt,
    queryFn: () =>
      assignmentApi
        .assignmentQueryAssignmentSubmitDetailsFull(
          Number(assignmentId),
          Number(attempt)
        )
        .then(r => r.data),
    placeholderData: prev => prev
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
            queryKey: ["teacherAssignmentSubmitDetails", assignmentId, attempt]
          })
        }
      />
    )
  }

  return (
    <>
      <Stack spacing={2}>
       <Grid container spacing={2}>
          <Grid flex={1}>
            <Stack spacing={2}>
              <StatsCard
                title={t(TranslationKey.TEACHER_ASSIGNMENT_GROUP_DETAILS_SUBMIT_NAME)}
                value={detailsQuery.data?.studentName ?? "-"}
                icon={<Person />}
              />
            </Stack>
          </Grid>
        </Grid>

        <Grid container spacing={2}>
          <Grid flex={1}>
            <Stack spacing={2}>
              <StatsCard
                title={t(TranslationKey.TEACHER_ASSIGNMENT_GROUP_DETAILS_SUBMIT_SUCCESS_RATE)}
                value={`${detailsQuery.data?.successRate.toFixed(2)}%`}
                icon={<Percent />}
              />
              <StatsCard
                title={t(TranslationKey.TEACHER_ASSIGNMENT_GROUP_DETAILS_SUBMIT_ATTEMPT)}
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
                            RouteKeys.TEACHER_ASSIGNMENT_GROUPS_DETAILS_SUBMIT,
                            {
                              [RouteParams.ASSIGNMENT_GROUP_ID]: assignmentGroupId?.toString(),
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
            </Stack>
          </Grid>

          <Grid flex={1}>
            <Stack spacing={2}>
              <StatsCard
                title={t(TranslationKey.TEACHER_ASSIGNMENT_GROUP_DETAILS_SUBMIT_SUBMITTED_AT)}
                value={detailsQuery.data?.submittedAt
                  ? new Date(detailsQuery.data.submittedAt).toLocaleString() : "-"}
                icon={<AccessTime />}
              />
              <StatsCard
                title={t(TranslationKey.TEACHER_ASSIGNMENT_GROUP_DETAILS_SUBMIT_CORRECT)}
                value={
                  correctStats ? `${correctStats.correct}/${correctStats.total}` : "-"
                }
                icon={<TaskAlt />}
              />
            </Stack>
          </Grid>

        </Grid>
      </Stack>

      <Divider sx={{ my: 2 }} />

      <Box
        sx={{
          display: (detailsQuery.data?.results.length ?? 0) === 1 ? "flex" : "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 2,
          width: "100%",
          maxWidth: 1200,
          justifyContent: "center"
        }}
      >
        {detailsQuery.data &&
          detailsQuery.data.results.map((result, index) => (
            <Card key={index} sx={{ width: "100%" }}>
              <CardHeader
                title={
                  <Typography variant="h6" sx={{ textAlign: "center" }}>
                    <strong>
                      {t(
                        TranslationKey
                          .TEACHER_ASSIGNMENT_GROUP_DETAILS_SUBMIT_HOSTS
                      )}
                      :{" "}
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
                    title={t(
                      TranslationKey
                        .TEACHER_ASSIGNMENT_GROUP_DETAILS_SUBMIT_NETWORK
                    )}
                    submitted={result.network.submitted || ""}
                    correct={result.network.correct}
                  />
                  <CardSingleDetail
                    title={t(
                      TranslationKey
                        .TEACHER_ASSIGNMENT_GROUP_DETAILS_SUBMIT_FIRST_USABLE
                    )}
                    submitted={result.firstUsable.submitted || ""}
                    correct={result.firstUsable.correct}
                  />
                  <CardSingleDetail
                    title={t(
                      TranslationKey
                        .TEACHER_ASSIGNMENT_GROUP_DETAILS_SUBMIT_LAST_USABLE
                    )}
                    submitted={result.lastUsable.submitted || ""}
                    correct={result.lastUsable.correct}
                  />
                  <CardSingleDetail
                    title={t(
                      TranslationKey
                        .TEACHER_ASSIGNMENT_GROUP_DETAILS_SUBMIT_BROADCAST
                    )}
                    submitted={result.broadcast.submitted || ""}
                    correct={result.broadcast.correct}
                  />
                </Stack>
              </CardContent>
            </Card>
          ))}
      </Box>
    </>
  )
}

export default TeacherAssignmentGroupDetailsSubmit