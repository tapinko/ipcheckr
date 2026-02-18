import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import {
	AssignmentGroupStatus,
	AssignmentGroupType,
	type ClassDto,
	type IDNetAssignmentDto,
	type SubnetAssignmentDto
} from "../../dtos"
import { assignmentApi } from "../../utils/apiClients"
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
import { getParametrizedUrl, RouteKeys, RouteParams } from "../../router/routes"
import { useAuth } from "../../contexts/AuthContext"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import ErrorLoading from "../../components/ErrorLoading"
import CardsSkeleton from "../../components/CardsSkeleton"
import { getStatusMap } from "../../utils/getStatusMap"
import AGHeader from "../../components/AGHeader"
import type { AGClassFilterValue, AGIpCatFilterValue, AGTypeFilterValue } from "../../components/AGHeader"
import { toAssignmentTypeParam } from "../../utils/assignmentType"

type StudentAssignment = (IDNetAssignmentDto | SubnetAssignmentDto) & {
	assignmentId: number
	type: AssignmentGroupType
}

const resolveAssignmentId = (a: unknown): number => {
	const raw = (a as any)?.assignmentId ?? (a as any)?.id
	return typeof raw === "number" && raw > 0 ? raw : 0
}

const formatDateTime = (value: string) =>
	new Date(value).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })

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

const resolveComputedStatus = (startDate: string, deadline: string, successRate?: number | null): AssignmentGroupStatus => {
	if (successRate !== null && successRate !== undefined) return AssignmentGroupStatus.Ended

	const now = Date.now()
	const start = new Date(startDate).getTime()
	const end = new Date(deadline).getTime()

	if (now < start) return AssignmentGroupStatus.Upcoming
	if (now > end) return AssignmentGroupStatus.Ended
	return AssignmentGroupStatus.InProgress
}

