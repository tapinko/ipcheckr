import { Box, Container, Skeleton } from "@mui/material"
import TableSkeleton from "./TableSkeleton"
import CardsSkeleton from "./CardsSkeleton"

const LoadingPage = () => {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", flexWrap: "wrap" }}>
      <Skeleton variant="rectangular" height={80} sx={{ width: "100%" }} />
      <Container sx={{ my: 10, display: "flex", flexDirection: "column", gap: 2 }}>
        <TableSkeleton />
        <CardsSkeleton />
      </Container>
    </Box>
  )
}

export default LoadingPage