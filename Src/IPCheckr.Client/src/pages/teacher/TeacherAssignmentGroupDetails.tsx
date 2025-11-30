import { useTranslation } from "react-i18next"
import {
  AssignmentGroupStatus,
  type QueryAssignmentGroupDetailsRes
} from "../../dtos"
import { TranslationKey } from "../../utils/i18n"
import { getStatusMap } from "../../utils/getStatusMap"
import { getIpCatLabel } from "../../utils/getIpCatLabel"
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Divider,
  Typography,
  Stack
} from "@mui/material"
import { useNavigate, useParams } from "react-router-dom"
import { getParametrizedUrl, RouteKeys, RouteParams } from "../../router/routes"
import { assignmentGroupApi } from "../../utils/apiClients"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import ErrorLoading from "../../components/ErrorLoading"
import CardsSkeleton from "../../components/CardsSkeleton"
import TableSkeleton from "../../components/TableSkeleton"
import StatsCard from "../../components/StatsCard"
import {
  AccessTime,
  Category,
  Class,
  Description,
  Dns,
  Percent,
  PlaylistAddCheck,
  Quiz,
  TaskAlt
} from "@mui/icons-material"
import ResponsiveStatsSection from "../../components/ResponsiveStatsSection"

interface IAssignmentGroupSubmitDetailsCard {
  assignmentId: number
  studentUsername: string
  successRate: number
  attemptCount: number
  lastSubmit?: Date
  status: AssignmentGroupStatus
}

const AssignmentGroupSubmitDetailsCard = ({
  assignmentId,
  studentUsername,
  successRate,
  attemptCount,
  lastSubmit,
  status
}: IAssignmentGroupSubmitDetailsCard) => {
  const { t } = useTranslation()
  const statusMap = getStatusMap(t)
  const navigate = useNavigate()
  const { [RouteParams.ASSIGNMENT_GROUP_ID]: assignmentGroupId } = useParams()

  return (
    <Card
      variant="outlined"
      sx={{
        width: 320,
        minWidth: 320,
        maxWidth: 320,
        borderColor: "divider",
        borderWidth: 2,
        borderStyle: "solid",
        cursor: "default",
        boxShadow: 0,
        transition: "box-shadow 0.2s, border-color 0.2s",
        backgroundColor: "background.paper"
      }}
    >
      <CardHeader
        title={
          <Typography variant="h5" fontWeight="bold">
            {studentUsername}
          </Typography>
        }
        action={
          <Chip
            label={statusMap[status]?.label ?? t("unknown")}
            color={
              status === AssignmentGroupStatus.Completed
                ? "success"
                : status === AssignmentGroupStatus.NotCompleted
                ? "default"
                : "default"
            }
            variant="outlined"
          />
        }
      />
      <CardContent sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
        <Typography variant="body2" color="textSecondary">
          <strong>
            {t(
              TranslationKey.TEACHER_ASSIGNMENT_GROUP_DETAILS_CARD_SUCCESS_RATE
            )}
            :
          </strong>{" "}
            {successRate}%
        </Typography>
        <Typography variant="body2" color="textSecondary">
          <strong>
            {t(
              TranslationKey.TEACHER_ASSIGNMENT_GROUP_DETAILS_CARD_ATTEMPT_COUNT
            )}
            :
          </strong>{" "}
            {attemptCount}
        </Typography>
        <Typography variant="body2" color="textSecondary">
          <strong>
            {t(
              TranslationKey.TEACHER_ASSIGNMENT_GROUP_DETAILS_CARD_LAST_SUBMIT
            )}
            :
          </strong>{" "}
          {lastSubmit
            ? new Date(lastSubmit).toLocaleString()
            : t(
                TranslationKey
                  .TEACHER_ASSIGNMENT_GROUP_DETAILS_CARD_UNSUBMITTED
              )}
        </Typography>
        <Button
          onClick={() =>
            navigate(
              getParametrizedUrl(
                RouteKeys.TEACHER_ASSIGNMENT_GROUPS_DETAILS_SUBMIT,
                {
                  [RouteParams.ASSIGNMENT_GROUP_ID]: assignmentGroupId,
                  [RouteParams.ASSIGNMENT_ID]: assignmentId.toString(),
                  [RouteParams.ATTEMPT]: "1"
                }
              )
            )
          }
          variant="outlined"
          disabled={attemptCount === 0}
          color="primary"
          fullWidth
          sx={{ mt: 1 }}
        >
          {t(TranslationKey.TEACHER_ASSIGNMENT_GROUP_DETAILS_CARD_DETAILS)}
        </Button>
      </CardContent>
    </Card>
  )
}

