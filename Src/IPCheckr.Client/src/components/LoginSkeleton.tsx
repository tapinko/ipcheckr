import { Box, Divider, Paper, Skeleton, Stack } from "@mui/material"

const LoginSkeleton = () => (
  <Box
    display="flex"
    flexDirection="column"
    justifyContent="center"
    alignItems="center"
    minHeight="100vh"
    bgcolor="background.default"
    gap={{ xs: 3, md: 6 }}
    px={{ xs: 2, sm: 4 }}
    py={{ xs: 4, md: 6 }}
  >
    <Stack direction="row" spacing={{ xs: 1.5, sm: 2 }} alignItems="center" justifyContent="center">
      <Skeleton variant="rounded" width={130} height={48} sx={{ borderRadius: 1 }} />
      <Divider orientation="vertical" flexItem sx={{ height: 40 }} />
      <Skeleton variant="circular" width={36} height={36} />
    </Stack>

    <Box display="flex" justifyContent="center" alignItems="center" width="100%">
      <Paper
        elevation={3}
        sx={{
          width: "100%",
          maxWidth: 420,
          mx: "auto",
          p: { xs: 3, sm: 4 },
          borderRadius: 3
        }}
      >
        <Stack spacing={2}>
          <Skeleton variant="text" width="50%" height={36} sx={{ mx: "auto" }} />
          <Skeleton variant="rounded" height={56} sx={{ borderRadius: 1 }} />
          <Skeleton variant="rounded" height={56} sx={{ borderRadius: 1 }} />
          <Skeleton variant="rounded" height={42} sx={{ borderRadius: 1, mt: 1 }} />
        </Stack>
      </Paper>
    </Box>
  </Box>
)

export default LoginSkeleton