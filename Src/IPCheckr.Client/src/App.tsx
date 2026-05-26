import { createBrowserRouter, RouterProvider, Outlet } from "react-router-dom"
import routeConfig from "./router/router"
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material"
import { ThemeContext, NestedThemeProvider } from "./contexts/ThemeContext"
import { useContext, useEffect, Suspense } from "react"
import { AuthProvider } from "./contexts/AuthContext"
import { useAuth } from "./contexts/AuthContext"
import ReactQueryProvider from "./contexts/ReactQueryProvider"
import { AppConfigProvider } from "./contexts/AppConfigContext"
import LoadingPage from "./components/LoadingPage"

const AuthInitializer = () => {
  const { refreshAuth } = useAuth()
  useEffect(() => {
    refreshAuth()
  }, [refreshAuth])
  return (
    <Suspense fallback={<LoadingPage />}>
      <Outlet />
    </Suspense>
  )
}

/**
 * Root layout rendered by the data router. Provides MUI theme and auth
 * context to every route in the tree.
 */
const RouterRoot = () => {
  const { mode } = useContext(ThemeContext)
  const theme = createTheme({ palette: { mode } })
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <AuthInitializer />
      </AuthProvider>
    </ThemeProvider>
  )
}

const router = createBrowserRouter([
  {
    element: <RouterRoot />,
    children: routeConfig,
  },
])

const RootApp = () => {
  return (
    <NestedThemeProvider>
      <ReactQueryProvider>
        <AppConfigProvider>
          <RouterProvider router={router} />
        </AppConfigProvider>
      </ReactQueryProvider>
    </NestedThemeProvider>
  )
}

export default RootApp