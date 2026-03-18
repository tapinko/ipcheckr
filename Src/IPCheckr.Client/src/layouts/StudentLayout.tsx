import { Outlet } from "react-router-dom"
import Navbar from "../components/Navbar"
import Footer from "../components/Footer"
import { Box, Container } from "@mui/material"
import UserRole from "../types/UserRole"
import CustomBreadcrumbs from "../router/breadcrumbs"

const StudentLayout = () => {
  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Navbar role={UserRole.STUDENT} />
      <CustomBreadcrumbs />
      <Container component="main" sx={{ my: 10, flexGrow: 1 }}>
        <Outlet />
      </Container>
      <Footer />
    </Box>
  )
}

export default StudentLayout