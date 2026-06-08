import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import {
	AssignmentGroupDifficulty,
	AssignmentGroupIpCat,
	AssignmentGroupStatus,
	AssignmentGroupType,
	type ClassDto,
	type IDNetAssignmentDto,
	type SubnetAssignmentDto
} from "../../dtos"
import { getDifficultyColor, getDifficultyLabel } from "../../utils/getDifficultyLabel"
import { getHostSortLabel } from "../../utils/getHostSortLabel"
import { resolveComputedStatus, resolveEffectiveStatus } from "../../features/assignmentGroups/agStatus"
import { assignmentApi, assignmentGroupApi, assignmentSubmitApi } from "../../utils/apiClients"
import {
	Box,
	Button,
	Card,
	CardContent,
	CardHeader,
	Chip,
	Divider,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	LinearProgress,
	Stack,
	Typography
} from "@mui/material"
import { alpha } from "@mui/material/styles"
import { TranslationKey } from "../../utils/i18n"
import { getParametrizedUrl, RouteKeys, RouteParams, Routes } from "../../router/routes"
import { useAuth } from "../../contexts/AuthContext"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import ErrorLoading from "../../components/ui/ErrorLoading"
import AGListSkeleton from "../../features/assignmentGroups/components/skeletons/AGListSkeleton"
import { getStatusMap } from "../../utils/getStatusMap"
import AGHeader from "../../features/assignmentGroups/components/AGHeader"
import type { AGClassFilterValue } from "../../features/assignmentGroups/components/AGHeader"
import { toAssignmentTypeParam } from "../../utils/assignmentType"
import { isDemoMode } from "../../config/demoMode"

type StudentAssignment = (IDNetAssignmentDto | SubnetAssignmentDto) & {
	assignmentId: number
	type: AssignmentGroupType
}

const resolveAssignmentId = (a: unknown): number => {
	const obj = a as { assignmentId?: unknown; id?: unknown } | null
	const raw = obj?.assignmentId ?? obj?.id
	return typeof raw === "number" && raw > 0 ? raw : 0
}

const formatDateTime = (value: string) =>
	new Date(value).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })

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

const normalizeSubnet = (a: SubnetAssignmentDto): StudentAssignment => ({
	...a,
	assignmentId: resolveAssignmentId(a),
	type: AssignmentGroupType.Subnet
})

const normalizeIdNet = (a: IDNetAssignmentDto): StudentAssignment => ({
	...a,
	assignmentId: resolveAssignmentId(a),
	type: AssignmentGroupType.Idnet
})

const statusColor = (status: AssignmentGroupStatus) => {
	if (status === AssignmentGroupStatus.Upcoming) return "primary"
	if (status === AssignmentGroupStatus.InProgress) return "warning"
	return "default"
}


