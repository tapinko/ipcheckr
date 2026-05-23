import { useNavigate } from "react-router-dom"
import AGAssignmentGroupDetailsFeature from "../../features/assignmentGroups/AGAssignmentGroupDetailsFeature"
import { getParametrizedUrl, RouteKeys, RouteParams } from "../../router/routes"
import { toAssignmentTypeParam } from "../../utils/assignmentType"

const TeacherArchiveAssignmentGroupDetails = () => {
  const navigate = useNavigate()
  return (
    <AGAssignmentGroupDetailsFeature
      onNavigateSubmitDetails={(agId, assignmentId, type) => navigate(getParametrizedUrl(RouteKeys.TEACHER_ASSIGNMENT_GROUPS_ARCHIVE_DETAILS_SUBMIT, {
        [RouteParams.ASSIGNMENT_GROUP_ID]: agId,
        [RouteParams.ASSIGNMENT_ID]: assignmentId.toString(),
        [RouteParams.ASSIGNMENT_GROUP_TYPE]: toAssignmentTypeParam(type)
      }))}
      onNavigateClassDetails={classId => navigate(getParametrizedUrl(RouteKeys.TEACHER_MY_CLASSES_CLASS_DETAILS, {
        [RouteParams.CLASS_ID]: classId.toString()
      }))}
    />
  )
}

export default TeacherArchiveAssignmentGroupDetails