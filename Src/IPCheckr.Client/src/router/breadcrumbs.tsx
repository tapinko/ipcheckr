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
    path: Routes[RouteKeys.ADMIN_USERS],
    breadcrumb: () => <Typography variant="body2" component="span">
        {i18n.t(TranslationKey.BREADCRUMBS_ADMIN_USERS)}
      </Typography>
  },
  {
    path: Routes[RouteKeys.ADMIN_USER_DETAILS],
    breadcrumb: ({match}) => <Typography variant="body2" component="span">
        {i18n.t(TranslationKey.BREADCRUMBS_ADMIN_USER_DETAILS)} {match.params.USER_ID}
      </Typography>
  },
  {
    path: Routes[RouteKeys.ADMIN_CLASSES],
    breadcrumb: () => <Typography variant="body2" component="span">
        {i18n.t(TranslationKey.BREADCRUMBS_ADMIN_CLASSES)}
      </Typography>
  },
  {
    path: Routes[RouteKeys.ADMIN_CLASS_DETAILS],
    breadcrumb: ({match}) => <Typography variant="body2" component="span">
        {i18n.t(TranslationKey.BREADCRUMBS_ADMIN_CLASS_DETAILS)} {match.params.CLASS_ID}
      </Typography>
  },
  {
    path: Routes[RouteKeys.ADMIN_GNS3],
    breadcrumb: () => <Typography variant="body2" component="span">
        {i18n.t(TranslationKey.BREADCRUMBS_ADMIN_GNS3)}
      </Typography>
  },

  {
    path: Routes[RouteKeys.TEACHER_MY_CLASSES],
    breadcrumb: () => <Typography variant="body2" component="span">
        {i18n.t(TranslationKey.BREADCRUMBS_TEACHER_MY_CLASSES)}
      </Typography>
  },
  {
    path: Routes[RouteKeys.TEACHER_MY_CLASSES_STUDENT_DETAILS],
    breadcrumb: ({match}) => <Typography variant="body2" component="span">
        {i18n.t(TranslationKey.BREADCRUMBS_TEACHER_MY_CLASSES_STUDENT_DETAILS)} {match.params.STUDENT_ID}
      </Typography>
  },
  {
    path: Routes[RouteKeys.TEACHER_MY_CLASSES_CLASS_DETAILS],
    breadcrumb: ({match}) => <Typography variant="body2" component="span">
        {i18n.t(TranslationKey.BREADCRUMBS_TEACHER_MY_CLASSES_CLASS)} {match.params.CLASS_ID}
      </Typography>
  },
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
    path: Routes[RouteKeys.TEACHER_GNS3],
    breadcrumb: () => <Typography variant="body2" component="span">
        {i18n.t(TranslationKey.BREADCRUMBS_TEACHER_GNS3)}
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