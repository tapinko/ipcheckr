import { useNavigate } from "react-router-dom"
import AGEditTemplateFeature from "../../features/assignmentGroups/AGEditTemplateFeature"
import { RouteKeys, Routes } from "../../router/routes"

const AdminEditAGTemplate = () => {
  const navigate = useNavigate()
  return (
    <AGEditTemplateFeature
      onAfterSave={() => navigate(Routes[RouteKeys.ADMIN_AG_TEMPLATES])}
    />
  )
}

export default AdminEditAGTemplate