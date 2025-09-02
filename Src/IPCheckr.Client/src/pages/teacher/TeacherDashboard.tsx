import { useEffect, useState, type ReactElement, type ReactNode } from "react"
import {
  Avatar,
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
  Grid
} from "@mui/material"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { useAuth } from "../../contexts/AuthContext"
import { dashboardApi } from "../../utils/apiClients"
import type { QueryTeacherDashboardRes } from "../../dtos"
import ErrorLoading from "../../components/ErrorLoading"
import CardsSkeleton from "../../components/CardsSkeleton"
import { TranslationKey } from "../../utils/i18n"
import { AccessTime, Class, EmojiEvents, Groups, School } from "@mui/icons-material"
import { BarChart } from "@mui/x-charts"

interface IStatsCardProps {
  title: string
  value: ReactNode
  icon: ReactElement
}

const StatsCard = ({
  title,
  value,
  icon
}: IStatsCardProps) => (
  <Card variant="outlined">
    <CardContent>
      <Stack direction="row" spacing={2} alignItems="center">
        <Avatar sx={{ bgcolor: "primary.main" }}>{icon}</Avatar>
        <Box>
          <Typography variant="overline" color="text.secondary">
            {title}
          </Typography>
          <Typography variant="h6">{value}</Typography>
        </Box>
      </Stack>
    </CardContent>
  </Card>
)

const TeacherDashboard = () => {
  const { t } = useTranslation()
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
        <CardsSkeleton />
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
            </Stack>
          </Grid>

          <Grid flex={1}>
            <Stack spacing={2}>
              <StatsCard
                title={t(TranslationKey.TEACHER_DASHBOARD_INSTITUTION_NAME)}
                value={dashboardQuery.data?.institutionName ?? "-"}
                icon={<School />}
              />
              <StatsCard
                title={t(TranslationKey.TEACHER_DASHBOARD_CLASSES)}
                value={dashboardQuery.data?.totalClasses ?? 0}
                icon={<Class />}
              />
              <StatsCard
                title={t(TranslationKey.TEACHER_DASHBOARD_STUDENTS)}
                value={dashboardQuery.data?.totalStudents ?? 0}
                icon={<Groups />}
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
                          dashboardQuery.data!.averagePercentageInClasses!.map(d => d.username),
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