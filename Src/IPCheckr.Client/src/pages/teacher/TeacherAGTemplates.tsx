import { useNavigate } from "react-router-dom"
import AGTemplatesFeature from "../../features/assignmentGroups/AGTemplatesFeature"
import { getParametrizedUrl, RouteKeys, RouteParams, Routes } from "../../router/routes"

const TeacherAGTemplates = () => {
  const navigate = useNavigate()
  return (
    <AGTemplatesFeature
      onNavigateCreate={() => navigate(Routes[RouteKeys.TEACHER_AG_TEMPLATE_CREATE])}
      onNavigateEdit={id =>
        navigate(getParametrizedUrl(RouteKeys.TEACHER_AG_TEMPLATE_EDIT, { [RouteParams.TEMPLATE_ID]: id.toString() }))
      }
    />
  )
}

export default TeacherAGTemplates