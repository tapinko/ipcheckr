import {
  Box,
  Card,
  CardContent,
  Link,
  Stack,
  Tooltip,
  Typography
} from "@mui/material"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate, useParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { LineChart, RadarChart } from "@mui/x-charts"
import { AccessTime, Class, Percent, Person, Quiz, TaskAlt } from "@mui/icons-material"
import InsightGridSkeleton from "../../components/InsightGridSkeleton"
import ErrorLoading from "../../components/ErrorLoading"
import { TranslationKey } from "../../utils/i18n"
import { AssignmentGroupType, type QueryUserDetailsRes } from "../../dtos"
import { assignmentGroupApi, userApi } from "../../utils/apiClients"
import { getParametrizedUrl, RouteKeys, RouteParams } from "../../router/routes"
import { fromAssignmentTypeParam, toAssignmentTypeParam } from "../../utils/assignmentType"
import InsightCard from "../../components/InsightCard"
import InsightGrid from "../../components/InsightGrid"

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
  const studentClasses = detailsQuery.data?.classes ?? []
  const hasAnyAverage =
    [
      detailsQuery.data?.averageNetwork,
      detailsQuery.data?.averageFirst,
      detailsQuery.data?.averageLast,
      detailsQuery.data?.averageBroadcast
    ]
      .some(v => typeof v === "number")

  const hasLastSubmitTarget =
    !!detailsQuery.data?.lastSubmitGroupId &&
    !!detailsQuery.data?.lastSubmitAssignmentId

  const handleClassNavigate = (classId: number) => {
    navigate(
      getParametrizedUrl(RouteKeys.TEACHER_MY_CLASSES_CLASS_DETAILS, {
        [RouteParams.CLASS_ID]: classId.toString()
      })
    )
  }

  const handleLastSubmitNavigate = async () => {
    if (!detailsQuery.data?.lastSubmitGroupId || !detailsQuery.data?.lastSubmitAssignmentId) return

    let resolvedType = fromAssignmentTypeParam((detailsQuery.data as any)?.lastSubmitType as string | undefined)

    if (!resolvedType) {
      try {
        await assignmentGroupApi.assignmentGroupQuerySubnetAssignmentGroupDetails(detailsQuery.data.lastSubmitGroupId)
        resolvedType = AssignmentGroupType.Subnet
      } catch {
        try {
          await assignmentGroupApi.assignmentGroupQueryIdNetAssignmentGroupDetails(detailsQuery.data.lastSubmitGroupId)
          resolvedType = AssignmentGroupType.Idnet
        } catch {
          return
        }
      }
    }

    navigate(
      getParametrizedUrl(RouteKeys.TEACHER_ASSIGNMENT_GROUPS_DETAILS_SUBMIT, {
        [RouteParams.ASSIGNMENT_GROUP_ID]: detailsQuery.data.lastSubmitGroupId.toString(),
        [RouteParams.ASSIGNMENT_ID]: detailsQuery.data.lastSubmitAssignmentId.toString(),
        [RouteParams.ASSIGNMENT_GROUP_TYPE]: toAssignmentTypeParam(resolvedType)
      })
    )
  }

  if (detailsQuery.isLoading && !detailsQuery.data) {
    return <InsightGridSkeleton count={9} columnsMax={3} />
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
        <InsightGrid
          spacing={1.25}
          columnsMax={3}
          items={[
            <InsightCard
              title={t(TranslationKey.TEACHER_STUDENT_DETAILS_USERNAME)}
              value={detailsQuery.data?.username ?? "-"}
              icon={<Person />}
              tone="info"
              dense
            />,
            <InsightCard
              title={t(TranslationKey.TEACHER_STUDENT_DETAILS_TOTAL_SUBMITS)}
              value={detailsQuery.data?.totalSubmits ?? "-"}
              icon={<TaskAlt />}
              tone="info"
              dense
            />,
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
                title={t(TranslationKey.TEACHER_STUDENT_DETAILS_LAST_SUBMIT)}
                value={
                  <Box component="span" className="last-submit-link-value" sx={{ fontWeight: "inherit", fontSize: "inherit" }}>
                    {detailsQuery.data?.lastSubmitAt ? new Date(detailsQuery.data.lastSubmitAt).toLocaleString() : "-"}
                  </Box>
                }
                icon={<AccessTime />}
                dense
              />
            </Box>,
            <Tooltip
              title={t(TranslationKey.TEACHER_STUDENT_DETAILS_SUCCESS_RATE_TOOLTIP)}
            >
              <Box>
                <InsightCard
                  title={t(TranslationKey.TEACHER_STUDENT_DETAILS_SUCCESS_RATE)}
                  value={`${(detailsQuery.data?.averageTotal ?? 0).toFixed(2)}%`}
                  icon={<Percent />}
                  tone="success"
                  dense
                />
              </Box>
            </Tooltip>,
            <InsightCard
              title={t(TranslationKey.TEACHER_STUDENT_DETAILS_CLASSES)}
              value={studentClasses.length > 0 ? (
                <Box component="span">
                  {studentClasses.map((c, index) => (
                    <Box key={c.id} component="span">
                      <Link
                        component="button"
                        type="button"
                        underline="hover"
                        color="inherit"
                        onClick={() => handleClassNavigate(c.id)}
                        sx={{ fontWeight: "inherit", fontSize: "inherit", verticalAlign: "baseline" }}
                      >
                        {c.name}
                      </Link>
                      {index < studentClasses.length - 1 ? ", " : null}
                    </Box>
                  ))}
                </Box>
              ) : "-"}
              icon={<Class />}
              dense
            />,
            <InsightCard
              title={t(TranslationKey.TEACHER_STUDENT_DETAILS_TOTAL_ASSIGNMENT_GROUPS)}
              value={detailsQuery.data?.totalAssignmentGroups ?? "-"}
              icon={<Quiz />}
              dense
            />,
            <InsightCard
              title={t(TranslationKey.TEACHER_STUDENT_DETAILS_TOTAL_UPCOMING)}
              value={detailsQuery.data?.totalUpcoming ?? "-"}
              icon={<AccessTime />}
              dense
            />,
            <InsightCard
              title={t(TranslationKey.TEACHER_STUDENT_DETAILS_TOTAL_IN_PROGRESS)}
              value={detailsQuery.data?.totalInProgress ?? "-"}
              icon={<AccessTime />}
              tone="warning"
              dense
            />,
            <InsightCard
              title={t(TranslationKey.TEACHER_STUDENT_DETAILS_TOTAL_ENDED)}
              value={detailsQuery.data?.totalEnded ?? "-"}
              icon={<AccessTime />}
              tone="success"
              dense
            />
          ]}
        />

        <Stack spacing={2} direction={{ xs: "column", md: "row" }}>
          <Box sx={{ flex: 1, width: "100%" }}>
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
          <Box sx={{ flex: 1, width: "100%" }} height="100%">
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