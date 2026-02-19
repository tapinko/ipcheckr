import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Divider,
  FormControl,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
  Checkbox,
  IconButton,
  Pagination,
  LinearProgress
} from "@mui/material"
import { alpha } from "@mui/material/styles"
import EditOutlinedIcon from "@mui/icons-material/EditOutlined"
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { assignmentGroupApi, classApi, userApi } from "../../utils/apiClients"
import {
  AssignmentGroupIpCat,
  AssignmentGroupStatus,
  AssignmentGroupType,
  type ApiProblemDetails,
  type ClassDto,
  type CreateIDNetAGRes,
  type CreateSubnetAGRes,
  type IDNetAGDto,
  type QueryIDNetAGDetailRes,
  type QueryIDNetAGsRes,
  type QuerySubnetAGDetailRes,
  type QuerySubnetAGsRes,
  type SubnetAGDto,
  type UserDto,
} from "../../dtos"
import { useAuth } from "../../contexts/AuthContext"
import CardsSkeleton from "../../components/CardsSkeleton"
import ErrorLoading from "../../components/ErrorLoading"
import { getParametrizedUrl, RouteKeys, RouteParams } from "../../router/routes"
import { Language, TranslationKey } from "../../utils/i18n"
import { Controller, useForm } from "react-hook-form"
import FormRules from "../../utils/FormRules"
import DeleteDialog from "../../components/DeleteDialog"
import { LocalizationProvider, DateTimePicker, renderTimeViewClock } from "@mui/x-date-pickers"
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns"
import type { AxiosError, AxiosResponse } from "axios"
import { CustomAlert, type CustomAlertState } from "../../components/CustomAlert"
import UserRole from "../../types/UserRole"
import AGHeader from "../../components/AGHeader"
import type { AGClassFilterValue, AGIpCatFilterValue, AGTypeFilterValue } from "../../components/AGHeader"
import { getStatusMap } from "../../utils/getStatusMap"
import { toAssignmentTypeParam } from "../../utils/assignmentType"

interface IAG {
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
  successRate: number
  type: AssignmentGroupType
  ipCat?: AssignmentGroupIpCat
  testWildcard?: boolean
  testFirstLastBr?: boolean
}

type ClassFilterValue = AGClassFilterValue
type TypeFilterValue = AGTypeFilterValue
type IpCatFilterValue = AGIpCatFilterValue

type CreateFormValues = {
  name: string
  description: string
  classId: number | null
  type: AssignmentGroupType
  numberOfRecords: number
  possibleOctets: number
  ipCat: AssignmentGroupIpCat
  testWildcard: boolean
  testFirstLastBr: boolean
  students: number[]
  startDate: string
  deadline: string
}

type EditFormValues = {
  name: string
  description: string
  students: number[]
  startDate: string
  deadline: string
}

type MovePlan = {
  ag: IAG
  fromStatus: AssignmentGroupStatus
  toStatus: AssignmentGroupStatus
  startDate: string
  deadline: string
}

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })

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
  const oldStart = new Date(ag.startDate)
  const oldDeadline = new Date(ag.deadline)

  let nextStart = new Date(oldStart)
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

const normalizeSubnet = (ag: SubnetAGDto): IAG => ({
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
  successRate: ag.successRate,
  type: AssignmentGroupType.Subnet,
  ipCat: ag.ipCat
})

const normalizeIdNet = (ag: IDNetAGDto): IAG => ({
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
  successRate: ag.successRate,
  type: AssignmentGroupType.Idnet,
  ipCat: ag.ipCat,
  testWildcard: ag.testWildcard,
  testFirstLastBr: ag.testFirstLastBr
})

