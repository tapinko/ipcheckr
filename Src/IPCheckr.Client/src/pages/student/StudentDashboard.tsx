import {
  Box,
  Button,
  Divider,
  Grid,
  Stack,
  Typography,
  Card,
  CardContent,
} from "@mui/material"
import { TranslationKey } from "../../utils/i18n"
import { useTranslation } from "react-i18next"
import TableSkeleton from "../../components/TableSkeleton"
import CardsSkeleton from "../../components/CardsSkeleton"
import ErrorLoading from "../../components/ErrorLoading"
import StatsCard from "../../components/StatsCard"
import { AccessTime, Class, Groups, School, TaskAlt, Quiz } from "@mui/icons-material"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { dashboardApi } from "../../utils/apiClients"
import type { QueryStudentDashboardRes } from "../../dtos"
import { useAuth } from "../../contexts/AuthContext"
import { LineChart } from "@mui/x-charts"
import { getParametrizedUrl, RouteKeys, RouteParams } from "../../router/routes"
import { useNavigate } from "react-router-dom"

const StudentDashboard = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { userId } = useAuth()
  const queryClient = useQueryClient()

  const dashboardQuery = useQuery<QueryStudentDashboardRes, Error>({
    queryKey: ["studentDashboard", userId],
    enabled: !!userId,
    queryFn: () => dashboardApi.dashboardQueryStudentDashboard().then(r => r.data),
    placeholderData: prev => prev,
  })

  return (
    <>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
        <Typography variant="h5">{t(TranslationKey.STUDENT_DASHBOARD_TITLE)}</Typography>
      </Box>

      <Divider sx={{ my: 2 }} />

      {dashboardQuery.isLoading ? (
        <>
          <TableSkeleton />
          <CardsSkeleton />
        </>
      ) : dashboardQuery.isError ? (
        <ErrorLoading
          onRetry={() =>
            queryClient.invalidateQueries({ queryKey: ["studentDashboard"] })
          }
        />
      ) : (<Stack spacing={2}>
        <Grid container spacing={2}>
          <Grid flex={1}>
            <Stack spacing={2}>
              <StatsCard
                title={t(TranslationKey.STUDENT_DASHBOARD_INSTITUTION_NAME)}
                value={dashboardQuery.data?.institutionName ?? "-"}
                icon={<School />}
              />
            </Stack>
          </Grid>
        </Grid>

        <Grid container spacing={2}>
          <Grid flex={1}>
            <Stack spacing={2}>
              <StatsCard
                title={t(TranslationKey.STUDENT_DASHBOARD_CLASSES)}
                value={dashboardQuery.data?.classes}
                icon={<Class />}
              />
              <StatsCard
                title={t(TranslationKey.STUDENT_DASHBOARD_STUDENTS)}
                value={dashboardQuery.data?.teachers}
                icon={<Groups />}
              />
              <StatsCard
                title={t(TranslationKey.STUDENT_DASHBOARD_TOTAL_SUBMITS)}
                value={dashboardQuery.data?.totalSubmits}
                icon={<TaskAlt />}
              />
              <StatsCard
                title={t(TranslationKey.STUDENT_DASHBOARD_LAST_SUBMIT)}
                value={
                  dashboardQuery.data?.lastSubmitAt ? (
                      new Date(dashboardQuery.data.lastSubmitAt).toLocaleString()
                  ) : ("-")
                }
                icon={<AccessTime />}
                actions={
                  <Button variant="outlined" onClick={() => 
                    navigate(
                      getParametrizedUrl(RouteKeys.STUDENT_ASSIGNMENT_DETAILS, {
                        [RouteParams.ASSIGNMENT_ID]: dashboardQuery.data?.lastSubmitId!.toString(),
                        [RouteParams.ATTEMPT]: "1"
                      })
                    )}
                  >
                    {t(TranslationKey.STUDENT_DASHBOARD_SHOW_DETAILS)}
                  </Button>
                }
              />
            </Stack>
          </Grid>

          <Grid flex={1}>
            <Stack spacing={2}>
              <StatsCard
                title={t(TranslationKey.STUDENT_DASHBOARD_TOTAL_ASSIGNMENT_GROUPS)}
                value={dashboardQuery.data?.totalAssignmentGroups}
                icon={<Quiz />}
              />
              <StatsCard
                title={t(TranslationKey.STUDENT_DASHBOARD_TOTAL_UPCOMING)}
                value={dashboardQuery.data?.totalUpcoming}
                icon={<AccessTime />}
                color="default"
              />
              <StatsCard
                title={t(TranslationKey.STUDENT_DASHBOARD_TOTAL_IN_PROGRESS)}
                value={dashboardQuery.data?.totalInProgress}
                icon={<AccessTime />}
                color="warning"
              />
              <StatsCard
                title={t(TranslationKey.STUDENT_DASHBOARD_TOTAL_ENDED)}
                value={dashboardQuery.data?.totalEnded}
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
                {t(TranslationKey.STUDENT_DASHBOARD_SUCCESS_RATE)}
              </Typography>
              {(dashboardQuery.data?.successRate?.length ?? 0) > 0 ? (
                <LineChart
                  height={300}
                  xAxis={[
                    {
                      scaleType: "point",
                      data: dashboardQuery.data!.successRate!.map(d => d.date),
                      label: t(TranslationKey.STUDENT_DASHBOARD_DATE),
                    },
                  ]}
                  series={[
                    {
                      data: dashboardQuery.data!.successRate!.map(d => d.percentage),
                      label: t(TranslationKey.STUDENT_DASHBOARD_PERCENTAGE),
                      area: true,
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
                  {t(TranslationKey.STUDENT_DASHBOARD_NO_DATA)}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Box>
      </Stack>)}
    </>
  )
}

export default StudentDashboard