import { useEffect, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { CustomAlert, type CustomAlertState } from "../../components/ui/CustomAlert"
import AGAssignmentGroupDetailsSubmitFeature from "../../features/assignmentGroups/AGAssignmentGroupDetailsSubmitFeature"

const StudentAssignmentDetails = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [alert, setAlert] = useState<CustomAlertState | null>(
    () => (location.state as { alert?: CustomAlertState })?.alert ?? null
  )

  useEffect(() => {
    if ((location.state as { alert?: unknown })?.alert) {
      navigate(location.pathname.replace(/\/+$/, ""), { replace: true })
    }
  }, [location.state, location.pathname, navigate])

  return (
    <>
      <AGAssignmentGroupDetailsSubmitFeature refetchInterval={15000} />
      {alert && (
        <CustomAlert
          severity={alert.severity}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}
    </>
  )
}

export default StudentAssignmentDetails