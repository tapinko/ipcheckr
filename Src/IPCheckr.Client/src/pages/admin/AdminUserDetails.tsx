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
import { AccessTime, MoreTime, Percent, Person, Quiz, TaskAlt } from "@mui/icons-material"
import TableSkeleton from "../../components/TableSkeleton"
import CardsSkeleton from "../../components/CardsSkeleton"
import ErrorLoading from "../../components/ErrorLoading"
import StatsCard from "../../components/StatsCard"
import { TranslationKey } from "../../utils/i18n"
import type { QueryUserDetailsRes, QueryUsersRes } from "../../dtos"
import { userApi } from "../../utils/apiClients"
import { getParametrizedUrl, RouteKeys, RouteParams } from "../../router/routes"
import UserRole from "../../types/UserRole"

const AdminUserDetails = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { [RouteParams.USER_ID]: userId } = useParams()

  const roleQuery = useQuery<QueryUsersRes, Error>({
    queryKey: ["adminUserRole", userId],
    enabled: !!userId,
    queryFn: () => userApi.userQueryUsers(Number(userId)).then(r => r.data),
    placeholderData: prev => prev
  })

  const detailsQuery = useQuery<QueryUserDetailsRes, Error>({
    queryKey: ["adminUserDetails", userId],
    enabled: !!userId,
    queryFn: () => userApi.userQueryUserDetails(Number(userId)).then(r => r.data),
    placeholderData: prev => prev
  })

  const role = roleQuery.data?.users?.[0]?.role
  const isTeacher = role === UserRole.TEACHER

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

  if ((detailsQuery.isLoading || roleQuery.isLoading) && !detailsQuery.data) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <TableSkeleton />
        <CardsSkeleton />
      </Box>
    )
  }

  if (detailsQuery.isError || roleQuery.isError) {
    return (
      <ErrorLoading
        onRetry={() => {
          queryClient.invalidateQueries({ queryKey: ["adminUserDetails", userId] })
          queryClient.invalidateQueries({ queryKey: ["adminUserRole", userId] })
        }}
      />
    )
  }

  if (isTeacher) {
    return (
      <>
        <Stack spacing={2}>
          <Grid container spacing={2}>
            <Grid flex={1}>
              <Stack spacing={2}>
                <StatsCard
                  title={t(TranslationKey.ADMIN_USER_DETAILS_USERNAME)}
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
                  title={t(TranslationKey.ADMIN_USER_DETAILS_CREATED_AT)}
                  value={new Date(detailsQuery.data?.createdAt ?? "").toLocaleDateString()}
                  icon={<MoreTime />}
                />
                {/* <StatsCard
                  title={t(TranslationKey.TEACHER_DASHBOARD_TOTAL_ASSIGNMENT_GROUPS)}
                  value={detailsQuery.data?.totalAssignmentGroups}
                  icon={<Quiz />}
                /> */}
                <StatsCard
                  title={t(TranslationKey.TEACHER_DASHBOARD_TOTAL_UPCOMING)}
                  value={detailsQuery.data?.totalUpcoming}
                  icon={<AccessTime />}
                  color="default"
                />
              </Stack>
            </Grid>
            <Grid flex={1}>
              <Stack spacing={2}>
                <StatsCard
                  title={t(TranslationKey.TEACHER_DASHBOARD_TOTAL_IN_PROGRESS)}
                  value={detailsQuery.data?.totalInProgress}
                  icon={<AccessTime />}
                  color="warning"
                />
                <StatsCard
                  title={t(TranslationKey.TEACHER_DASHBOARD_TOTAL_ENDED)}
                  value={detailsQuery.data?.totalEnded}
                  icon={<AccessTime />}
                  color="success"
                />
              </Stack>
            </Grid>
          </Grid>
          

          <Box>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="overline" color="text.secondary">
                  {t(TranslationKey.ADMIN_USER_DETAILS_CLASSES)}
                </Typography>

                {detailsQuery.data?.classes?.length ? (
                  <Stack spacing={1} sx={{ mt: 1 }}>
                    {detailsQuery.data.classes.map(c => (
                      <Stack
                        key={c.id}
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                        sx={{
                          border: theme => `1px solid ${theme.palette.divider}`,
                          borderRadius: 1,
                          p: 1
                        }}
                      >
                        <Typography variant="body2">{c.name}</Typography>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() =>
                            navigate(
                              getParametrizedUrl(RouteKeys.ADMIN_CLASS_DETAILS, {
                                [RouteParams.CLASS_ID]: c.id.toString()
                              })
                            )
                          }
                        >
                          {t(TranslationKey.ADMIN_USER_DETAILS_SHOW_DETAILS)}
                        </Button>
                      </Stack>
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {t(TranslationKey.ADMIN_USER_DETAILS_NO_CLASSES)}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Box>
        </Stack>
      </>
    )
  }

  return (
    <>
      <Stack spacing={2}>
        <Grid container spacing={2}>
          <Grid flex={1}>
            <Stack spacing={2}>
              <StatsCard
                title={t(TranslationKey.ADMIN_USER_DETAILS_USERNAME)}
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
                title={t(TranslationKey.ADMIN_USER_DETAILS_CREATED_AT)}
                value={new Date(detailsQuery.data?.createdAt ?? "").toLocaleDateString()}
                icon={<MoreTime />}
              />
              <StatsCard
                title={t(TranslationKey.ADMIN_USER_DETAILS_TOTAL_SUBMITS)}
                value={detailsQuery.data?.totalSubmits}
                icon={<TaskAlt />}
              />
              <StatsCard
                title={t(TranslationKey.ADMIN_USER_DETAILS_LAST_SUBMIT)}
                value={
                  detailsQuery.data?.lastSubmitAt ? (
                    new Date(detailsQuery.data.lastSubmitAt).toLocaleString()
                  ) : ("-")
                }
                icon={<AccessTime />}
              />
              <Tooltip title={t(TranslationKey.ADMIN_USER_DETAILS_AVERAGE_SUCCESS_RATE_TOOLTIP)}>
                <Box>
                  <StatsCard
                    title={t(TranslationKey.ADMIN_USER_DETAILS_AVERAGE_SUCCESS_RATE)}
                    value={`${detailsQuery.data?.averageTotal.toFixed(2)}%`}
                    icon={<Percent />}
                  />
                </Box>
              </Tooltip>
            </Stack>
          </Grid>

          <Grid flex={1}>
            <Stack spacing={2}>
              <StatsCard
                title={t(TranslationKey.ADMIN_USER_DETAILS_TOTAL_ASSIGNMENT_GROUPS)}
                value={detailsQuery.data?.totalAssignmentGroups}
                icon={<Quiz />}
              />
              <StatsCard
                title={t(TranslationKey.ADMIN_USER_DETAILS_TOTAL_UPCOMING)}
                value={detailsQuery.data?.totalUpcoming}
                icon={<AccessTime />}
                color="default"
              />
              <StatsCard
                title={t(TranslationKey.ADMIN_USER_DETAILS_TOTAL_IN_PROGRESS)}
                value={detailsQuery.data?.totalInProgress}
                icon={<AccessTime />}
                color="warning"
              />
              <StatsCard
                title={t(TranslationKey.ADMIN_USER_DETAILS_TOTAL_ENDED)}
                value={detailsQuery.data?.totalEnded}
                icon={<AccessTime />}
                color="success"
              />
            </Stack>
          </Grid>
        </Grid>

        <Box>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="overline" color="text.secondary">
                {t(TranslationKey.ADMIN_USER_DETAILS_CLASSES)}
              </Typography>

              {detailsQuery.data?.classes?.length ? (
                <Stack spacing={1} sx={{ mt: 1 }}>
                  {detailsQuery.data.classes.map(c => (
                    <Stack
                      key={c.id}
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                      sx={{
                        border: theme => `1px solid ${theme.palette.divider}`,
                        borderRadius: 1,
                        p: 1
                      }}
                    >
                      <Typography variant="body2">{c.name}</Typography>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() =>
                          navigate(
                            getParametrizedUrl(RouteKeys.ADMIN_CLASS_DETAILS, {
                              [RouteParams.CLASS_ID]: c.id.toString()
                            })
                          )
                        }
                      >
                        {t(TranslationKey.ADMIN_USER_DETAILS_SHOW_DETAILS)}
                      </Button>
                    </Stack>
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {t(TranslationKey.ADMIN_USER_DETAILS_NO_CLASSES)}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Box>

        <Stack spacing={2} direction="row">
          <Box flex={1}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="overline" color="text.secondary">
                  {t(TranslationKey.ADMIN_USER_DETAILS_AVERAGES)}
                </Typography>

                {hasAnyAverage ? (
                  <RadarChart
                    shape="circular"
                    divisions={4}
                    height={320}
                    series={[
                      {
                        data: [avgNetwork, avgFirst, avgLast, avgBroadcast],
                        label: t(TranslationKey.ADMIN_USER_DETAILS_PERCENTAGE),
                        fillArea: true,
                        valueFormatter: (v: number) => `${v.toFixed(2)}%`,
                      }
                    ]}
                    radar={{
                      max: 100,
                      metrics: [
                        t(TranslationKey.ADMIN_USER_DETAILS_NETWORK),
                        t(TranslationKey.ADMIN_USER_DETAILS_FIRST),
                        t(TranslationKey.ADMIN_USER_DETAILS_LAST),
                        t(TranslationKey.ADMIN_USER_DETAILS_BROADCAST)
                      ],
                    }}
                  />
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    {t(TranslationKey.ADMIN_USER_DETAILS_NO_DATA)}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Box>
          <Box flex={1} height="100%">
            <Card variant="outlined">
              <CardContent>
                <Typography variant="overline" color="text.secondary">
                  {t(TranslationKey.ADMIN_USER_DETAILS_AVERAGE_SUCCESS_RATE)}
                </Typography>
                {(detailsQuery.data?.successRate?.length ?? 0) > 0 ? (
                  <LineChart
                    height={320}
                    xAxis={[
                      {
                        scaleType: "point",
                        data: detailsQuery.data!.successRate!.map(d => d.date),
                        label: t(TranslationKey.ADMIN_USER_DETAILS_DATE),
                      },
                    ]}
                    series={[
                      {
                        data: detailsQuery.data!.successRate!.map(d => d.percentage),
                        label: t(TranslationKey.ADMIN_USER_DETAILS_PERCENTAGE),
                        area: true,
                      },
                    ]}
                    yAxis={[
                      {
                        min: 0,
                        max: 100,
                        valueFormatter: (v: number) => `${v.toFixed(2)}%`,
                      },
                    ]}
                  />
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    {t(TranslationKey.ADMIN_USER_DETAILS_NO_DATA)}
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

export default AdminUserDetails