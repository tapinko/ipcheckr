import {
  Box,
  Paper,
  Stack,
  Typography,
  Tooltip
} from "@mui/material"
import { TranslationKey } from "../../utils/i18n"
import { useTranslation } from "react-i18next"
import InsightGridSkeleton from "../../components/skeletons/InsightGridSkeleton"
import ErrorLoading from "../../components/ui/ErrorLoading"
import AccessTime from "@mui/icons-material/AccessTime"
import Class from "@mui/icons-material/Class"
import EmojiEvents from "@mui/icons-material/EmojiEvents"
import Groups from "@mui/icons-material/Groups"
import Quiz from "@mui/icons-material/Quiz"
import School from "@mui/icons-material/School"
import TaskAlt from "@mui/icons-material/TaskAlt"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { dashboardApi } from "../../utils/apiClients"
import { type QueryAdminDashboardRes } from "../../dtos"
import InsightCard from "../../components/ui/InsightCard"
import { getParametrizedUrl, RouteKeys, RouteParams, Routes } from "../../router/routes"
import { useNavigate } from "react-router-dom"

const AdminDashboard = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const dashboardQuery = useQuery<QueryAdminDashboardRes, Error>({
    queryKey: ["adminDashboard"],
    queryFn: () => dashboardApi.dashboardQueryAdminDashboard().then(r => r.data),
    placeholderData: prev => prev
  })

  const hasLastSubmitTarget =
    !!dashboardQuery.data?.lastSubmitGroupId &&
    !!dashboardQuery.data?.lastSubmitId &&
    !!dashboardQuery.data?.lastSubmitType

  const hasMostSuccessfulClassTarget = !!dashboardQuery.data?.mostSuccessfulClassId
  const hasMostSuccessfulStudentTarget = !!dashboardQuery.data?.mostSuccessfulStudentId

  const handleLastSubmitNavigate = () => {
    const { lastSubmitGroupId, lastSubmitId, lastSubmitType } = dashboardQuery.data ?? {}
    if (!lastSubmitGroupId || !lastSubmitId || !lastSubmitType) return

    navigate(
      getParametrizedUrl(RouteKeys.ADMIN_ASSIGNMENT_GROUPS_DETAILS_SUBMIT, {
        [RouteParams.ASSIGNMENT_GROUP_ID]: lastSubmitGroupId.toString(),
        [RouteParams.ASSIGNMENT_ID]: lastSubmitId.toString(),
        [RouteParams.ASSIGNMENT_GROUP_TYPE]: lastSubmitType
      })
    )
  }

  const handleMostSuccessfulClassNavigate = () => {
    const classId = dashboardQuery.data?.mostSuccessfulClassId
    if (!classId) return

    navigate(
      getParametrizedUrl(RouteKeys.ADMIN_CLASS_DETAILS, {
        [RouteParams.CLASS_ID]: classId.toString()
      })
    )
  }

  const handleMostSuccessfulStudentNavigate = () => {
    const studentId = dashboardQuery.data?.mostSuccessfulStudentId
    if (!studentId) return

    navigate(
      getParametrizedUrl(RouteKeys.ADMIN_USER_DETAILS, {
        [RouteParams.USER_ID]: studentId.toString()
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
            queryClient.invalidateQueries({ queryKey: ["adminDashboard"] })
          }
        />
      ) : (<Stack spacing={2}>
        <Paper variant="outlined" sx={{ borderColor: "divider", backgroundColor: "background.paper" }}>
          <Box sx={{ p: 2 }}>
            <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
              <School fontSize="small" color="action" />
              <Typography variant="h6" fontWeight={800}>
                {dashboardQuery.data?.institutionName ?? "-"}
              </Typography>
            </Stack>
          </Box>
        </Paper>

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
              title={t(TranslationKey.ADMIN_DASHBOARD_TOTAL_ASSIGNMENT_GROUPS)}
              value={dashboardQuery.data?.totalAssignmentGroups ?? "-"}
              icon={<Quiz />}
              dense
            />
            <InsightCard
              title={t(TranslationKey.ADMIN_DASHBOARD_TOTAL_UPCOMING)}
              value={dashboardQuery.data?.totalUpcoming ?? "-"}
              icon={<AccessTime />}
              dense
            />
            <InsightCard
              title={t(TranslationKey.ADMIN_DASHBOARD_TOTAL_IN_PROGRESS)}
              value={dashboardQuery.data?.totalInProgress ?? "-"}
              icon={<AccessTime />}
              tone="warning"
              dense
            />
            <InsightCard
              title={t(TranslationKey.ADMIN_DASHBOARD_TOTAL_ENDED)}
              value={dashboardQuery.data?.totalEnded ?? "-"}
              icon={<AccessTime />}
              tone="success"
              dense
            />
          </Stack>

          <Stack spacing={1.25}>
            <Box
              onClick={handleLastSubmitNavigate}
              sx={{
                cursor: hasLastSubmitTarget ? "pointer" : "default",
                "&:hover .last-submit-link-value": hasLastSubmitTarget ? { textDecoration: "underline" } : undefined
              }}
            >
              <InsightCard
                title={t(TranslationKey.ADMIN_DASHBOARD_LAST_SUBMIT)}
                value={
                  <Box component="span" className="last-submit-link-value" sx={{ fontWeight: "inherit", fontSize: "inherit" }}>
                    {dashboardQuery.data?.lastSubmitUsername ?? "-"}
                  </Box>
                }
                icon={<AccessTime />}
                dense
              />
            </Box>
            <Box
              onClick={() => navigate(Routes[RouteKeys.ADMIN_CLASSES])}
              sx={{
                cursor: "pointer",
                "&:hover .admin-classes-link-value": {
                  textDecoration: "underline"
                }
              }}
            >
              <InsightCard
                title={t(TranslationKey.ADMIN_DASHBOARD_CLASSES)}
                value={
                  <Box component="span" className="admin-classes-link-value" sx={{ fontWeight: "inherit", fontSize: "inherit" }}>
                    {dashboardQuery.data?.totalClasses ?? "-"}
                  </Box>
                }
                icon={<Class />}
                dense
              />
            </Box>
            <Box
              onClick={() => navigate(Routes[RouteKeys.ADMIN_USERS])}
              sx={{
                cursor: "pointer",
                "&:hover .admin-users-link-value": {
                  textDecoration: "underline"
                }
              }}
            >
              <InsightCard
                title={t(TranslationKey.ADMIN_DASHBOARD_STUDENTS)}
                value={
                  <Box component="span" className="admin-users-link-value" sx={{ fontWeight: "inherit", fontSize: "inherit" }}>
                    {dashboardQuery.data?.totalStudents ?? "-"}
                  </Box>
                }
                icon={<Groups />}
                dense
              />
            </Box>
          </Stack>

          <Stack spacing={1.25}>
            <Tooltip title={t(TranslationKey.ADMIN_DASHBOARD_MOST_SUCCESSFUL_CLASS_TOOLTIP)}>
              <Box
                component="span"
                onClick={handleMostSuccessfulClassNavigate}
                sx={{
                  display: "block",
                  cursor: hasMostSuccessfulClassTarget ? "pointer" : "default",
                  "&:hover .most-successful-class-link-value": hasMostSuccessfulClassTarget ? { textDecoration: "underline" } : undefined
                }}
              >
                <InsightCard
                  title={t(TranslationKey.ADMIN_DASHBOARD_MOST_SUCCESSFUL_CLASS)}
                  value={
                    <Box component="span" className="most-successful-class-link-value" sx={{ fontWeight: "inherit", fontSize: "inherit" }}>
                      {dashboardQuery.data?.mostSuccessfulClass ?? "-"}
                    </Box>
                  }
                  icon={<Class />}
                  tone="success"
                  dense
                />
              </Box>
            </Tooltip>
            <Tooltip title={t(TranslationKey.ADMIN_DASHBOARD_MOST_SUCCESSFUL_STUDENT_TOOLTIP)}>
              <Box
                component="span"
                onClick={handleMostSuccessfulStudentNavigate}
                sx={{
                  display: "block",
                  cursor: hasMostSuccessfulStudentTarget ? "pointer" : "default",
                  "&:hover .most-successful-student-link-value": hasMostSuccessfulStudentTarget ? { textDecoration: "underline" } : undefined
                }}
              >
                <InsightCard
                  title={t(TranslationKey.ADMIN_DASHBOARD_MOST_SUCCESSFUL_STUDENT)}
                  value={
                    <Box component="span" className="most-successful-student-link-value" sx={{ fontWeight: "inherit", fontSize: "inherit" }}>
                      {dashboardQuery.data?.mostSuccessfulStudent ?? "-"}
                    </Box>
                  }
                  icon={<EmojiEvents />}
                  tone="success"
                  dense
                />
              </Box>
            </Tooltip>
            <InsightCard
              title={t(TranslationKey.ADMIN_DASHBOARD_TOTAL_SUBMITS)}
              value={dashboardQuery.data?.totalSubmits ?? "-"}
              icon={<TaskAlt />}
              tone="info"
              dense
            />
          </Stack>
        </Box>

      </Stack>)}
    </>
  )
}

export default AdminDashboard