import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  AssignmentSubmissionAttemptStatus,
  AssignmentGroupStatus,
  AssignmentGroupType,
  type AGSubmitDetailsBaseDtoAssignmentAttemptStatus,
  type ReopenStudentAssignmentAttemptReq,
  type QueryIDNetAGDetailRes,
  type QuerySubnetAGDetailRes
} from "../../dtos"
import { TranslationKey } from "../../utils/i18n"
import { getStatusMap } from "../../utils/getStatusMap"
import { getIpCatLabel } from "../../utils/getIpCatLabel"
import {
  AccessTime,
  Category,
  Class,
  Percent,
  PlaylistAddCheck,
  Quiz,
  TaskAlt
} from "@mui/icons-material"
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  LinearProgress,
  Stack,
  Typography
} from "@mui/material"
import { useNavigate, useParams } from "react-router-dom"
import { getParametrizedUrl, RouteKeys, RouteParams } from "../../router/routes"
import { assignmentGroupApi } from "../../utils/apiClients"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import ErrorLoading from "../../components/ErrorLoading"
import InsightGridSkeleton from "../../components/InsightGridSkeleton"
import InsightCard from "../../components/InsightCard"
import InsightGrid from "../../components/InsightGrid"
import { fromAssignmentTypeParam, toAssignmentTypeParam } from "../../utils/assignmentType"
import { createAttemptEventsConnection } from "../../utils/attemptEventsHub"

interface IAssignmentGroupSubmitDetailsCard {
  assignmentId: number
  studentUsername: string
  successRate: number
  submittedAt?: string | null
  assignmentAttemptStatus?: AGSubmitDetailsBaseDtoAssignmentAttemptStatus | null
  assignmentType?: AssignmentGroupType
  onReopen?: () => void
  reopenPending?: boolean
}

const AssignmentGroupSubmitDetailsCard = ({
  assignmentId,
  studentUsername,
  successRate,
  submittedAt,
  assignmentAttemptStatus,
  assignmentType,
  onReopen,
  reopenPending
}: IAssignmentGroupSubmitDetailsCard) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { [RouteParams.ASSIGNMENT_GROUP_ID]: assignmentGroupId } = useParams()
  const canReopenAttempt = assignmentAttemptStatus === AssignmentSubmissionAttemptStatus.Locked && !!onReopen
  const wasSubmitted = !!submittedAt
  const successRateValue = Number.isFinite(successRate) ? Math.min(Math.max(successRate, 0), 100) : 0

  const submittedLabel = submittedAt
    ? new Date(submittedAt).toLocaleString()
    : t(TranslationKey.TEACHER_ASSIGNMENT_GROUP_DETAILS_CARD_UNSUBMITTED)

  return (
    <Card
      variant="outlined"
      sx={{
        width: "100%",
        minWidth: 0,
        borderColor: "divider",
        borderWidth: 1.5,
        borderStyle: "solid",
        cursor: "pointer",
        boxShadow: 0,
        transition: "box-shadow 0.2s, border-color 0.2s",
        backgroundColor: "background.paper",
        opacity: 1,
        "&:hover .submit-student-name": {
          textDecoration: "underline"
        }
      }}
      onClick={() => {
        if (!assignmentGroupId) return
        const targetType = assignmentType
        if (!targetType) return
        navigate(
          getParametrizedUrl(RouteKeys.TEACHER_ASSIGNMENT_GROUPS_DETAILS_SUBMIT, {
            [RouteParams.ASSIGNMENT_GROUP_ID]: assignmentGroupId,
            [RouteParams.ASSIGNMENT_ID]: assignmentId.toString(),
            [RouteParams.ASSIGNMENT_GROUP_TYPE]: toAssignmentTypeParam(targetType)
          })
        )
      }}
    >
      <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <Stack direction="row" alignItems="flex-start" spacing={1} justifyContent="space-between" flexWrap="wrap">
          <Stack spacing={0.25} sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="subtitle1" fontWeight={700} className="submit-student-name" sx={{ wordBreak: "break-word" }}>
              {studentUsername}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ wordBreak: "break-word" }}>
              {submittedLabel}
            </Typography>
          </Stack>
        </Stack>

        <Stack spacing={0.5}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="h6" fontWeight={800}>
              {wasSubmitted ? `${successRateValue.toFixed(2)}%` : t(TranslationKey.TEACHER_ASSIGNMENT_GROUP_DETAILS_CARD_UNSUBMITTED)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t(TranslationKey.TEACHER_ASSIGNMENT_GROUP_DETAILS_CARD_SUCCESS_RATE)}
            </Typography>
          </Stack>
          {wasSubmitted ? (
            <LinearProgress
              variant="determinate"
              value={successRateValue}
              sx={{ height: 8, borderRadius: 999 }}
            />
          ) : null}
        </Stack>

        {canReopenAttempt ? (
          <Button
            size="small"
            variant="contained"
            color="warning"
            disabled={reopenPending}
            onClick={e => {
              e.stopPropagation()
              onReopen?.()
            }}
          >
            {t(TranslationKey.TEACHER_ASSIGNMENT_GROUP_DETAILS_CARD_CONTINUE_TEST)}
          </Button>
        ) : null}

      </CardContent>
    </Card>
  )
}

