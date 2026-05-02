import { useNavigate } from "react-router-dom"
import AGEditAssignmentGroupFeature from "../../features/assignmentGroups/AGEditAssignmentGroupFeature"
import { RouteKeys, Routes } from "../../router/routes"

const TeacherEditAssignmentGroup = () => {
  const navigate = useNavigate()
  return (
    <AGEditAssignmentGroupFeature
      onAfterSave={() => navigate(Routes[RouteKeys.TEACHER_ASSIGNMENT_GROUPS])}
    />
  )
}

export default TeacherEditAssignmentGroup