const TeacherAssignmentGroups = () => {
  const { t, i18n } = useTranslation()
  const { userId } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const statusMap = getStatusMap(t)

  const [search, setSearch] = useState("")
  const [classFilter, setClassFilter] = useState<ClassFilterValue>(null)
  const [typeFilter, setTypeFilter] = useState<TypeFilterValue>("ALL")
  const [ipCatFilter, setIpCatFilter] = useState<IpCatFilterValue>("ALL_CAT")
  const [endedPage, setEndedPage] = useState(1)
  
  const [createDialogVis, setCreateDialogVis] = useState(false)
  const [editDialogVis, setEditDialogVis] = useState(false)
  const [deleteDialogVis, setDeleteDialogVis] = useState(false)
  const [editAG, setEditAG] = useState<IAG | null>(null)
  const [deleteAG, setDeleteAG] = useState<IAG | null>(null)
  const [alert, setAlert] = useState<CustomAlertState | null>(null)
  const [draggedAG, setDraggedAG] = useState<IAG | null>(null)
  const [dragOverStatus, setDragOverStatus] = useState<AssignmentGroupStatus | null>(null)
  const [movePlan, setMovePlan] = useState<MovePlan | null>(null)

  const classesQuery = useQuery<ClassDto[], Error>({
    queryKey: ["teacherClasses", userId],
    enabled: !!userId,
    queryFn: () => classApi.classQueryClasses(null, null, userId).then(r => r.data.classes)
  })

  useEffect(() => {
    if (classFilter === null && classesQuery.data) {
      setClassFilter("ALL")
    }
  }, [classFilter, classesQuery.data])

  const classFilterNormalized = classFilter === "ALL" || classFilter === null ? null : classFilter

  const subnetAGsQuery = useQuery<QuerySubnetAGsRes, Error>({
    queryKey: ["teacherSubnetAGs", userId, classFilterNormalized, search],
    enabled: !!userId,
    queryFn: () =>
      assignmentGroupApi
        .assignmentGroupQuerySubnetAssignmentGroups(
          search.trim() ? search.trim() : null,
          classFilterNormalized,
          userId,
          null,
          AssignmentGroupType.Subnet
        )
        .then(r => r.data),
    placeholderData: prev => prev
  })

  const idNetAGsQuery = useQuery<QueryIDNetAGsRes, Error>({
    queryKey: ["teacherIdNetAGs", userId, classFilterNormalized, search],
    enabled: !!userId,
    queryFn: () =>
      assignmentGroupApi
        .assignmentGroupQueryIdNetAssignmentGroups(
          search.trim() ? search.trim() : null,
          classFilterNormalized,
          userId,
          null,
          AssignmentGroupType.Idnet
        )
        .then(r => r.data),
    placeholderData: prev => prev
  })

  const allAGs = [
    ...(subnetAGsQuery.data?.assignmentGroups ?? []).map(normalizeSubnet),
    ...(idNetAGsQuery.data?.assignmentGroups ?? []).map(normalizeIdNet)
  ]

  const filteredAGs = allAGs
    .filter(ag => (typeFilter === "ALL" ? true : ag.type === typeFilter))
    .filter(ag => (ipCatFilter === "ALL_CAT" ? true : ag.ipCat === ipCatFilter))
    .filter(ag => (classFilterNormalized ? ag.classId === classFilterNormalized : true))
    .filter(ag => {
      const searchTerm = search.trim().toLowerCase()
      return searchTerm
        ? ag.name.toLowerCase().includes(searchTerm) ||
            ag.className.toLowerCase().includes(searchTerm)
        : true
    })

  const grouped: Record<AssignmentGroupStatus, IAG[]> = {
    [AssignmentGroupStatus.Upcoming]: [],
    [AssignmentGroupStatus.InProgress]: [],
    [AssignmentGroupStatus.Ended]: []
  }

  filteredAGs.forEach(ag => {
    grouped[ag.status]?.push(ag)
  })

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
    if (endedPage > endedPages) {
      setEndedPage(1)
    }
  }, [endedCount, endedPage, endedPages])

  useEffect(() => {
    setEndedPage(1)
  }, [search, classFilter, typeFilter, ipCatFilter])

  const isLoading =
    classesQuery.isLoading || subnetAGsQuery.isLoading || idNetAGsQuery.isLoading
  const hasError =
    classesQuery.isError || subnetAGsQuery.isError || idNetAGsQuery.isError

  useEffect(() => {
    if (hasError) {
      setAlert({ severity: "error", message: "Error loading data" })
    }
  }, [hasError])

  const retry = () => {
    queryClient.invalidateQueries({ queryKey: ["teacherClasses"] })
    queryClient.invalidateQueries({ queryKey: ["teacherSubnetAGs"] })
    queryClient.invalidateQueries({ queryKey: ["teacherIdNetAGs"] })
  }

  const {
    control: createControl,
    handleSubmit: handleCreateSubmit,
    reset: resetCreate,
    watch: createWatch,
    setValue: setCreateValue,
    formState: { errors: createErrors }
  } = useForm<CreateFormValues>({
    defaultValues: {
      name: "",
      description: "",
      classId: classFilterNormalized ?? null,
      type: AssignmentGroupType.Idnet,
      numberOfRecords: 6,
      possibleOctets: 3,
      ipCat: AssignmentGroupIpCat.Abc,
      testWildcard: false,
      testFirstLastBr: false,
      students: [],
      startDate: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    },
    mode: "onBlur"
  })

  const {
    control: editControl,
    handleSubmit: handleEditSubmit,
    reset: resetEdit,
    formState: { errors: editErrors }
  } = useForm<EditFormValues>({
    defaultValues: {
      name: "",
      description: "",
      students: [],
      startDate: new Date().toISOString(),
      deadline: new Date().toISOString()
    },
    mode: "onBlur"
  })

  const createWatchValues = createWatch()
  const isCreateIdnet = createWatchValues.type === AssignmentGroupType.Idnet

  useEffect(() => {
    if (createDialogVis) {
      setCreateValue("classId", classFilterNormalized ?? null)
    }
  }, [createDialogVis, classFilterNormalized, setCreateValue])

  const editDetailQuery = useQuery<QueryIDNetAGDetailRes | QuerySubnetAGDetailRes, Error>({
    queryKey: ["assignmentGroupDetail", editAG?.id, editAG?.type],
    enabled: editDialogVis && !!editAG,
    queryFn: () =>
      editAG?.type === AssignmentGroupType.Idnet
        ? assignmentGroupApi.assignmentGroupQueryIdNetAssignmentGroupDetails(editAG.id).then(r => r.data)
        : assignmentGroupApi.assignmentGroupQuerySubnetAssignmentGroupDetails(editAG!.id).then(r => r.data),
    placeholderData: prev => prev
  })

  useEffect(() => {
    if (editDialogVis && editDetailQuery.data) {
      const detail = editDetailQuery.data
      const studentIds = detail.assignments?.map(a => a.studentId) ?? []
      resetEdit({
        name: detail.name,
        description: detail.description ?? "",
        students: studentIds,
        startDate: detail.startDate,
        deadline: detail.deadline
      })
    }
  }, [editDetailQuery.data, editDialogVis, resetEdit])

  const studentsQueryClassId = editDialogVis && editAG ? editAG.classId : classFilterNormalized

  const studentsQuery = useQuery<UserDto[], Error>({
    queryKey: ["assignmentGroupStudents", userId, studentsQueryClassId],
    enabled: !!userId && studentsQueryClassId !== undefined,
    queryFn: () =>
      userApi
        .userQueryUsers(null, null, UserRole.STUDENT, studentsQueryClassId ?? null)
        .then(r => r.data.users ?? [])
  })

  const createMutation = useMutation<
    AxiosResponse<CreateIDNetAGRes | CreateSubnetAGRes>,
    AxiosError<ApiProblemDetails>,
    CreateFormValues
  >({
    mutationFn: async data => {
      if (!data.classId) {
        throw new Error("Class is required")
      }
      if (data.type === AssignmentGroupType.Idnet) {
        return assignmentGroupApi.assignmentGroupCreateIdNetAssignmentGroup({
          name: data.name,
          description: data.description || null,
          classId: data.classId,
          students: data.students.length ? data.students : null,
          type: AssignmentGroupType.Idnet,
          startDate: data.startDate,
          deadline: data.deadline,
          numberOfRecords: data.numberOfRecords,
          ipCat: data.ipCat,
          possibleOctets: data.possibleOctets,
          testWildcard: data.testWildcard,
          testFirstLastBr: data.testFirstLastBr
        })
      }
      return assignmentGroupApi.assignmentGroupCreateSubnetAssignmentGroup({
        name: data.name,
        description: data.description || null,
        classId: data.classId,
        students: data.students.length ? data.students : null,
        type: AssignmentGroupType.Subnet,
        startDate: data.startDate,
        deadline: data.deadline,
        numberOfRecords: data.numberOfRecords,
        ipCat: data.ipCat
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacherSubnetAGs"] })
      queryClient.invalidateQueries({ queryKey: ["teacherIdNetAGs"] })
      setAlert({
        severity: "success",
        message: t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_CREATE_SUCCESS, {
          value: createWatchValues.name
        })
      })
      setCreateDialogVis(false)
      resetCreate({
        name: "",
        description: "",
        classId: classFilterNormalized ?? null,
        type: AssignmentGroupType.Idnet,
        numberOfRecords: 6,
        possibleOctets: 3,
        ipCat: AssignmentGroupIpCat.Abc,
        testWildcard: false,
        testFirstLastBr: false,
        students: [],
        startDate: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      })
    },
    onError: error => {
      const details = error.response?.data
      const localMessage =
        i18n.language === Language.EN ? details?.messageEn : details?.messageSk
      setAlert({
        severity: "error",
        message: `${t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_CREATE_ERROR)}. ${localMessage ?? ""}`
      })
    }
  })

  const editMutation = useMutation<AxiosResponse<void>, AxiosError<ApiProblemDetails>, EditFormValues>({
    mutationFn: async data => {
      if (!editAG) throw new Error("No selection")
      if (editAG.type === AssignmentGroupType.Idnet) {
        return assignmentGroupApi.assignmentGroupEditIdNetAssignmentGroup({
          id: editAG.id,
          name: data.name,
          description: data.description,
          students: data.students.length ? data.students : null,
          startDate: data.startDate,
          deadline: data.deadline
        })
      }
      return assignmentGroupApi.assignmentGroupEditSubnetAssignmentGroup({
        id: editAG.id,
        name: data.name,
        description: data.description,
        students: data.students.length ? data.students : null,
        startDate: data.startDate,
        deadline: data.deadline
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacherSubnetAGs"] })
      queryClient.invalidateQueries({ queryKey: ["teacherIdNetAGs"] })
      if (editAG) {
        queryClient.invalidateQueries({
          queryKey: ["assignmentGroupDetail", editAG.id, editAG.type]
        })
      }
      setAlert({
        severity: "success",
        message: t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_EDIT_SUCCESS, {
          value: editAG?.name ?? ""
        })
      })
      setEditDialogVis(false)
      setEditAG(null)
    },
    onError: error => {
      const details = error.response?.data
      const localMessage =
        i18n.language === Language.EN ? details?.messageEn : details?.messageSk
      setAlert({
        severity: "error",
        message: `${t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_EDIT_ERROR)}. ${localMessage ?? ""}`
      })
    }
  })

  const deleteMutation = useMutation<void, AxiosError<ApiProblemDetails>, IAG[]>({
    mutationFn: async ags => {
      const idnetIds = ags.filter(a => a.type === AssignmentGroupType.Idnet).map(a => a.id)
      const subnetIds = ags.filter(a => a.type === AssignmentGroupType.Subnet).map(a => a.id)
      const calls: Promise<unknown>[] = []
      if (idnetIds.length) {
        calls.push(
          assignmentGroupApi.assignmentGroupDeleteIdNetAssignmentGroups({
            assignmentGroupIds: idnetIds
          })
        )
      }
      if (subnetIds.length) {
        calls.push(
          assignmentGroupApi.assignmentGroupDeleteSubnetAssignmentGroups({
            assignmentGroupIds: subnetIds
          })
        )
      }
      await Promise.all(calls)
    },
    onSuccess: (_data) => {
      queryClient.invalidateQueries({ queryKey: ["teacherSubnetAGs"] })
      queryClient.invalidateQueries({ queryKey: ["teacherIdNetAGs"] })
      setAlert({
        severity: "success",
        message: t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_DELETE_SUCCESS)
      })
      setDeleteDialogVis(false)
      setDeleteAG(null)
    },
    onError: error => {
      const details = error.response?.data
      const localMessage =
        i18n.language === Language.EN ? details?.messageEn : details?.messageSk
      setAlert({
        severity: "error",
        message: `${t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_DELETE_ERROR)}. ${localMessage ?? ""}`
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
      queryClient.invalidateQueries({ queryKey: ["teacherSubnetAGs"] })
      queryClient.invalidateQueries({ queryKey: ["teacherIdNetAGs"] })
      setAlert({
        severity: "success",
        message: t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_MOVE_SUCCESS, { value: plan.ag.name })
      })
      setMovePlan(null)
    },
    onError: error => {
      const details = error.response?.data
      const localMessage =
        i18n.language === Language.EN ? details?.messageEn : details?.messageSk
      setAlert({
        severity: "error",
        message: `${t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_EDIT_ERROR)}. ${localMessage ?? ""}`
      })
    }
  })

  const handleDelete = async () => {
    if (deleteAG) {
      await deleteMutation.mutateAsync([deleteAG])
    }
  }

  const handleCreate = async (data: CreateFormValues) => {
    await createMutation.mutateAsync(data)
  }

  const handleEdit = async (data: EditFormValues) => {
    await editMutation.mutateAsync(data)
  }

  const handleDropToStatus = (targetStatus: AssignmentGroupStatus) => {
    if (!draggedAG || draggedAG.status === targetStatus) return
    const moved = computeMoveDates(draggedAG, targetStatus)
    if (!moved) return
    setMovePlan({
      ag: draggedAG,
      fromStatus: draggedAG.status,
      toStatus: targetStatus,
      startDate: moved.startDate,
      deadline: moved.deadline
    })
  }

  const confirmMove = async () => {
    if (!movePlan) return
    await moveMutation.mutateAsync(movePlan)
    setDraggedAG(null)
    setDragOverStatus(null)
  }

  const disableCreate =
    !createWatchValues.name ||
    !createWatchValues.classId ||
    !createWatchValues.numberOfRecords ||
    !createWatchValues.startDate ||
    !createWatchValues.deadline ||
    createMutation.isPending

  const disableEdit = !editAG || editMutation.isPending || editDetailQuery.isLoading

  const getNumberOfRecordsTooltip = () => {
    return isCreateIdnet
      ? t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_IDNET_NUMBER_OF_RECORDS_TOOLTIP)
      : t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_NUMBER_OF_RECORDS_TOOLTIP)
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
          typeValue={typeFilter}
          onTypeChange={setTypeFilter}
          ipCatValue={ipCatFilter}
          onIpCatChange={setIpCatFilter}
        />

        <Button
          variant="contained"
          color="success"
          onClick={() => {
            resetCreate({
              name: "",
              description: "",
              classId: classFilterNormalized ?? null,
              type: AssignmentGroupType.Idnet,
              numberOfRecords: 6,
              possibleOctets: 3,
              ipCat: AssignmentGroupIpCat.Abc,
              testWildcard: false,
              testFirstLastBr: false,
              students: [],
              startDate: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
              deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
            })
            setCreateDialogVis(true)
          }}
          disabled={!classFilterNormalized}
          sx={{ alignSelf: "flex-start" }}
        >
          {t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_CREATE_ASSIGNMENT_GROUP)}
        </Button>
      </Box>

      <Divider />

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
          {[AssignmentGroupStatus.Upcoming, AssignmentGroupStatus.InProgress, AssignmentGroupStatus.Ended].map(
            status => {
              const totalItems = grouped[status]?.length ?? 0
              const visibleItems =
                status === AssignmentGroupStatus.Ended ? endedSlice : grouped[status] ?? []

              return (
                <Box
                  key={status === AssignmentGroupStatus.Ended ? `${status}-${endedPage}` : status}
                  onDragOver={e => {
                    if (!draggedAG || draggedAG.status === status || moveMutation.isPending) return
                    e.preventDefault()
                    if (dragOverStatus !== status) {
                      setDragOverStatus(status)
                    }
                  }}
                  onDragLeave={() => {
                    if (dragOverStatus === status) {
                      setDragOverStatus(null)
                    }
                  }}
                  onDrop={e => {
                    e.preventDefault()
                    handleDropToStatus(status)
                    setDragOverStatus(null)
                  }}
                  sx={{
                    backgroundColor: "background.paper",
                    border: "1px solid",
                    borderColor:
                      dragOverStatus === status && draggedAG?.status !== status
                        ? "primary.main"
                        : "divider",
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
                      {totalItems} {t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_ITEMS_LABEL)}
                    </Typography>
                  </Stack>
                  <Divider />
                  <Stack spacing={2}>
                    {totalItems === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        {t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_NO_DATA)}
                      </Typography>
                    ) : (
                      visibleItems.map(ag => (
                        <Tooltip key={`${status}-${ag.id}`} title={ag.description ?? ""}>
                          <Card
                            draggable={!moveMutation.isPending}
                            variant="outlined"
                            sx={{
                              minWidth: 320,
                              maxWidth: 360,
                              width: "100%",
                              border: "1px solid",
                              borderColor: "action.disabled",
                              borderRadius: 1,
                              display: "flex",
                              flexDirection: "column",
                              gap: 0.5,
                              maxHeight: 220,
                              overflow: "hidden",
                              cursor: "pointer",
                              "&:hover": {
                                opacity: 0.9
                              },
                              "&:hover .ag-title-text": {
                                textDecoration: "underline"
                              }
                            }}
                            onDragStart={e => {
                              e.stopPropagation()
                              setDraggedAG(ag)
                              e.dataTransfer.effectAllowed = "move"
                            }}
                            onDragEnd={() => {
                              setDraggedAG(null)
                              setDragOverStatus(null)
                            }}
                            onClick={() =>
                              navigate(
                                getParametrizedUrl(
                                  RouteKeys.TEACHER_ASSIGNMENT_GROUPS_DETAILS,
                                  {
                                    [RouteParams.ASSIGNMENT_GROUP_ID]: ag.id.toString(),
                                    [RouteParams.ASSIGNMENT_GROUP_TYPE]: toAssignmentTypeParam(ag.type)
                                  }
                                )
                              )
                            }
                          >
                            <CardHeader
                              sx={{ py: 2, px: 2, "& .MuiCardHeader-title": { mb: 0.25 }, "& .MuiCardHeader-subheader": { mt: 0 } }}
                              title={
                                ag.name.length > 10 ? (
                                  <Stack spacing={0.25}>
                                    <Typography variant="subtitle2" fontWeight={700} noWrap className="ag-title-text">
                                      {ag.name}
                                    </Typography>
                                    <Stack direction="row" alignItems="center" spacing={0.5}>
                                      <Chip
                                        label={
                                          ag.type === AssignmentGroupType.Subnet
                                            ? t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_TYPE_SUBNET)
                                            : t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_TYPE_IDNET)
                                        }
                                        color={ag.type === AssignmentGroupType.Subnet ? "primary" : "secondary"}
                                        size="small"
                                        variant="outlined"
                                      />
                                      {ag.ipCat && (
                                        <Chip
                                          label={ag.ipCat}
                                          size="small"
                                          sx={{ borderStyle: "dashed" }}
                                          variant="outlined"
                                        />
                                      )}
                                    </Stack>
                                  </Stack>
                                ) : (
                                  <Stack direction="row" alignItems="center" spacing={0.5}>
                                    <Typography variant="subtitle2" fontWeight={700} noWrap className="ag-title-text">
                                      {ag.name}
                                    </Typography>
                                    <Chip
                                      label={
                                        ag.type === AssignmentGroupType.Subnet
                                          ? t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_TYPE_SUBNET)
                                          : t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_TYPE_IDNET)
                                      }
                                      color={ag.type === AssignmentGroupType.Subnet ? "primary" : "secondary"}
                                      size="small"
                                      variant="outlined"
                                    />
                                    {ag.ipCat && (
                                      <Chip
                                        label={ag.ipCat}
                                        size="small"
                                        sx={{ borderStyle: "dashed" }}
                                        variant="outlined"
                                      />
                                    )}
                                  </Stack>
                                )
                              }
                              action={
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <IconButton
                                    size="small"
                                    onClick={e => {
                                      e.stopPropagation()
                                      setEditAG(ag)
                                      setEditDialogVis(true)
                                    }}
                                  >
                                    <EditOutlinedIcon fontSize="small" />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    onClick={e => {
                                      e.stopPropagation()
                                      setDeleteAG(ag)
                                      setDeleteDialogVis(true)
                                    }}
                                  >
                                    <DeleteOutlineOutlinedIcon fontSize="small" />
                                  </IconButton>
                                </Stack>
                              }
                              subheader={
                                <Stack direction="row" spacing={0.5} alignItems="center">
                                  {ag.testWildcard && (
                                    <Chip
                                      label={t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_CHIP_WILDCARD)}
                                      size="small"
                                      variant="outlined"
                                    />
                                  )}
                                  {ag.testFirstLastBr && (
                                    <Chip
                                      label={t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_CHIP_FIRST_LAST_BR)}
                                      size="small"
                                      variant="outlined"
                                    />
                                  )}
                                </Stack>
                              }
                            />
                            <LinearProgress
                              variant="determinate"
                              value={ag.total ? Math.min((ag.submitted / ag.total) * 100, 100) : 0}
                              sx={{
                                height: 8,
                                borderRadius: 999,
                                mx: 2,
                                mb: 1,
                                backgroundColor: theme => {
                                  const color =
                                    status === AssignmentGroupStatus.Upcoming
                                      ? theme.palette.primary.main
                                      : status === AssignmentGroupStatus.InProgress
                                        ? theme.palette.warning.main
                                        : theme.palette.success.main
                                  return alpha(color, 0.2)
                                },
                                "& .MuiLinearProgress-bar": {
                                  backgroundColor: theme => {
                                    if (status === AssignmentGroupStatus.Upcoming) {
                                      return theme.palette.primary.main
                                    }
                                    if (status === AssignmentGroupStatus.InProgress) {
                                      return theme.palette.warning.main
                                    }
                                    return theme.palette.success.main
                                  }
                                }
                              }}
                            />
                            <CardContent sx={{ display: "flex", flexDirection: "column", gap: 0.4, px: 2 }}>
                              <Stack spacing={0.2}>
                                <Typography variant="caption" color="text.secondary" noWrap>
                                  <strong>{ag.className}</strong>
                                </Typography>
                                <Typography variant="caption" color="text.secondary" noWrap>
                                  {ag.submitted}/{ag.total} • {ag.successRate.toFixed(0)}%
                                </Typography>
                                <Typography variant="subtitle2" fontWeight={700} color="text.primary">
                                  {formatDateTime(ag.startDate)} - {formatDateTime(ag.deadline)}
                                </Typography>
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
                        onChange={(_, page) => setEndedPage(page)}
                        size="small"
                        color="primary"
                      />
                    </Stack>
                  )}
                </Box>
              )
            }
          )}
        </Box>
      )}

      <Dialog open={createDialogVis} onClose={() => setCreateDialogVis(false)} fullWidth maxWidth="md">
        <form onSubmit={handleCreateSubmit(handleCreate)}>
          <DialogTitle>{t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_CREATE_ASSIGNMENT)}</DialogTitle>
          <DialogContent>
            <Controller
              name="name"
              control={createControl}
              rules={{
                ...FormRules.required(),
                ...FormRules.minLengthShort(),
                ...FormRules.maxLengthShort(),
                ...FormRules.patternLettersNumbersSpaces()
              }}
              render={({ field }) => (
                <TextField
                  margin="dense"
                  label={t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_NAME)}
                  fullWidth
                  {...field}
                  error={!!createErrors.name}
                  helperText={createErrors.name ? t(createErrors.name.message as string) : ""}
                />
              )}
            />
            <Controller
              name="description"
              control={createControl}
              rules={{
                ...FormRules.maxLengthLong(),
                ...FormRules.patternLettersNumbersSpecialSpaces()
              }}
              render={({ field }) => (
                <TextField
                  margin="dense"
                  label={t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_DESCRIPTION)}
                  fullWidth
                  {...field}
                  error={!!createErrors.description}
                  helperText={
                    createErrors.description ? t(createErrors.description.message as string) : ""
                  }
                />
              )}
            />
            <Controller
              name="classId"
              control={createControl}
              rules={{ ...FormRules.required() }}
              render={({ field }) => (
                <FormControl fullWidth margin="dense">
                  <InputLabel>{t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_CLASS)}</InputLabel>
                  <Select
                    label={t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_CLASS)}
                    value={field.value ?? ""}
                    onChange={e => field.onChange(Number(e.target.value))}
                  >
                    {(classesQuery.data ?? []).map(cls => (
                      <MenuItem key={cls.classId} value={cls.classId}>
                        {cls.className}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            />
            <Controller
              name="type"
              control={createControl}
              render={({ field }) => (
                <FormControl fullWidth margin="dense">
                  <InputLabel>{t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_TYPE)}</InputLabel>
                  <Select
                    label={t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_TYPE)}
                    value={field.value}
                    onChange={e => field.onChange(e.target.value as AssignmentGroupType)}
                  >
                    <MenuItem value={AssignmentGroupType.Idnet}>
                      {t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_TYPE_IDNET)}
                    </MenuItem>
                    <MenuItem value={AssignmentGroupType.Subnet}>
                      {t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_TYPE_SUBNET)}
                    </MenuItem>
                  </Select>
                </FormControl>
              )}
            />
            <Controller
              name="numberOfRecords"
              control={createControl}
              rules={{
                ...FormRules.required(),
                validate: v => v > 0 || t(TranslationKey.FORM_RULES_REQUIRED).toString()
              }}
              render={({ field }) => (
                <Tooltip title={getNumberOfRecordsTooltip()}>
                  <TextField
                    margin="dense"
                    label={t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_NUMBER_OF_RECORDS)}
                    type="number"
                    fullWidth
                    {...field}
                    onChange={e => field.onChange(Number(e.target.value))}
                    error={!!createErrors.numberOfRecords}
                    helperText={
                      createErrors.numberOfRecords
                        ? createErrors.numberOfRecords.message?.toString()
                        : ""
                    }
                  />
                </Tooltip>
              )}
            />
            {isCreateIdnet && (
              <Controller
                name="possibleOctets"
                control={createControl}
                rules={{
                  ...FormRules.required(),
                  validate: v =>
                    (v >= 1 && v <= 4) ||
                    t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_POSSIBLE_OCTETS_RANGE).toString()
                }}
                render={({ field }) => (
                  <Tooltip title={t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_POSSIBLE_OCTETS_TOOLTIP)}>
                    <TextField
                      select
                      margin="dense"
                      label={t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_POSSIBLE_OCTETS)}
                      fullWidth
                      {...field}
                      value={field.value ?? 4}
                      onChange={e => field.onChange(Number(e.target.value))}
                      error={!!createErrors.possibleOctets}
                      helperText={
                        createErrors.possibleOctets
                          ? t(createErrors.possibleOctets.message as string)
                          : ""
                      }
                    >
                      {[1, 2, 3, 4].map(option => (
                        <MenuItem key={option} value={option}>
                          {option}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Tooltip>
                )}
              />
            )}
            <Controller
              name="ipCat"
              control={createControl}
              render={({ field }) => (
                <Tooltip title={t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_IP_CATEGORY_TOOLTIP)}>
                  <FormControl fullWidth margin="dense">
                    <InputLabel>{t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_IP_CATEGORY)}</InputLabel>
                    <Select
                      value={field.value}
                      label={t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_IP_CATEGORY)}
                      onChange={e => field.onChange(e.target.value as AssignmentGroupIpCat)}
                    >
                      <MenuItem value={AssignmentGroupIpCat.All}>{t(TranslationKey.IP_CATEGORY_ALL)}</MenuItem>
                      <MenuItem value={AssignmentGroupIpCat.Abc}>{t(TranslationKey.IP_CATEGORY_ABC)}</MenuItem>
                      <MenuItem value={AssignmentGroupIpCat.Local}>{t(TranslationKey.IP_CATEGORY_PRIVATE)}</MenuItem>
                    </Select>
                  </FormControl>
                </Tooltip>
              )}
            />
            {isCreateIdnet && (
              <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={createWatchValues.testWildcard}
                      onChange={(_, checked) => setCreateValue("testWildcard", checked)}
                    />
                  }
                  label={t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_TEST_WILDCARD)}
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={createWatchValues.testFirstLastBr}
                      onChange={(_, checked) => setCreateValue("testFirstLastBr", checked)}
                    />
                  }
                  label={t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_TEST_FIRST_LAST_BR)}
                />
              </Stack>
            )}
            <Controller
              name="students"
              control={createControl}
              render={({ field }) => (
                <Tooltip title={t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_ALL_STUDENTS_INCLUDED_TOOLTIP)}>
                  <FormControl fullWidth margin="dense">
                    <InputLabel>{t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_STUDENTS)}</InputLabel>
                    <Select
                      multiple
                      value={field.value}
                      onChange={e =>
                        field.onChange(
                          Array.isArray(e.target.value)
                            ? e.target.value.map(Number)
                            : []
                        )
                      }
                      renderValue={selectedIds =>
                        (studentsQuery.data ?? [])
                          .filter(s => (selectedIds as (number | string)[]).includes(s.id))
                          .map(s => s.username)
                          .join(", ")
                      }
                    >
                      {(studentsQuery.data ?? []).map(student => (
                        <MenuItem key={student.id} value={student.id}>
                          <Checkbox checked={field.value.includes(student.id)} />
                          <Typography>{student.username}</Typography>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Tooltip>
              )}
            />
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <Controller
                name="startDate"
                control={createControl}
                rules={{ ...FormRules.required() }}
                render={({ field }) => (
                  <DateTimePicker
                    label={t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_START_DATE)}
                    value={field.value ? new Date(field.value) : null}
                    onChange={date => field.onChange(date ? toLocalDateTimeString(date) : "")}
                    slotProps={{
                      textField: {
                        margin: "dense",
                        fullWidth: true,
                        InputLabelProps: { shrink: true },
                        error: !!createErrors.startDate,
                        helperText: createErrors.startDate
                          ? t(createErrors.startDate.message as string)
                          : ""
                      }
                    }}
                    orientation="landscape"
                    format="dd/MM/yyyy HH:mm"
                    ampm={false}
                    viewRenderers={{
                      hours: renderTimeViewClock,
                      minutes: renderTimeViewClock,
                      seconds: renderTimeViewClock
                    }}
                  />
                )}
              />
              <Controller
                name="deadline"
                control={createControl}
                rules={{ ...FormRules.required() }}
                render={({ field }) => (
                  <DateTimePicker
                    label={t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_DEADLINE)}
                    value={field.value ? new Date(field.value) : null}
                    onChange={date => field.onChange(date ? toLocalDateTimeString(date) : "")}
                    slotProps={{
                      textField: {
                        margin: "dense",
                        fullWidth: true,
                        InputLabelProps: { shrink: true },
                        error: !!createErrors.deadline,
                        helperText: createErrors.deadline
                          ? t(createErrors.deadline.message as string)
                          : ""
                      }
                    }}
                    orientation="landscape"
                    format="dd/MM/yyyy HH:mm"
                    ampm={false}
                    viewRenderers={{
                      hours: renderTimeViewClock,
                      minutes: renderTimeViewClock,
                      seconds: renderTimeViewClock
                    }}
                  />
                )}
              />
            </LocalizationProvider>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateDialogVis(false)}>
              {t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_CANCEL)}
            </Button>
            <Button type="submit" variant="contained" color="success" disabled={disableCreate}>
              {t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_CREATE)}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <DeleteDialog
        open={deleteDialogVis}
        onClose={() => {
          setDeleteDialogVis(false)
          setDeleteAG(null)
        }}
        onConfirm={handleDelete}
        question={t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_DELETE_CONFIRMATION_QUESTION)}
        title={t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_DELETE_CONFIRMATION_TITLE)}
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
        <DialogTitle>{t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_MOVE_TITLE)}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 1 }}>
            {movePlan
              ? t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_MOVE_QUESTION, {
                  value: movePlan.ag.name,
                  from: statusMap[movePlan.fromStatus]?.label ?? movePlan.fromStatus,
                  to: statusMap[movePlan.toStatus]?.label ?? movePlan.toStatus
                })
              : ""}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_MOVE_NEW_START)}: {movePlan ? formatDateTime(movePlan.startDate) : ""}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_MOVE_NEW_DEADLINE)}: {movePlan ? formatDateTime(movePlan.deadline) : ""}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              if (moveMutation.isPending) return
              setMovePlan(null)
            }}
          >
            {t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_CANCEL)}
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={confirmMove}
            disabled={moveMutation.isPending}
          >
            {t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_MOVE_CONFIRM)}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={editDialogVis}
        onClose={() => {
          setEditDialogVis(false)
          setEditAG(null)
        }}
        fullWidth
        maxWidth="md"
      >
        <form onSubmit={handleEditSubmit(handleEdit)}>
          <DialogTitle>{t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_EDIT_ASSIGNMENT_GROUP)}</DialogTitle>
          <DialogContent>
            {editDetailQuery.isLoading ? (
              <Typography variant="body2">{t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_LOADING)}</Typography>
            ) : editDetailQuery.isError ? (
              <Typography variant="body2" color="error" sx={{ mb: 2 }}>
                {t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_EDIT_ERROR)}
              </Typography>
            ) : (
              <>
                <Controller
                  name="name"
                  control={editControl}
                  rules={{
                    ...FormRules.required(),
                    ...FormRules.minLengthShort(),
                    ...FormRules.maxLengthShort(),
                    ...FormRules.patternLettersNumbersSpaces()
                  }}
                  render={({ field }) => (
                    <TextField
                      margin="dense"
                      label={t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_NAME)}
                      fullWidth
                      {...field}
                      error={!!editErrors.name}
                      helperText={editErrors.name ? t(editErrors.name.message as string) : ""}
                    />
                  )}
                />
                <Controller
                  name="description"
                  control={editControl}
                  rules={{
                    ...FormRules.maxLengthLong(),
                    ...FormRules.patternLettersNumbersSpecialSpaces()
                  }}
                  render={({ field }) => (
                    <TextField
                      margin="dense"
                      label={t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_DESCRIPTION)}
                      fullWidth
                      {...field}
                      error={!!editErrors.description}
                      helperText={
                        editErrors.description ? t(editErrors.description.message as string) : ""
                      }
                    />
                  )}
                />
                <Controller
                  name="students"
                  control={editControl}
                  render={({ field }) => (
                    <FormControl fullWidth margin="dense">
                      <InputLabel>{t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_STUDENTS)}</InputLabel>
                      <Select
                        multiple
                        value={field.value}
                        onChange={e =>
                          field.onChange(
                            Array.isArray(e.target.value)
                              ? e.target.value.map(Number)
                              : []
                          )
                        }
                        renderValue={selectedIds =>
                          (studentsQuery.data ?? [])
                            .filter(s => (selectedIds as (number | string)[]).includes(s.id))
                            .map(s => s.username)
                            .join(", ")
                        }
                      >
                        {(studentsQuery.data ?? []).map(student => (
                          <MenuItem key={student.id} value={student.id}>
                            <Checkbox checked={field.value.includes(student.id)} />
                            <Typography>{student.username}</Typography>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <Controller
                    name="startDate"
                    control={editControl}
                    rules={{ ...FormRules.required() }}
                    render={({ field }) => (
                      <DateTimePicker
                        label={t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_START_DATE)}
                        value={field.value ? new Date(field.value) : null}
                        onChange={date => field.onChange(date ? toLocalDateTimeString(date) : "")}
                        slotProps={{
                          textField: {
                            margin: "dense",
                            fullWidth: true,
                            InputLabelProps: { shrink: true },
                            error: !!editErrors.startDate,
                            helperText: editErrors.startDate
                              ? t(editErrors.startDate.message as string)
                              : ""
                          }
                        }}
                        orientation="landscape"
                        format="dd/MM/yyyy HH:mm"
                        ampm={false}
                        viewRenderers={{
                          hours: renderTimeViewClock,
                          minutes: renderTimeViewClock,
                          seconds: renderTimeViewClock
                        }}
                      />
                    )}
                  />
                  <Controller
                    name="deadline"
                    control={editControl}
                    rules={{ ...FormRules.required() }}
                    render={({ field }) => (
                      <DateTimePicker
                        label={t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_DEADLINE)}
                        value={field.value ? new Date(field.value) : null}
                        onChange={date => field.onChange(date ? toLocalDateTimeString(date) : "")}
                        slotProps={{
                          textField: {
                            margin: "dense",
                            fullWidth: true,
                            InputLabelProps: { shrink: true },
                            error: !!editErrors.deadline,
                            helperText: editErrors.deadline
                              ? t(editErrors.deadline.message as string)
                              : ""
                          }
                        }}
                        orientation="landscape"
                        format="dd/MM/yyyy HH:mm"
                        ampm={false}
                        viewRenderers={{
                          hours: renderTimeViewClock,
                          minutes: renderTimeViewClock,
                          seconds: renderTimeViewClock
                        }}
                      />
                    )}
                  />
                </LocalizationProvider>
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialogVis(false)}>
              {t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_CANCEL)}
            </Button>
            <Button type="submit" variant="contained" color="success" disabled={disableEdit}>
              {t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_SAVE)}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {alert && (
        <CustomAlert
          severity={alert.severity}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}
    </Box>
  )
}

export default TeacherAssignmentGroups