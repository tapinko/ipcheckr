import { Box, Card, CardContent, Skeleton, Stack } from "@mui/material"

const AGDetailsSkeleton = () => (
  <Stack spacing={1.75}>
    <Card variant="outlined" sx={{ borderColor: "divider", backgroundColor: "background.paper" }}>
      <CardContent>
        <Stack spacing={1}>
          <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
            <Skeleton variant="circular" width={20} height={20} />
            <Skeleton variant="text" width={200} height={32} />
            <Skeleton variant="rounded" width={70} height={24} sx={{ borderRadius: 16 }} />
          </Stack>
          <Stack direction="row" gap={0.5} flexWrap="wrap">
            <Skeleton variant="rounded" width={60} height={22} sx={{ borderRadius: 16 }} />
            <Skeleton variant="rounded" width={72} height={22} sx={{ borderRadius: 16 }} />
          </Stack>
          <Skeleton variant="text" width="55%" height={20} />
        </Stack>
      </CardContent>
    </Card>

    <Box
      sx={{
        display: "grid",
        gap: 1.25,
        gridTemplateColumns: {
          xs: "1fr",
          sm: "repeat(2, minmax(0, 1fr))",
          md: "repeat(3, minmax(0, 1fr))"
        }
      }}
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} variant="outlined" sx={{ borderColor: "divider", backgroundColor: "background.paper" }}>
          <CardContent sx={{ px: 1.5, py: 1.25 }}>
            <Stack direction="row" spacing={2} alignItems="flex-start">
              <Skeleton variant="rounded" width={44} height={44} sx={{ borderRadius: 1.5, flexShrink: 0 }} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Skeleton variant="text" width="62%" height={18} />
                <Skeleton variant="text" width="38%" height={32} />
              </Box>
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Box>

    <Skeleton variant="rectangular" height={1} sx={{ my: 1 }} />

    <Stack direction="row" spacing={1} justifyContent="flex-end">
      <Skeleton variant="rounded" width={64} height={30} sx={{ borderRadius: 1 }} />
      <Skeleton variant="rounded" width={40} height={30} sx={{ borderRadius: 1 }} />
    </Stack>

    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: "repeat(auto-fill, minmax(240px, 1fr))" },
        gap: 2
      }}
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} variant="outlined" sx={{ borderColor: "divider", backgroundColor: "background.paper" }}>
          <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <Stack spacing={0.25}>
              <Skeleton variant="text" width="55%" height={24} />
              <Skeleton variant="text" width="70%" height={16} />
            </Stack>
            <Stack spacing={0.5}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Skeleton variant="text" width={80} height={32} />
                <Skeleton variant="text" width={60} height={20} />
              </Stack>
              <Skeleton variant="rounded" height={8} sx={{ borderRadius: 999 }} />
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Box>
  </Stack>
)

export default AGDetailsSkeleton