import { AssignmentGroupType } from "../../../dtos"
import UserRole from "../../../types/UserRole"
import { readDemoState, writeDemoState } from "../../db"
import { demoResponse, parseBody } from "./_http"
import {
  calculateSubnetAnswerKey,
  getGroupVariants,
  normalizeIpCat,
  tryGenerateSubnetData,
} from "./assignmentGroup.utils"
import type { DemoEndpointHandler } from "../../../types/DemoEndpointHandler"

export const createSubnetAssignmentGroupHandler: DemoEndpointHandler = async ({ config, path, method }) => {
  if (path !== "/api/assignment-group/create-subnet-assignment-group") return null
  if (method !== "post") return null

  const body = parseBody<{
    name?: string
    description?: string | null
    classId?: number
    startDate?: string
    deadline?: string
    numberOfRecords?: number
    ipCat?: string
    students?: number[] | null
  }>(config)

  const state = await readDemoState()
  const classObj = state.classes.find(c => c.classId === Number(body?.classId ?? 0))
  if (!classObj) return demoResponse(config, { messageEn: "Class not found" }, 400)

  const classStudents = state.users.filter(user => user.role === UserRole.STUDENT && user.classIds.includes(classObj.classId))
  const targetStudents = body?.students && body.students.length > 0
    ? classStudents.filter(student => body.students!.includes(student.id))
    : classStudents
  if (!targetStudents.length) return demoResponse(config, { messageEn: "No students found for assignment group" }, 400)

  const id = Math.max(0, ...state.assignments.map(item => item.id)) + 1
  const rowCount = Math.max(1, Number(body?.numberOfRecords ?? 1))
  const ipCat = normalizeIpCat(body?.ipCat)

  const maxExistingVariantId = Math.max(
    0,
    ...state.assignments.flatMap(group => getGroupVariants(state, group).map(v => v.assignmentId)),
  )
  let assignmentIdCounter = maxExistingVariantId + 1

  const studentAssignments: Array<{
    assignmentId: number
    studentUserId: number
    cidr: string
    hosts: number[]
    rows: Array<{ hosts: number; network: string; firstUsable: string; lastUsable: string; broadcast: string }>
  }> = []

  for (const student of targetStudents) {
    const generated = tryGenerateSubnetData(rowCount, ipCat)
    if (!generated) return demoResponse(config, { messageEn: "Failed to generate assignment data" }, 500)
    const rows = calculateSubnetAnswerKey(generated.cidr, generated.hosts)
    const assignmentId = assignmentIdCounter++

    studentAssignments.push({
      assignmentId,
      studentUserId: student.id,
      cidr: generated.cidr,
      hosts: generated.hosts,
      rows,
    })
  }

  const now = Date.now()
  const requestedStartDate = body?.startDate ? new Date(body.startDate).getTime() : now
  const startDate = Math.min(requestedStartDate, now)
  const deadline = body?.deadline ? body.deadline : new Date(now + 24 * 60 * 60 * 1000).toISOString()

  const assignment = {
    id,
    type: AssignmentGroupType.Subnet,
    name: (body?.name ?? "").trim(),
    description: (body?.description ?? "") || "",
    className: classObj.className,
    teacherUsername: classObj.teacherUsernames[0] ?? "teacher",
    ipCat,
    startDate: new Date(startDate).toISOString(),
    deadline: deadline,
    completedAt: null,
    expectedRows: (studentAssignments[0]?.rows ?? []).map(row => ({
      address: row.network,
      hosts: row.hosts,
      network: row.network,
      firstUsable: row.firstUsable,
      lastUsable: row.lastUsable,
      broadcast: row.broadcast,
    })),
    testWildcard: false,
    testFirstLastBr: false,
    createdByUserId: 101,
    studentAssignments,
  }

  await writeDemoState({
    ...state,
    assignments: [assignment, ...state.assignments],
  })

  return demoResponse(config, { assignmentGroupId: id })
}