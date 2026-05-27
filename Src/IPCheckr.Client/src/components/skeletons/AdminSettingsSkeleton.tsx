import { Box, Card, CardContent, Skeleton, Stack } from "@mui/material"

const SkeletonCard = ({ rows = 2 }: { rows?: number }) => (
  <Card variant="outlined" sx={{ borderRadius: 1 }}>
    <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
      <Stack direction="row" spacing={1} alignItems="center" mb={2}>
        <Skeleton variant="circular" width={20} height={20} />
        <Skeleton variant="text" width={120} height={22} />
      </Stack>
      <Stack spacing={2}>
        {Array.from({ length: rows }).map((_, i) => (
          <Box key={i}>
            <Skeleton variant="text" width={100} height={16} sx={{ mb: 0.75 }} />
            <Skeleton variant="rounded" height={36} />
          </Box>
        ))}
      </Stack>
    </CardContent>
  </Card>
)

const AdminSettingsSkeleton = () => (
  <Box display="flex" flexDirection="column" gap={3}>
    <Card variant="outlined" sx={{ borderRadius: 1 }}>
      <Stack direction="row" spacing={0} sx={{ px: 1, py: 0.5 }}>
        {[100, 120, 80].map((w, i) => (
          <Skeleton key={i} variant="rounded" width={w} height={36} sx={{ mx: 1, my: 0.5, borderRadius: 1 }} />
        ))}
      </Stack>
    </Card>

    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
        gap: 2,
        alignItems: "start",
      }}
    >
      <SkeletonCard rows={2} />
      <SkeletonCard rows={3} />
    </Box>
  </Box>
)

export default AdminSettingsSkeleton