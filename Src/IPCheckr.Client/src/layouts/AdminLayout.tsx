import { Outlet } from "react-router-dom"
import Navbar from "../components/Navbar"
import Footer from "../components/Footer"
import { Container } from "@mui/material"
import UserRole from "../types/UserRole"
import CustomBreadcrumbs from "../router/breadcrumbs"

const AdminLayout = () => {
  return (
    <>
      <Navbar role={UserRole.ADMIN} />
      <CustomBreadcrumbs />
      <Container sx={{ my: 10 }}>
        <Outlet />
      </Container>
      <Footer />
    </>
  )
}

export default AdminLayout