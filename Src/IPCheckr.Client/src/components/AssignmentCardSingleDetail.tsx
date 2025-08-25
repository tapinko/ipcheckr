import { Stack, TextField, Typography } from "@mui/material"
import { TranslationKey } from "../utils/i18n"
import { useTranslation } from "react-i18next"

interface ICardSingleDetailProps {
    title: string
    submitted: string
    correct: string
  }
  
const CardSingleDetail = ({ title, submitted, correct }: ICardSingleDetailProps) => {
  const { t } = useTranslation()
  const isAnswered = submitted !== ""
  const isCorrect = isAnswered && submitted === correct

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
            color={isCorrect ? "success" : undefined}
            error={isAnswered && !isCorrect}
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