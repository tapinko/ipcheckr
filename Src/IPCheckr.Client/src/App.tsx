import { BrowserRouter, useRoutes } from "react-router-dom"
import useAuthRouter from "./router/router"
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material"
import { ThemeContext } from "./contexts/ThemeContext"
import { useContext } from "react"
import { NestedThemeProvider } from "./contexts/ThemeContext"
import { AuthProvider } from "./contexts/AuthContext"
import ReactQueryProvider from "./contexts/ReactQueryProvider"

const AppRoutes = () => {
  const routes = useAuthRouter()
  return useRoutes(routes)
}

const App = () => {
  const { mode } = useContext(ThemeContext)
  const theme = createTheme({ palette: { mode } })

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppRoutes />
    </ThemeProvider>
  )
}

const RootApp = () => {
  return (
    <NestedThemeProvider>
      <ReactQueryProvider>
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </ReactQueryProvider>
    </NestedThemeProvider>
  )
}

export default RootApp