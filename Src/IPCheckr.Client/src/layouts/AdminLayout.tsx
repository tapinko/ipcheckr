import { Outlet } from "react-router-dom"
import Navbar from "../components/Navbar"
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
    </>
  )
}

export default AdminLayout