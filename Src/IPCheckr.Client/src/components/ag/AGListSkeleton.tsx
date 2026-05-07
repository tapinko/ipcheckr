import { Box, Card, CardContent, CardHeader, Skeleton, Stack } from "@mui/material"

interface AGListSkeletonProps {
  columns?: 2 | 3
}

const AGListSkeleton = ({ columns = 3 }: AGListSkeletonProps) => {
  const colTemplate =
    columns === 3
      ? { xs: "1fr", lg: "repeat(3, minmax(0, 1fr))" }
      : { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "center" }}>
        <Skeleton variant="rounded" height={56} sx={{ flex: 1, minWidth: 180, borderRadius: 1 }} />
        <Skeleton variant="rounded" width={76} height={56} sx={{ borderRadius: 1 }} />
        <Skeleton variant="rounded" width={76} height={56} sx={{ borderRadius: 1 }} />
        <Skeleton variant="rounded" width={76} height={56} sx={{ borderRadius: 1 }} />
        <Skeleton variant="circular" width={56} height={56} />
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: colTemplate, gap: 3 }}>
        {Array.from({ length: columns }).map((_, colIndex) => (
          <Box
            key={colIndex}
            sx={{
              backgroundColor: "background.paper",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1,
              p: 2,
              display: "flex",
              flexDirection: "column",
              gap: 2
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1}>
              <Skeleton variant="rounded" width={90} height={32} sx={{ borderRadius: 16 }} />
              <Skeleton variant="text" width={50} height={20} />
            </Stack>
            <Skeleton variant="rectangular" height={1} />

            <Stack spacing={2}>
              {Array.from({ length: 3 }).map((_, cardIndex) => (
                <Card key={cardIndex} variant="outlined" sx={{ borderColor: "action.disabled" }}>
                  <CardHeader
                    sx={{ py: 1.5, px: 2 }}
                    title={<Skeleton variant="text" width="65%" height={20} />}
                    subheader={
                      <Stack direction="row" gap={0.5} mt={0.5}>
                        <Skeleton variant="rounded" width={58} height={22} sx={{ borderRadius: 16 }} />
                        <Skeleton variant="rounded" width={46} height={22} sx={{ borderRadius: 16 }} />
                      </Stack>
                    }
                    action={
                      <Stack direction="row" spacing={0.5} pt={0.5}>
                        <Skeleton variant="circular" width={28} height={28} />
                        <Skeleton variant="circular" width={28} height={28} />
                      </Stack>
                    }
                  />
                  <CardContent sx={{ px: 2, pt: 0 }}>
                    <Stack spacing={0.8}>
                      <Stack direction="row" justifyContent="space-between">
                        <Skeleton variant="text" width="40%" height={16} />
                        <Skeleton variant="text" width="22%" height={16} />
                      </Stack>
                      <Skeleton variant="text" width="50%" height={16} />
                      <Skeleton variant="text" width="70%" height={22} />
                      <Skeleton variant="rounded" height={7} sx={{ borderRadius: 999 }} />
                      <Skeleton variant="text" width="80%" height={14} />
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </Box>
        ))}
      </Box>
    </Box>
  )
}

export default AGListSkeleton