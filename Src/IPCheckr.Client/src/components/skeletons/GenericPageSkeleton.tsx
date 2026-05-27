import { Box, Card, CardContent, Skeleton, Stack } from "@mui/material"

const GenericPageSkeleton = () => (
  <Stack spacing={2}>
    <Card variant="outlined" sx={{ borderRadius: 1 }}>
      <CardContent>
        <Skeleton variant="text" width={200} height={28} sx={{ mb: 1 }} />
        <Skeleton variant="rounded" height={36} />
      </CardContent>
    </Card>
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
      {[3, 2].map((rows, i) => (
        <Card key={i} variant="outlined" sx={{ borderRadius: 1 }}>
          <CardContent>
            <Stack direction="row" spacing={1} alignItems="center" mb={2}>
              <Skeleton variant="circular" width={20} height={20} />
              <Skeleton variant="text" width={120} height={22} />
            </Stack>
            <Stack spacing={2}>
              {Array.from({ length: rows }).map((_, j) => (
                <Box key={j}>
                  <Skeleton variant="text" width={100} height={16} sx={{ mb: 0.75 }} />
                  <Skeleton variant="rounded" height={36} />
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Box>
  </Stack>
)

export default GenericPageSkeleton