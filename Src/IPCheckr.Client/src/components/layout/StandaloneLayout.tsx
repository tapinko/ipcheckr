import { Outlet } from "react-router-dom"
import { Box, Container } from "@mui/material"
import { useAuth } from "../../contexts/AuthContext"
import Navbar from "./Navbar"
import Footer from "./Footer"
import CustomBreadcrumbs from "../../router/breadcrumbs"

const StandaloneLayout = () => {
  const { userRole } = useAuth()

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {userRole && <Navbar role={userRole} />}
      <CustomBreadcrumbs />
      <Container component="main" sx={{ my: 10, flexGrow: 1 }}>
        <Outlet />
      </Container>
      <Footer />
    </Box>
  )
}

export default StandaloneLayout