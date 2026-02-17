import { alpha, useTheme } from "@mui/material/styles"
import { Box, Card, CardContent, Stack, Typography } from "@mui/material"
import type { ReactElement, ReactNode } from "react"

type InsightTone = "neutral" | "info" | "success" | "warning" | "danger"

type InsightCardProps = {
  title: string
  value: ReactNode
  icon?: ReactElement
  hint?: ReactNode
  tone?: InsightTone
  action?: ReactNode
  dense?: boolean
}

const InsightCard = ({
  title,
  value,
  icon,
  hint,
  tone = "neutral",
  action,
  dense = true
}: InsightCardProps) => {
  const theme = useTheme()

  const toneColor = (() => {
    switch (tone) {
      case "info":
        return theme.palette.primary.main
      case "success":
        return theme.palette.success.main
      case "warning":
        return theme.palette.warning.main
      case "danger":
        return theme.palette.error.main
      case "neutral":
      default:
        return theme.palette.grey[500]
    }
  })()

  return (
    <Card
      variant="outlined"
      sx={{
        borderColor: alpha(toneColor, 0.35),
        backgroundColor: "background.paper",
        boxShadow: "none"
      }}
    >
      <CardContent sx={{ px: dense ? 1.5 : 2.25, py: dense ? 1.25 : 1.75 }}>
        <Stack direction="row" spacing={2} alignItems="flex-start">
          {icon ? (
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 1.5,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: alpha(toneColor, 0.15),
                color: toneColor,
                flexShrink: 0
              }}
            >
              {icon}
            </Box>
          ) : null}

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="overline"
              color="text.secondary"
              sx={{ letterSpacing: 0.5, display: "block" }}
            >
              {title}
            </Typography>
            <Typography variant="h6" fontWeight={700} sx={{ wordBreak: "break-word" }}>
              {value}
            </Typography>
            {hint ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                {hint}
              </Typography>
            ) : null}
          </Box>

          {action ? <Box sx={{ ml: 1 }}>{action}</Box> : null}
        </Stack>
      </CardContent>
    </Card>
  )
}

export default InsightCard