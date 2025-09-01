import {
  AppBar,
  Box,
  Button,
  Divider,
  IconButton,
  Toolbar,
  Typography
} from "@mui/material"
import { Brightness4, Brightness7 } from "@mui/icons-material"
import { useContext, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import i18n, { Language, TranslationKey } from "../utils/i18n"
import { ThemeContext } from "../contexts/ThemeContext"
import { useAuth } from "../contexts/AuthContext"
import { RouteKeys, Routes } from "../router/routes"
import UserRole from "../types/UserRole"
import bg_w_cr_text from "../assets/bg_w_cr_text.svg"

interface NavItem {
  labelKey: TranslationKey
  routeKey: RouteKeys
}

interface RoleConfig {
  titleKey: string
  items: NavItem[]
}

const navbarTitle = bg_w_cr_text

const roleConfig: Record<UserRole, RoleConfig> = {
  [UserRole.ADMIN]: {
    titleKey: navbarTitle,
    items: [
      { labelKey: TranslationKey.ADMIN_NAVBAR_DASHBOARD, routeKey: RouteKeys.ADMIN_DASHBOARD },
      { labelKey: TranslationKey.ADMIN_NAVBAR_USERS, routeKey: RouteKeys.ADMIN_USERS },
      { labelKey: TranslationKey.ADMIN_NAVBAR_CLASSES, routeKey: RouteKeys.ADMIN_CLASSES },
      { labelKey: TranslationKey.ADMIN_NAVBAR_SETTINGS, routeKey: RouteKeys.ADMIN_SETTINGS }
    ]
  },
  [UserRole.TEACHER]: {
    titleKey: navbarTitle,
    items: [
      { labelKey: TranslationKey.TEACHER_NAVBAR_DASHBOARD, routeKey: RouteKeys.TEACHER_DASHBOARD },
      { labelKey: TranslationKey.TEACHER_NAVBAR_MY_CLASSES, routeKey: RouteKeys.TEACHER_MY_CLASSES },
      { labelKey: TranslationKey.TEACHER_NAVBAR_ASSIGNMENT_GROUPS, routeKey: RouteKeys.TEACHER_ASSIGNMENT_GROUPS }
    ]
  },
  [UserRole.STUDENT]: {
    titleKey: navbarTitle,
    items: [
      { labelKey: TranslationKey.STUDENT_NAVBAR_DASHBOARD, routeKey: RouteKeys.STUDENT_DASHBOARD },
      { labelKey: TranslationKey.STUDENT_NAVBAR_ASSIGNMENTS, routeKey: RouteKeys.STUDENT_ASSIGNMENTS }
    ]
  }
}

const availableLanguages: Language[] = [Language.EN, Language.SK]

interface NavbarProps {
  role: UserRole
}

const Navbar = ({ role }: NavbarProps) => {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { mode, setMode } = useContext(ThemeContext)
  const { refreshAuth, username } = useAuth()

  const cfg = roleConfig[role]

  const handleLogout = useCallback(() => {
    sessionStorage.clear()
    refreshAuth()
    navigate(Routes[RouteKeys.LOGIN], { replace: true })
  }, [refreshAuth, navigate])

  const toggleTheme = useCallback(() => {
    setMode(mode === "light" ? "dark" : "light")
  }, [mode, setMode])

  const navButtons = useMemo(
    () =>
      cfg?.items.map(item => (
        <Button
          key={item.routeKey}
            color="inherit"
          onClick={() => navigate(Routes[item.routeKey], { replace: true })}
        >
          {t(item.labelKey)}
        </Button>
      )),
    [cfg, navigate, t]
  )

  if (!cfg) return null

  return (
    <nav style={{ display: "flex", alignItems: "center" }}>
      <AppBar position="static">
        <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
            <Box
              component="img"
              src={cfg.titleKey}
              alt="IPCheckr"
              sx={{
                height: 32,
                display: "block",
                filter: "drop-shadow(0px 6px 6px rgba(0, 0, 0, 0.3))",
                cursor: "pointer"
              }}
              onClick={() => navigate(Routes[RouteKeys.LOGIN], { replace: true })}
            />
            <Divider orientation="vertical" sx={{ height: 32, borderColor: "rgba(255, 255, 255, 0.5)" }} />
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              {navButtons}
            </Box>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <IconButton onClick={toggleTheme} color="inherit" aria-label={mode === "light" ? "Switch to dark mode" : "Switch to light mode"}>
              {mode === "light" ? <Brightness4 /> : <Brightness7 />}
            </IconButton>

            {availableLanguages.map(lng => (
              <Button
                key={lng}
                color="inherit"
                disabled={i18n.language === lng}
                onClick={() => i18n.changeLanguage(lng)}
              >
                {lng.toUpperCase()}
              </Button>
            ))}

            <Button onClick={handleLogout} color="error" variant="contained">
              {t(TranslationKey.NAVBAR_LOGOUT)}
            </Button>

            <Box pl={2} textAlign="right">
              <Typography variant="caption" color="text.secondary" display="block">
                {t(TranslationKey.NAVBAR_LOGGED_IN_AS)}
              </Typography>
              <Typography variant="body2">{username}</Typography>
            </Box>
          </Box>
        </Toolbar>
      </AppBar>
    </nav>
  )
}

export default Navbar