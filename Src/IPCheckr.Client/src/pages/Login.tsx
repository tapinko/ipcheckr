import { useState, type FormEvent } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { authApi } from "../utils/apiClients"
import { Box, Button, Paper, TextField, Typography } from "@mui/material"
import { RouteKeys, Routes } from "../router/routes"
import UserRole from "../types/UserRole"
import { useAuth } from "../contexts/AuthContext"
import { TranslationKey } from "../utils/i18n"

const Login = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [ username, setUsername ] = useState("")
  const [ password, setPassword ] = useState("")
  const [ error, setError ] = useState<string | null>(null)
  const [ loading, setLoading ] = useState(false)
  const { refreshAuth } = useAuth()

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    authApi.authLogin({ username, password })
      .then(res => {
        const role = res.data.role || ""
        sessionStorage.setItem("token", res.data.token || "")
        sessionStorage.setItem("role", role || "")
        refreshAuth()
        if (role === UserRole.ADMIN) navigate(Routes[RouteKeys.ADMIN_DASHBOARD], { replace: true })
        if (role === UserRole.TEACHER) navigate(Routes[RouteKeys.TEACHER_DASHBOARD], { replace: true })
        if (role === UserRole.STUDENT) navigate(Routes[RouteKeys.STUDENT_DASHBOARD], { replace: true })
        setError("Unknown role")
      })
      .catch(err => {
        setError(err.message || "Login failed")
      })
      .finally(() => {
        setLoading(false)
      })
  }

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      bgcolor="background.default"
    >
      <Paper elevation={3} sx={{ p: 4, width: "30%" }}>
        <Typography variant="h5" mb={2} align="center">
          {t(TranslationKey.LOGIN_TITLE)}
        </Typography>
        <form onSubmit={handleLogin}>
          <TextField
            label={t(TranslationKey.LOGIN_USERNAME)}
            variant="outlined"
            fullWidth
            margin="normal"
            value={username}
            onChange={e => setUsername(e.target.value)}
            autoFocus
            disabled={loading}
          />
          <TextField
            label={t(TranslationKey.LOGIN_PASSWORD)}
            type="password"
            variant="outlined"
            fullWidth
            margin="normal"
            value={password}
            onChange={e => setPassword(e.target.value)}
            disabled={loading}
          />
          {error && (
            <Typography color="error" variant="body2" mt={1}>
              {error}
            </Typography>
          )}
          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            sx={{ mt: 2 }}
            disabled={loading}
          >
            {loading ? t(TranslationKey.LOGIN_SUBMIT) : t(TranslationKey.LOGIN_SUBMIT)}
          </Button>
        </form>
      </Paper>
    </Box>
  )
}

export default Login