import { useNavigate } from "react-router-dom"
import AGTemplatesFeature from "../../features/assignmentGroups/AGTemplatesFeature"
import { getParametrizedUrl, RouteKeys, RouteParams, Routes } from "../../router/routes"

const AdminAGTemplates = () => {
  const navigate = useNavigate()
  return (
    <AGTemplatesFeature
      teacherFilter={null}
      onNavigateCreate={() => navigate(Routes[RouteKeys.ADMIN_AG_TEMPLATE_CREATE])}
      onNavigateEdit={id =>
        navigate(getParametrizedUrl(RouteKeys.ADMIN_AG_TEMPLATE_EDIT, { [RouteParams.TEMPLATE_ID]: id.toString() }))
      }
    />
  )
}

export default AdminAGTemplates