const TeacherAssignmentGroupDetails = () => {
  const { t } = useTranslation()
  const {
    [RouteParams.ASSIGNMENT_GROUP_ID]: assignmentGroupId,
    [RouteParams.ASSIGNMENT_GROUP_TYPE]: assignmentTypeParam
  } = useParams()
  const assignmentType = fromAssignmentTypeParam(assignmentTypeParam)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const statusMap = getStatusMap(t)
  const [sortField, setSortField] = useState<"name" | "%">("name")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const [reopenedAssignmentIds, setReopenedAssignmentIds] = useState<Set<number>>(new Set())

  const subnetQuery = useQuery<QuerySubnetAGDetailRes, Error>({
    queryKey: ["assignmentGroupDetails", "subnet", assignmentGroupId],
    enabled: !!assignmentGroupId && (!assignmentType || assignmentType === AssignmentGroupType.Subnet),
    queryFn: () =>
      assignmentGroupApi
        .assignmentGroupQuerySubnetAssignmentGroupDetails(Number(assignmentGroupId))
        .then(r => r.data),
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: false,
    placeholderData: prev => prev
  })

  const idnetQuery = useQuery<QueryIDNetAGDetailRes, Error>({
    queryKey: ["assignmentGroupDetails", "idnet", assignmentGroupId],
    enabled: !!assignmentGroupId && (
      assignmentType === AssignmentGroupType.Idnet || (!assignmentType && subnetQuery.isError)
    ),
    queryFn: () =>
      assignmentGroupApi
        .assignmentGroupQueryIdNetAssignmentGroupDetails(Number(assignmentGroupId))
        .then(r => r.data),
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: false,
    placeholderData: prev => prev
  })

  const data = useMemo(() => {
    if (assignmentType === AssignmentGroupType.Subnet) return subnetQuery.data ?? null
    if (assignmentType === AssignmentGroupType.Idnet) return idnetQuery.data ?? null
    if (subnetQuery.data) return subnetQuery.data
    if (idnetQuery.data) return idnetQuery.data
    return null
  }, [assignmentType, subnetQuery.data, idnetQuery.data])

  const isLoading = (() => {
    if (assignmentType === AssignmentGroupType.Subnet) return !data && subnetQuery.isLoading
    if (assignmentType === AssignmentGroupType.Idnet) return !data && idnetQuery.isLoading
    return (!data && subnetQuery.isLoading) || (!data && idnetQuery.isLoading)
  })()

  const hasError = (() => {
    if (assignmentType === AssignmentGroupType.Subnet) return subnetQuery.isError
    if (assignmentType === AssignmentGroupType.Idnet) return idnetQuery.isError
    return subnetQuery.isError && idnetQuery.isError
  })()

  const reopenAttemptMutation = useMutation({
    mutationFn: (payload: ReopenStudentAssignmentAttemptReq) =>
      assignmentGroupApi.assignmentGroupReopenStudentAssignmentAttempt(payload).then(r => r.data),
    onSuccess: (_data, variables) => {
      setReopenedAssignmentIds(prev => {
        const next = new Set(prev)
        next.add(variables.assignmentId)
        return next
      })
      queryClient.invalidateQueries({ queryKey: ["assignmentGroupDetails", "subnet", assignmentGroupId] })
      queryClient.invalidateQueries({ queryKey: ["assignmentGroupDetails", "idnet", assignmentGroupId] })
    }
  })

  useEffect(() => {
    if (!assignmentGroupId) return

    const channelType = assignmentType ?? data?.type
    if (!channelType) return

    const connection = createAttemptEventsConnection()
    const handleAttemptChanged = () => {
      queryClient.invalidateQueries({ queryKey: ["assignmentGroupDetails", "subnet", assignmentGroupId] })
      queryClient.invalidateQueries({ queryKey: ["assignmentGroupDetails", "idnet", assignmentGroupId] })
    }

    connection.on("AttemptChanged", handleAttemptChanged)

    let cancelled = false
    const connect = async () => {
      try {
        await connection.start()
        if (cancelled) return
        await connection.invoke("SubscribeAssignmentGroup", channelType, Number(assignmentGroupId))
      } catch {
      }
    }

    void connect()

    return () => {
      cancelled = true
      connection.off("AttemptChanged", handleAttemptChanged)
      void connection.invoke("UnsubscribeAssignmentGroup", channelType, Number(assignmentGroupId)).catch(() => {})
      void connection.stop()
    }
  }, [assignmentGroupId, assignmentType, data?.type, queryClient])

  const isIdNetDetail = (detail: QueryIDNetAGDetailRes | QuerySubnetAGDetailRes | null): detail is QueryIDNetAGDetailRes =>
    detail?.type === AssignmentGroupType.Idnet

  const isIdNetData = isIdNetDetail(data)

  const sortedAssignments = useMemo(() => {
    const assignments = data?.assignments ?? []
    const cloned = [...assignments]
    const compare = (a: (typeof assignments)[number], b: (typeof assignments)[number]) => {
      if (sortField === "name") {
        return a.studentUsername.localeCompare(b.studentUsername)
      }
      return a.successRate - b.successRate
    }
    cloned.sort((a, b) => {
      const base = compare(a, b)
      if (base === 0) {
        return a.studentUsername.localeCompare(b.studentUsername)
      }
      return sortDir === "asc" ? base : -base
    })
    return cloned
  }, [data?.assignments, sortDir, sortField])

  useEffect(() => {
    const assignments = data?.assignments ?? []
    if (assignments.length === 0) {
      if (reopenedAssignmentIds.size > 0) {
        setReopenedAssignmentIds(new Set())
      }
      return
    }

    const currentlyLockedIds = new Set(
      assignments
        .filter(a => a.assignmentAttemptStatus === AssignmentSubmissionAttemptStatus.Locked)
        .map(a => a.assignmentId)
    )

    setReopenedAssignmentIds(prev => {
      if (prev.size === 0) return prev
      const next = new Set(Array.from(prev).filter(id => currentlyLockedIds.has(id)))
      return next.size === prev.size ? prev : next
    })
  }, [data?.assignments, reopenedAssignmentIds.size])

  if (isLoading && !data) {
    return <InsightGridSkeleton count={8} columnsMax={3} />
  }

  if (hasError) {
    return (
      <ErrorLoading
        onRetry={() =>
          queryClient.invalidateQueries({
            queryKey: ["assignmentGroupDetails"]
          })
        }
      />
    )
  }

  return (
    <>
      <Stack spacing={1.75}>
        {data ? (
          <Card variant="outlined" sx={{ borderColor: "divider", backgroundColor: "background.paper" }}>
            <CardContent>
              <Stack spacing={1}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} flexWrap="wrap">
                  <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                    <Quiz fontSize="small" color="action" />
                    <Typography variant="h6" fontWeight={800} sx={{ mr: 1 }}>
                      {data.name}
                    </Typography>
                    <Chip
                      label={
                        data.type === AssignmentGroupType.Subnet
                          ? t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_TYPE_SUBNET)
                          : t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_TYPE_IDNET)
                      }
                      color={data.type === AssignmentGroupType.Subnet ? "primary" : "secondary"}
                      size="small"
                      variant="outlined"
                    />
                  </Stack>

                  <Chip
                    label={statusMap[data.status]?.label ?? data.status}
                    color={
                      data.status === AssignmentGroupStatus.Upcoming
                        ? "primary"
                        : data.status === AssignmentGroupStatus.InProgress
                          ? "warning"
                          : "default"
                    }
                    size="small"
                  />
                </Stack>

                {data.description ? (
                  <Typography variant="body2" color="text.secondary">
                    {data.description}
                  </Typography>
                ) : null}
              </Stack>
            </CardContent>
          </Card>
        ) : null}

        <InsightGrid
          spacing={1.25}
          columnsMax={3}
          items={[
            <InsightCard
              title={t(TranslationKey.TEACHER_ASSIGNMENT_GROUP_DETAILS_SUBMITTED)}
              value={data ? `${data.submitted}/${data.total}` : "-"}
              icon={<TaskAlt />}
              tone="info"
              dense
            />,
            <InsightCard
              title={t(TranslationKey.TEACHER_ASSIGNMENT_GROUP_DETAILS_SUCCESS_RATE)}
              value={data ? (data.successRate !== null && data.successRate !== undefined ? `${data.successRate.toFixed(2)}%` : t(TranslationKey.TEACHER_ASSIGNMENT_GROUP_DETAILS_CARD_UNSUBMITTED)) : "-"}
              icon={<Percent />}
              tone="success"
              dense
            />,
            <InsightCard
              title={t(TranslationKey.TEACHER_ASSIGNMENT_GROUP_DETAILS_IP_CATEGORY)}
              value={data?.ipCat ? getIpCatLabel(data.ipCat, t) : "-"}
              icon={<Category />}
              tone="neutral"
              dense
            />,
            <Box
              onClick={() => {
                if (!data?.classId) return
                navigate(
                  getParametrizedUrl(RouteKeys.TEACHER_MY_CLASSES_CLASS_DETAILS, {
                    [RouteParams.CLASS_ID]: data.classId.toString()
                  })
                )
              }}
              sx={{
                cursor: data?.classId ? "pointer" : "default",
                "&:hover .class-link-value": data?.classId
                  ? {
                      textDecoration: "underline"
                    }
                  : undefined
              }}
            >
              <InsightCard
                title={t(TranslationKey.TEACHER_ASSIGNMENT_GROUP_DETAILS_CLASS)}
                value={
                  <Box component="span" className="class-link-value" sx={{ fontWeight: "inherit", fontSize: "inherit" }}>
                    {data?.className ?? "-"}
                  </Box>
                }
                icon={<Class />}
                tone="neutral"
                dense
              />
            </Box>,
            <InsightCard
              title={t(TranslationKey.TEACHER_ASSIGNMENT_GROUP_DETAILS_START_DATE)}
              value={data?.startDate ? new Date(data.startDate).toLocaleString() : "-"}
              icon={<AccessTime />}
              tone="neutral"
              dense
            />,
            <InsightCard
              title={t(TranslationKey.TEACHER_ASSIGNMENT_GROUP_DETAILS_DEADLINE)}
              value={data?.deadline ? new Date(data.deadline).toLocaleString() : "-"}
              icon={<AccessTime />}
              tone="neutral"
              dense
            />,
            isIdNetData ? (
              <InsightCard
                title={t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_TEST_WILDCARD)}
                value={data?.testWildcard ? t(TranslationKey.STATUS_YES) : t(TranslationKey.STATUS_NO)}
                icon={<PlaylistAddCheck />}
                tone={data?.testWildcard ? "success" : "neutral"}
                dense
              />
            ) : null,
            isIdNetData ? (
              <InsightCard
                title={t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_TEST_FIRST_LAST_BR)}
                value={data?.testFirstLastBr ? t(TranslationKey.STATUS_YES) : t(TranslationKey.STATUS_NO)}
                icon={<PlaylistAddCheck />}
                tone={data?.testFirstLastBr ? "success" : "neutral"}
                dense
              />
            ) : null
          ]}
        />

        <Divider sx={{ my: 2 }} />

        <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
          <Button
            variant="outlined"
            size="small"
            onClick={() => {
              setSortField("name")
              setSortDir(prev => (prev === "asc" && sortField === "name" ? "desc" : "asc"))
            }}
          >
            {sortField === "name" && sortDir === "asc" ? t(TranslationKey.DATA_GRID_ASC) : t(TranslationKey.DATA_GRID_DESC)}
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={() => {
              setSortField("%")
              setSortDir(prev => (prev === "asc" && sortField === "%" ? "desc" : "asc"))
            }}
          >
            %
          </Button>
        </Stack>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(auto-fill, minmax(240px, 1fr))"
            },
            gap: 2
          }}
        >
          {sortedAssignments.map(a => {
            const canReopen =
              a.assignmentAttemptStatus === AssignmentSubmissionAttemptStatus.Locked &&
              !reopenedAssignmentIds.has(a.assignmentId)

            return (
              <AssignmentGroupSubmitDetailsCard
                key={a.assignmentId}
                assignmentId={a.assignmentId}
                studentUsername={a.studentUsername}
                successRate={a.successRate}
                submittedAt={"submittedAt" in a ? a.submittedAt : undefined}
                assignmentAttemptStatus={a.assignmentAttemptStatus}
                assignmentType={data?.type}
                reopenPending={reopenAttemptMutation.isPending}
                onReopen={canReopen
                  ? () => {
                      if (!data?.type) return
                      reopenAttemptMutation.mutate({
                        assignmentId: a.assignmentId,
                        assignmentGroupType: data.type
                      })
                    }
                  : undefined}
              />
            )
          })}
        </Box>
      </Stack>
    </>
  )
}

export default TeacherAssignmentGroupDetails