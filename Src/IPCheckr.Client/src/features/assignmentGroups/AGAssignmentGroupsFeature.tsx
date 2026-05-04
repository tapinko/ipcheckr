import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Tooltip,
  Typography,
  IconButton,
  Pagination,
  LinearProgress
} from "@mui/material"
import EditOutlinedIcon from "@mui/icons-material/EditOutlined"
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { assignmentGroupApi, classApi } from "../../utils/apiClients"
import {
  AssignmentGroupDifficulty,
  AssignmentGroupHostSortStrategy,
  AssignmentGroupIpCat,
  AssignmentGroupStatus,
  AssignmentGroupType,
  type ApiProblemDetails,
  type AssignmentGroupDto,
  type ClassDto,
  type QueryAssignmentGroupsRes,
} from "../../dtos"
import { useAuth } from "../../contexts/AuthContext"
import CardsSkeleton from "../../components/CardsSkeleton"
import ErrorLoading from "../../components/ErrorLoading"
import { Language, TranslationKey } from "../../utils/i18n"
import { getDifficultyColor, getDifficultyLabel } from "../../utils/getDifficultyLabel"
import { getHostSortLabel } from "../../utils/getHostSortLabel"
import DeleteDialog from "../../components/DeleteDialog"
import type { AxiosError, AxiosResponse } from "axios"
import { CustomAlert, type CustomAlertState } from "../../components/CustomAlert"
import { getStatusMap } from "../../utils/getStatusMap"
import type { AGClassFilterValue } from "../../components/AGHeader"
import AGHeader from "../../components/AGHeader"

export interface IAG {
  id: number
  name: string
  description?: string | null
  classId: number
  className: string
  submitted: number
  total: number
  startDate: string
  deadline: string
  status: AssignmentGroupStatus
  successRate: number | null
  type: AssignmentGroupType
  difficulty?: AssignmentGroupDifficulty | null
  ipCat?: AssignmentGroupIpCat
  hostSortStrategy?: AssignmentGroupHostSortStrategy | null
  testWildcard?: boolean
  testFirstLastBr?: boolean
  isArchived: boolean
}

type ClassFilterValue = AGClassFilterValue

type MovePlan = {
  ag: IAG
  fromStatus: AssignmentGroupStatus
  toStatus: AssignmentGroupStatus
  startDate: string
  deadline: string
}

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })

const formatDateTimeByLanguage = (value: string, language: string) =>
  new Date(value).toLocaleString(language.toLowerCase(), { dateStyle: "medium", timeStyle: "short" })

