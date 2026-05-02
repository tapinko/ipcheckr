import { useNavigate } from "react-router-dom"
import AGCreateAssignmentGroupFeature from "../../features/assignmentGroups/AGCreateAssignmentGroupFeature"
import { RouteKeys, Routes } from "../../router/routes"

const TeacherCreateAssignmentGroup = () => {
  const navigate = useNavigate()
  return (
    <AGCreateAssignmentGroupFeature
      onAfterCreate={classId => {
        const path = Routes[RouteKeys.TEACHER_ASSIGNMENT_GROUPS]
        navigate(classId ? `${path}?classId=${classId}` : path)
      }}
    />
  )
}

export default TeacherCreateAssignmentGroup