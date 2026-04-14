import { AssignmentGroupStatus, AssignmentGroupType } from "../../../dtos"
import UserRole from "../../../types/UserRole"
import { readDemoState } from "../../db"
import { getDemoUsers } from "../../auth"
import { resolveStatus, getGroupVariants } from "./assignmentGroup.utils"
import { buildAssignmentRowsByType } from "./assignment.utils"
import { resolveUser } from "./_http"
import { isDemoMode } from "../../../config/demoMode"

export const buildStudentDashboard = async (role: string | null) => {
  const state = await readDemoState()
  const currentUser = resolveUser(role)
  const studentId = currentUser?.id ?? null

  const idnetAssignments = await buildAssignmentRowsByType(AssignmentGroupType.Idnet, studentId)
  const subnetAssignments = await buildAssignmentRowsByType(AssignmentGroupType.Subnet, studentId)
  const assignments = [...idnetAssignments, ...subnetAssignments]

  const studentSubmissions = state.submissions
    .filter(sub => (studentId ? sub.studentUserId === studentId : true))
    .sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1))

  const totalSubmits = studentSubmissions.length
  const lastSubmitAt = studentSubmissions[0]?.submittedAt ?? null

  const successRate = studentSubmissions
    .slice(0, 10)
    .reverse()
    .map((sub, index) => ({
      date: `#${index + 1}`,
      percentage: sub.score,
    }))

  const totalUpcoming = assignments.filter(item => item.status === AssignmentGroupStatus.Upcoming).length
  const totalInProgress = assignments.filter(item => item.status === AssignmentGroupStatus.InProgress).length
  const totalEnded = assignments.filter(item => item.status === AssignmentGroupStatus.Ended).length

  const uniqueClasses = Array.from(new Set(assignments.map(item => item.className).filter(Boolean)))
  const uniqueTeachers = Array.from(new Set(assignments.map(item => item.teacherUsername).filter(Boolean)))

  const lastSubmitId = studentSubmissions[0]?.assignmentId ?? null

  const versionDisplay = isDemoMode ? `v${__APP_VERSION__}-demo` : `v${__APP_VERSION__}`

  return {
    institutionName: `IPCheckr  •  ${versionDisplay}`,
    totalUpcoming,
    totalInProgress,
    totalEnded,
    totalAssignmentGroups: assignments.length,
    classes: uniqueClasses.join(", "),
    teachers: uniqueTeachers.join(", "),
    totalSubmits,
    lastSubmitAt,
    lastSubmitId,
    successRate,
  }
}

export const buildTeacherDashboard = async (barChartLength: number) => {
  const state = await readDemoState()
  const assignments = state.assignments
  const users = getDemoUsers()
  const userNameById = new Map(users.map(user => [user.id, user.username]))

  const submissions = [...state.submissions].sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1))
  const lastSubmit = submissions[0] ?? null

  const versionDisplay = isDemoMode ? `v${__APP_VERSION__}-demo` : `v${__APP_VERSION__}`

  const studentBuckets = new Map<number, { count: number; total: number }>()
  for (const submission of submissions) {
    const bucket = studentBuckets.get(submission.studentUserId) ?? { count: 0, total: 0 }
    bucket.count += 1
    bucket.total += submission.score
    studentBuckets.set(submission.studentUserId, bucket)
  }

  const averagePercentageInStudents = [...studentBuckets.entries()]
    .map(([studentId, stats]) => ({
      username: userNameById.get(studentId) ?? `student-${studentId}`,
      percentage: stats.count > 0 ? stats.total / stats.count : 0,
    }))
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, Math.max(1, barChartLength))

  const mostSuccessfulStudent = averagePercentageInStudents[0]?.username ?? null

  const classBuckets = new Map<string, { count: number; total: number }>()
  for (const group of assignments) {
    const groupAssignmentIds = getGroupVariants(state, group).map(v => v.assignmentId)
    const scored = submissions.filter(item => groupAssignmentIds.includes(item.assignmentId))
    if (!scored.length) continue
    const avg = scored.reduce((acc, item) => acc + item.score, 0) / scored.length
    const bucket = classBuckets.get(group.className) ?? { count: 0, total: 0 }
    bucket.count += 1
    bucket.total += avg
    classBuckets.set(group.className, bucket)
  }

  const averagePercentageInClasses = [...classBuckets.entries()]
    .map(([className, stats]) => ({
      className,
      percentage: stats.count > 0 ? stats.total / stats.count : 0,
    }))
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, Math.max(1, barChartLength))

  const mostSuccessfulClass = averagePercentageInClasses[0]?.className ?? null
  const totalUpcoming = assignments.filter(item => resolveStatus(item.startDate, item.deadline, item.completedAt ?? null) === AssignmentGroupStatus.Upcoming).length
  const totalInProgress = assignments.filter(item => resolveStatus(item.startDate, item.deadline, item.completedAt ?? null) === AssignmentGroupStatus.InProgress).length
  const totalEnded = assignments.filter(item => resolveStatus(item.startDate, item.deadline, item.completedAt ?? null) === AssignmentGroupStatus.Ended).length

  const allClasses = new Set(state.classes.map(c => c.className))
  const totalClasses = allClasses.size

  return {
    institutionName: `IPCheckr  •  ${versionDisplay}`,
    totalAssignmentGroups: assignments.length,
    totalUpcoming,
    totalInProgress,
    totalEnded,
    lastSubmitUsername: lastSubmit ? (userNameById.get(lastSubmit.studentUserId) ?? null) : null,
    lastSubmitGroupId: lastSubmit?.assignmentId ?? null,
    lastSubmitId: lastSubmit?.assignmentId ?? null,
    totalClasses,
    totalStudents: users.filter(user => user.role === UserRole.STUDENT).length,
    mostSuccessfulClass,
    mostSuccessfulStudent,
    totalSubmits: submissions.length,
    averagePercentageInStudents,
    averagePercentageInClasses,
  }
}