import { Box, Stack } from "@mui/material"
import type { ReactNode } from "react"

interface ResponsiveStatsSectionProps {
  highlight?: ReactNode | ReactNode[]
  leftColumn?: ReactNode[]
  rightColumn?: ReactNode[]
  spacing?: number
}

const asArray = (node?: ReactNode | ReactNode[]) => {
  if (!node) return []
  return Array.isArray(node) ? node : [node]
}

const ResponsiveStatsSection = ({
  highlight, // wide - left + right
  leftColumn = [],
  rightColumn = [],
  spacing = 2
}: ResponsiveStatsSectionProps) => {
  const highlightItems = asArray(highlight)

  const columnCount = [leftColumn, rightColumn].filter(col => col.length > 0).length

  return (
    <Stack spacing={spacing}>
      {highlightItems.length > 0 && (
        <Stack spacing={spacing}>
          {highlightItems.map((item, idx) => (
            <Box key={`highlight-${idx}`}>{item}</Box>
          ))}
        </Stack>
      )}

      {columnCount > 0 && (
        <Box
          sx={{
            display: "grid",
            gap: theme => theme.spacing(spacing),
            gridTemplateColumns: {
              xs: "1fr",
              md: columnCount > 1 ? "repeat(2, minmax(0, 1fr))" : "1fr"
            }
          }}
        >
          {leftColumn.length > 0 && (
            <Stack spacing={spacing}>
              {leftColumn.map((item, idx) => (
                <Box key={`left-${idx}`}>{item}</Box>
              ))}
            </Stack>
          )}

          {rightColumn.length > 0 && (
            <Stack spacing={spacing}>
              {rightColumn.map((item, idx) => (
                <Box key={`right-${idx}`}>{item}</Box>
              ))}
            </Stack>
          )}
        </Box>
      )}
    </Stack>
  )
}
export default ResponsiveStatsSection