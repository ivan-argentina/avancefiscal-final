import { useState } from "react";
import logoAvanceFiscal from "../../assets/logo-avance-fiscal.png";

import {
  AppBar,
  Toolbar,
  Container,
  Box,
  Button,
  Typography,
  IconButton,
  Drawer,
  Stack,
} from "@mui/material";

import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import LoginRoundedIcon from "@mui/icons-material/LoginRounded";

export default function Navbar() {
  const [menuAbierto, setMenuAbierto] = useState(false);

  const irA = (id) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

    setMenuAbierto(false);
  };

  return (
    <>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(226,232,240,0.8)",
          boxShadow: "none",
        }}
      >
        <Container maxWidth={false}>
          <Toolbar
            disableGutters
            sx={{
              minHeight: {
                xs: 72,
                md: 90,
              },
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            {/* LOGO */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: {
                  xs: 1.2,
                  md: 2,
                },
              }}
            >
              <Box
                component="img"
                src={logoAvanceFiscal}
                alt="Avance Fiscal"
                sx={{
                  width: {
                    xs: 48,
                    md: 58,
                  },
                  height: {
                    xs: 48,
                    md: 58,
                  },
                  objectFit: "contain",
                }}
              />

              <Box>
                <Typography
                  sx={{
                    fontWeight: 800,
                    fontSize: {
                      xs: 17,
                      md: 20,
                    },
                    lineHeight: 1.1,
                    color: "#0f172a",
                  }}
                >
                  Avance Fiscal
                </Typography>

                <Typography
                  sx={{
                    display: {
                      xs: "none",
                      sm: "block",
                    },
                    color: "#64748b",
                    fontSize: 13,
                  }}
                >
                  Sistema de Gestión
                </Typography>
              </Box>
            </Box>

            {/* MENÚ DESKTOP */}
            <Box
              sx={{
                display: {
                  xs: "none",
                  md: "flex",
                },
                alignItems: "center",
                color: "#334155",
                fontWeight: 600,
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

              <Button
                variant="contained"
                startIcon={<LoginRoundedIcon />}
                href="/login"
                sx={{
                  ml: 1.5,
                  borderRadius: 3,
                  textTransform: "none",
                  bgcolor: "#10b981",
                  px: 2.5,
                  "&:hover": {
                    bgcolor: "#059669",
                  },
                }}
              >
                Ingresar
              </Button>
            </Box>

            {/* BOTÓN HAMBURGUESA MOBILE */}
            <IconButton
              onClick={() => setMenuAbierto(true)}
              sx={{
                display: {
                  xs: "flex",
                  md: "none",
                },
                color: "#0f172a",
                width: 44,
                height: 44,
              }}
            >
              <MenuRoundedIcon />
            </IconButton>
          </Toolbar>
        </Container>
      </AppBar>

      {/* MENÚ MOBILE */}
      <Drawer
        anchor="right"
        open={menuAbierto}
        onClose={() => setMenuAbierto(false)}
        PaperProps={{
          sx: {
            width: {
              xs: "82%",
              sm: 320,
            },
            maxWidth: 340,
            p: 2.5,
          },
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "flex-end",
            mb: 2,
          }}
        >
          <IconButton onClick={() => setMenuAbierto(false)}>
            <CloseRoundedIcon />
          </IconButton>
        </Box>

        <Stack spacing={1}>
          <Button
            fullWidth
            onClick={() => irA("funciones")}
            sx={{
              justifyContent: "flex-start",
              textTransform: "none",
              fontSize: 17,
              fontWeight: 700,
              color: "#0f172a",
              py: 1.4,
            }}
          >
            Funciones
          </Button>

          <Button
            fullWidth
            onClick={() => irA("capturas")}
            sx={{
              justifyContent: "flex-start",
              textTransform: "none",
              fontSize: 17,
              fontWeight: 700,
              color: "#0f172a",
              py: 1.4,
            }}
          >
            Capturas
          </Button>

          <Button
            fullWidth
            onClick={() => irA("planes")}
            sx={{
              justifyContent: "flex-start",
              textTransform: "none",
              fontSize: 17,
              fontWeight: 700,
              color: "#0f172a",
              py: 1.4,
            }}
          >
            Planes
          </Button>

          <Button
            fullWidth
            onClick={() => irA("contacto")}
            sx={{
              justifyContent: "flex-start",
              textTransform: "none",
              fontSize: 17,
              fontWeight: 700,
              color: "#0f172a",
              py: 1.4,
            }}
          >
            Contacto
          </Button>

          <Button
            fullWidth
            variant="contained"
            startIcon={<LoginRoundedIcon />}
            href="/login"
            sx={{
              mt: 2,
              py: 1.4,
              borderRadius: 3,
              textTransform: "none",
              fontWeight: 700,
              bgcolor: "#10b981",
              "&:hover": {
                bgcolor: "#059669",
              },
            }}
          >
            Ingresar
          </Button>
        </Stack>
      </Drawer>
    </>
  );
}
