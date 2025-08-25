import { Link as RouterLink, type LinkProps } from "react-router-dom"
import useBreadcrumbs, { type BreadcrumbData, type BreadcrumbsRoute } from "use-react-router-breadcrumbs"
import { RouteKeys, Routes } from "./routes"
import { TranslationKey } from "../utils/i18n"
import { Typography, Breadcrumbs, Link, Box, Paper } from "@mui/material"
import i18n from "../utils/i18n"
import ArrowRightIcon from '@mui/icons-material/ArrowRight'
import { useTranslation } from "react-i18next"

interface LinkRouterProps extends LinkProps{
  to: string
  underline?: "hover"
  color?: string
}

const LinkRouter = (props: LinkRouterProps) => {
  return <Link {...props} component={RouterLink} />
}

const routes: BreadcrumbsRoute[] = [
  {
    path: Routes[RouteKeys.TEACHER_ASSIGNMENT_GROUPS],
    breadcrumb: () => <Typography variant="body2" component="span">
        {i18n.t(TranslationKey.BREADCRUMBS_TEACHER_ASSIGNMENT_GROUPS)}
      </Typography>
  },
  {
    path: Routes[RouteKeys.TEACHER_ASSIGNMENT_GROUPS_DETAILS],
    breadcrumb: ({match}) => <Typography variant="body2" component="span">
        {i18n.t(TranslationKey.BREADCRUMBS_TEACHER_ASSIGNMENT_GROUP_DETAILS)} {match.params.ASSIGNMENT_GROUP_ID}
      </Typography>
  },
  {
    path: Routes[RouteKeys.TEACHER_ASSIGNMENT_GROUPS_DETAILS_SUBMIT],
    breadcrumb: ({match}) => <Typography variant="body2" component="span">
        {i18n.t(TranslationKey.BREADCRUMBS_TEACHER_ASSIGNMENT_GROUP_DETAILS_SUBMIT)} {match.params.ASSIGNMENT_ID}
      </Typography>
  },

  {
    path: Routes[RouteKeys.STUDENT_ASSIGNMENTS],
    breadcrumb: () => <Typography variant="body2" component="span">
        {i18n.t(TranslationKey.BREADCRUMBS_STUDENT_ASSIGNMENTS)}
      </Typography>
  },
  {
    path: Routes[RouteKeys.STUDENT_ASSIGNMENT_DETAILS],
    breadcrumb: ({match}) => <Typography variant="body2" component="span">
        {i18n.t(TranslationKey.BREADCRUMBS_STUDENT_ASSIGNMENT_DETAILS)} {match.params.ASSIGNMENT_ID}
      </Typography>
  },
  {
    path: Routes[RouteKeys.STUDENT_ASSIGNMENT_SUBMISSION],
    breadcrumb: ({match}) => <Typography variant="body2" component="span">
        {i18n.t(TranslationKey.BREADCRUMBS_STUDENT_ASSIGNMENT_SUBMISSION)} {match.params.ASSIGNMENT_ID}
      </Typography>
  },
]

const CustomBreadcrumbs = ({ breadcrumbs }: { breadcrumbs: BreadcrumbData[] }) => {
  return (
    <Breadcrumbs aria-label="breadcrumb" separator={<ArrowRightIcon fontSize="medium" />}>
      {breadcrumbs.map(({match, breadcrumb}, index) => {
        const last = index === breadcrumbs.length - 1
        return last ? (
          <Typography color="text.primary" key={match.pathname}>
            {breadcrumb}
          </Typography>
        ) : (
          <LinkRouter underline="hover" color="inherit" to={match.pathname} key={match.pathname}>
            {breadcrumb}
          </LinkRouter>
        )
      })}
    </Breadcrumbs>
  )
}

const CustomBreadcrumbsRoot = () => {
  useTranslation()
  const breadcrumbs = useBreadcrumbs(routes, { disableDefaults: true })

  return (
    <>
      {breadcrumbs.length > 0 && (
        <Box component={Paper} elevation={3} p={2}>
          <CustomBreadcrumbs breadcrumbs={breadcrumbs} />
        </Box>
      )}
    </>
  )
}

export default CustomBreadcrumbsRoot