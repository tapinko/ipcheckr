import { AssignmentGroupStatus } from "../../dtos"

export const statusOrder: Record<AssignmentGroupStatus, number> = {
  [AssignmentGroupStatus.Upcoming]: 0,
  [AssignmentGroupStatus.InProgress]: 1,
  [AssignmentGroupStatus.Ended]: 2,
}

export const resolveComputedStatus = (
  startDate: string,
  deadline: string,
  successRate?: number | null
): AssignmentGroupStatus => {
  if (successRate !== null && successRate !== undefined) return AssignmentGroupStatus.Ended
  const now = Date.now()
  if (now < new Date(startDate).getTime()) return AssignmentGroupStatus.Upcoming
  if (now > new Date(deadline).getTime()) return AssignmentGroupStatus.Ended
  return AssignmentGroupStatus.InProgress
}

// Takes the more advanced between client-computed (date-based) and server-provided status.
// This ensures instant transitions without waiting for the next server refetch.
export const resolveEffectiveStatus = (
  startDate: string,
  deadline: string,
  serverStatus: AssignmentGroupStatus,
  successRate?: number | null
): AssignmentGroupStatus => {
  const client = resolveComputedStatus(startDate, deadline, successRate)
  return statusOrder[client] > statusOrder[serverStatus] ? client : serverStatus
}