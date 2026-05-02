import { useNavigate } from "react-router-dom"
import AGEditAssignmentGroupFeature from "../../features/assignmentGroups/AGEditAssignmentGroupFeature"
import { RouteKeys, Routes } from "../../router/routes"

const AdminEditAssignmentGroup = () => {
  const navigate = useNavigate()
  return (
    <AGEditAssignmentGroupFeature
      onAfterSave={() => navigate(Routes[RouteKeys.ADMIN_ASSIGNMENT_GROUPS])}
    />
  )
}

export default AdminEditAssignmentGroup