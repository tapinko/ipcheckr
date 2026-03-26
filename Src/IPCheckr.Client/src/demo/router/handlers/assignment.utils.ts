import { AssignmentGroupType } from "../../../dtos"
import { getGroupVariants, resolveStatus } from "./assignmentGroup.utils"
import { readDemoState } from "../../db"

type DemoState = Awaited<ReturnType<typeof readDemoState>>

const round2 = (value: number) => Math.round(value * 100) / 100

const findVariantByAssignmentId = (state: DemoState, assignmentId: number) => {
  for (const group of state.assignments) {
    const variant = getGroupVariants(state, group).find(v => v.assignmentId === assignmentId)
    if (variant) return { group, variant }
  }
  return null
}

export const buildAssignmentRowsByType = async (
  type: typeof AssignmentGroupType[keyof typeof AssignmentGroupType],
  studentId?: number | null,
) => {
  const state = await readDemoState()
  if (!studentId) return []

  const items = state.assignments
    .filter(group => group.type === type)
    .map(group => {
      const variant = getGroupVariants(state, group).find(v => v.studentUserId === studentId)
      if (!variant) return null
      const submission = state.submissions.find(sub => sub.assignmentId === variant.assignmentId && sub.studentUserId === studentId)
      const successRate = submission ? submission.score : null

      return {
        assignmentId: variant.assignmentId,
        name: group.name,
        assignmentGroupDescription: group.description,
        startDate: group.startDate,
        deadline: group.deadline,
        teacherUsername: group.teacherUsername,
        className: group.className,
        status: resolveStatus(group.startDate, group.deadline, group.completedAt ?? null),
        ipCat: group.ipCat,
        successRate,
      }
    })

  return items.filter(item => item !== null)
}

export const buildIdNetDetails = async (assignmentId: number) => {
  const state = await readDemoState()
  const found = findVariantByAssignmentId(state, assignmentId)
  if (!found || found.group.type !== AssignmentGroupType.Idnet) return null

  const { group, variant } = found
  const submission = state.submissions.find(item => item.assignmentId === assignmentId)
  const student = state.users.find(u => u.id === variant.studentUserId)

  return {
    name: group.name,
    description: group.description,
    ipCat: group.ipCat,
    startDate: group.startDate,
    deadline: group.deadline,
    submittedAt: submission?.submittedAt ?? null,
    successRate: submission?.score ?? 0,
    studentName: student?.username ?? "-",
    status: resolveStatus(group.startDate, group.deadline, group.completedAt ?? null),
    testWildcard: group.testWildcard,
    testFirstLastBr: group.testFirstLastBr,
    results: (variant.rows ?? []).map((row, index) => {
      const submitted = submission?.rows[index] ?? {}
      return {
        address: row.address ?? "",
        idNet: { correct: row.idNet ?? "", submitted: submitted.idNet ?? "" },
        wildcard: { correct: row.wildcard ?? "", submitted: submitted.wildcard ?? "" },
        firstUsable: { correct: row.firstUsable ?? "", submitted: submitted.firstUsable ?? "" },
        lastUsable: { correct: row.lastUsable ?? "", submitted: submitted.lastUsable ?? "" },
        broadcast: { correct: row.broadcast ?? "", submitted: submitted.broadcast ?? "" },
      }
    }),
  }
}

export const buildSubnetDetails = async (assignmentId: number) => {
  const state = await readDemoState()
  const found = findVariantByAssignmentId(state, assignmentId)
  if (!found || found.group.type !== AssignmentGroupType.Subnet) return null

  const { group, variant } = found
  const submission = state.submissions.find(item => item.assignmentId === assignmentId)
  const student = state.users.find(u => u.id === variant.studentUserId)

  return {
    name: group.name,
    description: group.description,
    ipCat: group.ipCat,
    startDate: group.startDate,
    deadline: group.deadline,
    submittedAt: submission?.submittedAt ?? null,
    successRate: submission?.score ?? 0,
    studentName: student?.username ?? "-",
    status: resolveStatus(group.startDate, group.deadline, group.completedAt ?? null),
    results: (variant.rows ?? []).map((row, index) => {
      const submitted = submission?.rows[index] ?? {}
      return {
        hosts: row.hosts ?? 0,
        network: { correct: row.network ?? "", submitted: submitted.network ?? "" },
        firstUsable: { correct: row.firstUsable ?? "", submitted: submitted.firstUsable ?? "" },
        lastUsable: { correct: row.lastUsable ?? "", submitted: submitted.lastUsable ?? "" },
        broadcast: { correct: row.broadcast ?? "", submitted: submitted.broadcast ?? "" },
      }
    }),
  }
}

export const computeIdNetSubmissionScore = (expectedRows: Array<{
  idNet?: string
  wildcard?: string
  firstUsable?: string
  lastUsable?: string
  broadcast?: string
}>, rows: Array<{
  idNet?: string
  wildcard?: string
  firstUsable?: string
  lastUsable?: string
  broadcast?: string
}>, testWildcard: boolean, testFirstLastBr: boolean) => {
  let total = 0
  let correct = 0

  expectedRows.forEach((expected, index) => {
    const submitted = rows[index] ?? {}

    total += 1
    if ((submitted.idNet ?? "").trim() === (expected.idNet ?? "").trim()) correct += 1

    if (testWildcard) {
      total += 1
      if ((submitted.wildcard ?? "").trim() === (expected.wildcard ?? "").trim()) correct += 1
    }

    if (testFirstLastBr) {
      total += 3
      if ((submitted.firstUsable ?? "").trim() === (expected.firstUsable ?? "").trim()) correct += 1
      if ((submitted.lastUsable ?? "").trim() === (expected.lastUsable ?? "").trim()) correct += 1
      if ((submitted.broadcast ?? "").trim() === (expected.broadcast ?? "").trim()) correct += 1
    }
  })

  return total > 0 ? round2((correct / total) * 100) : 0
}

export const computeSubnetSubmissionScore = (expectedRows: Array<{
  network?: string
  firstUsable?: string
  lastUsable?: string
  broadcast?: string
}>, rows: Array<{
  network?: string
  firstUsable?: string
  lastUsable?: string
  broadcast?: string
}>) => {
  let total = 0
  let correct = 0

  expectedRows.forEach((expected, index) => {
    const submitted = rows[index] ?? {}

    total += 4
    if ((submitted.network ?? "").trim() === (expected.network ?? "").trim()) correct += 1
    if ((submitted.firstUsable ?? "").trim() === (expected.firstUsable ?? "").trim()) correct += 1
    if ((submitted.lastUsable ?? "").trim() === (expected.lastUsable ?? "").trim()) correct += 1
    if ((submitted.broadcast ?? "").trim() === (expected.broadcast ?? "").trim()) correct += 1
  })

  return total > 0 ? round2((correct / total) * 100) : 0
}

export const findVariantAndGroup = (state: DemoState, assignmentId: number) => {
  return findVariantByAssignmentId(state, assignmentId)
}