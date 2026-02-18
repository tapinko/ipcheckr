import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate, useParams } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Divider,
  Stack,
  Typography
} from "@mui/material"
import { AccessTime, Category, Percent, Person, Quiz, TaskAlt } from "@mui/icons-material"
import { getParametrizedUrl, RouteKeys, RouteParams } from "../../router/routes"
import { assignmentApi, userApi } from "../../utils/apiClients"
import { AssignmentGroupType, type QueryIDNetAssignmentSubmitDetailsFullRes, type QuerySubnetAssignmentSubmitDetailsFullRes } from "../../dtos"
import UserRole from "../../types/UserRole"
import { TranslationKey } from "../../utils/i18n"
import ErrorLoading from "../../components/ErrorLoading"
import SubmissionSkeleton from "../../components/SubmissionSkeleton"
import CardSingleDetail from "../../components/AssignmentCardSingleDetail"
import InsightCard from "../../components/InsightCard"
import InsightGrid from "../../components/InsightGrid"
import { getIpCatLabel } from "../../utils/getIpCatLabel"
import { fromAssignmentTypeParam } from "../../utils/assignmentType"

const TeacherAssignmentGroupDetailsSubmit = () => {
  const { t } = useTranslation()
  const {
    [RouteParams.ASSIGNMENT_ID]: assignmentId,
    [RouteParams.ASSIGNMENT_GROUP_TYPE]: assignmentTypeParam
  } = useParams()
  const assignmentType = fromAssignmentTypeParam(assignmentTypeParam)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const subnetDetailsQuery = useQuery<QuerySubnetAssignmentSubmitDetailsFullRes, Error>({
    queryKey: ["teacherAssignmentSubmitDetails", "subnet", assignmentId],
    enabled: !!assignmentId && (!assignmentType || assignmentType === AssignmentGroupType.Subnet),
    queryFn: () =>
      assignmentApi
        .assignmentQuerySubnetAssignmentSubmitDetailsFull(
          Number(assignmentId)
        )
        .then(r => r.data),
    placeholderData: prev => prev
  })

  const idNetDetailsQuery = useQuery<QueryIDNetAssignmentSubmitDetailsFullRes, Error>({
    queryKey: ["teacherAssignmentSubmitDetails", "idnet", assignmentId],
    enabled: !!assignmentId && (
      assignmentType === AssignmentGroupType.Idnet || (!assignmentType && subnetDetailsQuery.isError)
    ),
    queryFn: () =>
      assignmentApi
        .assignmentQueryIdNetAssignmentSubmitDetailsFull(
          Number(assignmentId)
        )
        .then(r => r.data),
    placeholderData: prev => prev
  })

  const data = useMemo(() => {
    if (assignmentType === AssignmentGroupType.Subnet) return subnetDetailsQuery.data ?? null
    if (assignmentType === AssignmentGroupType.Idnet) return idNetDetailsQuery.data ?? null
    return subnetDetailsQuery.data ?? idNetDetailsQuery.data ?? null
  }, [assignmentType, subnetDetailsQuery.data, idNetDetailsQuery.data])

  const isSubnetData = (d: typeof data): d is QuerySubnetAssignmentSubmitDetailsFullRes =>
    !!d && Array.isArray(d.results) && d.results.length > 0 && "hosts" in d.results[0]

  const isIdNetData = (d: typeof data): d is QueryIDNetAssignmentSubmitDetailsFullRes =>
    !!d && Array.isArray(d.results) && d.results.length > 0 && "address" in d.results[0]

  const correctStats = useMemo(() => {
    if (!data || !data.results || data.results.length === 0) return null

    if (isSubnetData(data)) {
      const fields = ["network", "firstUsable", "lastUsable", "broadcast"] as const
      const total = data.results.length * fields.length
      let correct = 0
      for (const r of data.results) {
        for (const f of fields) {
          const submitted = r[f].submitted
          const expected = r[f].correct
          if (submitted !== undefined && submitted !== null && submitted !== "" && submitted === expected) {
            correct++
          }
        }
      }
      return { correct, total }
    }

    if (isIdNetData(data)) {
      const includeWildcardInScore = typeof (data as any)?.testWildcard === "boolean"
        ? Boolean((data as any)?.testWildcard)
        : true
      const includeFirstLastBrInScore = typeof (data as any)?.testFirstLastBr === "boolean"
        ? Boolean((data as any)?.testFirstLastBr)
        : true

      type IdNetFieldKey = "idNet" | "wildcard" | "firstUsable" | "lastUsable" | "broadcast"
      const fields: IdNetFieldKey[] = ["idNet"]
      if (includeWildcardInScore) fields.push("wildcard")
      if (includeFirstLastBrInScore) fields.push("firstUsable", "lastUsable", "broadcast")

      const total = data.results.length * fields.length
      let correct = 0
      for (const r of data.results) {
        for (const f of fields) {
          const submitted = r[f].submitted
          const expected = r[f].correct
          if (submitted !== undefined && submitted !== null && submitted !== "" && submitted === expected) {
            correct++
          }
        }
      }
      return { correct, total }
    }

    return null
  }, [data])

  const isLoading = !data && (subnetDetailsQuery.isLoading || idNetDetailsQuery.isLoading)

  const studentLookupQuery = useQuery({
    queryKey: ["teacherAssignmentSubmitStudentLookup", data?.studentName],
    enabled: !!data?.studentName,
    queryFn: () => userApi.userQueryUsers(null, data!.studentName, UserRole.STUDENT).then(r => r.data.users ?? []),
    placeholderData: prev => prev
  })

  const studentId = useMemo(() => {
    const users = studentLookupQuery.data ?? []
    const exactMatch = users.find(u => u.username === data?.studentName)
    return exactMatch?.id ?? users[0]?.id ?? null
  }, [studentLookupQuery.data, data?.studentName])

  const hasError = (() => {
    if (assignmentType === AssignmentGroupType.Subnet) return subnetDetailsQuery.isError
    if (assignmentType === AssignmentGroupType.Idnet) return idNetDetailsQuery.isError
    return subnetDetailsQuery.isError && idNetDetailsQuery.isError
  })()

  if (isLoading) {
    return <SubmissionSkeleton />
  }

  if (hasError || !data) {
    return (
      <ErrorLoading
        onRetry={() => {
          queryClient.invalidateQueries({
            queryKey: ["teacherAssignmentSubmitDetails", "subnet", assignmentId]
          })
          queryClient.invalidateQueries({
            queryKey: ["teacherAssignmentSubmitDetails", "idnet", assignmentId]
          })
        }}
      />
    )
  }

  const isSingleResult = (data.results.length ?? 0) === 1
  const assignmentGroupName = data?.name ?? "-"
  const descriptionValue = data?.description ? data.description : "-"
  const successRateValue = data?.successRate
  const successRateLabel = successRateValue === undefined || successRateValue === null
    ? "-"
    : `${successRateValue.toFixed(2)}%`
  const ipCategoryValue = data?.ipCat ? getIpCatLabel(data.ipCat, t) : "-"
  const submittedAtLabel = data?.submittedAt
    ? new Date(data.submittedAt).toLocaleString()
    : "-"
  const correctValue = correctStats ? `${correctStats.correct}/${correctStats.total}` : "-"
  const startDateLabel = (data as any)?.startDate
    ? new Date((data as any).startDate).toLocaleString()
    : "-"
  const deadlineLabel = (data as any)?.deadline
    ? new Date((data as any).deadline).toLocaleString()
    : "-"
  const studentName = data?.studentName ?? "-"
  const resolvedType = assignmentType ?? (isSubnetData(data) ? AssignmentGroupType.Subnet : AssignmentGroupType.Idnet)
  const includeWildcard = resolvedType === AssignmentGroupType.Idnet
    ? typeof (data as any)?.testWildcard === "boolean"
      ? Boolean((data as any)?.testWildcard)
      : data.results.some((r: any) => (r?.wildcard?.correct ?? "") !== "")
    : false
  const includeFirstLastBr = resolvedType === AssignmentGroupType.Idnet
    ? typeof (data as any)?.testFirstLastBr === "boolean"
      ? Boolean((data as any)?.testFirstLastBr)
      : data.results.some((r: any) =>
          (r?.firstUsable?.correct ?? "") !== "" ||
          (r?.lastUsable?.correct ?? "") !== "" ||
          (r?.broadcast?.correct ?? "") !== ""
        )
    : false

  const subnetTone = (submitted: string, correct: string) =>
    submitted === correct && submitted !== "" ? "success" : "error"

  const idNetTone = (submitted: string, correct: string, enabled = true) => {
    if (!enabled) return "info"
    return submitted === correct && submitted !== "" ? "success" : "error"
  }

  return (
    <>
      <Stack spacing={1.75}>
        <Card variant="outlined" sx={{ borderColor: "divider", backgroundColor: "background.paper" }}>
          <CardContent>
            <Stack spacing={1}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} flexWrap="wrap">
                <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                  <Quiz fontSize="small" color="action" />
                  <Typography variant="h6" fontWeight={800}>
                    {assignmentGroupName}
                  </Typography>
                  <Chip
                    label={
                      resolvedType === AssignmentGroupType.Subnet
                        ? t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_TYPE_SUBNET)
                        : t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_TYPE_IDNET)
                    }
                    color={resolvedType === AssignmentGroupType.Subnet ? "primary" : "secondary"}
                    size="small"
                    variant="outlined"
                  />
                </Stack>

                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={1}
                  onClick={() => {
                    if (!studentId) return
                    navigate(
                      getParametrizedUrl(RouteKeys.TEACHER_MY_CLASSES_STUDENT_DETAILS, {
                        [RouteParams.STUDENT_ID]: studentId.toString()
                      })
                    )
                  }}
                  sx={{
                    cursor: studentId ? "pointer" : "default",
                    "&:hover .student-link-name": studentId
                      ? {
                          textDecoration: "underline"
                        }
                      : undefined
                  }}
                >
                  <Person fontSize="small" color="action" />
                  <Typography variant="body2" fontWeight={700} className="student-link-name">
                    {studentName}
                  </Typography>
                </Stack>
              </Stack>

              {descriptionValue !== "-" ? (
                <Typography variant="body2" color="text.secondary">
                  {descriptionValue}
                </Typography>
              ) : null}
            </Stack>
          </CardContent>
        </Card>

        <InsightGrid
          spacing={1.25}
          columnsMax={3}
          items={[
            <InsightCard
              title={t(TranslationKey.STUDENT_ASSIGNMENT_DETAILS_SUCCESS_RATE)}
              value={successRateLabel}
              icon={<Percent />}
              tone="success"
              dense
            />,
            <InsightCard
              title={t(TranslationKey.STUDENT_ASSIGNMENT_DETAILS_CORRECT)}
              value={correctValue}
              icon={<TaskAlt />}
              tone="info"
              dense
            />,
            <InsightCard
              title={t(TranslationKey.STUDENT_ASSIGNMENT_DETAILS_IP_CATEGORY)}
              value={ipCategoryValue}
              icon={<Category />}
              dense
            />,
            <InsightCard
              title={t(TranslationKey.STUDENT_ASSIGNMENT_DETAILS_SUBMITTED_AT)}
              value={submittedAtLabel}
              icon={<AccessTime />}
              dense
            />,
            <InsightCard
              title={t(TranslationKey.TEACHER_ASSIGNMENT_GROUP_DETAILS_START_DATE)}
              value={startDateLabel}
              icon={<AccessTime />}
              dense
            />,
            <InsightCard
              title={t(TranslationKey.TEACHER_ASSIGNMENT_GROUP_DETAILS_DEADLINE)}
              value={deadlineLabel}
              icon={<AccessTime />}
              dense
            />
          ]}
        />
      </Stack>

      <Divider sx={{ my: 2 }} />

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            md: isSingleResult ? "1fr" : "repeat(2, 1fr)"
          },
          gap: 2,
          width: "100%",
          maxWidth: 1200,
          justifyContent: "center",
          justifyItems: isSingleResult ? "center" : "stretch"
        }}
      >
        {isSubnetData(data)
          ? data.results.map((result, index) => (
              <Card
                key={index}
                sx={{
                  width: (data?.results.length ?? 0) === 1 ? "50%" : "100%"
                }}
              >
                <CardHeader
                  title={
                    <Typography variant="h6" sx={{ textAlign: "center" }}>
                      <strong>
                        {t(TranslationKey.STUDENT_ASSIGNMENT_DETAILS_HOSTS)}: {" "}
                      </strong>
                      {result.hosts}
                    </Typography>
                  }
                  sx={{
                    "& .MuiCardHeader-content": {
                      width: "100%",
                      display: "flex",
                      justifyContent: "center"
                    }
                  }}
                />
                <Divider />
                <CardContent>
                  <Stack spacing={2}>
                    <CardSingleDetail
                      title={t(TranslationKey.STUDENT_ASSIGNMENT_DETAILS_NETWORK)}
                      submitted={result.network.submitted || ""}
                      correct={result.network.correct}
                      tone={subnetTone(result.network.submitted || "", result.network.correct)}
                    />
                    <CardSingleDetail
                      title={t(TranslationKey.STUDENT_ASSIGNMENT_DETAILS_FIRST_USABLE)}
                      submitted={result.firstUsable.submitted || ""}
                      correct={result.firstUsable.correct}
                      tone={subnetTone(result.firstUsable.submitted || "", result.firstUsable.correct)}
                    />
                    <CardSingleDetail
                      title={t(TranslationKey.STUDENT_ASSIGNMENT_DETAILS_LAST_USABLE)}
                      submitted={result.lastUsable.submitted || ""}
                      correct={result.lastUsable.correct}
                      tone={subnetTone(result.lastUsable.submitted || "", result.lastUsable.correct)}
                    />
                    <CardSingleDetail
                      title={t(TranslationKey.STUDENT_ASSIGNMENT_DETAILS_BROADCAST)}
                      submitted={result.broadcast.submitted || ""}
                      correct={result.broadcast.correct}
                      tone={subnetTone(result.broadcast.submitted || "", result.broadcast.correct)}
                    />
                  </Stack>
                </CardContent>
              </Card>
            ))
          : data.results.map((result, index) => (
              <Card
                key={index}
                sx={{
                  width: (data?.results.length ?? 0) === 1 ? "50%" : "100%"
                }}
              >
                <CardHeader
                  title={
                    <Typography variant="h6" sx={{ textAlign: "center" }}>
                      <strong>
                        {t(TranslationKey.STUDENT_ASSIGNMENT_DETAILS_NETWORK)}: {" "}
                      </strong>
                      {result.address}
                    </Typography>
                  }
                  sx={{
                    "& .MuiCardHeader-content": {
                      width: "100%",
                      display: "flex",
                      justifyContent: "center"
                    }
                  }}
                />
                <Divider />
                <CardContent>
                  <Stack spacing={2}>
                    <CardSingleDetail
                      title="ID Net"
                      submitted={result.idNet.submitted || ""}
                      correct={result.idNet.correct}
                      tone={idNetTone(result.idNet.submitted || "", result.idNet.correct)}
                    />
                    <CardSingleDetail
                      title={t(TranslationKey.TEACHER_ASSIGNMENT_GROUPS_TEST_WILDCARD)}
                      submitted={result.wildcard.submitted || ""}
                      correct={result.wildcard.correct}
                      tone={idNetTone(result.wildcard.submitted || "", result.wildcard.correct, includeWildcard)}
                    />
                    <CardSingleDetail
                      title={t(
                        TranslationKey
                          .TEACHER_ASSIGNMENT_GROUP_DETAILS_SUBMIT_FIRST_USABLE
                      )}
                      submitted={result.firstUsable.submitted || ""}
                      correct={result.firstUsable.correct}
                      tone={idNetTone(result.firstUsable.submitted || "", result.firstUsable.correct, includeFirstLastBr)}
                    />
                    <CardSingleDetail
                      title={t(
                        TranslationKey
                          .TEACHER_ASSIGNMENT_GROUP_DETAILS_SUBMIT_LAST_USABLE
                      )}
                      submitted={result.lastUsable.submitted || ""}
                      correct={result.lastUsable.correct}
                      tone={idNetTone(result.lastUsable.submitted || "", result.lastUsable.correct, includeFirstLastBr)}
                    />
                    <CardSingleDetail
                      title={t(
                        TranslationKey
                          .TEACHER_ASSIGNMENT_GROUP_DETAILS_SUBMIT_BROADCAST
                      )}
                      submitted={result.broadcast.submitted || ""}
                      correct={result.broadcast.correct}
                      tone={idNetTone(result.broadcast.submitted || "", result.broadcast.correct, includeFirstLastBr)}
                    />
                  </Stack>
                </CardContent>
              </Card>
            ))}
      </Box>
    </>
  )
}

export default TeacherAssignmentGroupDetailsSubmit