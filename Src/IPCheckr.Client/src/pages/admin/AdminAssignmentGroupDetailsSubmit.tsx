import { useNavigate } from "react-router-dom"
import AGAssignmentGroupDetailsSubmitFeature from "../../features/assignmentGroups/AGAssignmentGroupDetailsSubmitFeature"
import { getParametrizedUrl, RouteKeys, RouteParams } from "../../router/routes"

const AdminAssignmentGroupDetailsSubmit = () => {
  const navigate = useNavigate()
  return (
    <AGAssignmentGroupDetailsSubmitFeature
      onNavigateStudentDetails={studentId => navigate(getParametrizedUrl(RouteKeys.ADMIN_USER_DETAILS, {
        [RouteParams.USER_ID]: studentId.toString()
      }))}
    />
  )
}

export default AdminAssignmentGroupDetailsSubmit