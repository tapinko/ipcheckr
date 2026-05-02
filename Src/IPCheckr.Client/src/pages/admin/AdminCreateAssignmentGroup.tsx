import { useNavigate } from "react-router-dom"
import AGCreateAssignmentGroupFeature from "../../features/assignmentGroups/AGCreateAssignmentGroupFeature"
import { RouteKeys, Routes } from "../../router/routes"

const AdminCreateAssignmentGroup = () => {
  const navigate = useNavigate()
  return (
    <AGCreateAssignmentGroupFeature
      teacherFilter={null}
      onAfterCreate={classId => {
        const path = Routes[RouteKeys.ADMIN_ASSIGNMENT_GROUPS]
        navigate(classId ? `${path}?classId=${classId}` : path)
      }}
    />
  )
}

export default AdminCreateAssignmentGroup