const TeacherAssignmentGroupDetails = () => {
  const { t } = useTranslation()
  const { [RouteParams.ASSIGNMENT_GROUP_ID]: assignmentGroupId } = useParams()
  const queryClient = useQueryClient()

  const detailsQuery = useQuery<QueryAssignmentGroupDetailsRes, Error>({
    queryKey: ["assignmentGroupDetails", assignmentGroupId],
    enabled: !!assignmentGroupId,
    queryFn: () =>
      assignmentGroupApi
        .assignmentGroupQueryAssignmentGroupDetails(
          Number(assignmentGroupId)
        )
        .then(r => r.data),
    placeholderData: prev => prev
  })

  const data = detailsQuery.data

  if (detailsQuery.isLoading && !data) {
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
          queryClient.invalidateQueries({
            queryKey: ["assignmentGroupDetails", assignmentGroupId]
          })
        }
      />
    )
  }

  return (
    <>
      <Stack spacing={2}>
        <ResponsiveStatsSection
          highlight={
            <Stack spacing={2}>
              <StatsCard
                title={t(TranslationKey.TEACHER_ASSIGNMENT_GROUP_DETAILS_NAME)}
                value={data?.assignmentGroupName ?? "-"}
                icon={<Quiz />}
              />
              <StatsCard
                title={t(TranslationKey.TEACHER_ASSIGNMENT_GROUP_DETAILS_DESCRIPTION)}
                value={data?.assignmentGroupDescription === ""
                  ? "-" : data?.assignmentGroupDescription}
                icon={<Description />}
              />
            </Stack>
          }
          leftColumn={[
            <StatsCard
              title={t(TranslationKey.TEACHER_ASSIGNMENT_GROUP_DETAILS_IP_CATEGORY)}
              value={
                data?.assignmentGroupIpCat
                  ? getIpCatLabel(data.assignmentGroupIpCat, t)
                  : "-"
              }
              icon={<Category />}
            />,
            <StatsCard
              title={t(TranslationKey.TEACHER_ASSIGNMENT_GROUP_DETAILS_CLASS)}
              value={data?.className ?? "-"}
              icon={<Class />}
            />,
            <StatsCard
              title={t(TranslationKey.TEACHER_ASSIGNMENT_GROUP_DETAILS_NUMBER_OF_RECORDS)}
              value={data?.numberOfRecords ?? "-"}
              icon={<Dns />}
            />,
            <StatsCard
              title={t(TranslationKey.TEACHER_ASSIGNMENT_GROUP_DETAILS_POSSIBLE_ATTEMPTS)}
              value={data?.possibleAttempts ?? "-"}
              icon={<PlaylistAddCheck />}
            />
          ]}
          rightColumn={[
            <StatsCard
              title={t(TranslationKey.TEACHER_ASSIGNMENT_GROUP_DETAILS_SUBMITTED)}
              value={`${data?.submitted}/${data?.total}`}
              icon={<TaskAlt />}
            />,
            <StatsCard
              title={t(TranslationKey.TEACHER_ASSIGNMENT_GROUP_DETAILS_SUCCESS_RATE)}
              value={`${data?.successRate.toFixed(2)}%`}
              icon={<Percent />}
            />,
            <StatsCard
              title={t(TranslationKey.TEACHER_ASSIGNMENT_GROUP_DETAILS_START_DATE)}
              value={
                data?.startDate
                  ? new Date(data.startDate).toLocaleString()
                  : "-"
              }
              icon={<AccessTime />}
            />,
            <StatsCard
              title={t(TranslationKey.TEACHER_ASSIGNMENT_GROUP_DETAILS_DEADLINE)}
              value={
                data?.deadline
                  ? new Date(data.deadline).toLocaleString()
                  : "-"
              }
              icon={<AccessTime />}
            />
          ]}
        />

        <Divider sx={{ my: 2 }} />

        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
          {data?.assignments.map(a => (
            <AssignmentGroupSubmitDetailsCard
              key={a.assignmentId}
              assignmentId={a.assignmentId}
              studentUsername={a.studentUsername}
              successRate={a.successRate.toFixed(2) as unknown as number}
              attemptCount={a.attemptCount}
              lastSubmit={a.lastSubmit ? new Date(a.lastSubmit) : undefined}
              status={a.status}
            />
          ))}
        </Box>
      </Stack>
    </>
  )
}

export default TeacherAssignmentGroupDetails