import { Box } from "@mui/material"
import type { ReactNode } from "react"

interface InsightGridProps {
  items: ReactNode[]
  spacing?: number
  columnsMax?: 1 | 2 | 3
}

const InsightGrid = ({
  items,
  spacing = 1.25,
  columnsMax = 3
}: InsightGridProps) => {
  const columns = Math.min(3, Math.max(1, columnsMax))

  const getColumns = (breakpoint: "sm" | "md") => {
    if (breakpoint === "sm") {
      return columns >= 2 ? "repeat(2, minmax(0, 1fr))" : "1fr"
    }

    if (breakpoint === "md") {
      if (columns === 3) return "repeat(3, minmax(0, 1fr))"
      if (columns === 2) return "repeat(2, minmax(0, 1fr))"
      return "1fr"
    }

    return "1fr"
  }

  const visibleItems = items.filter(item => !!item)

  return (
    <Box
      sx={{
        display: "grid",
        gap: theme => theme.spacing(spacing),
        gridTemplateColumns: {
          xs: "1fr",
          sm: getColumns("sm"),
          md: getColumns("md")
        }
      }}
    >
      {visibleItems.map((item, index) => (
        <Box key={index}>
          {item}
        </Box>
      ))}
    </Box>
  )
}

export default InsightGrid