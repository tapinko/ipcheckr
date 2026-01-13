import {
  AppBar,
  Box,
  Button,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
  useMediaQuery
} from "@mui/material"
import { Brightness4, Brightness7, Menu as MenuIcon } from "@mui/icons-material"
import { useContext, useCallback, useMemo, useState, useEffect } from "react"
import type { MouseEvent } from "react"
import { useTheme } from "@mui/material/styles"
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
      { labelKey: TranslationKey.ADMIN_NAVBAR_GNS3, routeKey: RouteKeys.ADMIN_GNS3 },
      { labelKey: TranslationKey.ADMIN_NAVBAR_SETTINGS, routeKey: RouteKeys.ADMIN_SETTINGS }
    ]
  },
  [UserRole.TEACHER]: {
    titleKey: navbarTitle,
    items: [
      { labelKey: TranslationKey.TEACHER_NAVBAR_DASHBOARD, routeKey: RouteKeys.TEACHER_DASHBOARD },
      { labelKey: TranslationKey.TEACHER_NAVBAR_MY_CLASSES, routeKey: RouteKeys.TEACHER_MY_CLASSES },
      { labelKey: TranslationKey.TEACHER_NAVBAR_ASSIGNMENT_GROUPS, routeKey: RouteKeys.TEACHER_ASSIGNMENT_GROUPS },
      { labelKey: TranslationKey.TEACHER_NAVBAR_GNS3, routeKey: RouteKeys.TEACHER_GNS3 }
    ]
  },
  [UserRole.STUDENT]: {
    titleKey: navbarTitle,
    items: [
      { labelKey: TranslationKey.STUDENT_NAVBAR_DASHBOARD, routeKey: RouteKeys.STUDENT_DASHBOARD },
      { labelKey: TranslationKey.STUDENT_NAVBAR_ASSIGNMENTS, routeKey: RouteKeys.STUDENT_ASSIGNMENTS },
      { labelKey: TranslationKey.STUDENT_NAVBAR_GNS3, routeKey: RouteKeys.STUDENT_GNS3 }
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
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down("lg"))
  const [navMenuAnchor, setNavMenuAnchor] = useState<null | HTMLElement>(null)
  const [settingsMenuAnchor, setSettingsMenuAnchor] = useState<null | HTMLElement>(null)

  const cfg = roleConfig[role]

  const closeMobileMenu = useCallback(() => {
    setNavMenuAnchor(null)
  }, [])

  const openMobileMenu = useCallback((e: MouseEvent<HTMLElement>) => {
    setNavMenuAnchor(e.currentTarget)
  }, [])

  const openSettingsMenu = useCallback((e: MouseEvent<HTMLElement>) => {
    setSettingsMenuAnchor(e.currentTarget)
  }, [])

  const closeSettingsMenu = useCallback(() => {
    setSettingsMenuAnchor(null)
  }, [])

  const handleLogout = useCallback(() => {
    closeMobileMenu()
    closeSettingsMenu()
    sessionStorage.clear()
    refreshAuth()
    navigate(Routes[RouteKeys.LOGIN], { replace: true })
  }, [closeMobileMenu, closeSettingsMenu, refreshAuth, navigate])

  const toggleTheme = useCallback(() => {
    setMode(mode === "light" ? "dark" : "light")
  }, [mode, setMode])

  useEffect(() => {
    if (!isMobile) {
      closeMobileMenu()
      closeSettingsMenu()
    }
  }, [isMobile, closeMobileMenu, closeSettingsMenu])

  const handleNavigate = useCallback(
    (routeKey: RouteKeys) => {
      navigate(Routes[routeKey], { replace: true })
      closeMobileMenu()
    },
    [closeMobileMenu, navigate]
  )

  const navButtons = useMemo(
    () =>
      cfg?.items.map(item => (
        <Button
          key={item.routeKey}
            color="inherit"
          onClick={() => handleNavigate(item.routeKey)}
        >
          {t(item.labelKey)}
        </Button>
      )),
    [cfg, handleNavigate, t]
  )

  if (!cfg) return null

  return (
    <nav style={{ display: "flex", alignItems: "center" }}>
      <AppBar position="static">
        <Toolbar
          sx={{
            display: "flex",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: { xs: 1, md: 2 }
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            {isMobile ? (
              <IconButton
                color="inherit"
                onClick={openSettingsMenu}
                aria-label="Open settings menu"
              >
                <Box
                  component="img"
                  src={cfg.titleKey}
                  alt="IPCheckr"
                  sx={{
                    height: 32,
                    display: "block",
                    filter: "drop-shadow(0px 6px 6px rgba(0, 0, 0, 0.3))"
                  }}
                />
              </IconButton>
            ) : (
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
            )}
            <Divider
              orientation="vertical"
              sx={{
                height: 32,
                borderColor: "rgba(255, 255, 255, 0.5)",
                display: { xs: "none", lg: "block" }
              }}
            />
            <Box sx={{ display: { xs: "none", lg: "flex" }, alignItems: "center", gap: 1 }}>
              {navButtons}
            </Box>
          </Box>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              flexWrap: "wrap",
              justifyContent: { xs: "flex-end", sm: "flex-end" }
            }}
            >
            {isMobile && (
              <IconButton
                color="inherit"
                onClick={openMobileMenu}
                aria-label="Open navigation menu"
              >
                <MenuIcon />
              </IconButton>
            )}

            {!isMobile && (
              <>
                <IconButton onClick={toggleTheme} color="inherit" aria-label={mode === "light" ? "Switch to dark mode" : "Switch to light mode"}>
                  {mode === "light" ? <Brightness4 /> : <Brightness7 />}
                </IconButton>

                {availableLanguages.map(lng => (
                  <Button
                    key={lng}
                    color="inherit"
                    size="small"
                    disabled={i18n.language === lng}
                    onClick={() => i18n.changeLanguage(lng)}
                  >
                    {lng.toUpperCase()}
                  </Button>
                ))}

<Button onClick={handleLogout} color="error" variant="contained">
                  {t(TranslationKey.NAVBAR_LOGOUT)}
                </Button>

                <Box pl={{ xs: 0, md: 2 }} textAlign={{ xs: "left", md: "right" }}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {t(TranslationKey.NAVBAR_LOGGED_IN_AS)}
                  </Typography>
                  <Typography variant="body2">{username}</Typography>
                </Box>
              </>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      <Menu
        anchorEl={navMenuAnchor}
        open={Boolean(navMenuAnchor) && isMobile}
        onClose={closeMobileMenu}
        keepMounted
      >
        {cfg.items.map(item => (
          <MenuItem key={item.routeKey} onClick={() => handleNavigate(item.routeKey)}>
            {t(item.labelKey)}
          </MenuItem>
        ))}
      </Menu>

      <Menu
        anchorEl={settingsMenuAnchor}
        open={Boolean(settingsMenuAnchor) && isMobile}
        onClose={closeSettingsMenu}
        keepMounted
      >
        <MenuItem
          disableRipple
          onClick={event => event.stopPropagation()}
          sx={{ cursor: "default" }}
        >
          <Box display="flex" alignItems="center" justifyContent="space-between" width="100%" gap={2}>
            <Typography variant="body2">{t(TranslationKey.NAVBAR_THEME)}</Typography>
            <IconButton
              size="small"
              color="inherit"
              onClick={event => {
                event.stopPropagation()
                toggleTheme()
              }}
              aria-label={mode === "light" ? "Switch to dark mode" : "Switch to light mode"}
            >
              {mode === "light" ? <Brightness4 fontSize="small" /> : <Brightness7 fontSize="small" />}
            </IconButton>
          </Box>
        </MenuItem>

        <MenuItem
          disableRipple
          onClick={event => event.stopPropagation()}
          sx={{ cursor: "default" }}
        >
          <Box width="100%">
            <Typography variant="body2" mb={0.5}>
              {t(TranslationKey.NAVBAR_LANGUAGE)}
            </Typography>
            <Box display="flex" gap={1} flexWrap="wrap">
              {availableLanguages.map(lng => (
                <Button
                  key={lng}
                  variant={i18n.language === lng ? "contained" : "outlined"}
                  size="small"
                  onClick={event => {
                    event.stopPropagation()
                    i18n.changeLanguage(lng)
                  }}
                  disabled={i18n.language === lng}
                >
                  {lng.toUpperCase()}
                </Button>
              ))}
            </Box>
          </Box>
        </MenuItem>

        <Divider component="li" sx={{ my: 0.5 }} />

        <MenuItem
          disableRipple
          onClick={event => event.stopPropagation()}
          sx={{ cursor: "default" }}
        >
          <Box>
            <Typography variant="caption" color="text.secondary" display="block">
              {t(TranslationKey.NAVBAR_LOGGED_IN_AS)}
            </Typography>
            <Typography variant="body2">{username}</Typography>
          </Box>
        </MenuItem>

        <MenuItem onClick={handleLogout} sx={{ color: "error.main" }}>
          {t(TranslationKey.NAVBAR_LOGOUT)}
        </MenuItem>
      </Menu>
    </nav>
  )
}

export default Navbar