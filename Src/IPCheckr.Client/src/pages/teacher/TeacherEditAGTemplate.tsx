import { useNavigate } from "react-router-dom"
import AGEditTemplateFeature from "../../features/assignmentGroups/AGEditTemplateFeature"
import { RouteKeys, Routes } from "../../router/routes"

const TeacherEditAGTemplate = () => {
  const navigate = useNavigate()
  return (
    <AGEditTemplateFeature
      onAfterSave={() => navigate(Routes[RouteKeys.TEACHER_AG_TEMPLATES])}
    />
  )
}

export default TeacherEditAGTemplate