import { useTranslation } from "react-i18next"
import {
  AssignmentGroupState,
  AssignmentGroupStatus,
  type AssignmentDto
} from "../../dtos"
import { getStateMap } from "../../utils/getStateMap"
import { useNavigate } from "react-router-dom"
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Tooltip,
  Typography
} from "@mui/material"
import { TranslationKey } from "../../utils/i18n"
import { getParametrizedUrl, RouteKeys, RouteParams } from "../../router/routes"
import { assignmentApi } from "../../utils/apiClients"
import { useAuth } from "../../contexts/AuthContext"
import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import ErrorLoading from "../../components/ErrorLoading"
import CardsSkeleton from "../../components/CardsSkeleton"

interface IAssignmentGroupCardProps {
  id: number
  name: string
  attemptCount: number
  availableAttempts: number
  state: AssignmentGroupState
  status: AssignmentGroupStatus
  startDate: string
  deadline: string
  maxSuccessRate?: string
  className: string
  description?: string
  onSubmit: () => void
}

const AssignmentGroupCard = ({
  id,
  name,
  attemptCount,
  availableAttempts,
  state,
  status,
  startDate,
  deadline,
  maxSuccessRate,
  className,
  description,
  onSubmit
}: IAssignmentGroupCardProps) => {
  const { t } = useTranslation()
  const stateMap = getStateMap(t)
  const navigate = useNavigate()

  return (
    <Tooltip title={description}>
      <Card
        variant="outlined"
        sx={{
          width: 320,
          minWidth: 320,
          maxWidth: 320,
          borderColor: "divider",
          borderWidth: 2,
          borderStyle: "solid",
          boxShadow: 0,
          transition: "box-shadow 0.2s, border-color 0.2s",
          backgroundColor: "background.paper"
        }}
      >
        <CardHeader
          title={
            <Typography variant="h5" fontWeight="bold">
              {name}
            </Typography>
          }
          action={
            <Chip
              label={stateMap[state]?.label ?? t("unknown")}
              color={
                state === AssignmentGroupState.Ended
                  ? "success"
                  : state === AssignmentGroupState.InProgress
                  ? "warning"
                  : state === AssignmentGroupState.Upcoming
                  ? "default"
                  : "default"
              }
              variant="outlined"
            />
          }
        />
        <CardContent sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
          <Typography variant="body2" color="textSecondary">
            <strong>{t(TranslationKey.STUDENT_ASSIGNMENTS_CARD_CLASS)}:</strong>{" "}
            {className}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            <strong>
              {t(TranslationKey.STUDENT_ASSIGNMENTS_CARD_AVAILABLE_ATTEMPTS)}:
            </strong>{" "}
            {availableAttempts}
          </Typography>
            {maxSuccessRate && (
              <Typography variant="body2" color="textSecondary">
                <strong>
                  {t(
                    TranslationKey.STUDENT_ASSIGNMENTS_CARD_MAX_SUCCESS_RATE
                  )}
                  :
                </strong>{" "}
                {maxSuccessRate}%
              </Typography>
            )}
          <Typography variant="body2" color="textSecondary">
            <strong>
              {t(TranslationKey.STUDENT_ASSIGNMENTS_CARD_START_DATE)}:
            </strong>{" "}
            {startDate}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            <strong>
              {t(TranslationKey.STUDENT_ASSIGNMENTS_CARD_DEADLINE)}:
            </strong>{" "}
            {deadline}
          </Typography>
          <Button
            onClick={onSubmit}
            disabled={
              state === AssignmentGroupState.Ended ||
              status === AssignmentGroupStatus.Completed
            }
            variant="outlined"
            color="primary"
            fullWidth
            sx={{ mt: 1 }}
          >
            {t(TranslationKey.STUDENT_ASSIGNMENTS_CARD_SUBMIT)}
          </Button>
          <Button
            onClick={() =>
              navigate(
                getParametrizedUrl(RouteKeys.STUDENT_ASSIGNMENT_DETAILS, {
                  [RouteParams.ASSIGNMENT_ID]: id.toString(),
                  [RouteParams.ATTEMPT]: "1"
                })
              )
            }
            disabled={attemptCount === 0}
            variant="outlined"
            color="primary"
            fullWidth
            sx={{ mt: 1 }}
          >
            {t(TranslationKey.STUDENT_ASSIGNMENTS_CARD_DETAILS)}
          </Button>
        </CardContent>
      </Card>
    </Tooltip>
  )
}

const StudentAssignments = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { userId } = useAuth()
  const queryClient = useQueryClient()

  const [confirmDialogVis, setConfirmDialogVis] = useState(false)
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<number | null>(null)

  const assignmentsQuery = useQuery<AssignmentDto[], Error>({
    queryKey: ["studentAssignments", userId],
    enabled: !!userId,
    queryFn: () =>
      assignmentApi
        .assignmentQueryAssignments(userId!)
        .then(r => r.data.assignments ?? []),
    refetchInterval: 10_000,
    placeholderData: prev => prev
  })

  return (
    <>
      {assignmentsQuery.isLoading ? (
        <CardsSkeleton />
      ) : assignmentsQuery.isError ? (
        <ErrorLoading
          onRetry={() =>
            queryClient.invalidateQueries({
              queryKey: ["studentAssignments"]
            })
          }
        />
      ) : (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
          {(assignmentsQuery.data ?? []).length > 0 ? (
            assignmentsQuery.data?.map(assignment => (
              <AssignmentGroupCard
                key={assignment.assignmentId}
                id={assignment.assignmentId}
                name={assignment.assignmentGroupName}
                attemptCount={assignment.attemptCount}
                availableAttempts={
                  assignment.maxAttempts - assignment.attemptCount
                }
                state={assignment.state}
                status={assignment.status}
                startDate={new Date(assignment.startDate).toLocaleDateString()}
                deadline={new Date(assignment.deadline).toLocaleDateString()}
                maxSuccessRate={assignment.maxSuccessRate?.toString()}
                className={assignment.className}
                description={
                  assignment.assignmentGroupDescription || undefined
                }
                onSubmit={() => {
                  setSelectedAssignmentId(assignment.assignmentId)
                  setConfirmDialogVis(true)
                }}
              />
            ))
          ) : (
            <Typography variant="h6">
              {t(TranslationKey.STUDENT_ASSIGNMENTS_NO_ASSIGNMENTS)}
            </Typography>
          )}
        </Box>
      )}

      <Dialog
        open={confirmDialogVis}
        onClose={() => setConfirmDialogVis(false)}
        sx={{ "& .MuiDialog-paper": { width: "30vw" } }}
      >
        <DialogTitle>
          {t(TranslationKey.STUDENT_ASSIGNMENTS_SUBMIT_DIALOG_TITLE)}
        </DialogTitle>
        <DialogContent>
          {t(TranslationKey.STUDENT_ASSIGNMENTS_SUBMIT_DIALOG_QUESTION)}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogVis(false)}>
            {t(TranslationKey.STUDENT_ASSIGNMENTS_SUBMIT_DIALOG_CANCEL)}
          </Button>
          <Button
            onClick={() => {
              navigate(
                getParametrizedUrl(RouteKeys.STUDENT_ASSIGNMENT_SUBMISSION, {
                  [RouteParams.ASSIGNMENT_ID]:
                    selectedAssignmentId?.toString() || ""
                })
              )
              setConfirmDialogVis(false)
            }}
            color="warning"
            variant="contained"
          >
            {t(TranslationKey.STUDENT_ASSIGNMENTS_SUBMIT_DIALOG_CONFIRM)}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default StudentAssignments