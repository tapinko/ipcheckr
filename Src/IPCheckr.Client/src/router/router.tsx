import { lazy } from "react"

// Eager — needed immediately
import Login from "../pages/Login"
import NotFound404 from "../pages/errors/NotFound404"
import Unauthorized401 from "../pages/errors/Unauthorized401"
import Forbidden403 from "../pages/errors/Forbidden403"
import StandaloneLayout from "../components/layout/StandaloneLayout"

// Lazy — loaded only when the matching role section is first accessed
const AdminDashboard = lazy(() => import("../pages/admin/AdminDashboard"))
const AdminUsers = lazy(() => import("../pages/admin/AdminUsers"))
const AdminUserDetails = lazy(() => import("../pages/admin/AdminUserDetails"))
const AdminClasses = lazy(() => import("../pages/admin/AdminClasses"))
const AdminClassDetails = lazy(() => import("../pages/admin/AdminClassDetails"))
const AdminGns3 = lazy(() => import("../pages/admin/AdminGns3"))
const AdminGns3AllSessions = lazy(() => import("../pages/admin/AdminGnsAllSessions"))
const AdminSettings = lazy(() => import("../pages/admin/AdminSettings"))
const AdminAssignmentGroups = lazy(() => import("../pages/admin/AdminAssignmentGroups"))
const AdminCreateAssignmentGroup = lazy(() => import("../pages/admin/AdminCreateAssignmentGroup"))
const AdminEditAssignmentGroup = lazy(() => import("../pages/admin/AdminEditAssignmentGroup"))
const AdminAssignmentGroupDetails = lazy(() => import("../pages/admin/AdminAssignmentGroupDetails"))
const AdminAssignmentGroupDetailsSubmit = lazy(() => import("../pages/admin/AdminAssignmentGroupDetailsSubmit"))
const AdminArchiveAssignmentGroups = lazy(() => import("../pages/admin/AdminArchiveAssignmentGroups"))
const AdminArchiveAssignmentGroupDetails = lazy(() => import("../pages/admin/AdminArchiveAssignmentGroupDetails"))
const AdminAGTemplates = lazy(() => import("../pages/admin/AdminAGTemplates"))
const AdminCreateAGTemplate = lazy(() => import("../pages/admin/AdminCreateAGTemplate"))
const AdminEditAGTemplate = lazy(() => import("../pages/admin/AdminEditAGTemplate"))

const TeacherDashboard = lazy(() => import("../pages/teacher/TeacherDashboard"))
const TeacherMyClasses = lazy(() => import("../pages/teacher/TeacherMyClasses"))
const TeacherStudentDetails = lazy(() => import("../pages/teacher/TeacherStudentDetails"))
const TeacherClassDetails = lazy(() => import("../pages/teacher/TeacherClassDetails"))
const TeacherAssignmentGroups = lazy(() => import("../pages/teacher/TeacherAssignmentGroups"))
const TeacherCreateAssignmentGroup = lazy(() => import("../pages/teacher/TeacherCreateAssignmentGroup"))
const TeacherEditAssignmentGroup = lazy(() => import("../pages/teacher/TeacherEditAssignmentGroup"))
const TeacherAssignmentGroupDetails = lazy(() => import("../pages/teacher/TeacherAssignmentGroupDetails"))
const TeacherAssignmentGroupDetailsSubmit = lazy(() => import("../pages/teacher/TeacherAssignmentGroupDetailsSubmit"))
const TeacherArchiveAssignmentGroups = lazy(() => import("../pages/teacher/TeacherArchiveAssignmentGroups"))
const TeacherArchiveAssignmentGroupDetails = lazy(() => import("../pages/teacher/TeacherArchiveAssignmentGroupDetails"))
const TeacherAGTemplates = lazy(() => import("../pages/teacher/TeacherAGTemplates"))
const TeacherCreateAGTemplate = lazy(() => import("../pages/teacher/TeacherCreateAGTemplate"))
const TeacherEditAGTemplate = lazy(() => import("../pages/teacher/TeacherEditAGTemplate"))
const TeacherGns3 = lazy(() => import("../pages/teacher/TeacherGns3"))
const TeacherGns3AllSessions = lazy(() => import("../pages/teacher/TeacherGns3AllSessions"))

