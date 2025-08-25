import { Typography } from "@mui/material"
import { useTranslation } from "react-i18next"
import { TranslationKey } from "../../utils/i18n"

const NotFound404 = () => {
  const { t } = useTranslation()

  return (
    <Typography variant="h4">
      {t(TranslationKey.PAGE_NOT_FOUND)}
    </Typography>
  )
}

export default NotFound404