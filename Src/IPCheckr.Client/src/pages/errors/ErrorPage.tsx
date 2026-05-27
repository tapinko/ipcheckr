import { Box, Button, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { TranslationKey } from "../../utils/i18n"
import { useAuth } from "../../contexts/AuthContext"
import { Routes, RouteKeys } from "../../router/routes"
import UserRole from "../../types/UserRole"

interface ErrorPageProps {
  code: 401 | 403 | 404
}

const titleKey: Record<ErrorPageProps["code"], TranslationKey> = {
  401: TranslationKey.ERROR_PAGE_401_TITLE,
  403: TranslationKey.ERROR_PAGE_403_TITLE,
  404: TranslationKey.ERROR_PAGE_404_TITLE,
}

const descriptionKey: Record<ErrorPageProps["code"], TranslationKey> = {
  401: TranslationKey.ERROR_PAGE_401_DESCRIPTION,
  403: TranslationKey.ERROR_PAGE_403_DESCRIPTION,
  404: TranslationKey.ERROR_PAGE_404_DESCRIPTION,
}

const dashboardRoute: Record<string, string> = {
  [UserRole.ADMIN]: Routes[RouteKeys.ADMIN_DASHBOARD],
  [UserRole.TEACHER]: Routes[RouteKeys.TEACHER_DASHBOARD],
  [UserRole.STUDENT]: Routes[RouteKeys.STUDENT_DASHBOARD],
}

const ErrorPage = ({ code }: ErrorPageProps) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { userRole } = useAuth()

  const dashboard = userRole ? dashboardRoute[userRole] : Routes[RouteKeys.LOGIN]

  return (
    <Box
      sx={{
        flexGrow: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        gap: 2,
        py: 8,
      }}
    >
      <Typography
        variant="h1"
        fontWeight={800}
        sx={{ fontSize: { xs: "3.5rem", sm: "5rem" }, lineHeight: 1, color: "text.disabled" }}
      >
        {code}
      </Typography>

      <Typography variant="h5" fontWeight={700}>
        {t(titleKey[code])}
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 400 }}>
        {t(descriptionKey[code])}
      </Typography>

      <Button
        variant="outlined"
        size="medium"
        onClick={() => navigate(dashboard)}
        sx={{ mt: 1 }}
      >
        {t(TranslationKey.ERROR_PAGE_BACK_TO_DASHBOARD)}
      </Button>
    </Box>
  )
}

export default ErrorPage