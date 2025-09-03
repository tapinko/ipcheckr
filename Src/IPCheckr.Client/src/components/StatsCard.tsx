import {
  Avatar,
  Box,
  Card,
  CardContent,
  Stack,
  Typography
} from "@mui/material"
import type { ReactElement, ReactNode } from "react"

interface IStatsCardProps {
  title: string
  value: ReactNode
  icon: ReactElement
  color?: "primary" | "secondary" | "error" | "warning" | "info" | "success" | "default"
  actions?: ReactNode
}
  
const StatsCard = ({
  title,
  value,
  icon,
  color = "primary",
  actions
}: IStatsCardProps) => {
  const getMuiPalette = (color: string) => {
    switch (color) {
      case "primary":
        return "primary.main"
      case "secondary":
        return "secondary.main"
      case "error":
        return "error.main"
      case "warning":
        return "warning.main"
      case "info":
        return "info.main"
      case "success":
        return "success.main"
      case "default":
        return "grey.500"
    }
  }

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar sx={{ bgcolor: getMuiPalette(color) }}>{icon}</Avatar>
          <Box>
            <Typography variant="overline" color="text.secondary">
              {title}
            </Typography>
            <Typography variant="h6">{value}</Typography>
          </Box>
          <Box flexGrow={1} />
          <Box>{actions}</Box>
        </Stack>
      </CardContent>
    </Card>
  )
}

export default StatsCard