const StudentDashboard = lazy(() => import("../pages/student/StudentDashboard"))
const StudentAssignments = lazy(() => import("../pages/student/StudentAssignments"))
const StudentAssignmentSubmission = lazy(() => import("../pages/student/StudentAssignmentSubmission"))
const StudentAssignmentDetails = lazy(() => import("../pages/student/StudentAssignmentDetails"))
const StudentGns3 = lazy(() => import("../pages/student/StudentGns3"))
const StudentArchiveAssignmentGroups = lazy(() => import("../pages/student/StudentArchiveAssignmentGroups"))

import { Navigate } from "react-router-dom"
import type { RouteObject } from "react-router-dom"
import { Routes, RouteKeys } from "./routes"
import UserRole from "../types/UserRole"
import ProtectedRoute from "../components/routing/ProtectedRoute"
import PublicRoute from "../components/routing/PublicRoute"
import type { JSX } from "react"

const childPath = (full: string, parent: string) =>
  full.startsWith(parent) ? full.slice(parent.length).replace(/^\//, "") : full

const routeElements: Partial<Record<RouteKeys, JSX.Element>> = {
  [RouteKeys.ADMIN_DASHBOARD]: <AdminDashboard />,
  [RouteKeys.ADMIN_USERS]: <AdminUsers />,
  [RouteKeys.ADMIN_USER_DETAILS]: <AdminUserDetails />,
  [RouteKeys.ADMIN_CLASSES]: <AdminClasses />,
  [RouteKeys.ADMIN_CLASS_DETAILS]: <AdminClassDetails />,
  [RouteKeys.ADMIN_GNS3]: <AdminGns3 />,
  [RouteKeys.ADMIN_GNS3_ALL_SESSIONS]: <AdminGns3AllSessions />,
  [RouteKeys.ADMIN_SETTINGS]: <AdminSettings />,
  [RouteKeys.ADMIN_ASSIGNMENT_GROUPS]: <AdminAssignmentGroups />,
  [RouteKeys.ADMIN_ASSIGNMENT_GROUPS_CREATE]: <AdminCreateAssignmentGroup />,
  [RouteKeys.ADMIN_ASSIGNMENT_GROUPS_EDIT]: <AdminEditAssignmentGroup />,
  [RouteKeys.ADMIN_ASSIGNMENT_GROUPS_DETAILS]: <AdminAssignmentGroupDetails />,
  [RouteKeys.ADMIN_ASSIGNMENT_GROUPS_DETAILS_SUBMIT]: <AdminAssignmentGroupDetailsSubmit />,
  [RouteKeys.ADMIN_ASSIGNMENT_GROUPS_ARCHIVE]: <AdminArchiveAssignmentGroups />,
  [RouteKeys.ADMIN_ASSIGNMENT_GROUPS_ARCHIVE_DETAILS]: <AdminArchiveAssignmentGroupDetails />,
  [RouteKeys.ADMIN_ASSIGNMENT_GROUPS_ARCHIVE_DETAILS_SUBMIT]: <AdminAssignmentGroupDetailsSubmit />,
  [RouteKeys.ADMIN_AG_TEMPLATES]: <AdminAGTemplates />,
  [RouteKeys.ADMIN_AG_TEMPLATE_CREATE]: <AdminCreateAGTemplate />,
  [RouteKeys.ADMIN_AG_TEMPLATE_EDIT]: <AdminEditAGTemplate />,

  [RouteKeys.TEACHER_DASHBOARD]: <TeacherDashboard />,
  [RouteKeys.TEACHER_MY_CLASSES]: <TeacherMyClasses />,
  [RouteKeys.TEACHER_MY_CLASSES_STUDENT_DETAILS]: <TeacherStudentDetails />,
  [RouteKeys.TEACHER_MY_CLASSES_CLASS_DETAILS]: <TeacherClassDetails />,
  [RouteKeys.TEACHER_ASSIGNMENT_GROUPS]: <TeacherAssignmentGroups />,
  [RouteKeys.TEACHER_ASSIGNMENT_GROUPS_CREATE]: <TeacherCreateAssignmentGroup />,
  [RouteKeys.TEACHER_ASSIGNMENT_GROUPS_EDIT]: <TeacherEditAssignmentGroup />,
  [RouteKeys.TEACHER_ASSIGNMENT_GROUPS_DETAILS]: <TeacherAssignmentGroupDetails />,
  [RouteKeys.TEACHER_ASSIGNMENT_GROUPS_DETAILS_SUBMIT]: <TeacherAssignmentGroupDetailsSubmit />,
  [RouteKeys.TEACHER_ASSIGNMENT_GROUPS_ARCHIVE]: <TeacherArchiveAssignmentGroups />,
  [RouteKeys.TEACHER_ASSIGNMENT_GROUPS_ARCHIVE_DETAILS]: <TeacherArchiveAssignmentGroupDetails />,
  [RouteKeys.TEACHER_ASSIGNMENT_GROUPS_ARCHIVE_DETAILS_SUBMIT]: <TeacherAssignmentGroupDetailsSubmit />,
  [RouteKeys.TEACHER_AG_TEMPLATES]: <TeacherAGTemplates />,
  [RouteKeys.TEACHER_AG_TEMPLATE_CREATE]: <TeacherCreateAGTemplate />,
  [RouteKeys.TEACHER_AG_TEMPLATE_EDIT]: <TeacherEditAGTemplate />,
  [RouteKeys.TEACHER_GNS3]: <TeacherGns3 />,
  [RouteKeys.TEACHER_GNS3_ALL_SESSIONS]: <TeacherGns3AllSessions />,

  [RouteKeys.STUDENT_DASHBOARD]: <StudentDashboard />,
  [RouteKeys.STUDENT_ASSIGNMENTS]: <StudentAssignments />,
  [RouteKeys.STUDENT_ASSIGNMENT_SUBMISSION]: <StudentAssignmentSubmission />,
  [RouteKeys.STUDENT_ASSIGNMENT_DETAILS]: <StudentAssignmentDetails />,
  [RouteKeys.STUDENT_GNS3]: <StudentGns3 />,
  [RouteKeys.STUDENT_ASSIGNMENTS_ARCHIVE]: <StudentArchiveAssignmentGroups />,
  [RouteKeys.STUDENT_ARCHIVE_ASSIGNMENT_DETAILS]: <StudentAssignmentDetails />,
}

const routeConfig: RouteObject[] = [
  {
    path: Routes[RouteKeys.LOGIN],
    element: (
      <PublicRoute>
        <Login />
      </PublicRoute>
    ),
  },
  {
    path: Routes[RouteKeys.ADMIN],
    element: (
      <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
        <StandaloneLayout />
      </ProtectedRoute>
    ),
    children: [
      ...[
        RouteKeys.ADMIN_DASHBOARD,
        RouteKeys.ADMIN_USERS,
        RouteKeys.ADMIN_USER_DETAILS,
        RouteKeys.ADMIN_CLASSES,
        RouteKeys.ADMIN_CLASS_DETAILS,
        RouteKeys.ADMIN_GNS3,
        RouteKeys.ADMIN_GNS3_ALL_SESSIONS,
        RouteKeys.ADMIN_SETTINGS,
        RouteKeys.ADMIN_ASSIGNMENT_GROUPS,
        RouteKeys.ADMIN_ASSIGNMENT_GROUPS_CREATE,
        RouteKeys.ADMIN_ASSIGNMENT_GROUPS_EDIT,
        RouteKeys.ADMIN_ASSIGNMENT_GROUPS_DETAILS,
        RouteKeys.ADMIN_ASSIGNMENT_GROUPS_DETAILS_SUBMIT,
        RouteKeys.ADMIN_ASSIGNMENT_GROUPS_ARCHIVE,
        RouteKeys.ADMIN_ASSIGNMENT_GROUPS_ARCHIVE_DETAILS,
        RouteKeys.ADMIN_ASSIGNMENT_GROUPS_ARCHIVE_DETAILS_SUBMIT,
        RouteKeys.ADMIN_AG_TEMPLATES,
        RouteKeys.ADMIN_AG_TEMPLATE_CREATE,
        RouteKeys.ADMIN_AG_TEMPLATE_EDIT,
      ].map(key => ({
        path: childPath(Routes[key], Routes[RouteKeys.ADMIN]),
        element: routeElements[key]!,
      })),
      { path: "*", element: <NotFound404 /> },
    ],
  },
  {
    path: Routes[RouteKeys.TEACHER],
    element: (
      <ProtectedRoute allowedRoles={[UserRole.TEACHER]}>
        <StandaloneLayout />
      </ProtectedRoute>
    ),
    children: [
      ...[
        RouteKeys.TEACHER_DASHBOARD,
        RouteKeys.TEACHER_MY_CLASSES,
        RouteKeys.TEACHER_MY_CLASSES_STUDENT_DETAILS,
        RouteKeys.TEACHER_MY_CLASSES_CLASS_DETAILS,
        RouteKeys.TEACHER_ASSIGNMENT_GROUPS,
        RouteKeys.TEACHER_ASSIGNMENT_GROUPS_CREATE,
        RouteKeys.TEACHER_ASSIGNMENT_GROUPS_EDIT,
        RouteKeys.TEACHER_ASSIGNMENT_GROUPS_DETAILS,
        RouteKeys.TEACHER_ASSIGNMENT_GROUPS_DETAILS_SUBMIT,
        RouteKeys.TEACHER_ASSIGNMENT_GROUPS_ARCHIVE,
        RouteKeys.TEACHER_ASSIGNMENT_GROUPS_ARCHIVE_DETAILS,
        RouteKeys.TEACHER_ASSIGNMENT_GROUPS_ARCHIVE_DETAILS_SUBMIT,
        RouteKeys.TEACHER_AG_TEMPLATES,
        RouteKeys.TEACHER_AG_TEMPLATE_CREATE,
        RouteKeys.TEACHER_AG_TEMPLATE_EDIT,
        RouteKeys.TEACHER_GNS3,
        RouteKeys.TEACHER_GNS3_ALL_SESSIONS,
      ].map(key => ({
        path: childPath(Routes[key], Routes[RouteKeys.TEACHER]),
        element: routeElements[key]!,
      })),
      { path: "*", element: <NotFound404 /> },
    ],
  },
  {
    path: Routes[RouteKeys.STUDENT],
    element: (
      <ProtectedRoute allowedRoles={[UserRole.STUDENT]}>
        <StandaloneLayout />
      </ProtectedRoute>
    ),
    children: [
      ...[
        RouteKeys.STUDENT_DASHBOARD,
        RouteKeys.STUDENT_ASSIGNMENTS,
        RouteKeys.STUDENT_ASSIGNMENTS_ARCHIVE,
        RouteKeys.STUDENT_ARCHIVE_ASSIGNMENT_DETAILS,
        RouteKeys.STUDENT_ASSIGNMENT_SUBMISSION,
        RouteKeys.STUDENT_ASSIGNMENT_DETAILS,
        RouteKeys.STUDENT_GNS3,
      ].map(key => ({
        path: childPath(Routes[key], Routes[RouteKeys.STUDENT]),
        element: routeElements[key]!,
      })),
      { path: "*", element: <NotFound404 /> },
    ],
  },
  {
    element: <StandaloneLayout />,
    children: [
      { path: Routes[RouteKeys.UNAUTHORIZED], element: <Unauthorized401 /> },
      { path: Routes[RouteKeys.FORBIDDEN], element: <Forbidden403 /> },
    ],
  },
  {
    path: "*",
    element: <Navigate to={Routes[RouteKeys.LOGIN]} replace />,
  },
  {
    path: "/",
    element: <Navigate to={Routes[RouteKeys.LOGIN]} replace />,
  },
]

export default routeConfig