import {
  Box,
  Stack,
  Typography,
  Card,
  CardContent,
} from "@mui/material"
import { TranslationKey } from "../../utils/i18n"
import { useTranslation } from "react-i18next"
import InsightGridSkeleton from "../../components/skeletons/InsightGridSkeleton"
import ErrorLoading from "../../components/ui/ErrorLoading"
import AccessTime from "@mui/icons-material/AccessTime"
import Class from "@mui/icons-material/Class"
import Groups from "@mui/icons-material/Groups"
import School from "@mui/icons-material/School"
import TaskAlt from "@mui/icons-material/TaskAlt"
import Quiz from "@mui/icons-material/Quiz"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { dashboardApi } from "../../utils/apiClients"
import { type QueryStudentDashboardRes } from "../../dtos"
import { useAuth } from "../../contexts/AuthContext"
import { LazyLineChart } from "../../components/charts/LazyCharts"
import { getParametrizedUrl, RouteKeys, RouteParams } from "../../router/routes"
import { useNavigate } from "react-router-dom"

import InsightCard from "../../components/ui/InsightCard"

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

  const hasLastSubmitTarget =
    !!dashboardQuery.data?.lastSubmitId &&
    !!dashboardQuery.data?.lastSubmitType

  const handleLastSubmitNavigate = () => {
    const { lastSubmitId, lastSubmitType } = dashboardQuery.data ?? {}
    if (!lastSubmitId || !lastSubmitType) return

    navigate(
      getParametrizedUrl(RouteKeys.STUDENT_ASSIGNMENT_DETAILS, {
        [RouteParams.ASSIGNMENT_ID]: lastSubmitId.toString(),
        [RouteParams.ASSIGNMENT_GROUP_TYPE]: lastSubmitType
      })
    )
  }

  return (
    <>
      {dashboardQuery.isLoading ? (
        <InsightGridSkeleton count={8} columnsMax={3} />
      ) : dashboardQuery.isError ? (
        <ErrorLoading
          onRetry={() =>
            queryClient.invalidateQueries({ queryKey: ["studentDashboard"] })
          }
        />
      ) : (<Stack spacing={2}>
        <Card variant="outlined" sx={{ borderColor: "divider", backgroundColor: "background.paper" }}>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
              <School fontSize="small" color="action" />
              <Typography variant="h6" fontWeight={800}>
                {dashboardQuery.data?.institutionName ?? "-"}
              </Typography>
            </Stack>
          </CardContent>
        </Card>

        <Box
          sx={{
            display: "grid",
            gap: theme => theme.spacing(1.25),
            gridTemplateColumns: {
              xs: "1fr",
              md: "repeat(3, minmax(0, 1fr))"
            }
          }}
        >
          <Stack spacing={1.25}>
            <InsightCard
              title={t(TranslationKey.STUDENT_DASHBOARD_TOTAL_UPCOMING)}
              value={dashboardQuery.data?.totalUpcoming ?? "-"}
              icon={<AccessTime />}
              dense
            />
            <InsightCard
              title={t(TranslationKey.STUDENT_DASHBOARD_TOTAL_IN_PROGRESS)}
              value={dashboardQuery.data?.totalInProgress ?? "-"}
              icon={<AccessTime />}
              tone="warning"
              dense
            />
            <InsightCard
              title={t(TranslationKey.STUDENT_DASHBOARD_TOTAL_ENDED)}
              value={dashboardQuery.data?.totalEnded ?? "-"}
              icon={<AccessTime />}
              tone="success"
              dense
            />
          </Stack>

          <Stack spacing={1.25}>
            <InsightCard
              title={t(TranslationKey.STUDENT_DASHBOARD_TOTAL_ASSIGNMENT_GROUPS)}
              value={dashboardQuery.data?.totalAssignmentGroups ?? "-"}
              icon={<Quiz />}
              dense
            />
            <InsightCard
              title={t(TranslationKey.STUDENT_DASHBOARD_CLASSES)}
              value={dashboardQuery.data?.classes ? dashboardQuery.data.classes : "-"}
              icon={<Class />}
              dense
            />
            <InsightCard
              title={t(TranslationKey.STUDENT_DASHBOARD_TEACHERS)}
              value={dashboardQuery.data?.teachers ? dashboardQuery.data.teachers : "-"}
              icon={<Groups />}
              dense
            />
          </Stack>

          <Stack spacing={1.25}>
            <InsightCard
              title={t(TranslationKey.STUDENT_DASHBOARD_TOTAL_SUBMITS)}
              value={dashboardQuery.data?.totalSubmits ?? "-"}
              icon={<TaskAlt />}
              tone="info"
              dense
            />
            <Box
              onClick={handleLastSubmitNavigate}
              sx={{
                cursor: hasLastSubmitTarget ? "pointer" : "default",
                "&:hover .last-submit-link-value":
                  hasLastSubmitTarget
                    ? {
                        textDecoration: "underline"
                      }
                    : undefined
              }}
            >
              <InsightCard
                title={t(TranslationKey.STUDENT_DASHBOARD_LAST_SUBMIT)}
                value={
                  <Box component="span" className="last-submit-link-value" sx={{ fontWeight: "inherit", fontSize: "inherit" }}>
                    {dashboardQuery.data?.lastSubmitAt
                      ? new Date(dashboardQuery.data.lastSubmitAt).toLocaleString()
                      : "-"}
                  </Box>
                }
                icon={<AccessTime />}
                dense
              />
            </Box>
          </Stack>
        </Box>

        <Box>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="overline" color="text.secondary">
                {t(TranslationKey.STUDENT_DASHBOARD_SUCCESS_RATE)}
              </Typography>
              {(dashboardQuery.data?.successRate?.length ?? 0) > 0 ? (
                <LazyLineChart
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
                  margin={{ left: 60, right: 80, top: 20, bottom: 40 }}
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