import {
  AppBar,
  Toolbar,
  Container,
  Box,
  Button,
  Typography,
} from "@mui/material";

import LoginRoundedIcon from "@mui/icons-material/LoginRounded";

export default function Navbar() {
  const irA = (id) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };
  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        background: "transparent",
        boxShadow: "none",
      }}
    >
      <Container maxWidth="xl">
        <Toolbar
          disableGutters
          sx={{
            height: 90,
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          {/* LOGO */}

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Box
              sx={{
                width: 46,
                height: 46,
                borderRadius: 2,
                bgcolor: "#2563eb",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: 20,
              }}
            >
              AF
            </Box>

            <Box>
              <Typography
                sx={{
                  fontWeight: 800,
                  fontSize: 20,
                  lineHeight: 1.1,
                  color: "#0f172a",
                }}
              >
                Avance Fiscal
              </Typography>

              <Typography
                sx={{
                  color: "#64748b",
                  fontSize: 13,
                }}
              >
                Sistema de Gestión
              </Typography>
            </Box>
          </Box>

          {/* MENÚ */}

          <Box
            sx={{
              color: "#334155",
              fontWeight: 600,
              textTransform: "none",
              transition: "color .25s ease",
              "&:hover": {
                color: "#2563eb",
                backgroundColor: "transparent",
              },
            }}
          >
            <Button color="inherit" onClick={() => irA("funciones")}>
              Funciones
            </Button>

            <Button color="inherit" onClick={() => irA("capturas")}>
              Capturas
            </Button>

            <Button color="inherit" onClick={() => irA("planes")}>
              Planes
            </Button>

            <Button color="inherit" onClick={() => irA("contacto")}>
              Contacto
            </Button>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