const StudentAssignments = () => {
	const { t } = useTranslation()
	const navigate = useNavigate()
	const { userId } = useAuth()
	const queryClient = useQueryClient()
	const statusMap = getStatusMap(t)

	const [confirmDialogVis, setConfirmDialogVis] = useState(false)
	const [selectedAssignment, setSelectedAssignment] = useState<StudentAssignment | null>(null)
	const [search, setSearch] = useState("")
	const [classFilter, setClassFilter] = useState<AGClassFilterValue>("ALL")
	const [typeFilter, setTypeFilter] = useState<AGTypeFilterValue>("ALL")
	const [ipCatFilter, setIpCatFilter] = useState<AGIpCatFilterValue>("ALL_CAT")

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
		return normalized
	}, [idNetQuery.data, subnetQuery.data])

	const classOptions = useMemo<ClassDto[]>(() => {
		const uniqueNames = Array.from(new Set(assignments.map(a => a.className))).sort((a, b) => a.localeCompare(b))
		return uniqueNames.map((className, index) => ({
			classId: index + 1,
			className,
			teachers: [],
			teacherUsernames: []
		}))
	}, [assignments])

	const selectedClassName = useMemo(
		() => (classFilter === "ALL" || classFilter === null ? null : classOptions.find(c => c.classId === classFilter)?.className ?? null),
		[classFilter, classOptions]
	)

	const filteredAssignments = useMemo(() => {
		const term = search.trim().toLowerCase()
		return assignments
			.filter(a => (typeFilter === "ALL" ? true : a.type === typeFilter))
			.filter(a => (ipCatFilter === "ALL_CAT" ? true : a.ipCat === ipCatFilter))
			.filter(a => (selectedClassName ? a.className === selectedClassName : true))
			.filter(a =>
				term
					? a.name.toLowerCase().includes(term) ||
						a.className.toLowerCase().includes(term) ||
						a.teacherUsername.toLowerCase().includes(term)
					: true
			)
	}, [assignments, typeFilter, ipCatFilter, selectedClassName, search])

	const inProgressAssignment = useMemo(() => {
		const items = assignments.filter(a => resolveComputedStatus(a.startDate, a.deadline, a.successRate) === AssignmentGroupStatus.InProgress)
		return items.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())[0]
	}, [assignments])

	const inProgressOthers = useMemo(
		() => assignments.filter(a => resolveComputedStatus(a.startDate, a.deadline, a.successRate) === AssignmentGroupStatus.InProgress && a !== inProgressAssignment),
		[assignments, inProgressAssignment]
	)

	const inProgressList = useMemo(
		() => (inProgressAssignment ? [inProgressAssignment, ...inProgressOthers] : []),
		[inProgressAssignment, inProgressOthers]
	)

	const grouped = useMemo(() => {
		const remaining = filteredAssignments.filter(a => resolveComputedStatus(a.startDate, a.deadline, a.successRate) !== AssignmentGroupStatus.InProgress)
		const endedSorted = remaining
			.filter(a => resolveComputedStatus(a.startDate, a.deadline, a.successRate) === AssignmentGroupStatus.Ended)
			.sort((a, b) => new Date(b.deadline).getTime() - new Date(a.deadline).getTime())

		return {
			upcoming: remaining.filter(a => resolveComputedStatus(a.startDate, a.deadline, a.successRate) === AssignmentGroupStatus.Upcoming),
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
		return <CardsSkeleton />
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
		const successRateValue = Number.isFinite(assignment.successRate)
			? Math.min(Math.max(assignment.successRate as number, 0), 100)
			: 0
		const canViewDetails = computedStatus !== AssignmentGroupStatus.InProgress || (assignment.successRate !== null && assignment.successRate !== undefined)
		const isInProgress = computedStatus === AssignmentGroupStatus.InProgress

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
				cursor: assignment.assignmentId && !isInProgress ? "pointer" : "default",
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
				"&:hover .assignment-title-link": assignment.assignmentId && !isInProgress
					? {
						textDecoration: "underline"
					}
					: undefined
			}}
			onClick={() => {
				if (!assignment.assignmentId || !canViewDetails) return
				handleDetailsNavigate(assignment)
			}}
		>
			<CardHeader
				title={
					<Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap">
						<Typography variant={wide ? "h5" : "h6"} fontWeight={700} className="assignment-title-link">
							{assignment.name}
						</Typography>
						<Chip
							label={assignment.type === AssignmentGroupType.Subnet ? t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_TYPE_SUBNET) : t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_TYPE_IDNET)}
							size="small"
							color={assignment.type === AssignmentGroupType.Subnet ? "primary" : "secondary"}
							variant="outlined"
						/>
						<Chip
							label={statusMap[computedStatus]?.label ?? computedStatus}
							size="small"
							color={statusColor(computedStatus)}
							variant="outlined"
						/>
						{"ipCat" in assignment && assignment.ipCat ? (
							<Chip
								label={assignment.ipCat}
								size="small"
								variant="outlined"
								sx={{ borderStyle: "dashed" }}
							/>
						) : null}
						{assignment.successRate !== undefined && assignment.successRate !== null ? (
							<Chip
								label={`${assignment.successRate.toFixed(1)}%`}
								size="small"
								variant="filled"
							/>
						) : null}
					</Stack>
				}
				subheader={null}
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
				<Typography variant="subtitle1" fontWeight={700} color="text.primary">
					{formatDateTime(assignment.startDate)} - {formatDateTime(assignment.deadline)}
				</Typography>
				{computedStatus === AssignmentGroupStatus.Ended ? (
					<Stack spacing={0.5}>
						<Stack direction="row" alignItems="center" spacing={1}>
							<Typography variant="h6" fontWeight={800}>
								{successRateValue.toFixed(2)}%
							</Typography>
							<Typography variant="body2" color="text.secondary">
								{t(TranslationKey.TEACHER_ASSIGNMENT_GROUP_DETAILS_CARD_SUCCESS_RATE)}
							</Typography>
						</Stack>
						<LinearProgress
							variant="determinate"
							value={successRateValue}
							sx={{ height: 8, borderRadius: 999 }}
						/>
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
					typeValue={typeFilter}
					onTypeChange={setTypeFilter}
					ipCatValue={ipCatFilter}
					onIpCatChange={setIpCatFilter}
				/>

        <Divider />

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
									{section.items.length} {t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_ITEMS_LABEL)}
								</Typography>
							</Stack>
							<Divider />
							<Stack spacing={1.5}>
								{section.items.length === 0 ? (
									<Typography variant="body2" color="text.secondary">
										{t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_NO_DATA)}
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