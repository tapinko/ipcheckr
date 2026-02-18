import { Stack, TextField, Typography } from "@mui/material"
import { TranslationKey } from "../utils/i18n"
import { useTranslation } from "react-i18next"

type DetailTone = "success" | "error" | "info" | "neutral"

interface ICardSingleDetailProps {
  title: string
  submitted: string
  correct: string
  tone?: DetailTone
}

const CardSingleDetail = ({ title, submitted, correct, tone }: ICardSingleDetailProps) => {
  const { t } = useTranslation()
  const isAnswered = submitted !== ""
  const isCorrect = isAnswered && submitted === correct
  const computedTone: DetailTone = tone ?? (isCorrect ? "success" : isAnswered ? "error" : "neutral")
  const isError = computedTone === "error"
  const textFieldColorMap: Record<DetailTone, "success" | "error" | "info" | undefined> = {
    success: "success",
    error: "error",
    info: "info",
    neutral: undefined
  }
  const textFieldColor = textFieldColorMap[computedTone]

  return (
    <Stack spacing={2}>
      <Stack>
        <Typography
          variant="body2"
          sx={{ display: "flex", justifyContent: "center" }}
        >
          {title}
        </Typography>
        <Stack direction="row" spacing={2} justifyContent="space-between">
          <TextField
            fullWidth
            label={t(TranslationKey.STUDENT_ASSIGNMENT_DETAILS_SUBMITTED)}
            value={submitted}
            size="small"
            variant="filled"
            slotProps={{ input: { readOnly: true } }}
            color={textFieldColor}
            error={isError}
            focused
            sx={{ "& .MuiInputBase-root": { pointerEvents: "none" } }}
          />
          <TextField
            fullWidth
            label={t(TranslationKey.STUDENT_ASSIGNMENT_DETAILS_CORRECT)}
            value={correct}
            size="small"
            variant="filled"
            slotProps={{ input: { readOnly: true, tabIndex: -1 } }}
            sx={{ "& .MuiInputBase-root": { pointerEvents: "none" } }}
          />
        </Stack>
      </Stack>
    </Stack>
  )
}

export default CardSingleDetail