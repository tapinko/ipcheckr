import { useNavigate } from "react-router-dom"
import AGAssignmentGroupsFeature from "../../features/assignmentGroups/AGAssignmentGroupsFeature"
import { getParametrizedUrl, RouteKeys, RouteParams, Routes } from "../../router/routes"
import { toAssignmentTypeParam } from "../../utils/assignmentType"

const TeacherAssignmentGroups = () => {
  const navigate = useNavigate()
  return (
    <AGAssignmentGroupsFeature
      onNavigateCreate={classId => {
        const path = Routes[RouteKeys.TEACHER_ASSIGNMENT_GROUPS_CREATE]
        navigate(classId ? `${path}?classId=${classId}` : path)
      }}
      onNavigateTemplates={() => navigate(Routes[RouteKeys.TEACHER_AG_TEMPLATES])}
      onNavigateDetails={(id, type) => navigate(getParametrizedUrl(RouteKeys.TEACHER_ASSIGNMENT_GROUPS_DETAILS, {
        [RouteParams.ASSIGNMENT_GROUP_ID]: id.toString(),
        [RouteParams.ASSIGNMENT_GROUP_TYPE]: toAssignmentTypeParam(type)
      }))}
      onNavigateEdit={(id, type) => navigate(getParametrizedUrl(RouteKeys.TEACHER_ASSIGNMENT_GROUPS_EDIT, {
        [RouteParams.ASSIGNMENT_GROUP_ID]: id.toString(),
        [RouteParams.ASSIGNMENT_GROUP_TYPE]: toAssignmentTypeParam(type)
      }))}
      onNavigateArchive={() => navigate(Routes[RouteKeys.TEACHER_ASSIGNMENT_GROUPS_ARCHIVE])}
    />
  )
}

export default TeacherAssignmentGroups