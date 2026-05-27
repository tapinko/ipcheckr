import { Box, Card, CardActions, CardContent, CardHeader, Skeleton, Stack } from "@mui/material"

const AGTemplatesSkeleton = () => (
  <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
    <Stack direction="row" spacing={1.5} alignItems="center">
      <Skeleton variant="rounded" height={56} sx={{ flex: 1, borderRadius: 1 }} />
      <Skeleton variant="rounded" width={60} height={56} sx={{ borderRadius: 1 }} />
      <Skeleton variant="rounded" width={80} height={56} sx={{ borderRadius: 1 }} />
      <Skeleton variant="rounded" width={80} height={56} sx={{ borderRadius: 1 }} />
      <Skeleton variant="circular" width={56} height={56} />
    </Stack>

    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0,1fr))", lg: "repeat(3, minmax(0,1fr))" },
        gap: 2
      }}
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} variant="outlined" sx={{ display: "flex", flexDirection: "column" }}>
          <CardHeader
            sx={{ pb: 0.5 }}
            title={<Skeleton variant="text" width="60%" height={20} />}
            action={<Skeleton variant="circular" width={28} height={28} />}
          />
          <CardContent sx={{ pt: 0.5, pb: 0.5, flexGrow: 1 }}>
            <Stack direction="row" flexWrap="wrap" gap={0.5} mb={1}>
              <Skeleton variant="rounded" width={58} height={22} sx={{ borderRadius: 16 }} />
              <Skeleton variant="rounded" width={46} height={22} sx={{ borderRadius: 16 }} />
              <Skeleton variant="rounded" width={70} height={22} sx={{ borderRadius: 16 }} />
            </Stack>
            <Skeleton variant="text" width="50%" height={14} />
          </CardContent>
          <Skeleton variant="rectangular" height={1} />
          <CardActions sx={{ px: 1.5, py: 1 }}>
            <Skeleton variant="rounded" height={36} sx={{ width: "100%", borderRadius: 1 }} />
          </CardActions>
        </Card>
      ))}
    </Box>
  </Box>
)

export default AGTemplatesSkeleton