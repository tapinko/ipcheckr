import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { authApi } from "../utils/apiClients"
import { Box, Button, Divider, Paper, Stack, TextField, Typography } from "@mui/material"
import { RouteKeys, Routes } from "../router/routes"
import UserRole from "../types/UserRole"
import { useAuth } from "../contexts/AuthContext"
import i18n, { Language, TranslationKey } from "../utils/i18n"
import { Controller, useForm } from "react-hook-form"
import FormRules from "../utils/FormRules"
import { useMutation } from "@tanstack/react-query"
import type { AxiosError, AxiosResponse } from "axios"
import type { ApiProblemDetails } from "../dtos"
import bg_w_cr_text from "../assets/bg_w_cr_text.svg"
import { GitHub } from "@mui/icons-material"

type LoginFormValues = {
  username: string
  password: string
}

const Login = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { refreshAuth } = useAuth()

  const {
    control,
    handleSubmit,
    formState: { errors, isValid }
  } = useForm<LoginFormValues>({
    defaultValues: { username: "", password: "" },
    mode: "onChange"
  })

  const {
    mutate: doLogin,
    isPending: loading,
    error
  } = useMutation<
    AxiosResponse<{ token?: string; role?: string }>,
    AxiosError<ApiProblemDetails>,
    LoginFormValues
  >({
    mutationFn: ({ username, password }) =>
      authApi.authLogin({ username, password }),
    onSuccess: res => {
      const role = res.data.role || ""
      sessionStorage.setItem("token", res.data.token || "")
      sessionStorage.setItem("role", role || "")
      refreshAuth()

      if (role === UserRole.ADMIN) {
        navigate(Routes[RouteKeys.ADMIN_DASHBOARD], { replace: true })
      } else if (role === UserRole.TEACHER) {
        navigate(Routes[RouteKeys.TEACHER_DASHBOARD], { replace: true })
      } else if (role === UserRole.STUDENT) {
        navigate(Routes[RouteKeys.STUDENT_DASHBOARD], { replace: true })
      } 
    }
  })

  const serverErrorMessage = (() => {
    if (!error) return null
    const details = error.response?.data
    return i18n.language === Language.EN
        ? details?.messageEn
        : details?.messageSk
  })()

  const onSubmit = (values: LoginFormValues) => {
    doLogin(values)
  }

  return (
    <>
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        bgcolor="background.default"
        gap={6}
      >
        <Stack direction="row" spacing={2} alignItems="center">
          <Box
            component="img"
            src={bg_w_cr_text}
            alt="IPCheckr"
            sx={{
              height: 56,
              display: "block",
              filter: "drop-shadow(0px 6px 6px rgba(0, 0, 0, 0.3))",
            }}
          />
          <Divider orientation="vertical" flexItem />
          <Box
            component="a"
            href="https://github.com/tapinko/ipcheckr"
            target="_blank"
            rel="noopener noreferrer"
            sx={{ display: "flex", alignItems: "center" }}
          >
            <GitHub fontSize="large" color="action" />
          </Box>
        </Stack>
        
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          width="100%"
          height="100%"
        >
          <Paper elevation={3} sx={{ p: 4, width: "30%" }}>
            <Typography variant="h5" mb={2} align="center">
              {t(TranslationKey.LOGIN_TITLE)}
            </Typography>
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <Controller
                name="username"
                control={control}
                rules={{
                  ...FormRules.required(),
                  ...FormRules.minLengthShort(),
                  ...FormRules.maxLengthShort(),
                  ...FormRules.patternLettersNumbersDots(),
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label={t(TranslationKey.LOGIN_USERNAME)}
                    variant="outlined"
                    fullWidth
                    margin="normal"
                    autoFocus
                    autoComplete="username"
                    disabled={loading}
                    error={!!errors.username}
                    helperText={
                      errors.username ? t(errors.username.message as string) : ""
                    }
                    onChange={(e) => field.onChange(e.target.value.trim())}
                  />
                )}
              />
              <Controller
                name="password"
                control={control}
                rules={{
                  ...FormRules.required(),
                  ...FormRules.minLengthLong(),
                  ...FormRules.maxLengthLong(),
                  ...FormRules.patternLettersNumbersSpecial(),
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label={t(TranslationKey.LOGIN_PASSWORD)}
                    type="password"
                    variant="outlined"
                    fullWidth
                    margin="normal"
                    autoComplete="current-password"
                    disabled={loading}
                    error={!!errors.password}
                    helperText={
                      errors.password ? t(errors.password.message as string) : ""
                    }
                  />
                )}
              />
  
              {serverErrorMessage && (
                <Typography color="error" variant="body2" mt={1}>
                  {serverErrorMessage}
                </Typography>
              )}
  
              <Button
                type="submit"
                variant="contained"
                color="primary"
                fullWidth
                sx={{ mt: 2 }}
                disabled={loading || !isValid}
              >
                {t(TranslationKey.LOGIN_SUBMIT)}
              </Button>
            </form>
          </Paper>
        </Box>
      </Box>
    </>
  )
}

export default Login