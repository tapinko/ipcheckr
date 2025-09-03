import AdminLayout from "../layouts/AdminLayout"
import AdminDashboard from "../pages/admin/AdminDashboard"
import AdminUsers from "../pages/admin/AdminUsers"
import AdminClasses from "../pages/admin/AdminClasses"
import AdminSettings from "../pages/admin/AdminSettings"

import TeacherLayout from "../layouts/TeacherLayout"
import TeacherDashboard from "../pages/teacher/TeacherDashboard"
import TeacherMyClasses from "../pages/teacher/TeacherMyClasses"
import TeacherAssignmentGroups from "../pages/teacher/TeacherAssignmentGroups"
import TeacherAssignmentGroupDetails from "../pages/teacher/TeacherAssignmentGroupDetails"
import TeacherAssignmentGroupDetailsSubmit from "../pages/teacher/TeacherAssignmentGroupDetailsSubmit"

import StudentLayout from "../layouts/StudentLayout"
import StudentDashboard from "../pages/student/StudentDashboard"
import StudentAssignments from "../pages/student/StudentAssignments"
import StudentAssignmentSubmission from "../pages/student/StudentAssignmentSubmission"
import StudentAssignmentDetails from "../pages/student/StudentAssignmentDetails"

import Unauthorized401 from "../pages/errors/Unauthorized401"
import NotFound404 from "../pages/errors/NotFound404"
import Login from "../pages/Login"
import LoadingPage from "../components/LoadingPage"

import { useEffect, type JSX } from "react"
import { Routes, RouteKeys } from "./routes"
import { Navigate } from "react-router-dom"
import UserRole from "../types/UserRole"
import { useAuth } from "../contexts/AuthContext"

const childPath = (full: string, parent: string) =>
  full.startsWith(parent) ? full.slice(parent.length).replace(/^\//, "") : full

const routeElements: Partial<Record<RouteKeys, JSX.Element>> = {
  [RouteKeys.ADMIN]: <Navigate to={Routes[RouteKeys.ADMIN_DASHBOARD]} />,
  [RouteKeys.ADMIN_DASHBOARD]: <AdminDashboard />,
  [RouteKeys.ADMIN_USERS]: <AdminUsers />,
  [RouteKeys.ADMIN_CLASSES]: <AdminClasses />,
  [RouteKeys.ADMIN_SETTINGS]: <AdminSettings />,

  [RouteKeys.TEACHER]: <Navigate to={Routes[RouteKeys.TEACHER_DASHBOARD]} />,
  [RouteKeys.TEACHER_DASHBOARD]: <TeacherDashboard />,
  [RouteKeys.TEACHER_MY_CLASSES]: <TeacherMyClasses />,
  [RouteKeys.TEACHER_ASSIGNMENT_GROUPS]: <TeacherAssignmentGroups />,
  [RouteKeys.TEACHER_ASSIGNMENT_GROUPS_DETAILS]: <TeacherAssignmentGroupDetails />,
  [RouteKeys.TEACHER_ASSIGNMENT_GROUPS_DETAILS_SUBMIT]: <TeacherAssignmentGroupDetailsSubmit />,

  [RouteKeys.STUDENT]: <Navigate to={Routes[RouteKeys.STUDENT_DASHBOARD]} />,
  [RouteKeys.STUDENT_DASHBOARD]: <StudentDashboard />,
  [RouteKeys.STUDENT_ASSIGNMENTS]: <StudentAssignments />,
  [RouteKeys.STUDENT_ASSIGNMENT_SUBMISSION]: <StudentAssignmentSubmission />,
  [RouteKeys.STUDENT_ASSIGNMENT_DETAILS]: <StudentAssignmentDetails />,
}

const useAuthRouter = () => {
  const { isAuthenticated, userRole, loading, refreshAuth } = useAuth()

  useEffect(() => {
    refreshAuth()
  }, [refreshAuth])

  const requiresNoAuth = (Component: JSX.Element) => {
    if (loading) return <LoadingPage />
    if (isAuthenticated) {
      if (userRole === UserRole.ADMIN) return <Navigate to={Routes[RouteKeys.ADMIN_DASHBOARD]} replace />
      if (userRole === UserRole.TEACHER) return <Navigate to={Routes[RouteKeys.TEACHER_DASHBOARD]} replace />
      if (userRole === UserRole.STUDENT) return <Navigate to={Routes[RouteKeys.STUDENT_DASHBOARD]} replace />
      return <Navigate to="/" replace />
    }
    return Component
  }

  const requiresAuth = (Component: JSX.Element, allowedRoles?: UserRole[]) => {
    if (loading) return <LoadingPage />
    if (!isAuthenticated) return <Navigate to={Routes[RouteKeys.LOGIN]} replace />
    if (allowedRoles && (!userRole || !allowedRoles.includes(userRole))) return <Unauthorized401 />
    return Component
  }

  return [
    {
      path: Routes[RouteKeys.LOGIN],
      element: requiresNoAuth(<Login />),
    },
    {
      path: Routes[RouteKeys.ADMIN],
      element: requiresAuth(<AdminLayout />, [UserRole.ADMIN]),
      children: [
        ...[
          RouteKeys.ADMIN_DASHBOARD,
          RouteKeys.ADMIN_USERS,
          RouteKeys.ADMIN_CLASSES,
          RouteKeys.ADMIN_SETTINGS,
        ].map(key => ({
          path: childPath(Routes[key], Routes[RouteKeys.ADMIN]),
          element: routeElements[key]!,
        })),
        { path: "*", element: <NotFound404 /> },
      ],
    },
    {
      path: Routes[RouteKeys.TEACHER],
      element: requiresAuth(<TeacherLayout />, [UserRole.TEACHER]),
      children: [
        ...[
          RouteKeys.TEACHER_DASHBOARD,
          RouteKeys.TEACHER_MY_CLASSES,
          RouteKeys.TEACHER_ASSIGNMENT_GROUPS,
          RouteKeys.TEACHER_ASSIGNMENT_GROUPS_DETAILS,
          RouteKeys.TEACHER_ASSIGNMENT_GROUPS_DETAILS_SUBMIT,
        ].map(key => ({
          path: childPath(Routes[key], Routes[RouteKeys.TEACHER]),
          element: routeElements[key]!,
        })),
        { path: "*", element: <NotFound404 /> },
      ],
    },
    {
      path: Routes[RouteKeys.STUDENT],
      element: requiresAuth(<StudentLayout />, [UserRole.STUDENT]),
      children: [
        ...[
          RouteKeys.STUDENT_DASHBOARD,
          RouteKeys.STUDENT_ASSIGNMENTS,
          RouteKeys.STUDENT_ASSIGNMENT_SUBMISSION,
          RouteKeys.STUDENT_ASSIGNMENT_DETAILS,
        ].map(key => ({
          path: childPath(Routes[key], Routes[RouteKeys.STUDENT]),
          element: routeElements[key]!,
        })),
        { path: "*", element: <NotFound404 /> },
      ],
    },
    {
      path: "*",
      element: <NotFound404 />
    },
    {
      path: "/",
      element: <Navigate to={Routes[RouteKeys.LOGIN]} replace />
    }
  ]
}

export default useAuthRouter