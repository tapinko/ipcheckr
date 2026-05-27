import { useNavigate } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { AssignmentGroupType } from "../../dtos"
import { assignmentApi } from "../../utils/apiClients"
import { useAuth } from "../../contexts/AuthContext"
import AGArchiveAssignmentGroupsFeature from "../../features/assignmentGroups/AGArchiveAssignmentGroupsFeature"
import { getParametrizedUrl, RouteKeys, RouteParams } from "../../router/routes"
import { toAssignmentTypeParam } from "../../utils/assignmentType"

const StudentArchiveAssignmentGroups = () => {
  const navigate = useNavigate()
  const { userId } = useAuth()
  const queryClient = useQueryClient()

  const subnetQuery = useQuery({
    queryKey: ["studentAssignments", "subnet", userId],
    enabled: !!userId,
    queryFn: () => assignmentApi.assignmentQuerySubnetAssignments(userId!).then(r => r.data.assignments ?? [])
  })

  const idnetQuery = useQuery({
    queryKey: ["studentAssignments", "idnet", userId],
    enabled: !!userId,
    queryFn: () => assignmentApi.assignmentQueryIdNetAssignments(userId!).then(r => r.data.assignments ?? [])
  })

  const handleNavigate = (agId: number, type: AssignmentGroupType) => {
    const list = type === AssignmentGroupType.Subnet
      ? (subnetQuery.data ?? [])
      : (idnetQuery.data ?? [])
    const assignment = list.find(a => a.assignmentGroupId === agId)
    if (!assignment) return
    navigate(getParametrizedUrl(RouteKeys.STUDENT_ARCHIVE_ASSIGNMENT_DETAILS, {
      [RouteParams.ASSIGNMENT_ID]: assignment.assignmentId.toString(),
      [RouteParams.ASSIGNMENT_GROUP_TYPE]: toAssignmentTypeParam(type)
    }))
  }

  const handleCardHover = (agId: number, type: AssignmentGroupType) => {
    const list = type === AssignmentGroupType.Subnet ? (subnetQuery.data ?? []) : (idnetQuery.data ?? [])
    const assignment = list.find(a => a.assignmentGroupId === agId)
    if (!assignment?.assignmentId) return
    const typeKey = type === AssignmentGroupType.Subnet ? "subnet" : "idnet"
    if (type === AssignmentGroupType.Subnet) {
      queryClient.prefetchQuery({
        queryKey: ["agSubmitDetails", typeKey, String(assignment.assignmentId)],
        queryFn: () => assignmentApi.assignmentQuerySubnetAssignmentSubmitDetailsFull(assignment.assignmentId).then(r => r.data),
        staleTime: 60_000
      })
    } else {
      queryClient.prefetchQuery({
        queryKey: ["agSubmitDetails", typeKey, String(assignment.assignmentId)],
        queryFn: () => assignmentApi.assignmentQueryIdNetAssignmentSubmitDetailsFull(assignment.assignmentId).then(r => r.data),
        staleTime: 60_000
      })
    }
  }

  return (
    <AGArchiveAssignmentGroupsFeature
      teacherFilter={null}
      onNavigateDetails={handleNavigate}
      onCardHover={handleCardHover}
    />
  )
}

export default StudentArchiveAssignmentGroups