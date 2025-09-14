import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useParams, useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { BarChart, LineChart } from "@mui/x-charts"
import TableSkeleton from "../../components/TableSkeleton"
import CardsSkeleton from "../../components/CardsSkeleton"
import ErrorLoading from "../../components/ErrorLoading"
import StatsCard from "../../components/StatsCard"
import { TranslationKey } from "../../utils/i18n"
import { classApi } from "../../utils/apiClients"
import type { QueryClassDetailsRes } from "../../dtos"
import {
  AccessTime,
  Class,
  Groups,
  Percent,
  Quiz,
  TaskAlt,
} from "@mui/icons-material"
import { getParametrizedUrl, RouteKeys, RouteParams } from "../../router/routes"

const AdminClassDetails = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { [RouteParams.CLASS_ID]: classId } = useParams()

  const detailsQuery = useQuery<QueryClassDetailsRes, Error>({
    queryKey: ["teacherClassDetails", classId],
    enabled: !!classId,
    queryFn: () => classApi.classQueryClassDetails(Number(classId)).then(r => r.data),
    placeholderData: prev => prev
  })

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
          queryClient.invalidateQueries({ queryKey: ["teacherClassDetails", classId] })
        }
      />
    )
  }

  const avgStudents = detailsQuery.data?.averageSuccessRateInStudents ?? []
  const avgGroups = detailsQuery.data?.averageSuccessRateInAssignmentGroups ?? []

  return (
    <>
      <Stack spacing={2}>
        <Grid container spacing={2}>
          <Grid flex={1}>
            <Stack spacing={2}>
              <StatsCard
                title={t(TranslationKey.ADMIN_CLASS_DETAILS_CLASS_NAME)}
                value={detailsQuery.data?.className}
                icon={<Class />}
              />
            </Stack>
          </Grid>
        </Grid>

        <Grid container spacing={2}>
          <Grid flex={1}>
            <Stack spacing={2}>
              <StatsCard
                title={t(TranslationKey.ADMIN_CLASS_DETAILS_CREATED_AT)}
                value={new Date(detailsQuery.data?.createdAt ?? "").toLocaleString()}
                icon={<Groups />}
              />
              <Tooltip title={t(TranslationKey.ADMIN_CLASS_DETAILS_AVERAGE_SUCCESS_RATE_TOOLTIP)}>
                <Box>
                  <StatsCard
                    title={t(TranslationKey.ADMIN_CLASS_DETAILS_AVERAGE_SUCCESS_RATE)}
                    value={`${detailsQuery.data?.averageSuccessRate.toFixed(2)}%`}
                    icon={<Percent />}
                  />
                </Box>
              </Tooltip>
              <StatsCard
                title={t(TranslationKey.ADMIN_CLASS_DETAILS_LAST_SUBMIT)}
                value={
                  detailsQuery.data?.lastSubmitUsername ? (
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                      <span>{detailsQuery.data.lastSubmitUsername}</span>
                      {detailsQuery.data.lastSubmitAt && (
                        <Chip
                          size="small"
                          icon={<AccessTime />}
                          label={new Date(detailsQuery.data.lastSubmitAt).toLocaleString()}
                          variant="outlined"
                        />
                      )}
                    </Stack>
                  ) : ("-")
                }
                icon={<AccessTime />}
              />
              <StatsCard
                title={t(TranslationKey.ADMIN_CLASS_DETAILS_TOTAL_SUBMITS)}
                value={detailsQuery.data?.totalSubmits}
                icon={<TaskAlt />}
              />
            </Stack>
          </Grid>

          <Grid flex={1}>
            <Stack spacing={2}>
              <StatsCard
                title={t(TranslationKey.ADMIN_CLASS_DETAILS_TOTAL_ASSIGNMENT_GROUPS)}
                value={detailsQuery.data?.totalAssignmentGroups}
                icon={<Quiz />}
              />
              <StatsCard
                title={t(TranslationKey.ADMIN_CLASS_DETAILS_TOTAL_UPCOMING)}
                value={detailsQuery.data?.totalUpcoming}
                icon={<AccessTime />}
                color="default"
              />
              <StatsCard
                title={t(TranslationKey.ADMIN_CLASS_DETAILS_TOTAL_IN_PROGRESS)}
                value={detailsQuery.data?.totalInProgress}
                icon={<AccessTime />}
                color="warning"
              />
              <StatsCard
                title={t(TranslationKey.ADMIN_CLASS_DETAILS_TOTAL_ENDED)}
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
                  {t(TranslationKey.ADMIN_CLASS_DETAILS_STUDENTS)}
                </Typography>

                {detailsQuery.data?.students?.length ? (
                  <Stack spacing={1} sx={{ mt: 1 }}>
                    {detailsQuery.data.students.map(s => (
                      <Stack
                        key={s.studentId}
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                        sx={{
                          border: theme => `1px solid ${theme.palette.divider}`,
                          borderRadius: 1,
                          p: 1
                        }}
                      >
                        <Typography variant="body2">{s.username}</Typography>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() =>
                            navigate(
                              getParametrizedUrl(RouteKeys.ADMIN_USER_DETAILS, {
                                [RouteParams.USER_ID]: s.studentId.toString()
                              })
                            )
                          }
                        >
                          {t(TranslationKey.ADMIN_CLASS_DETAILS_SHOW_DETAILS)}
                        </Button>
                      </Stack>
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {t(TranslationKey.ADMIN_CLASS_DETAILS_NO_STUDENTS)}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Box>

          <Box flex={1}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="overline" color="text.secondary">
                  {t(TranslationKey.ADMIN_CLASS_DETAILS_TEACHERS)}
                </Typography>

                {detailsQuery.data?.teachers?.length ? (
                  <Stack spacing={1} sx={{ mt: 1 }}>
                    {detailsQuery.data.teachers.map(te => (
                      <Stack
                        key={te.teacherId}
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                        sx={{
                          border: theme => `1px solid ${theme.palette.divider}`,
                          borderRadius: 1,
                          p: 1
                        }}
                      >
                        <Typography variant="body2">{te.username}</Typography>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() =>
                            navigate(
                              getParametrizedUrl(RouteKeys.ADMIN_USER_DETAILS, {
                                [RouteParams.USER_ID]: te.teacherId.toString()
                              })
                            )
                          }
                        >
                          {t(TranslationKey.ADMIN_CLASS_DETAILS_SHOW_DETAILS)}
                        </Button>
                      </Stack>
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {t(TranslationKey.ADMIN_CLASS_DETAILS_NO_STUDENTS)}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Box>
        </Stack>

        <Box sx={{ display: "flex", gap: 2 }}>
          <Box sx={{ flex: 3 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="overline" color="text.secondary">
                  {t(TranslationKey.ADMIN_CLASS_DETAILS_AVERAGE_IN_STUDENTS)}
                </Typography>
                {(avgStudents.length ?? 0) > 0 ? (
                  <BarChart
                    height={300}
                    xAxis={[
                      {
                        scaleType: "band",
                        data: avgStudents.map(s => s.username),
                      },
                    ]}
                    series={[
                      {
                        data: avgStudents.map(s => s.percentage),
                        label: t(TranslationKey.ADMIN_CLASS_DETAILS_PERCENTAGE),
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
                    margin={{ left: 60, right: 20, top: 20, bottom: 40 }}
                  />
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    {t(TranslationKey.ADMIN_CLASS_DETAILS_NO_DATA)}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Box>

          <Box sx={{ flex: 2 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="overline" color="text.secondary">
                  {t(TranslationKey.ADMIN_CLASS_DETAILS_AVERAGE_IN_ASSIGNMENT_GROUPS)}
                </Typography>
                {(avgGroups.length ?? 0) > 0 ? (
                  <LineChart
                    height={300}
                    xAxis={[
                      {
                        scaleType: "point",
                        data: avgGroups.map(g => g.assignmentGroupName),
                      },
                    ]}
                    series={[
                      {
                        data: avgGroups.map(g => g.percentage),
                        label: t(TranslationKey.ADMIN_CLASS_DETAILS_PERCENTAGE),
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
                    margin={{ left: 60, right: 20, top: 20, bottom: 40 }}
                  />
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    {t(TranslationKey.ADMIN_CLASS_DETAILS_NO_DATA)}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Box>
        </Box>
      </Stack>
    </>
  )
}

export default AdminClassDetails