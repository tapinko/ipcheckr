import { useNavigate } from "react-router-dom"
import AGArchiveAssignmentGroupsFeature from "../../features/assignmentGroups/AGArchiveAssignmentGroupsFeature"
import { getParametrizedUrl, RouteKeys, RouteParams } from "../../router/routes"
import { toAssignmentTypeParam } from "../../utils/assignmentType"

const AdminArchiveAssignmentGroups = () => {
  const navigate = useNavigate()
  return (
    <AGArchiveAssignmentGroupsFeature
      teacherFilter={null}
      onNavigateDetails={(id, type) => navigate(getParametrizedUrl(RouteKeys.ADMIN_ASSIGNMENT_GROUPS_ARCHIVE_DETAILS, {
        [RouteParams.ASSIGNMENT_GROUP_ID]: id.toString(),
        [RouteParams.ASSIGNMENT_GROUP_TYPE]: toAssignmentTypeParam(type)
      }))}
    />
  )
}

export default AdminArchiveAssignmentGroups