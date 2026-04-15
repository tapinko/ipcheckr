import {
  Box,
  Card,
  CardContent,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useParams, useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { BarChart, LineChart } from "@mui/x-charts"
import InsightGridSkeleton from "../../components/InsightGridSkeleton"
import ErrorLoading from "../../components/ErrorLoading"
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
import InsightCard from "../../components/InsightCard"
import InsightGrid from "../../components/InsightGrid"

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
    return <InsightGridSkeleton count={8} columnsMax={3} />
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
        <Card variant="outlined" sx={{ borderColor: "divider", backgroundColor: "background.paper" }}>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
              <Class fontSize="small" color="action" />
              <Typography variant="h6" fontWeight={800}>
                {detailsQuery.data?.className ?? "-"}
              </Typography>
            </Stack>
          </CardContent>
        </Card>

        <InsightGrid
          spacing={1.25}
          columnsMax={3}
          items={[
            <InsightCard
              title={t(TranslationKey.ADMIN_CLASS_DETAILS_TOTAL_ASSIGNMENT_GROUPS)}
              value={detailsQuery.data?.totalAssignmentGroups ?? "-"}
              icon={<Quiz />}
              dense
            />,
            <InsightCard
              title={t(TranslationKey.ADMIN_CLASS_DETAILS_TOTAL_UPCOMING)}
              value={detailsQuery.data?.totalUpcoming ?? "-"}
              icon={<AccessTime />}
              dense
            />,
            <InsightCard
              title={t(TranslationKey.ADMIN_CLASS_DETAILS_TOTAL_IN_PROGRESS)}
              value={detailsQuery.data?.totalInProgress ?? "-"}
              icon={<AccessTime />}
              tone="warning"
              dense
            />,
            <InsightCard
              title={t(TranslationKey.ADMIN_CLASS_DETAILS_TOTAL_ENDED)}
              value={detailsQuery.data?.totalEnded ?? "-"}
              icon={<AccessTime />}
              tone="success"
              dense
            />,
            <InsightCard
              title={t(TranslationKey.ADMIN_CLASS_DETAILS_CREATED_AT)}
              value={detailsQuery.data?.createdAt ? new Date(detailsQuery.data.createdAt).toLocaleString() : "-"}
              icon={<Groups />}
              dense
            />,
            <Tooltip title={t(TranslationKey.ADMIN_CLASS_DETAILS_AVERAGE_SUCCESS_RATE_TOOLTIP)}>
              <Box>
                <InsightCard
                  title={t(TranslationKey.ADMIN_CLASS_DETAILS_AVERAGE_SUCCESS_RATE)}
                  value={detailsQuery.data && detailsQuery.data.totalSubmits > 0 ? `${detailsQuery.data.averageSuccessRate.toFixed(2)}%` : (detailsQuery.data ? t(TranslationKey.TEACHER_ASSIGNMENT_GROUP_DETAILS_CARD_UNSUBMITTED) : "0.00%")}
                  icon={<Percent />}
                  tone="success"
                  dense
                />
              </Box>
            </Tooltip>,
            <InsightCard
              title={t(TranslationKey.ADMIN_CLASS_DETAILS_LAST_SUBMIT)}
              value={detailsQuery.data?.lastSubmitUsername ?? "-"}
              icon={<AccessTime />}
              dense
            />,
            <InsightCard
              title={t(TranslationKey.ADMIN_CLASS_DETAILS_TOTAL_SUBMITS)}
              value={detailsQuery.data?.totalSubmits ?? "-"}
              icon={<TaskAlt />}
              tone="info"
              dense
            />
          ]}
        />

        <Stack spacing={2} direction={{ xs: "column", md: "row" }}>
          <Box sx={{ flex: 1, width: "100%" }}>
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
                          p: 1,
                          cursor: "pointer",
                          "&:hover .admin-student-link": { textDecoration: "underline" }
                        }}
                        onClick={() =>
                          navigate(
                            getParametrizedUrl(RouteKeys.ADMIN_USER_DETAILS, {
                              [RouteParams.USER_ID]: s.studentId.toString()
                            })
                          )
                        }
                      >
                        <Typography variant="body2" className="admin-student-link">{s.username}</Typography>
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

          <Box sx={{ flex: 1, width: "100%" }}>
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
                          p: 1,
                          cursor: "pointer",
                          "&:hover .admin-teacher-link": { textDecoration: "underline" }
                        }}
                        onClick={() =>
                          navigate(
                            getParametrizedUrl(RouteKeys.ADMIN_USER_DETAILS, {
                              [RouteParams.USER_ID]: te.teacherId.toString()
                            })
                          )
                        }
                      >
                        <Typography variant="body2" className="admin-teacher-link">{te.username}</Typography>
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

        <Stack spacing={2} direction={{ xs: "column", md: "row" }}>
          <Box sx={{ flex: { md: 3 }, width: "100%" }}>
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

          <Box sx={{ flex: { md: 2 }, width: "100%" }}>
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
        </Stack>
      </Stack>
    </>
  )
}

export default AdminClassDetails