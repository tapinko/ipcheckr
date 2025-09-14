import { useEffect, useState } from "react"
import {
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Tooltip,
  Typography,
  Grid,
  Button
} from "@mui/material"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { useAuth } from "../../contexts/AuthContext"
import { dashboardApi } from "../../utils/apiClients"
import type { QueryTeacherDashboardRes } from "../../dtos"
import ErrorLoading from "../../components/ErrorLoading"
import CardsSkeleton from "../../components/CardsSkeleton"
import { TranslationKey } from "../../utils/i18n"
import { AccessTime, Class, EmojiEvents, Groups, Quiz, School, TaskAlt } from "@mui/icons-material"
import { BarChart } from "@mui/x-charts"
import StatsCard from "../../components/StatsCard"
import TableSkeleton from "../../components/TableSkeleton"
import { useNavigate } from "react-router-dom"
import { getParametrizedUrl, RouteKeys, RouteParams } from "../../router/routes"

const TeacherDashboard = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { userId } = useAuth()
  const queryClient = useQueryClient()

  const [barChartLength, setBarChartLength] = useState<number>(5)

  const dashboardQuery = useQuery<QueryTeacherDashboardRes, Error>({
    queryKey: ["teacherDashboard", userId, barChartLength],
    enabled: !!userId,
    queryFn: () =>
      dashboardApi.dashboardQueryTeacherDashboard(barChartLength).then(r => r.data),
    placeholderData: prev => prev
  })

  useEffect(() => {
    if (barChartLength < 1) setBarChartLength(1)
    else if (barChartLength > 10) setBarChartLength(10)
  }, [barChartLength])

  return (
    <>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
        <Typography variant="h5">{t(TranslationKey.TEACHER_DASHBOARD_TITLE)}</Typography>
        <Box sx={{ flex: 1 }} />
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel id="bar-length-label">{t(TranslationKey.TEACHER_DASHBOARD_BAR_LENGTH)}</InputLabel>
          <Select
            labelId="bar-length-label"
            label={t(TranslationKey.TEACHER_DASHBOARD_BAR_LENGTH)}
            value={barChartLength}
            onChange={e => setBarChartLength(Number(e.target.value))}
          >
            {[...Array(10)].map((_, i) => (
              <MenuItem key={i} value={i + 1}>{i + 1}</MenuItem>
            ))}
          </Select>
        </FormControl>
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
            queryClient.invalidateQueries({ queryKey: ["teacherDashboard"] })
          }
        />
      ) : (<Stack spacing={2}>
        <Grid container spacing={2}>
          <Grid flex={1}>
            <Stack spacing={2}>
              <StatsCard
                title={t(TranslationKey.TEACHER_DASHBOARD_INSTITUTION_NAME)}
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
                title={t(TranslationKey.TEACHER_DASHBOARD_LAST_SUBMIT)}
                value={
                  dashboardQuery.data?.lastSubmitUsername ? (
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                      <span>{dashboardQuery.data.lastSubmitUsername}</span>
                      {dashboardQuery.data.lastSubmitAt && (
                        <Chip
                          size="small"
                          icon={<AccessTime />}
                          label={new Date(dashboardQuery.data.lastSubmitAt).toLocaleString()}
                          variant="outlined"
                        />
                      )}
                    </Stack>
                  ) : ("-")
                }
                icon={<AccessTime />}
                actions={
                  <Button variant="outlined" onClick={() => 
                    navigate(
                      getParametrizedUrl(RouteKeys.TEACHER_ASSIGNMENT_GROUPS_DETAILS_SUBMIT, {
                        [RouteParams.ASSIGNMENT_GROUP_ID]:
                          dashboardQuery.data?.lastSubmitGroupId!.toString(),
                        [RouteParams.ASSIGNMENT_ID]:
                          dashboardQuery.data?.lastSubmitId!.toString(),
                        [RouteParams.ATTEMPT]: "1"
                      })
                    )}
                    disabled={
                      !dashboardQuery.data?.lastSubmitGroupId ||
                      !dashboardQuery.data?.lastSubmitId ||
                      !dashboardQuery.data?.lastSubmitAt ||
                      !dashboardQuery.data?.lastSubmitUsername
                    }
                  >
                    {t(TranslationKey.STUDENT_DASHBOARD_SHOW_DETAILS)}
                  </Button>
                }
              />
              <Tooltip title={t(TranslationKey.TEACHER_DASHBOARD_MOST_SUCCESSFUL_CLASS_TOOLTIP)}>
                <Box component="span" sx={{ display: "block" }}>
                  <StatsCard
                    title={t(TranslationKey.TEACHER_DASHBOARD_MOST_SUCCESSFUL_CLASS)}
                    value={dashboardQuery.data?.mostSuccessfulClass ?? "-"}
                    icon={<Class />}
                  />
                </Box>
              </Tooltip>
              <Tooltip title={t(TranslationKey.TEACHER_DASHBOARD_MOST_SUCCESSFUL_STUDENT_TOOLTIP)}>
                <Box component="span" sx={{ display: "block" }}>
                  <StatsCard
                    title={t(TranslationKey.TEACHER_DASHBOARD_MOST_SUCCESSFUL_STUDENT)}
                    value={dashboardQuery.data?.mostSuccessfulStudent ?? "-"}
                    icon={<EmojiEvents />}
                  />
                </Box>
              </Tooltip>
              <StatsCard
                title={t(TranslationKey.TEACHER_DASHBOARD_CLASSES)}
                value={dashboardQuery.data?.totalClasses}
                icon={<Class />}
              />
              <StatsCard
                title={t(TranslationKey.TEACHER_DASHBOARD_STUDENTS)}
                value={dashboardQuery.data?.totalStudents}
                icon={<Groups />}
              />
            </Stack>
          </Grid>

          <Grid flex={1}>
            <Stack spacing={2}>
              <StatsCard
                title={t(TranslationKey.TEACHER_DASHBOARD_TOTAL_SUBMITS)}
                value={dashboardQuery.data?.totalSubmits}
                icon={<TaskAlt />}
              />
              <StatsCard
                title={t(TranslationKey.TEACHER_DASHBOARD_TOTAL_ASSIGNMENT_GROUPS)}
                value={dashboardQuery.data?.totalAssignmentGroups}
                icon={<Quiz />}
              />
              <StatsCard
                title={t(TranslationKey.TEACHER_DASHBOARD_TOTAL_UPCOMING)}
                value={dashboardQuery.data?.totalUpcoming}
                icon={<AccessTime />}
                color="default"
              />
              <StatsCard
                title={t(TranslationKey.TEACHER_DASHBOARD_TOTAL_IN_PROGRESS)}
                value={dashboardQuery.data?.totalInProgress}
                icon={<AccessTime />}
                color="warning"
              />
              <StatsCard
                title={t(TranslationKey.TEACHER_DASHBOARD_TOTAL_ENDED)}
                value={dashboardQuery.data?.totalEnded}
                icon={<AccessTime />}
                color="success"
              />
            </Stack>
          </Grid>

        </Grid>

        <Box sx={{ display: "flex", gap: 2 }}>
          <Box sx={{ flex: 3 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="overline" color="text.secondary">
                  {t(TranslationKey.TEACHER_DASHBOARD_AVERAGE_IN_STUDENTS)}
                </Typography>
                {(dashboardQuery.data?.averagePercentageInStudents?.length ?? 0) > 0 ? (
                  <BarChart
                    height={300}
                    xAxis={[
                      {
                        scaleType: "band",
                        data:
                          dashboardQuery.data!.averagePercentageInStudents!.map(d => d.username),
                      },
                    ]}
                    series={[
                      {
                        data:
                          dashboardQuery.data!.averagePercentageInStudents!.map(d => d.percentage),
                        label: t(TranslationKey.TEACHER_DASHBOARD_PERCENTAGE),
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
                    {t(TranslationKey.TEACHER_DASHBOARD_NO_DATA)}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Box>

          <Box sx={{ flex: 2 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="overline" color="text.secondary">
                  {t(TranslationKey.TEACHER_DASHBOARD_AVERAGE_IN_CLASSES)}
                </Typography>
                {(dashboardQuery.data?.averagePercentageInClasses?.length ?? 0) > 0 ? (
                  <BarChart
                    height={300}
                    xAxis={[
                      {
                        scaleType: "band",
                        data:
                          dashboardQuery.data!.averagePercentageInClasses!.map(d => d.className),
                      },
                    ]}
                    series={[
                      {
                        data:
                          dashboardQuery.data!.averagePercentageInClasses!.map(d => d.percentage),
                        label: t(TranslationKey.TEACHER_DASHBOARD_PERCENTAGE),
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
                    {t(TranslationKey.TEACHER_DASHBOARD_NO_DATA)}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Box>
        </Box>
      </Stack>)}
    </>
  )
}

export default TeacherDashboard