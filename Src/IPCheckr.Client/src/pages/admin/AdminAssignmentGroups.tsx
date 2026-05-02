import { useNavigate } from "react-router-dom"
import AGAssignmentGroupsFeature from "../../features/assignmentGroups/AGAssignmentGroupsFeature"
import { getParametrizedUrl, RouteKeys, RouteParams, Routes } from "../../router/routes"
import { toAssignmentTypeParam } from "../../utils/assignmentType"

const AdminAssignmentGroups = () => {
  const navigate = useNavigate()
  return (
    <AGAssignmentGroupsFeature
      teacherFilter={null}
      onNavigateCreate={classId => {
        const path = Routes[RouteKeys.ADMIN_ASSIGNMENT_GROUPS_CREATE]
        navigate(classId ? `${path}?classId=${classId}` : path)
      }}
      onNavigateTemplates={() => navigate("/admin/assignment-groups/templates")}
      onNavigateDetails={(id, type) => navigate(getParametrizedUrl(RouteKeys.ADMIN_ASSIGNMENT_GROUPS_DETAILS, {
        [RouteParams.ASSIGNMENT_GROUP_ID]: id.toString(),
        [RouteParams.ASSIGNMENT_GROUP_TYPE]: toAssignmentTypeParam(type)
      }))}
      onNavigateEdit={(id, type) => navigate(getParametrizedUrl(RouteKeys.ADMIN_ASSIGNMENT_GROUPS_EDIT, {
        [RouteParams.ASSIGNMENT_GROUP_ID]: id.toString(),
        [RouteParams.ASSIGNMENT_GROUP_TYPE]: toAssignmentTypeParam(type)
      }))}
    />
  )
}

export default AdminAssignmentGroups