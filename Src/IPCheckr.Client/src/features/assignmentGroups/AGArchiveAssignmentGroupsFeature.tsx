import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Divider,
  Pagination,
  Stack,
  Tooltip,
  Typography,
  LinearProgress
} from "@mui/material"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { assignmentGroupApi } from "../../utils/apiClients"
import {
  AssignmentGroupDifficulty,
  AssignmentGroupIpCat,
  AssignmentGroupType,
  type AssignmentGroupDto,
  type ClassDto,
  type QueryAssignmentGroupsRes,
} from "../../dtos"
import { useAuth } from "../../contexts/AuthContext"
import AGArchiveSkeleton from "./components/skeletons/AGArchiveSkeleton"
import ErrorLoading from "../../components/ui/ErrorLoading"
import { TranslationKey } from "../../utils/i18n"
import { getDifficultyColor, getDifficultyLabel } from "../../utils/getDifficultyLabel"
import { getHostSortLabel } from "../../utils/getHostSortLabel"
import AGHeader from "./components/AGHeader"
import type { AGClassFilterValue } from "./components/AGHeader"
import type { IAG } from "./AGAssignmentGroupsFeature"

const formatDateTimeByLanguage = (value: string, language: string) =>
  new Date(value).toLocaleString(language.toLowerCase(), { dateStyle: "medium", timeStyle: "short" })

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

interface AGArchiveCardProps {
  ag: IAG
  onCardClick: (ag: IAG) => void
}

const AGArchiveCard = ({ ag, onCardClick }: AGArchiveCardProps) => {
  const { t, i18n } = useTranslation()

  return (
    <Tooltip title={ag.description ?? ""}>
      <Card
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
        onClick={() => onCardClick(ag)}
      >
        <CardHeader
          sx={{ py: 1.5, px: 2, "& .MuiCardHeader-title": { mb: 0.25 }, "& .MuiCardHeader-subheader": { mt: 0.25 } }}
          title={
            <Typography variant="subtitle2" fontWeight={700} noWrap className="ag-title-text">
              {ag.name}
            </Typography>
          }
          subheader={
            <Stack direction="row" flexWrap="wrap" gap={0.5} alignItems="center">
              <Chip
                label={
                  ag.type === AssignmentGroupType.Subnet
                    ? t(TranslationKey.AG_ARCHIVE_TYPE_SUBNET)
                    : t(TranslationKey.AG_ARCHIVE_TYPE_IDNET)
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
                <Chip label={t(TranslationKey.AG_ARCHIVE_CHIP_WILDCARD)} size="small" variant="outlined" />
              )}
              {ag.testFirstLastBr && (
                <Chip label={t(TranslationKey.AG_ARCHIVE_CHIP_FIRST_LAST_BR)} size="small" variant="outlined" />
              )}
            </Stack>
          }
        />
        <CardContent sx={{ display: "flex", flexDirection: "column", gap: 0.4, px: 2 }}>
          <Stack spacing={0.8}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" color="text.secondary" noWrap>
                {t(TranslationKey.AG_ARCHIVE_CARD_SUBMITTED)}: {ag.submitted}/{ag.total}
              </Typography>
              <Typography variant="caption" fontWeight={700} color="text.primary" noWrap sx={{ ml: 1 }}>
                {ag.className}
              </Typography>
            </Stack>
            <Stack spacing={0.6}>
              <Typography variant="caption" color="text.secondary">
                {t(TranslationKey.AG_ARCHIVE_CARD_AVG_SUCCESS)}
              </Typography>
              <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
                {ag.successRate !== null && ag.successRate !== undefined
                  ? `${ag.successRate.toFixed(1)}%`
                  : t(TranslationKey.AG_ARCHIVE_CARD_UNSUBMITTED)}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={Math.max(0, Math.min(100, ag.successRate ?? 0))}
                color="inherit"
                sx={{ height: 7, borderRadius: 999, opacity: 0.4 }}
              />
              <Typography variant="caption" color="text.secondary" noWrap>
                {formatDateTimeByLanguage(ag.startDate, i18n.language)} – {formatDateTimeByLanguage(ag.deadline, i18n.language)}
              </Typography>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Tooltip>
  )
}

interface AGArchiveAssignmentGroupsFeatureProps {
  onNavigateDetails: (id: number, type: AssignmentGroupType) => void
  teacherFilter?: number | null
  hideClassFilter?: boolean
}