const formatCountdownClock = (remainingMs: number) => {
  const clamped = Math.max(0, remainingMs)
  const totalSeconds = Math.floor(clamped / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (days > 0) {
    return `${String(days).padStart(2, "0")}:${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
  }
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

const toLocalDateTimeString = (date: Date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  const h = String(date.getHours()).padStart(2, "0")
  const min = String(date.getMinutes()).padStart(2, "0")
  const s = String(date.getSeconds()).padStart(2, "0")
  return `${y}-${m}-${d}T${h}:${min}:${s}`
}

const TEN_MINUTES_MS = 10 * 60 * 1000
const TWENTY_MINUTES_MS = 20 * 60 * 1000

const computeMoveDates = (
  ag: IAG,
  targetStatus: AssignmentGroupStatus,
  now = new Date()
): { startDate: string; deadline: string } | null => {
  if (ag.status === targetStatus) return null

  const nowMs = now.getTime()
  const oldDeadline = new Date(ag.deadline)

  let nextStart = new Date(ag.startDate)
  let nextDeadline = new Date(oldDeadline)

  if (ag.status === AssignmentGroupStatus.Upcoming && targetStatus === AssignmentGroupStatus.InProgress) {
    nextStart = new Date(nowMs)
    if (oldDeadline.getTime() <= nowMs + TEN_MINUTES_MS) {
      nextDeadline = new Date(nowMs + TEN_MINUTES_MS)
    }
  }

  if (ag.status === AssignmentGroupStatus.Upcoming && targetStatus === AssignmentGroupStatus.Ended) {
    nextStart = new Date(nowMs)
    nextDeadline = new Date(nowMs)
  }

  if (ag.status === AssignmentGroupStatus.InProgress && targetStatus === AssignmentGroupStatus.Upcoming) {
    nextStart = new Date(nowMs + TEN_MINUTES_MS)
    nextDeadline = new Date(nowMs + TWENTY_MINUTES_MS)
  }

  if (ag.status === AssignmentGroupStatus.InProgress && targetStatus === AssignmentGroupStatus.Ended) {
    nextDeadline = new Date(nowMs)
    if (nextStart.getTime() > nextDeadline.getTime()) {
      nextStart = new Date(nowMs)
    }
  }

  if (ag.status === AssignmentGroupStatus.Ended && targetStatus === AssignmentGroupStatus.Upcoming) {
    nextStart = new Date(nowMs + TEN_MINUTES_MS)
    nextDeadline = new Date(nowMs + TWENTY_MINUTES_MS)
  }

  if (ag.status === AssignmentGroupStatus.Ended && targetStatus === AssignmentGroupStatus.InProgress) {
    nextDeadline = new Date(nowMs + TEN_MINUTES_MS)
    const remainingMs = oldDeadline.getTime() - nowMs
    if (remainingMs < TEN_MINUTES_MS) {
      nextStart = new Date(nowMs)
    }
    if (nextStart.getTime() > nextDeadline.getTime()) {
      nextStart = new Date(nowMs)
    }
  }

  return {
    startDate: toLocalDateTimeString(nextStart),
    deadline: toLocalDateTimeString(nextDeadline)
  }
}

const normalizeAssignmentGroup = (ag: AssignmentGroupDto): IAG => ({
  id: ag.assignmentGroupId,
  name: ag.name,
  description: ag.description,
  classId: ag.classId,
  className: ag.className,
  submitted: ag.submitted,
  total: ag.total,
  startDate: ag.startDate,
  deadline: ag.deadline,
  status: ag.status,
  difficulty: ag.difficulty ?? null,
  successRate: ag.successRate,
  type: ag.type,
  ipCat: ag.ipCat ?? undefined,
  hostSortStrategy: ag.hostSortStrategy ?? null,
  testWildcard: ag.testWildcard ?? undefined,
  testFirstLastBr: ag.testFirstLastBr ?? undefined,
  isArchived: ag.isArchived
})

interface AssignmentGroupStatusMetricProps {
  ag: IAG
  nowMs: number
}

const AssignmentGroupStatusMetric = ({ ag, nowMs }: AssignmentGroupStatusMetricProps) => {
  const { t, i18n } = useTranslation()

  const startMs = new Date(ag.startDate).getTime()
  const deadlineMs = new Date(ag.deadline).getTime()
  const toStartMs = startMs - nowMs
  const toDeadlineMs = deadlineMs - nowMs
  const activeWindowMs = Math.max(deadlineMs - startMs, 1)
  const inProgressElapsedPct = Math.max(0, Math.min(100, ((nowMs - startMs) / activeWindowMs) * 100))

  return (
    <Stack spacing={0.6}>
      {ag.status === AssignmentGroupStatus.Upcoming && (
        <>
          <Typography variant="caption" color="text.secondary">
            {t(TranslationKey.AG_ASSIGNMENT_GROUPS_CARD_STARTS_IN)}
          </Typography>
          <Typography variant="subtitle2" fontWeight={700} color="primary.main" sx={{ fontVariantNumeric: "tabular-nums" }}>
            {toStartMs > 0
              ? formatCountdownClock(toStartMs)
              : t(TranslationKey.AG_ASSIGNMENT_GROUPS_CARD_COUNTDOWN_FINISHED)}
          </Typography>
          <LinearProgress
            variant={toStartMs > 0 ? "indeterminate" : "determinate"}
            value={100}
            color="primary"
            sx={{ height: 7, borderRadius: 999 }}
          />
        </>
      )}

      {ag.status === AssignmentGroupStatus.InProgress && (
        <>
          <Typography variant="caption" color="text.secondary">
            {t(TranslationKey.AG_ASSIGNMENT_GROUPS_CARD_ENDS_IN)}
          </Typography>
          <Typography variant="subtitle2" fontWeight={700} color="warning.main" sx={{ fontVariantNumeric: "tabular-nums" }}>
            {toDeadlineMs > 0
              ? formatCountdownClock(toDeadlineMs)
              : t(TranslationKey.AG_ASSIGNMENT_GROUPS_CARD_COUNTDOWN_FINISHED)}
          </Typography>
          <LinearProgress
            variant="determinate"
            value={inProgressElapsedPct}
            color="warning"
            sx={{ height: 7, borderRadius: 999 }}
          />
        </>
      )}

      {ag.status === AssignmentGroupStatus.Ended && (
        <>
          <Typography variant="caption" color="text.secondary">
            {t(TranslationKey.AG_ASSIGNMENT_GROUPS_CARD_AVG_SUCCESS)}
          </Typography>
          <Typography variant="subtitle2" fontWeight={700} color="success.main" sx={{ fontVariantNumeric: "tabular-nums" }}>
            {ag.successRate !== null && ag.successRate !== undefined
              ? `${ag.successRate.toFixed(1)}%`
              : t(TranslationKey.AG_ASSIGNMENT_GROUPS_CARD_UNSUBMITTED)}
          </Typography>
          <LinearProgress
            variant="determinate"
            value={Math.max(0, Math.min(100, ag.successRate ?? 0))}
            color="success"
            sx={{ height: 7, borderRadius: 999 }}
          />
        </>
      )}

      <Typography variant="caption" color="text.secondary" noWrap>
        {formatDateTimeByLanguage(ag.startDate, i18n.language)} - {formatDateTimeByLanguage(ag.deadline, i18n.language)}
      </Typography>
    </Stack>
  )
}

interface AGStatusColumnProps {
  status: AssignmentGroupStatus
  visibleItems: IAG[]
  totalItems: number
  isDragOver: boolean
  draggedAGStatus: AssignmentGroupStatus | null
  moveMutationPending: boolean
  nowMs: number
  endedPage: number
  endedPages: number
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent) => void
  onCardDragStart: (ag: IAG, e: React.DragEvent) => void
  onCardDragEnd: () => void
  onCardClick: (ag: IAG) => void
  onCardEdit: (ag: IAG) => void
  onCardDelete: (ag: IAG) => void
  onEndedPageChange: (page: number) => void
}

const AGStatusColumn = ({
  status,
  visibleItems,
  totalItems,
  isDragOver,
  draggedAGStatus,
  moveMutationPending,
  nowMs,
  endedPage,
  endedPages,
  onDragOver,
  onDragLeave,
  onDrop,
  onCardDragStart,
  onCardDragEnd,
  onCardClick,
  onCardEdit,
  onCardDelete,
  onEndedPageChange,
}: AGStatusColumnProps) => {
  const { t } = useTranslation()
  const statusMap = getStatusMap(t)

  return (
    <Box
      onDragOver={e => {
        if (!draggedAGStatus || draggedAGStatus === status || moveMutationPending) return
        e.preventDefault()
        onDragOver(e)
      }}
      onDragLeave={onDragLeave}
      onDrop={e => {
        e.preventDefault()
        onDrop(e)
      }}
      sx={{
        backgroundColor: "background.paper",
        border: "1px solid",
        borderColor: isDragOver && draggedAGStatus !== status ? "primary.main" : "divider",
        borderRadius: 1,
        p: 2,
        display: "flex",
        flexDirection: "column",
        gap: 2,
        transition: "border-color 120ms ease"
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1}>
        <Chip
          label={statusMap[status]?.label ?? status}
          color={
            status === AssignmentGroupStatus.Upcoming
              ? "primary"
              : status === AssignmentGroupStatus.InProgress
                ? "warning"
                : "success"
          }
        />
        <Typography variant="subtitle2" color="text.secondary">
          {totalItems} {t(TranslationKey.AG_ASSIGNMENT_GROUPS_ITEMS_LABEL)}
        </Typography>
      </Stack>
      <Divider />
      <Stack spacing={2}>
        {totalItems === 0 ? (
          <Typography variant="body2" color="text.secondary">
            {t(TranslationKey.AG_ASSIGNMENT_GROUPS_NO_DATA)}
          </Typography>
        ) : (
          visibleItems.map(ag => (
            <Tooltip key={`${status}-${ag.id}`} title={ag.description ?? ""}>
              <Card
                draggable={!moveMutationPending}
                variant="outlined"
                sx={{
                  width: "100%",
                  border: "1px solid",
                  borderColor: "action.disabled",
                  borderRadius: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: 0.5,
                  cursor: "pointer",
                  "&:hover": { opacity: 0.9 },
                  "&:hover .ag-title-text": { textDecoration: "underline" }
                }}
                onDragStart={e => {
                  e.stopPropagation()
                  onCardDragStart(ag, e)
                  e.dataTransfer.effectAllowed = "move"
                }}
                onDragEnd={onCardDragEnd}
                onClick={() => onCardClick(ag)}
              >
                <CardHeader
                  sx={{ py: 1.5, px: 2, "& .MuiCardHeader-title": { mb: 0.25 }, "& .MuiCardHeader-subheader": { mt: 0.25 } }}
                  title={
                    <Typography variant="subtitle2" fontWeight={700} noWrap className="ag-title-text">
                      {ag.name}
                    </Typography>
                  }
                  action={
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <IconButton
                        size="small"
                        disabled={ag.isArchived}
                        onClick={e => {
                          e.stopPropagation()
                          onCardEdit(ag)
                        }}
                      >
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={e => {
                          e.stopPropagation()
                          onCardDelete(ag)
                        }}
                      >
                        <DeleteOutlineOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  }
                  subheader={
                    <Stack direction="row" flexWrap="wrap" gap={0.5} alignItems="center">
                      <Chip
                        label={
                          ag.type === AssignmentGroupType.Subnet
                            ? t(TranslationKey.AG_ASSIGNMENT_GROUPS_TYPE_SUBNET)
                            : t(TranslationKey.AG_ASSIGNMENT_GROUPS_TYPE_IDNET)
                        }
                        color={ag.type === AssignmentGroupType.Subnet ? "primary" : "secondary"}
                        size="small"
                        variant="outlined"
                      />
                      {ag.ipCat && (
                        <Chip label={ag.ipCat} size="small" sx={{ borderStyle: "dashed" }} variant="outlined" />
                      )}
                      {ag.difficulty && (
                        <Chip
                          label={getDifficultyLabel(ag.difficulty, t)}
                          color={getDifficultyColor(ag.difficulty)}
                          size="small"
                          variant="outlined"
                        />
                      )}
                      {ag.hostSortStrategy && (
                        <Chip label={getHostSortLabel(ag.hostSortStrategy, t)} size="small" variant="outlined" />
                      )}
                      {ag.testWildcard && (
                        <Chip
                          label={t(TranslationKey.AG_ASSIGNMENT_GROUPS_CHIP_WILDCARD)}
                          size="small"
                          variant="outlined"
                        />
                      )}
                      {ag.testFirstLastBr && (
                        <Chip
                          label={t(TranslationKey.AG_ASSIGNMENT_GROUPS_CHIP_FIRST_LAST_BR)}
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Stack>
                  }
                />
                <CardContent sx={{ display: "flex", flexDirection: "column", gap: 0.4, px: 2 }}>
                  <Stack spacing={0.8}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {t(TranslationKey.AG_ASSIGNMENT_GROUPS_CARD_SUBMITTED)}: {ag.submitted}/{ag.total}
                      </Typography>
                      <Typography variant="caption" fontWeight={700} color="text.primary" noWrap sx={{ ml: 1 }}>
                        {ag.className}
                      </Typography>
                    </Stack>
                    <AssignmentGroupStatusMetric ag={ag} nowMs={nowMs} />
                  </Stack>
                </CardContent>
              </Card>
            </Tooltip>
          ))
        )}
      </Stack>
      {status === AssignmentGroupStatus.Ended && totalItems > 10 && (
        <Stack direction="row" justifyContent="center">
          <Pagination
            count={endedPages}
            page={endedPage}
            onChange={(_, page) => onEndedPageChange(page)}
            size="small"
            color="primary"
          />
        </Stack>
      )}
    </Box>
  )
}

interface AGAssignmentGroupsFeatureProps {
  onNavigateCreate: (classId?: number) => void
  onNavigateTemplates: () => void
  onNavigateDetails: (id: number, type: AssignmentGroupType) => void
  onNavigateEdit: (id: number, type: AssignmentGroupType) => void
  onNavigateArchive: () => void
  teacherFilter?: number | null
}

const AGAssignmentGroupsFeature = ({
  onNavigateCreate,
  onNavigateTemplates,
  onNavigateDetails,
  onNavigateEdit,
  onNavigateArchive,
  teacherFilter
}: AGAssignmentGroupsFeatureProps) => {
  const { t, i18n } = useTranslation()
  const { userId } = useAuth()
  const queryUserId = teacherFilter !== undefined ? teacherFilter : userId
  const queryClient = useQueryClient()
  const statusMap = getStatusMap(t)

  const [search, setSearch] = useState("")
  const [classFilter, setClassFilter] = useState<ClassFilterValue>(null)
  const [typeFilters, setTypeFilters] = useState<AssignmentGroupType[]>([
    AssignmentGroupType.Subnet,
    AssignmentGroupType.Idnet
  ])
  const [ipCatFilters, setIpCatFilters] = useState<AssignmentGroupIpCat[]>([
    AssignmentGroupIpCat.All,
    AssignmentGroupIpCat.Abc,
    AssignmentGroupIpCat.Local
  ])
  const [difficultyFilters, setDifficultyFilters] = useState<AssignmentGroupDifficulty[]>([
    AssignmentGroupDifficulty.Easy,
    AssignmentGroupDifficulty.Medium,
    AssignmentGroupDifficulty.Hard
  ])
  const [endedPage, setEndedPage] = useState(1)

  const [deleteDialogVis, setDeleteDialogVis] = useState(false)
  const [deleteAG, setDeleteAG] = useState<IAG | null>(null)
  const [alert, setAlert] = useState<CustomAlertState | null>(null)
  const [draggedAG, setDraggedAG] = useState<IAG | null>(null)
  const [dragOverStatus, setDragOverStatus] = useState<AssignmentGroupStatus | null>(null)
  const [movePlan, setMovePlan] = useState<MovePlan | null>(null)
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    const interval = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  const classesQuery = useQuery<ClassDto[], Error>({
    queryKey: ["agClasses", queryUserId],
    enabled: !!userId,
    queryFn: () => classApi.classQueryClasses(null, null, queryUserId).then(r => r.data.classes)
  })

  useEffect(() => {
    if (classFilter === null && classesQuery.data) {
      setClassFilter("ALL")
    }
  }, [classFilter, classesQuery.data])

  const classFilterNormalized = classFilter === "ALL" || classFilter === null ? null : classFilter
  const difficultyFilterQuery =
    difficultyFilters.length === 0 || difficultyFilters.length === 3
      ? null
      : difficultyFilters.join(",")

  const agsQuery = useQuery<QueryAssignmentGroupsRes, Error>({
    queryKey: ["agAssignmentGroups", queryUserId, classFilterNormalized, search, difficultyFilterQuery],
    enabled: !!userId,
    queryFn: () =>
      assignmentGroupApi
        .assignmentGroupQueryAssignmentGroups(
          search.trim() ? search.trim() : null,
          classFilterNormalized,
          queryUserId,
          null,
          null,
          difficultyFilterQuery,
          false
        )
        .then(r => r.data),
    placeholderData: prev => prev
  })

  const allAGs = (agsQuery.data?.assignmentGroups ?? []).map(normalizeAssignmentGroup)

  const filteredAGs = allAGs
    .filter(ag => typeFilters.includes(ag.type))
    .filter(ag => (ag.ipCat ? ipCatFilters.includes(ag.ipCat) : true))
    .filter(ag => (ag.difficulty ? difficultyFilters.includes(ag.difficulty) : true))
    .filter(ag => (classFilterNormalized ? ag.classId === classFilterNormalized : true))
    .filter(ag => {
      const searchTerm = search.trim().toLowerCase()
      return searchTerm
        ? ag.name.toLowerCase().includes(searchTerm) || ag.className.toLowerCase().includes(searchTerm)
        : true
    })

  const grouped: Record<AssignmentGroupStatus, IAG[]> = {
    [AssignmentGroupStatus.Upcoming]: [],
    [AssignmentGroupStatus.InProgress]: [],
    [AssignmentGroupStatus.Ended]: []
  }

  filteredAGs.forEach(ag => grouped[ag.status]?.push(ag))

  grouped[AssignmentGroupStatus.Upcoming].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  )
  grouped[AssignmentGroupStatus.InProgress].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  )
  grouped[AssignmentGroupStatus.Ended].sort(
    (a, b) => new Date(b.deadline).getTime() - new Date(a.deadline).getTime()
  )

  const endedCount = grouped[AssignmentGroupStatus.Ended]?.length ?? 0
  const endedPages = Math.max(1, Math.ceil(endedCount / 10) || 1)
  const endedItems = grouped[AssignmentGroupStatus.Ended] ?? []
  const endedSlice = endedItems.slice((endedPage - 1) * 10, endedPage * 10)

  useEffect(() => {
    if (endedPage > endedPages) setEndedPage(1)
  }, [endedCount, endedPage, endedPages])

  useEffect(() => {
    setEndedPage(1)
  }, [search, classFilter, typeFilters, ipCatFilters, difficultyFilters])

  const isLoading = classesQuery.isLoading || agsQuery.isLoading
  const hasError = classesQuery.isError || agsQuery.isError

  useEffect(() => {
    if (hasError) setAlert({ severity: "error", message: "Error loading data" })
  }, [hasError])

  const retry = () => {
    queryClient.invalidateQueries({ queryKey: ["agClasses"] })
    queryClient.invalidateQueries({ queryKey: ["agAssignmentGroups"] })
  }

  const deleteMutation = useMutation<void, AxiosError<ApiProblemDetails>, IAG[]>({
    mutationFn: async ags => {
      const idnetIds = ags.filter(a => a.type === AssignmentGroupType.Idnet).map(a => a.id)
      const subnetIds = ags.filter(a => a.type === AssignmentGroupType.Subnet).map(a => a.id)
      const calls: Promise<unknown>[] = []
      if (idnetIds.length) {
        calls.push(assignmentGroupApi.assignmentGroupDeleteIdNetAssignmentGroups({ assignmentGroupIds: idnetIds }))
      }
      if (subnetIds.length) {
        calls.push(assignmentGroupApi.assignmentGroupDeleteSubnetAssignmentGroups({ assignmentGroupIds: subnetIds }))
      }
      await Promise.all(calls)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agSubnetAGs"], exact: false })
      queryClient.invalidateQueries({ queryKey: ["agIdNetAGs"], exact: false })
      setAlert({ severity: "success", message: t(TranslationKey.AG_ASSIGNMENT_GROUPS_DELETE_SUCCESS) })
      setDeleteDialogVis(false)
      setDeleteAG(null)
    },
    onError: error => {
      const details = error.response?.data
      const localMessage = i18n.language === Language.EN ? details?.messageEn : details?.messageSk
      setAlert({
        severity: "error",
        message: `${t(TranslationKey.AG_ASSIGNMENT_GROUPS_DELETE_ERROR)}. ${localMessage ?? ""}`
      })
    }
  })

  const moveMutation = useMutation<AxiosResponse<void>, AxiosError<ApiProblemDetails>, MovePlan>({
    mutationFn: async plan => {
      if (plan.ag.type === AssignmentGroupType.Idnet) {
        return assignmentGroupApi.assignmentGroupEditIdNetAssignmentGroup({
          id: plan.ag.id,
          startDate: plan.startDate,
          deadline: plan.deadline
        })
      }
      return assignmentGroupApi.assignmentGroupEditSubnetAssignmentGroup({
        id: plan.ag.id,
        startDate: plan.startDate,
        deadline: plan.deadline
      })
    },
    onSuccess: (_data, plan) => {
      queryClient.invalidateQueries({ queryKey: ["agSubnetAGs"], exact: false })
      queryClient.invalidateQueries({ queryKey: ["agIdNetAGs"], exact: false })
      setAlert({
        severity: "success",
        message: t(TranslationKey.AG_ASSIGNMENT_GROUPS_MOVE_SUCCESS, { value: plan.ag.name })
      })
      setMovePlan(null)
    },
    onError: error => {
      const details = error.response?.data
      const localMessage = i18n.language === Language.EN ? details?.messageEn : details?.messageSk
      setAlert({
        severity: "error",
        message: `${t(TranslationKey.AG_ASSIGNMENT_GROUPS_EDIT_ERROR)}. ${localMessage ?? ""}`
      })
    }
  })

  const handleDelete = async () => {
    if (deleteAG) await deleteMutation.mutateAsync([deleteAG])
  }

  const handleDropToStatus = (targetStatus: AssignmentGroupStatus) => {
    if (!draggedAG || draggedAG.status === targetStatus) return
    const moved = computeMoveDates(draggedAG, targetStatus)
    if (!moved) return
    setMovePlan({ ag: draggedAG, fromStatus: draggedAG.status, toStatus: targetStatus, ...moved })
  }

  const confirmMove = async () => {
    if (!movePlan) return
    await moveMutation.mutateAsync(movePlan)
    setDraggedAG(null)
    setDragOverStatus(null)
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <AGHeader
          t={t}
          search={search}
          onSearchChange={setSearch}
          classValue={classFilter}
          onClassChange={setClassFilter}
          classOptions={classesQuery.data ?? []}
          typeValues={typeFilters}
          onToggleType={(value: AssignmentGroupType) => {
            setTypeFilters(prev =>
              prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
            )
          }}
          ipCatValues={ipCatFilters}
          onToggleIpCat={(value: AssignmentGroupIpCat) => {
            setIpCatFilters(prev =>
              prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
            )
          }}
          difficultyValues={difficultyFilters}
          onToggleDifficulty={(value: AssignmentGroupDifficulty) => {
            setDifficultyFilters(prev =>
              prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
            )
          }}
          onCreateClick={() => onNavigateCreate(classFilterNormalized ?? undefined)}
          onTemplatesClick={() => onNavigateTemplates()}
          onArchiveClick={() => onNavigateArchive()}
          createDisabled={!classesQuery.data?.length}
        />
      </Box>

      {isLoading ? (
        <CardsSkeleton />
      ) : hasError ? (
        <ErrorLoading onRetry={retry} />
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", lg: "repeat(3, minmax(0, 1fr))" },
            gap: 3
          }}
        >
          {[AssignmentGroupStatus.Upcoming, AssignmentGroupStatus.InProgress, AssignmentGroupStatus.Ended].map(status => {
            const totalItems = grouped[status]?.length ?? 0
            const visibleItems = status === AssignmentGroupStatus.Ended ? endedSlice : grouped[status] ?? []

            return (
              <AGStatusColumn
                key={status === AssignmentGroupStatus.Ended ? `${status}-${endedPage}` : status}
                status={status}
                visibleItems={visibleItems}
                totalItems={totalItems}
                isDragOver={dragOverStatus === status}
                draggedAGStatus={draggedAG?.status ?? null}
                moveMutationPending={moveMutation.isPending}
                nowMs={nowMs}
                endedPage={endedPage}
                endedPages={endedPages}
                onDragOver={() => {
                  if (dragOverStatus !== status) setDragOverStatus(status)
                }}
                onDragLeave={() => {
                  if (dragOverStatus === status) setDragOverStatus(null)
                }}
                onDrop={() => {
                  handleDropToStatus(status)
                  setDragOverStatus(null)
                }}
                onCardDragStart={(ag) => setDraggedAG(ag)}
                onCardDragEnd={() => {
                  setDraggedAG(null)
                  setDragOverStatus(null)
                }}
                onCardClick={ag => onNavigateDetails(ag.id, ag.type)}
                onCardEdit={ag => onNavigateEdit(ag.id, ag.type)}
                onCardDelete={ag => {
                  setDeleteAG(ag)
                  setDeleteDialogVis(true)
                }}
                onEndedPageChange={setEndedPage}
              />
            )
          })}
        </Box>
      )}

      <DeleteDialog
        open={deleteDialogVis}
        onClose={() => {
          setDeleteDialogVis(false)
          setDeleteAG(null)
        }}
        onConfirm={handleDelete}
        question={t(TranslationKey.AG_ASSIGNMENT_GROUPS_DELETE_CONFIRMATION_QUESTION)}
        title={t(TranslationKey.AG_ASSIGNMENT_GROUPS_DELETE_CONFIRMATION_TITLE)}
        label={deleteAG?.name ?? ""}
      />

      <Dialog
        open={!!movePlan}
        onClose={() => {
          if (moveMutation.isPending) return
          setMovePlan(null)
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>{t(TranslationKey.AG_ASSIGNMENT_GROUPS_MOVE_TITLE)}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 1 }}>
            {movePlan
              ? t(TranslationKey.AG_ASSIGNMENT_GROUPS_MOVE_QUESTION, {
                  value: movePlan.ag.name,
                  from: statusMap[movePlan.fromStatus]?.label ?? movePlan.fromStatus,
                  to: statusMap[movePlan.toStatus]?.label ?? movePlan.toStatus
                })
              : ""}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t(TranslationKey.AG_ASSIGNMENT_GROUPS_MOVE_NEW_START)}: {movePlan ? formatDateTime(movePlan.startDate) : ""}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t(TranslationKey.AG_ASSIGNMENT_GROUPS_MOVE_NEW_DEADLINE)}: {movePlan ? formatDateTime(movePlan.deadline) : ""}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              if (moveMutation.isPending) return
              setMovePlan(null)
            }}
          >
            {t(TranslationKey.AG_ASSIGNMENT_GROUPS_CANCEL)}
          </Button>
          <Button variant="contained" color="success" onClick={confirmMove} disabled={moveMutation.isPending}>
            {t(TranslationKey.AG_ASSIGNMENT_GROUPS_MOVE_CONFIRM)}
          </Button>
        </DialogActions>
      </Dialog>

      {alert && (
        <CustomAlert severity={alert.severity} message={alert.message} onClose={() => setAlert(null)} />
      )}
    </Box>
  )
}

export default AGAssignmentGroupsFeature