import { Box, Skeleton } from "@mui/material"

const TableSkeleton = () => (
  <Box>
    <Skeleton variant="rectangular" height={48} sx={{ mb: 1 }} />
    {[...Array(6)].map((_, i) => (
      <Skeleton key={i} variant="rectangular" height={40} sx={{ mb: 0.8 }} />
    ))}
  </Box>
)

export default TableSkeleton