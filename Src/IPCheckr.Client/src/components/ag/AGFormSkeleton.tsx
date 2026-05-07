import { Box, Card, CardContent, Skeleton, Stack } from "@mui/material"

const AGFormSkeleton = () => (
  <Card variant="outlined" sx={{ borderColor: "divider", backgroundColor: "background.paper" }}>
    <CardContent>
      <Stack spacing={2.5}>
        <Skeleton variant="text" width={180} height={28} />
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" }, gap: 2 }}>
          <Skeleton variant="rounded" height={56} sx={{ borderRadius: 1 }} />
          <Skeleton variant="rounded" height={56} sx={{ borderRadius: 1 }} />
        </Box>
        <Skeleton variant="rounded" height={56} sx={{ borderRadius: 1 }} />
        <Skeleton variant="rounded" height={80} sx={{ borderRadius: 1 }} />
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" }, gap: 2 }}>
          <Skeleton variant="rounded" height={56} sx={{ borderRadius: 1 }} />
          <Skeleton variant="rounded" height={56} sx={{ borderRadius: 1 }} />
        </Box>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" }, gap: 2 }}>
          <Skeleton variant="rounded" height={56} sx={{ borderRadius: 1 }} />
          <Skeleton variant="rounded" height={56} sx={{ borderRadius: 1 }} />
        </Box>
        <Stack direction="row" justifyContent="flex-end">
          <Skeleton variant="rounded" width={120} height={40} sx={{ borderRadius: 1 }} />
        </Stack>
      </Stack>
    </CardContent>
  </Card>
)

export default AGFormSkeleton