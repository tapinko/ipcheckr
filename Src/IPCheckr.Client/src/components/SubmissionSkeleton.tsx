import { Box, Skeleton } from "@mui/material"

const SubmissionSkeleton = () => (
  <Box sx={{ width: "100%", display: "flex", flexDirection: "column", gap: 4 }}>
    <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "center"}}>
      <Skeleton variant="rectangular" height={100} width={200} />
    </Box>
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, flexDirection: "column" }}>
      <Box sx={{ width: "100%", display: "flex", gap: 1 }}>
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} variant="rectangular" height={230} width="50%" />
        ))}
      </Box>
      <Box sx={{ width: "100%", display: "flex", gap: 1 }}>
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} variant="rectangular" height={230} width="50%" />
        ))}
      </Box>
    </Box>
  </Box>
)

export default SubmissionSkeleton