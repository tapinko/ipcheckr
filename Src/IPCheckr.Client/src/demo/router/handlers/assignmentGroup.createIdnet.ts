import { AssignmentGroupType } from "../../../dtos"
import UserRole from "../../../types/UserRole"
import { readDemoState, writeDemoState } from "../../db"
import { demoResponse, parseBody } from "./_http"
import { generateIdNetData, getGroupVariants, normalizeIpCat } from "./assignmentGroup.utils"
import type { DemoEndpointHandler } from "../types"

export const createIdnetAssignmentGroupHandler: DemoEndpointHandler = async ({ config, path, method }) => {
  if (path !== "/api/assignment-group/create-idnet-assignment-group") return null
  if (method !== "post") return null

  const body = parseBody<{
    name?: string
    description?: string | null
    classId?: number
    startDate?: string
    deadline?: string
    numberOfRecords?: number
    ipCat?: string
    possibleOctets?: number
    testWildcard?: boolean
    testFirstLastBr?: boolean
    students?: number[] | null
  }>(config)

  const state = await readDemoState()
  const classObj = state.classes.find(c => c.classId === Number(body?.classId ?? 0))
  if (!classObj) return demoResponse(config, { messageEn: "Class not found" }, 400)

  const classStudents = state.users.filter(user => user.role === UserRole.STUDENT && user.classIds.includes(classObj.classId))
  const targetStudents = (body?.students ?? []).length
    ? classStudents.filter(student => (body?.students ?? []).includes(student.id))
    : classStudents
  if (!targetStudents.length) return demoResponse(config, { messageEn: "No students found for assignment group" }, 400)

  const id = Math.max(0, ...state.assignments.map(item => item.id)) + 1
  const rowCount = Math.max(1, Number(body?.numberOfRecords ?? 1))
  const possibleOctets = Math.max(1, Math.min(4, Number(body?.possibleOctets ?? 3)))
  const ipCat = normalizeIpCat(body?.ipCat)

  const maxExistingVariantId = Math.max(
    0,
    ...state.assignments.flatMap(group => getGroupVariants(state, group).map(v => v.assignmentId)),
  )

  let assignmentIdCounter = maxExistingVariantId + 1
  const studentAssignments = targetStudents.map(student => {
    const generatedRows = generateIdNetData(rowCount, ipCat, possibleOctets)
    const assignmentId = assignmentIdCounter++
    return {
      assignmentId,
      studentUserId: student.id,
      addresses: generatedRows.map(r => r.address),
      rows: generatedRows,
    }
  })

  const assignment = {
    id,
    type: AssignmentGroupType.Idnet,
    name: (body?.name ?? "").trim(),
    description: (body?.description ?? "") || "",
    className: classObj.className,
    teacherUsername: classObj.teacherUsernames[0] ?? "teacher",
    ipCat,
    startDate: body?.startDate ?? new Date().toISOString(),
    deadline: body?.deadline ?? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    completedAt: null,
    expectedRows: studentAssignments[0]?.rows ?? [],
    testWildcard: !!body?.testWildcard,
    testFirstLastBr: !!body?.testFirstLastBr,
    createdByUserId: 101,
    studentAssignments,
  }

  await writeDemoState({
    ...state,
    assignments: [assignment, ...state.assignments],
  })

  return demoResponse(config, { assignmentGroupId: id })
}