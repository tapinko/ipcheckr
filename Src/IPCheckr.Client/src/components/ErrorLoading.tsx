import { Button, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"
import { TranslationKey } from "../utils/i18n"

interface IProps {
  onRetry?: () => void
}

const ErrorLoading = ({ onRetry }: IProps) => {
  const { t } = useTranslation()
  return (
    <>
      <Typography color="error" variant="body1" sx={{ mb: 2 }}>
        {t(TranslationKey.ERROR_MESSAGE)}
      </Typography>
      {onRetry && (
        <Button variant="outlined" onClick={onRetry}>
          {t(TranslationKey.ERROR_RETRY)}
        </Button>
      )}
    </>
  )
}

export default ErrorLoading