import { Typography } from "@mui/material"
import { TranslationKey } from "../../utils/i18n"
import { useTranslation } from "react-i18next"

const Unauthorized401 = () => {
  const { t } = useTranslation()

  return (
    <Typography variant="h4" sx={{ display: "flex", justifyContent: "center" }}>
      {t(TranslationKey.UNAUTHORIZED)}
    </Typography>
  )
}

export default Unauthorized401