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
  Stack,
  Typography
} from "@mui/material"
import { TranslationKey } from "../../utils/i18n"
import SelectSearchField from "../../components/SelectSearchField"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import ErrorLoading from "../../components/ErrorLoading"
import SubmissionSkeleton from "../../components/SubmissionSkeleton"
import CardSingleDetail from "../../components/AssignmentCardSingleDetail"

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

  const data = detailsQuery.data

  if (detailsQuery.isLoading && !data) {
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
      <Box sx={{ display: "flex", justifyContent: "center" }}>
        <SelectSearchField
          label={`${t(
            TranslationKey.TEACHER_ASSIGNMENT_GROUP_DETAILS_SUBMIT_ATTEMPT
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
          onChange={selected =>
            navigate(
              getParametrizedUrl(
                RouteKeys.TEACHER_ASSIGNMENT_GROUPS_DETAILS_SUBMIT,
                {
                  [RouteParams.ASSIGNMENT_GROUP_ID]:
                    assignmentGroupId?.toString(),
                  [RouteParams.ASSIGNMENT_ID]: assignmentId?.toString(),
                  [RouteParams.ATTEMPT]: selected.attempt.toString()
                }
              )
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