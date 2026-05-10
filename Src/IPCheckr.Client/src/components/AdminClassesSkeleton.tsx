import { Box, Card, CardContent, Divider, Skeleton, Stack } from "@mui/material"

const ClassCardSkeleton = () => (
  <Card variant="outlined" sx={{ borderRadius: 1 }}>
    <Box sx={{ display: "flex", alignItems: "center", px: 0.5, py: 0.5, borderBottom: "1px solid", borderColor: "divider" }}>
      <Skeleton variant="rounded" width={24} height={24} sx={{ borderRadius: 0.5, flexShrink: 0, mx: 0.5 }} />
      <Skeleton variant="text" sx={{ flex: 1, mx: 1, fontSize: "1rem" }} />
    </Box>
    <Box sx={{ px: 2, py: 1.5 }}>
      <Skeleton variant="text" width="60%" sx={{ fontSize: "0.875rem" }} />
      <Skeleton variant="text" width="80%" sx={{ fontSize: "0.75rem", mt: 0.5 }} />
    </Box>
    <Divider />
    <Stack direction="row" justifyContent="flex-end" sx={{ px: 1, py: 0.5 }}>
      <Skeleton variant="circular" width={28} height={28} />
      <Skeleton variant="circular" width={28} height={28} sx={{ ml: 0.5 }} />
    </Stack>
  </Card>
)

const AdminClassesSkeleton = () => (
  <Box display="flex" flexDirection="column" gap={3}>
    <Card variant="outlined" sx={{ borderRadius: 1 }}>
      <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
          <Skeleton variant="rounded" height={56} sx={{ flex: 1, borderRadius: 1 }} />
          <Skeleton variant="circular" width={56} height={56} sx={{ flexShrink: 0 }} />
        </Stack>
      </CardContent>
    </Card>

    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)", lg: "repeat(4, 1fr)" },
        gap: 2,
      }}
    >
      {Array.from({ length: 8 }).map((_, i) => (
        <ClassCardSkeleton key={i} />
      ))}
    </Box>
  </Box>
)

export default AdminClassesSkeleton