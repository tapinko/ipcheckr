import { AppBar, Box, Skeleton, Toolbar } from "@mui/material"

const NavbarSkeleton = () => (
  <AppBar position="static" component="div">
    <Toolbar sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <Skeleton
          variant="rounded"
          width={130}
          height={32}
          sx={{ bgcolor: "rgba(255,255,255,0.15)", borderRadius: 1, flexShrink: 0 }}
        />
        <Box sx={{ display: { xs: "none", lg: "flex" }, gap: 1 }}>
          {[88, 76, 110, 76, 90].map((w, i) => (
            <Skeleton
              key={i}
              variant="rounded"
              width={w}
              height={32}
              sx={{ bgcolor: "rgba(255,255,255,0.15)", borderRadius: 1 }}
            />
          ))}
        </Box>
      </Box>

      <Box sx={{ display: { xs: "none", lg: "flex" }, alignItems: "center", gap: 1 }}>
        <Skeleton variant="circular" width={36} height={36} sx={{ bgcolor: "rgba(255,255,255,0.15)" }} />
        <Skeleton variant="rounded" width={32} height={26} sx={{ bgcolor: "rgba(255,255,255,0.15)", borderRadius: 1 }} />
        <Skeleton variant="rounded" width={32} height={26} sx={{ bgcolor: "rgba(255,255,255,0.15)", borderRadius: 1 }} />
        <Skeleton variant="rounded" width={84} height={36} sx={{ bgcolor: "rgba(255,255,255,0.15)", borderRadius: 1 }} />
        <Box sx={{ pl: 1 }}>
          <Skeleton variant="text" width={60} height={14} sx={{ bgcolor: "rgba(255,255,255,0.15)" }} />
          <Skeleton variant="text" width={90} height={20} sx={{ bgcolor: "rgba(255,255,255,0.15)" }} />
        </Box>
      </Box>

      <Box sx={{ display: { xs: "flex", lg: "none" }, alignItems: "center", gap: 1 }}>
        <Skeleton variant="circular" width={36} height={36} sx={{ bgcolor: "rgba(255,255,255,0.15)" }} />
        <Skeleton variant="circular" width={36} height={36} sx={{ bgcolor: "rgba(255,255,255,0.15)" }} />
      </Box>
    </Toolbar>
  </AppBar>
)

export default NavbarSkeleton