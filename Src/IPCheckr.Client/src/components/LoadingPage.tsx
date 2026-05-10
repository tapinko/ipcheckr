import { type JSX } from "react"
import { useLocation } from "react-router-dom"
import { Box, Container } from "@mui/material"
import NavbarSkeleton from "./NavbarSkeleton"
import LoginSkeleton from "./LoginSkeleton"
import AGListSkeleton from "./ag/AGListSkeleton"
import AGArchiveSkeleton from "./ag/AGArchiveSkeleton"
import AGTemplatesSkeleton from "./ag/AGTemplatesSkeleton"
import AGDetailsSkeleton from "./ag/AGDetailsSkeleton"
import AGFormSkeleton from "./ag/AGFormSkeleton"
import InsightGridSkeleton from "./InsightGridSkeleton"
import TableSkeleton from "./TableSkeleton"
import SubmissionSkeleton from "./SubmissionSkeleton"
import AdminUsersSkeleton from "./AdminUsersSkeleton"
import MyClassesSkeleton from "./MyClassesSkeleton"

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
  if (/\/teacher\/my-classes/.test(path)) return <MyClassesSkeleton />

  // Dashboards
  if (/\/dashboard/.test(path)) return <InsightGridSkeleton count={8} columnsMax={3} />

  // Detail pages (user/class/student/class-details)
  if (/\/(details|student-details|class-details)\//.test(path)) {
    return <InsightGridSkeleton count={6} columnsMax={3} />
  }

  // Fallback old skeleton
  return <TableSkeleton />
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