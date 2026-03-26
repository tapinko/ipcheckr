import { readDemoState, writeDemoState } from "../../db"
import { AssignmentGroupStatus } from "../../../dtos"
import { resolveStatus } from "./assignmentGroup.utils"

type DemoState = Awaited<ReturnType<typeof readDemoState>>

const sortByUsername = <T extends { username: string }>(items: T[], descending: boolean) => {
  const sorted = [...items].sort((a, b) => a.username.localeCompare(b.username))
  return descending ? sorted.reverse() : sorted
}

const toUserDto = (state: DemoState, user: DemoState["users"][number]) => {
  const classNames = state.classes.filter(c => user.classIds.includes(c.classId)).map(c => c.className)
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    classIds: user.classIds,
    classNames,
  }
}

export const getUsersFiltered = async (
  username?: string | null,
  roleFilter?: string | null,
  classId?: number | null,
  className?: string | null,
  descending?: boolean,
) => {
  const state = await readDemoState()

  const users = state.users
    .filter(user => (roleFilter ? user.role === roleFilter : true))
    .filter(user => (username ? user.username.toLowerCase().includes(username.toLowerCase()) : true))
    .filter(user => (typeof classId === "number" && classId > 0 ? user.classIds.includes(classId) : true))
    .filter(user => {
      if (!className) return true
      const names = state.classes.filter(c => user.classIds.includes(c.classId)).map(c => c.className.toLowerCase())
      return names.some(name => name.includes(className.toLowerCase()))
    })

  const dtos = sortByUsername(users.map(user => toUserDto(state, user)), descending ?? false)
  return dtos
}

export const addUser = async (
  username: string,
  password: string | null,
  role: string,
  classIds: number[] | null,
) => {
  const state = await readDemoState()

  if (state.users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
    return { success: false, error: "User already exists" }
  }

  const nextId = Math.max(0, ...state.users.map(u => u.id)) + 1
  const filteredClassIds = (classIds ?? []).filter((id): id is number => Number.isFinite(id))

  const nextState = {
    ...state,
    users: [
      ...state.users,
      {
        id: nextId,
        username,
        password: password ?? "cisco",
        role: role as any,
        classIds: filteredClassIds,
      },
    ],
  }

  await writeDemoState(nextState)
  return { success: true, id: nextId }
}

export const editUser = async (
  id: number,
  username?: string | null,
  password?: string | null,
  classIds?: number[] | null,
) => {
  const state = await readDemoState()
  const idx = state.users.findIndex(u => u.id === id)
  if (idx < 0) return false

  const current = state.users[idx]
  const nextUser = {
    ...current,
    username: (username ?? current.username).trim(),
    password: password ? password : current.password,
    classIds: Array.isArray(classIds) ? classIds.filter(Number.isFinite) : current.classIds,
  }

  const users = [...state.users]
  users[idx] = nextUser
  await writeDemoState({ ...state, users })
  return true
}

export const deleteUsers = async (userIds: number[]) => {
  const state = await readDemoState()
  const ids = new Set(userIds.filter(Number.isFinite))

  const users = state.users.filter(u => !ids.has(u.id))
  await writeDemoState({ ...state, users })
}

export const getUserDetails = async (id: number) => {
  const state = await readDemoState()
  const user = state.users.find(u => u.id === id)
  if (!user) return null

  const submissions = state.submissions.filter(sub => sub.studentUserId === id)
  const rates = submissions.map(sub => ({
    date: new Date(sub.submittedAt).toLocaleDateString(),
    percentage: sub.score,
  }))
  const averageTotal = rates.length ? rates.reduce((acc, item) => acc + item.percentage, 0) / rates.length : 0

  return {
    username: user.username,
    classes: state.classes
      .filter(c => user.classIds.includes(c.classId))
      .map(c => ({ id: c.classId, name: c.className })),
    lastSubmitAt: submissions[0]?.submittedAt ?? null,
    lastSubmitGroupId: submissions[0]?.assignmentId ?? null,
    lastSubmitAssignmentId: submissions[0]?.assignmentId ?? null,
    averageNetwork: averageTotal,
    averageFirst: averageTotal,
    averageLast: averageTotal,
    averageBroadcast: averageTotal,
    averageTotal,
    successRate: rates,
    totalSubmits: submissions.length,
    totalAssignmentGroups: state.assignments.length,
    totalUpcoming: state.assignments.filter(a => resolveStatus(a.startDate, a.deadline, a.completedAt ?? null) === AssignmentGroupStatus.Upcoming).length,
    totalInProgress: state.assignments.filter(a => resolveStatus(a.startDate, a.deadline, a.completedAt ?? null) === AssignmentGroupStatus.InProgress).length,
    totalEnded: state.assignments.filter(a => resolveStatus(a.startDate, a.deadline, a.completedAt ?? null) === AssignmentGroupStatus.Ended).length,
  }
}