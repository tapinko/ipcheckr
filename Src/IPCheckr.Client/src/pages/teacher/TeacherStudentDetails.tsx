import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Stack,
  Tooltip,
  Typography
} from "@mui/material"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate, useParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { LineChart, RadarChart } from "@mui/x-charts"
import { AccessTime, Class, Percent, Person, Quiz, TaskAlt } from "@mui/icons-material"
import TableSkeleton from "../../components/TableSkeleton"
import CardsSkeleton from "../../components/CardsSkeleton"
import ErrorLoading from "../../components/ErrorLoading"
import StatsCard from "../../components/StatsCard"
import { TranslationKey } from "../../utils/i18n"
import type { QueryUserDetailsRes } from "../../dtos"
import { userApi } from "../../utils/apiClients"
import { getParametrizedUrl, RouteKeys, RouteParams } from "../../router/routes"

const TeacherStudentDetails = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { [RouteParams.STUDENT_ID]: studentId } = useParams()

  const detailsQuery = useQuery<QueryUserDetailsRes, Error>({
    queryKey: ["teacherStudentDetails", studentId],
    enabled: !!studentId,
    queryFn: () => userApi.userQueryUserDetails(Number(studentId)).then(r => r.data),
    placeholderData: prev => prev
  })

  const avgNetwork = detailsQuery.data?.averageNetwork ?? 0
  const avgFirst = detailsQuery.data?.averageFirst ?? 0
  const avgLast = detailsQuery.data?.averageLast ?? 0
  const avgBroadcast = detailsQuery.data?.averageBroadcast ?? 0
  const hasAnyAverage =
    [
      detailsQuery.data?.averageNetwork,
      detailsQuery.data?.averageFirst,
      detailsQuery.data?.averageLast,
      detailsQuery.data?.averageBroadcast
    ]
      .some(v => typeof v === "number")

  if (detailsQuery.isLoading && !detailsQuery.data) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <TableSkeleton />
        <CardsSkeleton />
      </Box>
    )
  }

  if (detailsQuery.isError) {
    return (
      <ErrorLoading
        onRetry={() =>
          queryClient.invalidateQueries({ queryKey: ["teacherStudentDetails", studentId] })
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
                title={t(TranslationKey.TEACHER_STUDENT_DETAILS_USERNAME)}
                value={detailsQuery.data?.username}
                icon={<Person />}
              />
            </Stack>
          </Grid>
        </Grid>

        <Grid container spacing={2}>
          <Grid flex={1}>
            <Stack spacing={2}>
              <StatsCard
                title={t(TranslationKey.TEACHER_STUDENT_DETAILS_TOTAL_SUBMITS)}
                value={detailsQuery.data?.totalSubmits}
                icon={<TaskAlt />}
              />

              <StatsCard
                title={t(TranslationKey.TEACHER_STUDENT_DETAILS_LAST_SUBMIT)}
                value={
                  detailsQuery.data?.lastSubmitAt ? (
                      new Date(detailsQuery.data.lastSubmitAt).toLocaleString()
                  ) : ("-")
                }
                icon={<AccessTime />}
                actions={
                  <Button variant="outlined" onClick={() =>
                      navigate(
                        getParametrizedUrl(RouteKeys.TEACHER_ASSIGNMENT_GROUPS_DETAILS_SUBMIT, {
                          [RouteParams.ASSIGNMENT_GROUP_ID]:
                            detailsQuery.data?.lastSubmitGroupId?.toString() ?? "",
                          [RouteParams.ASSIGNMENT_ID]:
                            detailsQuery.data?.lastSubmitAssignmentId?.toString() ?? "",
                          [RouteParams.ATTEMPT]:
                            (detailsQuery.data?.lastSubmitAttempt ?? 1).toString()
                        })
                      )
                    }
                    disabled={
                      !detailsQuery.data?.lastSubmitGroupId ||
                      !detailsQuery.data?.lastSubmitAssignmentId ||
                      !detailsQuery.data?.lastSubmitAttempt
                    }
                  >
                    {t(TranslationKey.TEACHER_STUDENT_DETAILS_SHOW_DETAILS)}
                  </Button>
                }
              />
              <Tooltip title={t(TranslationKey.TEACHER_STUDENT_DETAILS_SUCCESS_RATE_TOOLTIP)}>
                <Box>
                  <StatsCard
                    title={t(TranslationKey.TEACHER_STUDENT_DETAILS_SUCCESS_RATE)}
                    value={`${detailsQuery.data?.averageTotal.toFixed(2)}%`}
                    icon={<Percent />}
                  />
                </Box>
              </Tooltip>
              <StatsCard
                title={t(TranslationKey.TEACHER_STUDENT_DETAILS_CLASSES)}
                value={detailsQuery.data?.classes
                  && detailsQuery.data.classes.length
                  > 0 ? detailsQuery.data.classes.map(c => c.name).join(", ") : "-"}
                icon={<Class />}
              />
            </Stack>
          </Grid>

          <Grid flex={1}>
            <Stack spacing={2}>
              <StatsCard
                title={t(TranslationKey.TEACHER_STUDENT_DETAILS_TOTAL_ASSIGNMENT_GROUPS)}
                value={detailsQuery.data?.totalAssignmentGroups}
                icon={<Quiz />}
              />
              <StatsCard
                title={t(TranslationKey.TEACHER_STUDENT_DETAILS_TOTAL_UPCOMING)}
                value={detailsQuery.data?.totalUpcoming}
                icon={<AccessTime />}
                color="default"
              />
              <StatsCard
                title={t(TranslationKey.TEACHER_STUDENT_DETAILS_TOTAL_IN_PROGRESS)}
                value={detailsQuery.data?.totalInProgress}
                icon={<AccessTime />}
                color="warning"
              />
              <StatsCard
                title={t(TranslationKey.TEACHER_STUDENT_DETAILS_TOTAL_ENDED)}
                value={detailsQuery.data?.totalEnded}
                icon={<AccessTime />}
                color="success"
              />
            </Stack>
          </Grid>
        </Grid>

        <Stack spacing={2} direction="row">
          <Box flex={1}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="overline" color="text.secondary">
                  {t(TranslationKey.TEACHER_STUDENT_DETAILS_AVERAGES)}
                </Typography>

                {hasAnyAverage ? (
                  <RadarChart
                    shape="circular"
                    divisions={4}
                    height={320}
                    series={[
                      {
                        data: [avgNetwork, avgFirst, avgLast, avgBroadcast],
                        label: t(TranslationKey.TEACHER_STUDENT_DETAILS_PERCENTAGE),
                        fillArea: true,
                        valueFormatter: (v: number | null) => `${v?.toFixed(2)}%`
                      }
                    ]}
                    radar={{
                      max: 100,
                      metrics: [
                        t(TranslationKey.TEACHER_STUDENT_DETAILS_NETWORK),
                        t(TranslationKey.TEACHER_STUDENT_DETAILS_FIRST),
                        t(TranslationKey.TEACHER_STUDENT_DETAILS_LAST),
                        t(TranslationKey.TEACHER_STUDENT_DETAILS_BROADCAST)
                      ],
                    }}
                  />
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    {t(TranslationKey.TEACHER_STUDENT_DETAILS_NO_DATA)}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Box>
          <Box flex={1} height="100%">
            <Card variant="outlined">
              <CardContent>
                <Typography variant="overline" color="text.secondary">
                  {t(TranslationKey.TEACHER_STUDENT_DETAILS_SUCCESS_RATE)}
                </Typography>
                {(detailsQuery.data?.successRate?.length ?? 0) > 0 ? (
                  <LineChart
                    height={320}
                    xAxis={[
                      {
                        scaleType: "point",
                        data: detailsQuery.data!.successRate!.map(d => d.date),
                        label: t(TranslationKey.TEACHER_STUDENT_DETAILS_DATE),
                      },
                    ]}
                    series={[
                      {
                        data: detailsQuery.data!.successRate!.map(d => d.percentage),
                        label: t(TranslationKey.TEACHER_STUDENT_DETAILS_PERCENTAGE),
                        area: true,
                        valueFormatter: (v: number | null) => `${v?.toFixed(2)}%`
                      },
                    ]}
                    yAxis={[
                      {
                        min: 0,
                        max: 100,
                        valueFormatter: (v: number) => `${v}%`,
                      },
                    ]}
                  />
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    {t(TranslationKey.TEACHER_STUDENT_DETAILS_NO_DATA)}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Box>
        </Stack>
      </Stack>
    </>
  )
}

export default TeacherStudentDetails