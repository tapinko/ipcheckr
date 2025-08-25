import { useTranslation } from "react-i18next"
import {
  AssignmentGroupStatus,
  type QueryAssignmentGroupDetailsRes
} from "../../dtos"
import { TranslationKey } from "../../utils/i18n"
import { getStatusMap } from "../../utils/getStatusMap"
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Divider,
  Typography
} from "@mui/material"
import { useNavigate, useParams } from "react-router-dom"
import { getParametrizedUrl, RouteKeys, RouteParams } from "../../router/routes"
import { assignmentGroupApi } from "../../utils/apiClients"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import ErrorLoading from "../../components/ErrorLoading"
import CardsSkeleton from "../../components/CardsSkeleton"
import TableSkeleton from "../../components/TableSkeleton"

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
      <Typography variant="h6" color="textPrimary" gutterBottom>
        <strong>
          {t(TranslationKey.TEACHER_ASSIGNMENT_GROUP_DETAILS_NAME)}:
        </strong>{" "}
        {data?.assignmentGroupName}
      </Typography>
      <Typography variant="h6" color="textPrimary" gutterBottom>
        <strong>
          {t(TranslationKey.TEACHER_ASSIGNMENT_GROUP_DETAILS_DESCRIPTION)}:
        </strong>{" "}
        {data?.assignmentGroupDescription}
      </Typography>
      <Typography variant="h6" color="textPrimary" gutterBottom>
        <strong>
          {t(TranslationKey.TEACHER_ASSIGNMENT_GROUP_DETAILS_CLASS)}:
        </strong>{" "}
        {data?.className}
      </Typography>
      <Typography variant="h6" color="textPrimary" gutterBottom>
        <strong>
          {t(
            TranslationKey.TEACHER_ASSIGNMENT_GROUP_DETAILS_NUMBER_OF_RECORDS
          )}
          :
        </strong>{" "}
        {data?.numberOfRecords}
      </Typography>
      <Typography variant="h6" color="textPrimary" gutterBottom>
        <strong>
          {t(TranslationKey.TEACHER_ASSIGNMENT_GROUP_DETAILS_POSSIBLE_ATTEMPTS)}:
        </strong>{" "}
        {data?.possibleAttempts}
      </Typography>
      <Typography variant="h6" color="textPrimary" gutterBottom>
        <strong>
          {t(TranslationKey.TEACHER_ASSIGNMENT_GROUP_DETAILS_SUBMITTED)}:
        </strong>{" "}
        {data?.submitted}/{data?.total}
      </Typography>
      <Typography variant="h6" color="textPrimary" gutterBottom>
        <strong>
          {t(TranslationKey.TEACHER_ASSIGNMENT_GROUP_DETAILS_SUCCESS_RATE)}:
        </strong>{" "}
        {data?.successRate}%
      </Typography>
      <Typography variant="h6" color="textPrimary" gutterBottom>
        <strong>
          {t(TranslationKey.TEACHER_ASSIGNMENT_GROUP_DETAILS_START_DATE)}:
        </strong>{" "}
        {data?.startDate
          ? new Date(data.startDate).toLocaleString()
          : undefined}
      </Typography>
      <Typography variant="h6" color="textPrimary">
        <strong>
          {t(TranslationKey.TEACHER_ASSIGNMENT_GROUP_DETAILS_DEADLINE)}:
        </strong>{" "}
        {data?.deadline ? new Date(data.deadline).toLocaleString() : undefined}
      </Typography>

      <Divider sx={{ my: 2 }} />

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
        {data?.assignments.map(a => (
          <AssignmentGroupSubmitDetailsCard
            key={a.assignmentId}
            assignmentId={a.assignmentId}
            studentUsername={a.studentUsername}
            successRate={a.successRate}
            attemptCount={a.attemptCount}
            lastSubmit={a.lastSubmit ? new Date(a.lastSubmit) : undefined}
            status={a.status}
          />
        ))}
      </Box>
    </>
  )
}

export default TeacherAssignmentGroupDetails