const StudentAssignments = () => {
	const { t } = useTranslation()
	const navigate = useNavigate()
	const { userId } = useAuth()
	const queryClient = useQueryClient()
	const statusMap = getStatusMap(t)

	const handleCardHover = (assignment: StudentAssignment) => {
		if (!assignment.assignmentId) return
		const computedStatus = resolveComputedStatus(assignment.startDate, assignment.deadline, assignment.successRate)
		const isEnded = computedStatus === AssignmentGroupStatus.Ended
		const typeKey = assignment.type === AssignmentGroupType.Subnet ? "subnet" : "idnet"
		const id = assignment.assignmentId
		if (isEnded) {
			if (assignment.type === AssignmentGroupType.Subnet) {
				queryClient.prefetchQuery({
					queryKey: ["agSubmitDetails", typeKey, String(id)],
					queryFn: () => assignmentApi.assignmentQuerySubnetAssignmentSubmitDetailsFull(id).then(r => r.data),
					staleTime: 60_000
				})
			} else {
				queryClient.prefetchQuery({
					queryKey: ["agSubmitDetails", typeKey, String(id)],
					queryFn: () => assignmentApi.assignmentQueryIdNetAssignmentSubmitDetailsFull(id).then(r => r.data),
					staleTime: 60_000
				})
			}
		} else {
			if (assignment.type === AssignmentGroupType.Subnet) {
				queryClient.prefetchQuery({
					queryKey: ["assignmentSubmissionData", typeKey, id],
					queryFn: () => assignmentSubmitApi.assignmentSubmitQuerySubnetAssignmentDataForSubmit(id).then(r => r.data),
					staleTime: 60_000
				})
			} else {
				queryClient.prefetchQuery({
					queryKey: ["assignmentSubmissionData", typeKey, id],
					queryFn: () => assignmentSubmitApi.assignmentSubmitQueryIdNetAssignmentDataForSubmit(id).then(r => r.data),
					staleTime: 60_000
				})
			}
		}
	}

	const [nowMs, setNowMs] = useState(() => Date.now())

	useEffect(() => {
		const interval = setInterval(() => setNowMs(Date.now()), 1000)
		return () => clearInterval(interval)
	}, [])

	const [confirmDialogVis, setConfirmDialogVis] = useState(false)
	const [selectedAssignment, setSelectedAssignment] = useState<StudentAssignment | null>(null)
	const [search, setSearch] = useState("")
	const [classFilter, setClassFilter] = useState<AGClassFilterValue>("ALL")
	const [typeFilter, setTypeFilter] = useState<AssignmentGroupType[]>([AssignmentGroupType.Subnet, AssignmentGroupType.Idnet])
	const [ipCatFilter, setIpCatFilter] = useState<AssignmentGroupIpCat[]>([AssignmentGroupIpCat.All, AssignmentGroupIpCat.Abc, AssignmentGroupIpCat.Local])
	const [difficultyFilter, setDifficultyFilter] = useState<AssignmentGroupDifficulty[]>([AssignmentGroupDifficulty.Easy, AssignmentGroupDifficulty.Medium, AssignmentGroupDifficulty.Hard])

	const idNetQuery = useQuery({
		queryKey: ["studentAssignments", "idnet", userId],
		enabled: !!userId,
		queryFn: () => assignmentApi.assignmentQueryIdNetAssignments(userId!).then(r => r.data.assignments ?? []),
		placeholderData: prev => prev,
		refetchInterval: 10_000
	})

	const subnetQuery = useQuery({
		queryKey: ["studentAssignments", "subnet", userId],
		enabled: !!userId,
		queryFn: () => assignmentApi.assignmentQuerySubnetAssignments(userId!).then(r => r.data.assignments ?? []),
		placeholderData: prev => prev,
		refetchInterval: 10_000
	})

	const assignments = useMemo(() => {
		const normalized = [
			...(idNetQuery.data ?? []).map(normalizeIdNet),
			...(subnetQuery.data ?? []).map(normalizeSubnet)
		]
		return normalized.filter(a => !a.isArchived)
	}, [idNetQuery.data, subnetQuery.data])

	const classOptions = useMemo<ClassDto[]>(() => {
		const uniqueNames = Array.from(new Set(assignments.map(a => a.className))).sort((a, b) => a.localeCompare(b))
		return uniqueNames.map((className, index) => ({
			classId: index + 1,
			className,
			teachers: [],
			teacherUsernames: [],
			studentCount: 0
		}))
	}, [assignments])

	const selectedClassName = useMemo(
		() => (classFilter === "ALL" || classFilter === null ? null : classOptions.find(c => c.classId === classFilter)?.className ?? null),
		[classFilter, classOptions]
	)

	const filteredAssignments = useMemo(() => {
		const term = search.trim().toLowerCase()
		return assignments
			.filter(a => typeFilter.includes(a.type))
			.filter(a => a.ipCat == null || ipCatFilter.includes(a.ipCat))
			.filter(a => (a as SubnetAssignmentDto).difficulty == null || difficultyFilter.includes((a as SubnetAssignmentDto).difficulty!))
			.filter(a => (selectedClassName ? a.className === selectedClassName : true))
			.filter(a =>
				term
					? a.name.toLowerCase().includes(term) ||
						a.className.toLowerCase().includes(term) ||
						a.teacherUsername.toLowerCase().includes(term)
					: true
			)
	}, [assignments, typeFilter, ipCatFilter, difficultyFilter, selectedClassName, search])

	const effectiveStatus = (a: StudentAssignment) =>
		resolveEffectiveStatus(a.startDate, a.deadline, a.status, a.successRate)

	const inProgressAssignment = useMemo(() => {
		const items = filteredAssignments.filter(a => effectiveStatus(a) === AssignmentGroupStatus.InProgress)
		return items.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())[0]
	}, [filteredAssignments])

	const inProgressOthers = useMemo(
		() => filteredAssignments.filter(a => effectiveStatus(a) === AssignmentGroupStatus.InProgress && a !== inProgressAssignment),
		[filteredAssignments, inProgressAssignment]
	)

	const inProgressList = useMemo(
		() => (inProgressAssignment ? [inProgressAssignment, ...inProgressOthers] : []),
		[inProgressAssignment, inProgressOthers]
	)

	const grouped = useMemo(() => {
		const remaining = filteredAssignments.filter(a => effectiveStatus(a) !== AssignmentGroupStatus.InProgress)
		const endedSorted = remaining
			.filter(a => effectiveStatus(a) === AssignmentGroupStatus.Ended)
			.sort((a, b) => new Date(b.deadline).getTime() - new Date(a.deadline).getTime())

		return {
			upcoming: remaining.filter(a => effectiveStatus(a) === AssignmentGroupStatus.Upcoming),
			ended: endedSorted
		}
	}, [filteredAssignments])

	const isLoading = (idNetQuery.isLoading || subnetQuery.isLoading) && assignments.length === 0
	const hasError = idNetQuery.isError || subnetQuery.isError

	const handleSubmitNavigate = (assignment: StudentAssignment) => {
		if (!assignment.assignmentId) return
		navigate(
			getParametrizedUrl(RouteKeys.STUDENT_ASSIGNMENT_SUBMISSION, {
				[RouteParams.ASSIGNMENT_ID]: assignment.assignmentId.toString(),
				[RouteParams.ASSIGNMENT_GROUP_TYPE]: toAssignmentTypeParam(assignment.type)
			}),
			{ state: { assignmentType: assignment.type } }
		)
	}

	const handleDetailsNavigate = (assignment: StudentAssignment) => {
		if (!assignment.assignmentId) return
		navigate(
			getParametrizedUrl(RouteKeys.STUDENT_ASSIGNMENT_DETAILS, {
				[RouteParams.ASSIGNMENT_ID]: assignment.assignmentId.toString(),
				[RouteParams.ASSIGNMENT_GROUP_TYPE]: toAssignmentTypeParam(assignment.type)
			}),
			{ state: { assignmentType: assignment.type } }
		)
	}

	if (isLoading) {
		return <AGListSkeleton columns={2} />
	}

	if (hasError) {
		return (
			<ErrorLoading
				onRetry={() => {
					queryClient.invalidateQueries({ queryKey: ["studentAssignments"] })
				}}
			/>
		)
	}

	const renderCard = (assignment: StudentAssignment, wide = false, allowSubmit = false) => {
		const computedStatus = resolveComputedStatus(assignment.startDate, assignment.deadline, assignment.successRate)
		const wasSubmitted = assignment.successRate !== null && assignment.successRate !== undefined
		const successRateValue = Number.isFinite(assignment.successRate)
			? Math.min(Math.max(assignment.successRate as number, 0), 100)
			: 0
		const canViewDetails = computedStatus === AssignmentGroupStatus.Ended

		return (
		<Card
			variant="outlined"
			sx={{
				position: "relative",
				overflow: "hidden",
				width: "100%",
				minWidth: wide ? "100%" : 260,
				maxWidth: "100%",
				borderRadius: 1,
				borderWidth: 2,
				borderColor: statusColor(computedStatus),
				backgroundColor:
					computedStatus === AssignmentGroupStatus.InProgress
						? theme => alpha(theme.palette.warning.main, 0.08)
						: "background.paper",
				cursor: assignment.assignmentId && canViewDetails ? "pointer" : "default",
				boxShadow: 0,
				"&::before":
					computedStatus === AssignmentGroupStatus.InProgress
						? {
							content: '""',
							position: "absolute",
							inset: 0,
							zIndex: 0,
							background:
								"linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent)",
							transform: "translateX(-100%)",
							animation: "inProgressShimmer 1.8s ease-in-out infinite"
						}
						: undefined,
				"& > *": {
					position: "relative",
					zIndex: 1
				},
				"@keyframes inProgressShimmer": {
					"100%": {
						transform: "translateX(100%)"
					}
				},
					"&:hover .assignment-title-link": assignment.assignmentId && canViewDetails
					? {
						textDecoration: "underline"
					}
					: undefined
			}}
			onMouseEnter={() => handleCardHover(assignment)}
			onClick={() => {
				if (!assignment.assignmentId || !canViewDetails) return
				handleDetailsNavigate(assignment)
			}}
		>
			<CardHeader
				title={
					<Typography variant={wide ? "h5" : "h6"} fontWeight={700} className="assignment-title-link" noWrap>
						{assignment.name}
					</Typography>
				}
				subheader={
					<Stack direction="row" flexWrap="wrap" gap={0.5} alignItems="center" sx={{ mt: 0.5 }}>
						<Chip
							label={assignment.type === AssignmentGroupType.Subnet ? t(TranslationKey.STUDENT_ASSIGNMENTS_TYPE_SUBNET) : t(TranslationKey.STUDENT_ASSIGNMENTS_TYPE_IDNET)}
							size="small"
							color={assignment.type === AssignmentGroupType.Subnet ? "primary" : "secondary"}
							variant="outlined"
						/>
						{assignment.ipCat && (
							<Chip
								label={assignment.ipCat}
								size="small"
								variant="outlined"
								sx={{ borderStyle: "dashed" }}
							/>
						)}
						{(assignment as SubnetAssignmentDto).difficulty && (
							<Chip
								label={getDifficultyLabel((assignment as SubnetAssignmentDto).difficulty!, t)}
								color={getDifficultyColor((assignment as SubnetAssignmentDto).difficulty!)}
								size="small"
								variant="outlined"
							/>
						)}
						{(assignment as SubnetAssignmentDto).hostSortStrategy && (
							<Chip
								label={getHostSortLabel((assignment as SubnetAssignmentDto).hostSortStrategy!, t)}
								size="small"
								variant="outlined"
							/>
						)}
						{(assignment as IDNetAssignmentDto).testWildcard && (
							<Chip
								label={t(TranslationKey.STUDENT_ASSIGNMENTS_CHIP_WILDCARD)}
								size="small"
								variant="outlined"
							/>
						)}
						{(assignment as IDNetAssignmentDto).testFirstLastBr && (
							<Chip
								label={t(TranslationKey.STUDENT_ASSIGNMENTS_CHIP_FIRST_LAST_BR)}
								size="small"
								variant="outlined"
							/>
						)}
					</Stack>
				}
			/>
			<CardContent sx={{ display: "flex", flexDirection: "column", gap: 0.8 }}>
				<Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
					<Stack direction="row" alignItems="center" spacing={1}>
						<Typography variant="body2" color="text.secondary" noWrap>
							{assignment.teacherUsername}
						</Typography>
						<Typography variant="body2" color="text.secondary" noWrap>
							{assignment.className}
						</Typography>
					</Stack>
					{allowSubmit ? (
						<Button
							variant="contained"
							color="primary"
							size="small"
							onClick={e => {
								e.stopPropagation()
								setSelectedAssignment(assignment)
								setConfirmDialogVis(true)
							}}
							disabled={computedStatus !== AssignmentGroupStatus.InProgress || !assignment.assignmentId}
						>
							{t(TranslationKey.STUDENT_ASSIGNMENTS_CARD_SUBMIT)}
						</Button>
					) : null}
				</Stack>
				{(() => {
					const startMs = new Date(assignment.startDate).getTime()
					const deadlineMs = new Date(assignment.deadline).getTime()
					const toStartMs = startMs - nowMs
					const toDeadlineMs = deadlineMs - nowMs
					const activeWindowMs = Math.max(deadlineMs - startMs, 1)
					const inProgressElapsedPct = Math.max(0, Math.min(100, ((nowMs - startMs) / activeWindowMs) * 100))

					if (computedStatus === AssignmentGroupStatus.Upcoming) {
						return (
							<Stack spacing={0.6}>
								<Typography variant="caption" color="text.secondary">
									{t(TranslationKey.AG_ASSIGNMENT_GROUPS_CARD_STARTS_IN)}
								</Typography>
								<Typography variant="subtitle2" fontWeight={700} color="primary.main" sx={{ fontVariantNumeric: "tabular-nums" }}>
									{toStartMs > 0 ? formatCountdownClock(toStartMs) : t(TranslationKey.AG_ASSIGNMENT_GROUPS_CARD_COUNTDOWN_FINISHED)}
								</Typography>
								<LinearProgress
									variant={toStartMs > 0 ? "indeterminate" : "determinate"}
									value={100}
									color="primary"
									sx={{ height: 7, borderRadius: 999 }}
								/>
								<Typography variant="caption" color="text.secondary" noWrap>
									{formatDateTime(assignment.startDate)} - {formatDateTime(assignment.deadline)}
								</Typography>
							</Stack>
						)
					}

					if (computedStatus === AssignmentGroupStatus.InProgress) {
						return (
							<Stack spacing={0.6}>
								<Typography variant="caption" color="text.secondary">
									{t(TranslationKey.AG_ASSIGNMENT_GROUPS_CARD_ENDS_IN)}
								</Typography>
								<Typography variant="subtitle2" fontWeight={700} color="warning.main" sx={{ fontVariantNumeric: "tabular-nums" }}>
									{toDeadlineMs > 0 ? formatCountdownClock(toDeadlineMs) : t(TranslationKey.AG_ASSIGNMENT_GROUPS_CARD_COUNTDOWN_FINISHED)}
								</Typography>
								<LinearProgress
									variant="determinate"
									value={inProgressElapsedPct}
									color="warning"
									sx={{ height: 7, borderRadius: 999 }}
								/>
								<Typography variant="caption" color="text.secondary" noWrap>
									{formatDateTime(assignment.startDate)} - {formatDateTime(assignment.deadline)}
								</Typography>
							</Stack>
						)
					}

					return (
						<Typography variant="subtitle1" fontWeight={700} color="text.primary">
							{formatDateTime(assignment.startDate)} - {formatDateTime(assignment.deadline)}
						</Typography>
					)
				})()}
				{computedStatus === AssignmentGroupStatus.Ended ? (
					<Stack spacing={0.5}>
						<Stack direction="row" alignItems="center" spacing={1}>
							<Typography variant="h6" fontWeight={800}>
							{wasSubmitted ? `${successRateValue.toFixed(2)}%` : t(TranslationKey.STUDENT_ASSIGNMENTS_CARD_UNSUBMITTED)}
						</Typography>
						<Typography variant="body2" color="text.secondary">
							{t(TranslationKey.STUDENT_ASSIGNMENTS_CARD_SUCCESS_RATE)}
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
				) : null}
			</CardContent>
		</Card>
		)
	}

	return (
		<>
			<Stack spacing={3}>
				{inProgressList.length > 0 ? (
          <>
            <Stack spacing={1.5}>
              {inProgressList.map(a => renderCard(a, true, true))}
            </Stack>
            <Divider />
          </>
				) : null}

				<AGHeader
					t={t}
					search={search}
					onSearchChange={setSearch}
					classValue={classFilter}
					onClassChange={setClassFilter}
					classOptions={classOptions}
					typeValues={typeFilter}
					onToggleType={v => setTypeFilter(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v])}
					ipCatValues={ipCatFilter}
					onToggleIpCat={v => setIpCatFilter(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v])}
					difficultyValues={difficultyFilter}
					onToggleDifficulty={v => setDifficultyFilter(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v])}
					onArchiveClick={() => navigate(Routes[RouteKeys.STUDENT_ASSIGNMENTS_ARCHIVE])}
					onArchiveHover={() => queryClient.prefetchQuery({
						queryKey: ["archiveAssignmentGroups", null, null, "", null],
						queryFn: () => assignmentGroupApi.assignmentGroupQueryAssignmentGroups(null, null, null, null, null, null, true).then(r => r.data),
						staleTime: 60_000
					})}
					archiveDisabled={isDemoMode}
					hideTemplates
				/>

				<Box
					sx={{
						display: "grid",
						gridTemplateColumns: {
							xs: "1fr",
							md: "repeat(2, minmax(0, 1fr))"
						},
						gap: 2
					}}
				>
					{[
						{
							status: AssignmentGroupStatus.Upcoming,
							items: grouped.upcoming
						},
						{
							status: AssignmentGroupStatus.Ended,
							items: grouped.ended
						}
					].map(section => (
						<Box
							key={section.status}
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
								<Chip
									label={statusMap[section.status]?.label ?? section.status}
									color={section.status === AssignmentGroupStatus.Upcoming ? "primary" : "success"}
								/>
								<Typography variant="subtitle2" color="text.secondary">
									{section.items.length} {t(TranslationKey.STUDENT_ASSIGNMENTS_ITEMS_LABEL)}
								</Typography>
							</Stack>
							<Divider />
							<Stack spacing={1.5}>
								{section.items.length === 0 ? (
									<Typography variant="body2" color="text.secondary">
										{t(TranslationKey.STUDENT_ASSIGNMENTS_NO_DATA)}
									</Typography>
								) : (
									section.items.map(a => renderCard(a, true))
								)}
							</Stack>
						</Box>
					))}
				</Box>
			</Stack>

			<Dialog open={confirmDialogVis} onClose={() => setConfirmDialogVis(false)} fullWidth maxWidth="xs">
				<DialogTitle>{t(TranslationKey.STUDENT_ASSIGNMENTS_SUBMIT_DIALOG_TITLE)}</DialogTitle>
				<DialogContent>{t(TranslationKey.STUDENT_ASSIGNMENTS_SUBMIT_DIALOG_QUESTION)}</DialogContent>
				<DialogActions>
					<Button onClick={() => setConfirmDialogVis(false)}>
						{t(TranslationKey.STUDENT_ASSIGNMENTS_SUBMIT_DIALOG_CANCEL)}
					</Button>
					<Button
						onClick={() => {
							if (!selectedAssignment?.assignmentId) return
							handleSubmitNavigate(selectedAssignment)
							setConfirmDialogVis(false)
						}}
						color="warning"
						variant="contained"
						disabled={!selectedAssignment?.assignmentId}
					>
						{t(TranslationKey.STUDENT_ASSIGNMENTS_SUBMIT_DIALOG_CONFIRM)}
					</Button>
				</DialogActions>
			</Dialog>
		</>
	)
}

export default StudentAssignments