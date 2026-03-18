import { AppBar, Toolbar, Typography } from "@mui/material"

const Footer = () => {
  return (
    <AppBar component="footer" position="static" color="primary">
      <Toolbar sx={{ justifyContent: "center", minHeight: "48px !important" }}>
        <Typography variant="body2" color="inherit">
          Patrik Tapušík • v{__APP_VERSION__}
        </Typography>
      </Toolbar>
    </AppBar>
  )
}

export default Footer