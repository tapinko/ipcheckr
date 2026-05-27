import { Box, Card, CardContent, Divider, Skeleton, Stack } from "@mui/material"

const MyClassesSkeleton = () => (
  <Box display="flex" flexDirection="column" gap={3}>
    <Card variant="outlined" sx={{ borderRadius: 1 }}>
      <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
        <Stack direction={{ xs: "column", lg: "row" }} spacing={2} alignItems={{ lg: "center" }}>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" flex={1}>
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} variant="rounded" height={40} sx={{ borderRadius: 1, width: { xs: 80, sm: 100 } }} />
            ))}
          </Stack>
          <Stack direction="row" spacing={1.25}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} variant="circular" width={56} height={56} />
            ))}
          </Stack>
        </Stack>
      </CardContent>
    </Card>

    <Card variant="outlined" sx={{ borderRadius: 1 }}>
      <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
          <Skeleton variant="rounded" height={56} sx={{ flex: 1, borderRadius: 1 }} />
          <Skeleton variant="circular" width={56} height={56} sx={{ flexShrink: 0 }} />
        </Stack>
      </CardContent>

      <Divider />

      <Box>
        {Array.from({ length: 6 }).map((_, i) => (
          <Box
            key={i}
            sx={{
              display: "flex",
              alignItems: "center",
              px: 1,
              py: 0.5,
              borderBottom: i < 5 ? "1px solid" : "none",
              borderColor: "divider"
            }}
          >
            <Skeleton variant="rounded" width={24} height={24} sx={{ borderRadius: 0.5, flexShrink: 0 }} />
            <Skeleton variant="text" sx={{ flex: 1, mx: 1.5, fontSize: "1rem" }} />
            <Stack direction="row" spacing={0.5}>
              <Skeleton variant="circular" width={28} height={28} />
              <Skeleton variant="circular" width={28} height={28} />
            </Stack>
          </Box>
        ))}
      </Box>
    </Card>

  </Box>
)

export default MyClassesSkeleton