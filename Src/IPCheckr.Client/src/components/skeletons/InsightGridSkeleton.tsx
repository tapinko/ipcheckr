import { Box, Card, CardContent, Skeleton, Stack } from "@mui/material"

type InsightGridSkeletonProps = {
  count?: number
  columnsMax?: 1 | 2 | 3
  spacing?: number
}

const InsightGridSkeleton = ({
  count = 8,
  columnsMax = 3,
  spacing = 1.25
}: InsightGridSkeletonProps) => {
  const columns = Math.min(3, Math.max(1, columnsMax))

  const getColumns = (breakpoint: "sm" | "md") => {
    if (breakpoint === "sm") {
      return columns >= 2 ? "repeat(2, minmax(0, 1fr))" : "1fr"
    }

    if (columns === 3) return "repeat(3, minmax(0, 1fr))"
    if (columns === 2) return "repeat(2, minmax(0, 1fr))"
    return "1fr"
  }

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
      {Array.from({ length: count }).map((_, index) => (
        <Card
          key={index}
          variant="outlined"
          sx={{
            borderColor: "divider",
            backgroundColor: "background.paper",
            boxShadow: "none"
          }}
        >
          <CardContent sx={{ px: 1.5, py: 1.25 }}>
            <Stack direction="row" spacing={2} alignItems="flex-start">
              <Skeleton variant="rounded" width={44} height={44} sx={{ borderRadius: 1.5, flexShrink: 0 }} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Skeleton variant="text" width="62%" height={18} />
                <Skeleton variant="text" width="38%" height={32} />
              </Box>
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Box>
  )
}

export default InsightGridSkeleton