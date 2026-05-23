import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Tooltip,
  Typography
} from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined"
import SearchIcon from "@mui/icons-material/Search"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { assignmentGroupApi, classApi, agTemplateApi } from "../../utils/apiClients"
import {
  AssignmentGroupDifficulty,
  AssignmentGroupType,
  type AGTemplateDto,
  type ApiProblemDetails,
  type ClassDto
} from "../../dtos"
import { useAuth } from "../../contexts/AuthContext"
import { Language, TranslationKey } from "../../utils/i18n"
import { getDifficultyColor, getDifficultyLabel } from "../../utils/getDifficultyLabel"
import { getHostSortLabel } from "../../utils/getHostSortLabel"
import DeleteDialog from "../../components/DeleteDialog"
import { CustomAlert, type CustomAlertState } from "../../components/CustomAlert"
import AGTemplatesSkeleton from "../../components/ag/AGTemplatesSkeleton"
import ErrorLoading from "../../components/ErrorLoading"
import type { AxiosError } from "axios"
import { toLocalDateTimeString } from "./AGDateColumn"

interface QuickCreateForm {
  agName: string
  classId: number | ""
  startDate: string
  deadline: string
}

interface AGTemplatesFeatureProps {
  onNavigateCreate: () => void
  onNavigateEdit: (id: number) => void
  onAfterCreate: (classId?: number) => void
  teacherFilter?: number | null
}

