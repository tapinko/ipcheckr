import { type JSX } from "react"
import { useLocation } from "react-router-dom"
import { Box, Container } from "@mui/material"
import NavbarSkeleton from "./NavbarSkeleton"
import LoginSkeleton from "../skeletons/LoginSkeleton"
import AGListSkeleton from "../../features/assignmentGroups/components/skeletons/AGListSkeleton"
import AGArchiveSkeleton from "../../features/assignmentGroups/components/skeletons/AGArchiveSkeleton"
import AGTemplatesSkeleton from "../../features/assignmentGroups/components/skeletons/AGTemplatesSkeleton"
import AGDetailsSkeleton from "../../features/assignmentGroups/components/skeletons/AGDetailsSkeleton"
import AGFormSkeleton from "../../features/assignmentGroups/components/skeletons/AGFormSkeleton"
import InsightGridSkeleton from "../skeletons/InsightGridSkeleton"
import AdminSettingsSkeleton from "../skeletons/AdminSettingsSkeleton"
import GenericPageSkeleton from "../skeletons/GenericPageSkeleton"
import SubmissionSkeleton from "../skeletons/SubmissionSkeleton"
import AdminUsersSkeleton from "../skeletons/AdminUsersSkeleton"
import AdminClassesSkeleton from "../skeletons/AdminClassesSkeleton"
import MyClassesSkeleton from "../skeletons/MyClassesSkeleton"

const resolvePageSkeleton = (path: string): JSX.Element => {
  // Templates — check before generic assignment-groups
  if (/\/templates\/.+\/edit/.test(path) || /\/templates\/create/.test(path)) return <AGFormSkeleton />
  if (/\/templates/.test(path)) return <AGTemplatesSkeleton />

  // Archive
  if (/\/archive/.test(path)) return <AGArchiveSkeleton />

  // Create / edit AG
  if (/\/create/.test(path)) return <AGFormSkeleton />
  if (/\/edit\//.test(path)) return <AGFormSkeleton />

  // AG details with nested submission assignment (e.g. /subnet/details/42/7)
  if (/\/(subnet|idnet)\/details\/\d+\/.+/.test(path)) return <SubmissionSkeleton />

  // AG details page
  if (/\/(subnet|idnet)\/details\//.test(path)) return <AGDetailsSkeleton />

  // Student assignment submission
  if (/\/(subnet|idnet)\/submit\//.test(path)) return <SubmissionSkeleton />

  // Main AG / assignments list (exact or with trailing slash)
  if (/\/assignment-groups(\/)?$/.test(path) || /\/assignments(\/)?$/.test(path)) {
    return path.includes("/student") ? <AGListSkeleton columns={2} /> : <AGListSkeleton columns={3} />
  }
  // Any deeper assignment-groups path not already matched
  if (path.includes("/assignment-groups") || path.endsWith("/assignments")) {
    return path.includes("/student") ? <AGListSkeleton columns={2} /> : <AGListSkeleton columns={3} />
  }

  // Users & classes management
  if (/\/admin\/users/.test(path)) return <AdminUsersSkeleton />
  if (/\/admin\/classes/.test(path)) return <AdminClassesSkeleton />
  if (/\/teacher\/my-classes/.test(path)) return <MyClassesSkeleton />

  // Dashboards
  if (/\/dashboard/.test(path)) return <InsightGridSkeleton count={8} columnsMax={3} />

  // Detail pages (user/class/student/class-details)
  if (/\/(details|student-details|class-details)\//.test(path)) {
    return <InsightGridSkeleton count={6} columnsMax={3} />
  }

  // Settings
  if (/\/settings/.test(path)) return <AdminSettingsSkeleton />

  return <GenericPageSkeleton />
}

const LoadingPage = () => {
  const { pathname } = useLocation()

  if (pathname === "/login" || pathname === "/") return <LoginSkeleton />

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <NavbarSkeleton />
      <Container component="main" sx={{ my: 10, flexGrow: 1 }}>
        {resolvePageSkeleton(pathname)}
      </Container>
    </Box>
  )
}

export default LoadingPage