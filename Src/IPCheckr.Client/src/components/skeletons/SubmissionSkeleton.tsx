import { Box, Card, CardContent, Skeleton, Stack } from "@mui/material"

const SubmissionSkeleton = () => (
  <Box sx={{ width: "100%", display: "flex", flexDirection: "column", gap: 2 }}>
    <Card variant="outlined" sx={{ borderColor: "divider", backgroundColor: "background.paper" }}>
      <CardContent>
        <Stack spacing={1}>
          <Skeleton variant="text" width="42%" height={34} />
          <Skeleton variant="text" width="72%" height={22} />
        </Stack>
      </CardContent>
    </Card>

    <Box
      sx={{
        display: "grid",
        gap: theme => theme.spacing(1.25),
        gridTemplateColumns: {
          xs: "1fr",
          sm: "repeat(2, minmax(0, 1fr))",
          md: "repeat(3, minmax(0, 1fr))"
        }
      }}
    >
      {Array.from({ length: 6 }).map((_, index) => (
        <Card
          key={index}
          variant="outlined"
          sx={{
            borderColor: "divider",
            backgroundColor: "background.paper",
            boxShadow: "none"
          }}
        >
          <CardContent sx={{ px: 1.5, py: 1.25 }}>
            <Stack direction="row" spacing={2} alignItems="flex-start">
              <Skeleton variant="rounded" width={44} height={44} sx={{ borderRadius: 1.5, flexShrink: 0 }} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Skeleton variant="text" width="62%" height={18} />
                <Skeleton variant="text" width="40%" height={32} />
              </Box>
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Box>

    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "1fr",
          md: "repeat(2, minmax(0, 1fr))"
        },
        gap: 2
      }}
    >
      {[0, 1].map(index => (
        <Card key={index} variant="outlined" sx={{ borderColor: "divider", backgroundColor: "background.paper" }}>
          <CardContent>
            <Stack spacing={1.5}>
              <Skeleton variant="text" width="48%" height={30} />
              {Array.from({ length: 5 }).map((_, rowIndex) => (
                <Skeleton key={rowIndex} variant="rounded" height={34} />
              ))}
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Box>
  </Box>
)

export default SubmissionSkeleton