const AGTemplatesFeature = ({ onNavigateCreate, onNavigateEdit, onAfterCreate, teacherFilter }: AGTemplatesFeatureProps) => {
  const { t, i18n } = useTranslation()
  const { userId } = useAuth()
  const queryUserId = teacherFilter !== undefined ? teacherFilter : userId
  const queryClient = useQueryClient()

  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<AssignmentGroupType | "ALL">("ALL")
  const [deleteTarget, setDeleteTarget] = useState<AGTemplateDto | null>(null)
  const [qcTemplate, setQcTemplate] = useState<AGTemplateDto | null>(null)
  const [alert, setAlert] = useState<CustomAlertState | null>(null)

  const [qcForm, setQcForm] = useState<QuickCreateForm>({
    agName: "",
    classId: "",
    startDate: "",
    deadline: ""
  })

  const templatesQuery = useQuery({
    queryKey: ["agTemplates"],
    enabled: !!userId,
    queryFn: () => agTemplateApi.aGTemplateQueryAGTemplates().then(r => r.data.templates ?? [])
  })

  const classesQuery = useQuery<ClassDto[], Error>({
    queryKey: ["agCreateClasses", queryUserId],
    enabled: !!userId,
    queryFn: () => classApi.classQueryClasses(null, null, queryUserId).then(r => r.data.classes)
  })

  const deleteMutation = useMutation<void, AxiosError<ApiProblemDetails>, number>({
    mutationFn: id => agTemplateApi.aGTemplateDeleteAGTemplates({ templateIds: [id] }).then(() => undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agTemplates"] })
      setAlert({ severity: "success", message: t(TranslationKey.AG_TEMPLATES_DELETE_SUCCESS) })
      setDeleteTarget(null)
    },
    onError: error => {
      const details = error.response?.data
      const msg = i18n.language === Language.EN ? details?.messageEn : details?.messageSk
      setAlert({ severity: "error", message: msg ?? t(TranslationKey.AG_TEMPLATES_DELETE_ERROR) })
    }
  })

  const quickCreateMutation = useMutation<void, AxiosError<ApiProblemDetails>, void>({
    mutationFn: async () => {
      if (!qcTemplate || !qcForm.classId) return
      const payload = {
        name: qcForm.agName || qcTemplate.agName || qcTemplate.name || "",
        description: qcTemplate.agDescription || null,
        classId: qcForm.classId as number,
        students: null,
        type: qcTemplate.type!,
        startDate: new Date(qcForm.startDate).toISOString(),
        deadline: new Date(qcForm.deadline).toISOString(),
        numberOfRecords: qcTemplate.numberOfRecords!,
        ipCat: qcTemplate.ipCat!
      }
      if (qcTemplate.type === AssignmentGroupType.Idnet) {
        await assignmentGroupApi.assignmentGroupCreateIdNetAssignmentGroup({
          ...payload,
          possibleOctets: qcTemplate.possibleOctets ?? 3,
          testWildcard: qcTemplate.testWildcard ?? false,
          testFirstLastBr: qcTemplate.testFirstLastBr ?? false
        })
      } else {
        await assignmentGroupApi.assignmentGroupCreateSubnetAssignmentGroup({
          ...payload,
          hostSortStrategy: qcTemplate.hostSortStrategy ?? undefined,
          difficulty: qcTemplate.difficulty ?? undefined
        })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agAssignmentGroups"] })
      setQcTemplate(null)
      onAfterCreate(qcForm.classId !== "" ? (qcForm.classId as number) : undefined)
    },
    onError: error => {
      const details = error.response?.data
      const msg = i18n.language === Language.EN ? details?.messageEn : details?.messageSk
      setAlert({ severity: "error", message: msg ?? t(TranslationKey.AG_TEMPLATES_QC_ERROR) })
    }
  })

  const applyQuickDuration = (minutes: number) => {
    const start = new Date()
    start.setSeconds(0, 0)
    start.setMinutes(start.getMinutes() + 1)
    const end = new Date(start.getTime() + minutes * 60 * 1000)
    setQcForm(f => ({
      ...f,
      startDate: toLocalDateTimeString(start),
      deadline: toLocalDateTimeString(end)
    }))
  }

  const openQuickCreate = (template: AGTemplateDto) => {
    setQcForm({ agName: template.agName ?? "", classId: classesQuery.data?.[0]?.classId ?? "", startDate: "", deadline: "" })
    setQcTemplate(template)
  }

  const filtered = (templatesQuery.data ?? []).filter(template => {
    const matchesSearch = search.trim() === "" || (template.name ?? "").toLowerCase().includes(search.trim().toLowerCase())
    const matchesType = typeFilter === "ALL" || template.type === typeFilter
    return matchesSearch && matchesType
  })

  const canQuickCreate =
    !!qcForm.classId &&
    !!qcForm.startDate &&
    !!qcForm.deadline &&
    !quickCreateMutation.isPending

  if (templatesQuery.isLoading || classesQuery.isLoading) return <AGTemplatesSkeleton />
  if (templatesQuery.isError) return <ErrorLoading onRetry={() => templatesQuery.refetch()} />

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {alert && <CustomAlert severity={alert.severity} message={alert.message} onClose={() => setAlert(null)} />}

      <Stack direction="row" spacing={1.5} alignItems="center">
        <TextField
          fullWidth
          placeholder={t(TranslationKey.AG_TEMPLATES_SEARCH)}
          value={search}
          onChange={e => setSearch(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              )
            }
          }}
          sx={{ "& .MuiOutlinedInput-root": { borderRadius: 1 } }}
        />
        <Stack direction="row" spacing={0.75}>
          {(["ALL", AssignmentGroupType.Subnet, AssignmentGroupType.Idnet] as const).map(val => (
            <Button
              key={val}
              variant={typeFilter === val ? "contained" : "outlined"}
              onClick={() => setTypeFilter(val)}
              sx={{ borderRadius: 1, textTransform: "none", fontWeight: 600, height: 56, px: 3 }}
            >
              {val === "ALL" ? "All" : val === AssignmentGroupType.Subnet ? "Subnet" : "IDNet"}
            </Button>
          ))}
        </Stack>
        <Tooltip title={t(TranslationKey.AG_TEMPLATE_CREATE)}>
          <span>
            <IconButton
              onClick={onNavigateCreate}
              color="success"
              sx={{
                border: theme => `1px solid ${theme.palette.success.main}`,
                width: 56,
                height: 56,
                backgroundColor: theme => theme.palette.success.light,
                "& .MuiSvgIcon-root": { fontSize: 30 },
                color: theme => theme.palette.success.dark,
              }}
            >
              <AddIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>

      {filtered.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {t(TranslationKey.AG_TEMPLATES_NO_DATA)}
        </Typography>
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0,1fr))", lg: "repeat(3, minmax(0,1fr))" },
            gap: 2
          }}
        >
          {filtered.map(template => (
            <Card
              key={template.id}
              variant="outlined"
              sx={{ display: "flex", flexDirection: "column", cursor: "pointer", "&:hover": { opacity: 0.9, "& .template-title": { textDecoration: "underline" } } }}
              onClick={() => onNavigateEdit(template.id!)}
            >
              <CardHeader
                sx={{ pb: 0.5, "& .MuiCardHeader-content": { minWidth: 0 } }}
                title={
                  <Tooltip title={template.name} placement="top-start">
                    <Typography
                      className="template-title"
                      variant="subtitle2"
                      fontWeight={700}
                      sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                    >
                      {template.name}
                    </Typography>
                  </Tooltip>
                }
                action={
                  <IconButton
                    size="small"
                    onClick={e => { e.stopPropagation(); setDeleteTarget(template) }}
                  >
                    <DeleteOutlineOutlinedIcon fontSize="small" />
                  </IconButton>
                }
              />
              <CardContent sx={{ pt: 0.5, pb: 0.5, flexGrow: 1 }}>
                <Stack direction="row" flexWrap="wrap" gap={0.5} mb={template.agName ? 1 : 0}>
                  <Chip
                    label={template.type === AssignmentGroupType.Subnet ? "Subnet" : "IDNet"}
                    color={template.type === AssignmentGroupType.Subnet ? "primary" : "secondary"}
                    size="small"
                    variant="outlined"
                  />
                  <Chip label={template.ipCat} size="small" variant="outlined" sx={{ borderStyle: "dashed" }} />
                  <Chip label={`${template.numberOfRecords} ${t(TranslationKey.AG_TEMPLATES_RECORDS)}`} size="small" variant="outlined" />
                  {template.difficulty && (
                    <Chip
                      label={getDifficultyLabel(template.difficulty as AssignmentGroupDifficulty, t)}
                      color={getDifficultyColor(template.difficulty as AssignmentGroupDifficulty)}
                      size="small"
                      variant="outlined"
                    />
                  )}
                  {template.hostSortStrategy && (
                    <Chip label={getHostSortLabel(template.hostSortStrategy, t)} size="small" variant="outlined" />
                  )}
                  {template.testWildcard && (
                    <Chip label={t(TranslationKey.AG_TEMPLATES_CHIP_WILDCARD)} size="small" variant="outlined" />
                  )}
                  {template.testFirstLastBr && (
                    <Chip label={t(TranslationKey.AG_TEMPLATES_CHIP_FIRST_LAST_BR)} size="small" variant="outlined" />
                  )}
                </Stack>
                {template.agName && (
                  <Typography variant="caption" color="text.secondary" noWrap display="block">
                    {template.agName}
                  </Typography>
                )}
              </CardContent>
              <Divider />
              <CardActions sx={{ px: 1.5, py: 1 }}>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={e => { e.stopPropagation(); openQuickCreate(template) }}
                  disabled={!classesQuery.data?.length}
                >
                  {t(TranslationKey.AG_TEMPLATES_USE)}
                </Button>
              </CardActions>
            </Card>
          ))}
        </Box>
      )}

      <DeleteDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id!)}
        title={t(TranslationKey.AG_TEMPLATES_DELETE_TITLE)}
        question={`${t(TranslationKey.AG_TEMPLATES_DELETE_QUESTION)} "${deleteTarget?.name}"?`}
        label={deleteTarget?.name ?? ""}
      />

      <Dialog
        open={!!qcTemplate}
        onClose={() => { if (!quickCreateMutation.isPending) setQcTemplate(null) }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>{t(TranslationKey.AG_TEMPLATES_QC_TITLE)}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label={t(TranslationKey.AG_TEMPLATES_QC_AG_NAME)}
              fullWidth
              value={qcForm.agName}
              onChange={e => setQcForm(f => ({ ...f, agName: e.target.value }))}
            />
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {(classesQuery.data ?? []).map(c => (
                <Chip
                  key={c.classId}
                  label={c.className}
                  variant={qcForm.classId === c.classId ? "filled" : "outlined"}
                  color={qcForm.classId === c.classId ? "primary" : "default"}
                  onClick={() => setQcForm(f => ({ ...f, classId: c.classId }))}
                  clickable
                  sx={{ fontSize: "0.9rem", height: 36, px: 1 }}
                />
              ))}
            </Stack>
            {classesQuery.data?.length === 0 && (
              <Typography variant="caption" color="error.main">
                {t(TranslationKey.AG_TEMPLATES_QC_NO_CLASSES)}
              </Typography>
            )}
            <Stack direction="row" spacing={1}>
              <TextField
                label={t(TranslationKey.AG_TEMPLATES_QC_START_DATE)}
                type="datetime-local"
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
                value={qcForm.startDate}
                onChange={e => setQcForm(f => ({ ...f, startDate: e.target.value }))}
              />
              <TextField
                label={t(TranslationKey.AG_TEMPLATES_QC_DEADLINE)}
                type="datetime-local"
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
                value={qcForm.deadline}
                onChange={e => setQcForm(f => ({ ...f, deadline: e.target.value }))}
              />
            </Stack>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {[5, 10, 15, 20].map(min => (
                <Button key={min} size="small" variant="outlined" onClick={() => applyQuickDuration(min)}>
                  {min}m
                </Button>
              ))}
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQcTemplate(null)} disabled={quickCreateMutation.isPending}>
            {t(TranslationKey.AG_TEMPLATES_QC_CANCEL)}
          </Button>
          <Button
            variant="contained"
            color="success"
            disabled={!canQuickCreate}
            onClick={() => quickCreateMutation.mutate()}
          >
            {quickCreateMutation.isPending
              ? t(TranslationKey.AG_TEMPLATES_QC_LOADING)
              : t(TranslationKey.AG_TEMPLATES_QC_CREATE)}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default AGTemplatesFeature