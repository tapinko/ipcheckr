import { AssignmentGroupStatus } from "../../../dtos"
import UserRole from "../../../types/UserRole"
import { readDemoState, writeDemoState } from "../../db"
import { resolveStatus } from "./assignmentGroup.utils"

type DemoState = Awaited<ReturnType<typeof readDemoState>>

export const toClassDto = (item: DemoState["classes"][number]) => ({
  classId: item.classId,
  className: item.className,
  teachers: item.teachers,
  teacherUsernames: item.teacherUsernames,
})

export const getClassesFiltered = async (
  classId?: number | null,
  className?: string | null,
  teacherId?: number | null,
) => {
  const state = await readDemoState()

  return state.classes
    .filter(item => (typeof classId === "number" && classId > 0 ? item.classId === classId : true))
    .filter(item => (className ? item.className.toLowerCase().includes(className.toLowerCase()) : true))
    .filter(item => (typeof teacherId === "number" && teacherId > 0 ? item.teachers.includes(teacherId) : true))
    .map(item => toClassDto(item))
}

export const createClass = async (className: string, teachers: number[]) => {
  const state = await readDemoState()
  const classId = Math.max(0, ...state.classes.map(c => c.classId)) + 1
  const filteredTeachers = teachers.filter(Number.isFinite)
  const teacherUsernames = state.users
    .filter(user => filteredTeachers.includes(user.id))
    .map(user => user.username)

  await writeDemoState({
    ...state,
    classes: [...state.classes, { classId, className, teachers: filteredTeachers, teacherUsernames }],
  })

  return classId
}

export const editClass = async (id: number, className?: string | null, teachers?: number[] | null) => {
  const state = await readDemoState()
  const idx = state.classes.findIndex(c => c.classId === id)
  if (idx < 0) return false

  const updatedTeachers = Array.isArray(teachers) ? teachers.filter(Number.isFinite) : state.classes[idx].teachers
  const teacherUsernames = state.users.filter(user => updatedTeachers.includes(user.id)).map(user => user.username)
  
  const updated = {
    ...state.classes[idx],
    className: className?.trim() || state.classes[idx].className,
    teachers: updatedTeachers,
    teacherUsernames,
  }

  const classes = [...state.classes]
  classes[idx] = updated
  await writeDemoState({ ...state, classes })
  return true
}

export const deleteClasses = async (classIds: number[]) => {
  const state = await readDemoState()
  const ids = new Set(classIds.filter(Number.isFinite))

  await writeDemoState({
    ...state,
    classes: state.classes.filter(c => !ids.has(c.classId)),
    users: state.users.map(user => ({ ...user, classIds: user.classIds.filter(id => !ids.has(id)) })),
  })
}

export const getClassDetails = async (classId: number) => {
  const state = await readDemoState()
  const klass = state.classes.find(c => c.classId === classId)
  if (!klass) return null

  const students = state.users.filter(user => user.role === UserRole.STUDENT && user.classIds.includes(classId))
  const submissions = state.submissions.filter(sub => students.some(student => student.id === sub.studentUserId))

  const assignmentGroups = state.assignments.filter(a => a.className === klass.className)
  const avg = submissions.length ? submissions.reduce((acc, s) => acc + s.score, 0) / submissions.length : 0

  return {
    className: klass.className,
    teachers: klass.teachers
      .map(id => state.users.find(user => user.id === id))
      .filter(Boolean)
      .map(user => ({ id: user!.id, username: user!.username })),
    averageSuccessRate: avg,
    lastSubmitGroupId: submissions[0]?.assignmentId ?? null,
    lastSubmitId: submissions[0]?.assignmentId ?? null,
    lastSubmitUsername: submissions[0] ? state.users.find(user => user.id === submissions[0].studentUserId)?.username ?? null : null,
    totalSubmits: submissions.length,
    totalAssignmentGroups: assignmentGroups.length,
    totalUpcoming: assignmentGroups.filter(a => resolveStatus(a.startDate, a.deadline, a.completedAt ?? null) === AssignmentGroupStatus.Upcoming).length,
    totalInProgress: assignmentGroups.filter(a => resolveStatus(a.startDate, a.deadline, a.completedAt ?? null) === AssignmentGroupStatus.InProgress).length,
    totalEnded: assignmentGroups.filter(a => resolveStatus(a.startDate, a.deadline, a.completedAt ?? null) === AssignmentGroupStatus.Ended).length,
    students: students.map(student => ({ studentId: student.id, username: student.username })),
    averageSuccessRateInStudents: students.map(student => {
      const userSubs = submissions.filter(sub => sub.studentUserId === student.id)
      const percentage = userSubs.length ? userSubs.reduce((acc, sub) => acc + sub.score, 0) / userSubs.length : 0
      return { username: student.username, percentage }
    }),
    averageSuccessRateInAssignmentGroups: assignmentGroups.map(group => {
      const groupSubs = submissions.filter(sub => sub.assignmentId === group.id)
      const percentage = groupSubs.length ? groupSubs.reduce((acc, sub) => acc + sub.score, 0) / groupSubs.length : 0
      return { assignmentGroupName: group.name, percentage }
    }),
  }
}