const ITEMS_PER_PAGE = 12

const AGArchiveAssignmentGroupsFeature = ({
  onNavigateDetails,
  teacherFilter,
  hideClassFilter
}: AGArchiveAssignmentGroupsFeatureProps) => {
  const { t } = useTranslation()
  const { userId } = useAuth()
  const queryUserId = teacherFilter !== undefined ? teacherFilter : userId
  const queryClient = useQueryClient()

  const [search, setSearch] = useState("")
  const [classFilter, setClassFilter] = useState<AGClassFilterValue>(null)
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
  const [page, setPage] = useState(1)

  const classFilterNormalized = classFilter === "ALL" || classFilter === null ? null : classFilter
  const difficultyFilterQuery =
    difficultyFilters.length === 0 || difficultyFilters.length === 3
      ? null
      : difficultyFilters.join(",")

  const agsQuery = useQuery<QueryAssignmentGroupsRes, Error>({
    queryKey: ["archiveAssignmentGroups", queryUserId, classFilterNormalized, search, difficultyFilterQuery],
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
          true
        )
        .then(r => r.data),
    placeholderData: prev => prev
  })

  const allAGs: IAG[] = (agsQuery.data?.assignmentGroups ?? []).map(normalizeAssignmentGroup)

  const classOptions: ClassDto[] = Array.from(
    new Map(allAGs.map(ag => [ag.classId, ag.className])).entries()
  )
    .sort((a, b) => a[1].localeCompare(b[1]))
    .map(([classId, className]) => ({ classId, className, teachers: [], teacherUsernames: [], studentCount: 0 }))

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
    .sort((a, b) => new Date(b.deadline).getTime() - new Date(a.deadline).getTime())

  const totalPages = Math.max(1, Math.ceil(filteredAGs.length / ITEMS_PER_PAGE))
  const pagedAGs = filteredAGs.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  const isLoading = agsQuery.isLoading
  const hasError = agsQuery.isError

  const retry = () => {
    queryClient.invalidateQueries({ queryKey: ["archiveAssignmentGroups"] })
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <AGHeader
        t={t}
        search={search}
        onSearchChange={v => { setSearch(v); setPage(1) }}
        classValue={classFilter ?? "ALL"}
        onClassChange={v => { setClassFilter(v); setPage(1) }}
        classOptions={classOptions}
        typeValues={typeFilters}
        onToggleType={value => {
          setTypeFilters(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value])
          setPage(1)
        }}
        ipCatValues={ipCatFilters}
        onToggleIpCat={value => {
          setIpCatFilters(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value])
          setPage(1)
        }}
        difficultyValues={difficultyFilters}
        onToggleDifficulty={value => {
          setDifficultyFilters(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value])
          setPage(1)
        }}
        hideArchive
        hideTemplates
        hideClassFilter={hideClassFilter}
      />

      {isLoading ? (
        <AGArchiveSkeleton />
      ) : hasError ? (
        <ErrorLoading onRetry={retry} />
      ) : (
        <Box
          sx={{
            backgroundColor: "background.paper",
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 1,
            p: 2,
            display: "flex",
            flexDirection: "column",
            gap: 2
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            <Chip label={t(TranslationKey.AG_ARCHIVE_TITLE)} color="default" />
            <Typography variant="subtitle2" color="text.secondary">
              {filteredAGs.length} {t(TranslationKey.AG_ARCHIVE_ITEMS_LABEL)}
            </Typography>
          </Stack>
          <Divider />
          {filteredAGs.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {t(TranslationKey.AG_ARCHIVE_NO_DATA)}
            </Typography>
          ) : (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" },
                gap: 2
              }}
            >
              {pagedAGs.map(ag => (
                <AGArchiveCard
                  key={`${ag.type}-${ag.id}`}
                  ag={ag}
                  onCardClick={ag => onNavigateDetails(ag.id, ag.type)}
                />
              ))}
            </Box>
          )}
          {filteredAGs.length > ITEMS_PER_PAGE && (
            <Stack direction="row" justifyContent="center">
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, p) => setPage(p)}
                size="small"
                color="primary"
              />
            </Stack>
          )}
        </Box>
      )}
    </Box>
  )
}

export default AGArchiveAssignmentGroupsFeature