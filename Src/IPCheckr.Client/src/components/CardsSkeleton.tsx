import { Box, Skeleton } from "@mui/material"

const CardsSkeleton = () => (
  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
    {[...Array(6)].map((_, i) => (
      <Skeleton key={i} variant="rectangular" height={230} width={270} />
    ))}
  </Box>
)

export default CardsSkeleton