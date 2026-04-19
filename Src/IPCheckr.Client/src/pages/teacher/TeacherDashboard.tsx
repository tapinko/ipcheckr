import { useEffect, useState } from "react"
import {
  Box,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Tooltip,
  Typography
} from "@mui/material"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { useAuth } from "../../contexts/AuthContext"
import { assignmentGroupApi, classApi, dashboardApi, userApi } from "../../utils/apiClients"
import { AssignmentGroupType, type QueryTeacherDashboardRes } from "../../dtos"
import ErrorLoading from "../../components/ErrorLoading"
import InsightGridSkeleton from "../../components/InsightGridSkeleton"
import { TranslationKey } from "../../utils/i18n"
import { AccessTime, Class, EmojiEvents, Groups, Quiz, School, TaskAlt } from "@mui/icons-material"
import { BarChart } from "@mui/x-charts"
import { useNavigate } from "react-router-dom"
import { getParametrizedUrl, RouteKeys, RouteParams } from "../../router/routes"
import { fromAssignmentTypeParam, toAssignmentTypeParam } from "../../utils/assignmentType"
import InsightCard from "../../components/InsightCard"
import UserRole from "../../types/UserRole"

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

  const hasLastSubmitTarget =
    !!dashboardQuery.data?.lastSubmitGroupId &&
    !!dashboardQuery.data?.lastSubmitId &&
    !!dashboardQuery.data?.lastSubmitUsername

  const hasMostSuccessfulClassTarget = !!dashboardQuery.data?.mostSuccessfulClass
  const hasMostSuccessfulStudentTarget = !!dashboardQuery.data?.mostSuccessfulStudent

  const handleMyClassesNavigate = () => {
    navigate(getParametrizedUrl(RouteKeys.TEACHER_MY_CLASSES, {}))
  }

  useEffect(() => {
    if (barChartLength < 1) setBarChartLength(1)
    else if (barChartLength > 10) setBarChartLength(10)
  }, [barChartLength])

  const handleLastSubmitNavigate = async () => {
    if (!dashboardQuery.data?.lastSubmitGroupId || !dashboardQuery.data?.lastSubmitId) return

    let resolvedType = fromAssignmentTypeParam((dashboardQuery.data as any)?.lastSubmitType as string | undefined)

    if (!resolvedType) {
      try {
        await assignmentGroupApi.assignmentGroupQuerySubnetAssignmentGroupDetails(dashboardQuery.data.lastSubmitGroupId)
        resolvedType = AssignmentGroupType.Subnet
      } catch {
        try {
          await assignmentGroupApi.assignmentGroupQueryIdNetAssignmentGroupDetails(dashboardQuery.data.lastSubmitGroupId)
          resolvedType = AssignmentGroupType.Idnet
        } catch {
          return
        }
      }
    }

    navigate(
      getParametrizedUrl(RouteKeys.TEACHER_ASSIGNMENT_GROUPS_DETAILS_SUBMIT, {
        [RouteParams.ASSIGNMENT_GROUP_ID]: dashboardQuery.data.lastSubmitGroupId.toString(),
        [RouteParams.ASSIGNMENT_ID]: dashboardQuery.data.lastSubmitId.toString(),
        [RouteParams.ASSIGNMENT_GROUP_TYPE]: toAssignmentTypeParam(resolvedType)
      })
    )
  }

  const handleMostSuccessfulClassNavigate = async () => {
    const className = dashboardQuery.data?.mostSuccessfulClass
    if (!className || !userId) return

    const classesRes = await classApi.classQueryClasses(null, className, userId)
    const classes = classesRes.data.classes ?? []
    const exactMatch = classes.find(c => c.className.toLowerCase() === className.toLowerCase())
    const targetClass = exactMatch ?? classes[0]
    if (!targetClass?.classId) return

    navigate(
      getParametrizedUrl(RouteKeys.TEACHER_MY_CLASSES_CLASS_DETAILS, {
        [RouteParams.CLASS_ID]: targetClass.classId.toString()
      })
    )
  }

  const handleMostSuccessfulStudentNavigate = async () => {
    const studentUsername = dashboardQuery.data?.mostSuccessfulStudent
    if (!studentUsername) return

    const usersRes = await userApi.userQueryUsers(null, studentUsername, UserRole.STUDENT, null, null, null)
    const users = usersRes.data.users ?? []
    const exactMatch = users.find(u => u.username.toLowerCase() === studentUsername.toLowerCase())
    const targetStudent = exactMatch ?? users[0]
    if (!targetStudent?.id) return

    navigate(
      getParametrizedUrl(RouteKeys.TEACHER_MY_CLASSES_STUDENT_DETAILS, {
        [RouteParams.STUDENT_ID]: targetStudent.id.toString()
      })
    )
  }

  return (
    <>
      {dashboardQuery.isLoading ? (
        <InsightGridSkeleton count={10} columnsMax={3} />
      ) : dashboardQuery.isError ? (
        <ErrorLoading
          onRetry={() =>
            queryClient.invalidateQueries({ queryKey: ["teacherDashboard"] })
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
              title={t(TranslationKey.TEACHER_DASHBOARD_TOTAL_ASSIGNMENT_GROUPS)}
              value={dashboardQuery.data?.totalAssignmentGroups ?? "-"}
              icon={<Quiz />}
              dense
            />
            <InsightCard
              title={t(TranslationKey.TEACHER_DASHBOARD_TOTAL_UPCOMING)}
              value={dashboardQuery.data?.totalUpcoming ?? "-"}
              icon={<AccessTime />}
              dense
            />
            <InsightCard
              title={t(TranslationKey.TEACHER_DASHBOARD_TOTAL_IN_PROGRESS)}
              value={dashboardQuery.data?.totalInProgress ?? "-"}
              icon={<AccessTime />}
              tone="warning"
              dense
            />
            <InsightCard
              title={t(TranslationKey.TEACHER_DASHBOARD_TOTAL_ENDED)}
              value={dashboardQuery.data?.totalEnded ?? "-"}
              icon={<AccessTime />}
              tone="success"
              dense
            />
          </Stack>

          <Stack spacing={1.25}>
            <Box
              onClick={() => {
                void handleLastSubmitNavigate()
              }}
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
                title={t(TranslationKey.TEACHER_DASHBOARD_LAST_SUBMIT)}
                value={
                  dashboardQuery.data?.lastSubmitUsername ? (
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                      <Box component="span" className="last-submit-link-value" sx={{ fontWeight: "inherit", fontSize: "inherit" }}>
                        {dashboardQuery.data.lastSubmitUsername}
                      </Box>
                    </Stack>
                  ) : "-"
                }
                icon={<AccessTime />}
                dense
              />
            </Box>
            <Box
              onClick={handleMyClassesNavigate}
              sx={{
                cursor: "pointer",
                "&:hover .my-classes-link-value": {
                  textDecoration: "underline"
                }
              }}
            >
              <InsightCard
                title={t(TranslationKey.TEACHER_DASHBOARD_CLASSES)}
                value={
                  <Box component="span" className="my-classes-link-value" sx={{ fontWeight: "inherit", fontSize: "inherit" }}>
                    {dashboardQuery.data?.totalClasses ?? "-"}
                  </Box>
                }
                icon={<Class />}
                dense
              />
            </Box>
            <Box
              onClick={handleMyClassesNavigate}
              sx={{
                cursor: "pointer",
                "&:hover .my-classes-link-value": {
                  textDecoration: "underline"
                }
              }}
            >
              <InsightCard
                title={t(TranslationKey.TEACHER_DASHBOARD_STUDENTS)}
                value={
                  <Box component="span" className="my-classes-link-value" sx={{ fontWeight: "inherit", fontSize: "inherit" }}>
                    {dashboardQuery.data?.totalStudents ?? "-"}
                  </Box>
                }
                icon={<Groups />}
                dense
              />
            </Box>
          </Stack>

          <Stack spacing={1.25}>
            <Tooltip
              title={t(TranslationKey.TEACHER_DASHBOARD_MOST_SUCCESSFUL_CLASS_TOOLTIP)}
            >
              <Box
                component="span"
                onClick={() => {
                  void handleMostSuccessfulClassNavigate()
                }}
                sx={{
                  display: "block",
                  cursor: hasMostSuccessfulClassTarget ? "pointer" : "default",
                  "&:hover .most-successful-class-link-value":
                    hasMostSuccessfulClassTarget
                      ? {
                          textDecoration: "underline"
                        }
                      : undefined
                }}
              >
                <InsightCard
                  title={t(TranslationKey.TEACHER_DASHBOARD_MOST_SUCCESSFUL_CLASS)}
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
            <Tooltip
              title={t(TranslationKey.TEACHER_DASHBOARD_MOST_SUCCESSFUL_STUDENT_TOOLTIP)}
            >
              <Box
                component="span"
                onClick={() => {
                  void handleMostSuccessfulStudentNavigate()
                }}
                sx={{
                  display: "block",
                  cursor: hasMostSuccessfulStudentTarget ? "pointer" : "default",
                  "&:hover .most-successful-student-link-value":
                    hasMostSuccessfulStudentTarget
                      ? {
                          textDecoration: "underline"
                        }
                      : undefined
                }}
              >
                <InsightCard
                  title={t(TranslationKey.TEACHER_DASHBOARD_MOST_SUCCESSFUL_STUDENT)}
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
              title={t(TranslationKey.TEACHER_DASHBOARD_TOTAL_SUBMITS)}
              value={dashboardQuery.data?.totalSubmits ?? "-"}
              icon={<TaskAlt />}
              tone="info"
              dense
            />
          </Stack>
        </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
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

        <Stack spacing={2} direction={{ xs: "column", md: "row" }}>
          <Box sx={{ flex: { md: 3 }, width: "100%" }}>
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
                        valueFormatter: (v: number | null) => `${v?.toFixed(2)}%`,
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

          <Box sx={{ flex: { md: 2 }, width: "100%" }}>
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
                        valueFormatter: (v: number| null) => `${v?.toFixed(2)}%`,
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
        </Stack>
      </Stack>)}
    </>
  )
}

export default TeacherDashboard