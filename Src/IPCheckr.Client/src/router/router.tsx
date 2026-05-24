import AdminLayout from "../layouts/AdminLayout"
import AdminDashboard from "../pages/admin/AdminDashboard"
import AdminUsers from "../pages/admin/AdminUsers"
import AdminUserDetails from "../pages/admin/AdminUserDetails"
import AdminClasses from "../pages/admin/AdminClasses"
import AdminClassDetails from "../pages/admin/AdminClassDetails"
import AdminGns3 from "../pages/admin/AdminGns3"
import AdminGns3AllSessions from "../pages/admin/AdminGnsAllSessions"
import AdminSettings from "../pages/admin/AdminSettings"
import AdminAssignmentGroups from "../pages/admin/AdminAssignmentGroups"
import AdminCreateAssignmentGroup from "../pages/admin/AdminCreateAssignmentGroup"
import AdminEditAssignmentGroup from "../pages/admin/AdminEditAssignmentGroup"
import AdminAssignmentGroupDetails from "../pages/admin/AdminAssignmentGroupDetails"
import AdminAssignmentGroupDetailsSubmit from "../pages/admin/AdminAssignmentGroupDetailsSubmit"
import AdminArchiveAssignmentGroups from "../pages/admin/AdminArchiveAssignmentGroups"
import AdminArchiveAssignmentGroupDetails from "../pages/admin/AdminArchiveAssignmentGroupDetails"
import AdminAGTemplates from "../pages/admin/AdminAGTemplates"
import AdminCreateAGTemplate from "../pages/admin/AdminCreateAGTemplate"
import AdminEditAGTemplate from "../pages/admin/AdminEditAGTemplate"

import TeacherLayout from "../layouts/TeacherLayout"
import TeacherDashboard from "../pages/teacher/TeacherDashboard"
import TeacherMyClasses from "../pages/teacher/TeacherMyClasses"
import TeacherStudentDetails from "../pages/teacher/TeacherStudentDetails"
import TeacherClassDetails from "../pages/teacher/TeacherClassDetails"
import TeacherAssignmentGroups from "../pages/teacher/TeacherAssignmentGroups"
import TeacherCreateAssignmentGroup from "../pages/teacher/TeacherCreateAssignmentGroup"
import TeacherEditAssignmentGroup from "../pages/teacher/TeacherEditAssignmentGroup"
import TeacherAssignmentGroupDetails from "../pages/teacher/TeacherAssignmentGroupDetails"
import TeacherAssignmentGroupDetailsSubmit from "../pages/teacher/TeacherAssignmentGroupDetailsSubmit"
import TeacherArchiveAssignmentGroups from "../pages/teacher/TeacherArchiveAssignmentGroups"
import TeacherArchiveAssignmentGroupDetails from "../pages/teacher/TeacherArchiveAssignmentGroupDetails"
import TeacherAGTemplates from "../pages/teacher/TeacherAGTemplates"
import TeacherCreateAGTemplate from "../pages/teacher/TeacherCreateAGTemplate"
import TeacherEditAGTemplate from "../pages/teacher/TeacherEditAGTemplate"
import TeacherGns3 from "../pages/teacher/TeacherGns3"
import TeacherGns3AllSessions from "../pages/teacher/TeacherGns3AllSessions"

import StudentLayout from "../layouts/StudentLayout"
import StudentDashboard from "../pages/student/StudentDashboard"
import StudentAssignments from "../pages/student/StudentAssignments"
import StudentAssignmentSubmission from "../pages/student/StudentAssignmentSubmission"
import StudentAssignmentDetails from "../pages/student/StudentAssignmentDetails"
import StudentGns3 from "../pages/student/StudentGns3"
import StudentArchiveAssignmentGroups from "../pages/student/StudentArchiveAssignmentGroups"

import NotFound404 from "../pages/errors/NotFound404"
import Login from "../pages/Login"

import { Navigate } from "react-router-dom"
import type { RouteObject } from "react-router-dom"
import { Routes, RouteKeys } from "./routes"
import UserRole from "../types/UserRole"
import ProtectedRoute from "../components/ProtectedRoute"
import PublicRoute from "../components/PublicRoute"
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
        <AdminLayout />
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
        <TeacherLayout />
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
        <StudentLayout />
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
    path: "*",
    element: <NotFound404 />,
  },
  {
    path: "/",
    element: <Navigate to={Routes[RouteKeys.LOGIN]} replace />,
  },
]

export default routeConfig