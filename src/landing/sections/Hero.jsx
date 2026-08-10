import {
  Box,
  Button,
  Chip,
  Container,
  Grid,
  Stack,
  Typography,
  Dialog,
  IconButton,
} from "@mui/material";

import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import LoginRoundedIcon from "@mui/icons-material/LoginRounded";
import facturacionImg from "../assets/facturacion.png";
import dashboardImg from "../assets/dashboard.png";
import clientesImg from "../assets/clientes.png";
import articulosImg from "../assets/articulos.png";
import resumenClImg from "../assets/resumenCl.png";
import reporteImg from "../assets/reporte.png";
import empreasImg from "../assets/empresas.png";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { abrirWhatsAppDemo } from "../utils/whatsapp";
import { useEffect, useState } from "react";

const beneficiosRapidos = [
  "Facturación electrónica",
  "Control de stock",
  "WhatsApp y email",
  "Acceso desde cualquier lugar",
];

export default function Hero() {
  const [pantallaActual, setPantallaActual] = useState(0);
  const [visible, setVisible] = useState(true);
  const [pausado, setPausado] = useState(false);
  const [imagenAbierta, setImagenAbierta] = useState(false);

  useEffect(() => {
    if (pantallas.length <= 1 || pausado) return;

    const intervalo = setInterval(() => {
      setVisible(false);

      const cambio = setTimeout(() => {
        setPantallaActual((actual) => (actual + 1) % pantallas.length);

        setVisible(true);
      }, 350);

      return () => clearTimeout(cambio);
    }, 5000);

    return () => clearInterval(intervalo);
  }, [pausado]);
  const pantallas = [
    {
      imagen: facturacionImg,
      nombre: "Facturación",
    },
    {
      imagen: dashboardImg,
      nombre: "Dashboard",
    },
    {
      nombre: "Clientes",
      imagen: clientesImg,
    },
    {
      nombre: "Articulos",
      imagen: articulosImg,
    },
    {
      nombre: "Resumen-Cliente",
      imagen: resumenClImg,
    },
    {
      nombre: "Reporte",
      imagen: reporteImg,
    },
    {
      nombre: "Empresas",
      imagen: empreasImg,
    },
  ];
  return (
    <Box
      component="section"
      sx={{
        display: "flex",
        alignItems: "center",
        overflow: "hidden",
        pt: { xs: 12, md: 15 },
        pb: { xs: 5, md: 7 },

        background: `
          radial-gradient(
            circle at 80% 20%,
            rgba(37, 99, 235, 0.14),
            transparent 32%
          ),
          radial-gradient(
            circle at 15% 80%,
            rgba(16, 185, 129, 0.10),
            transparent 28%
          ),
          linear-gradient(
            180deg,
            #ffffff 0%,
            #f8fafc 55%,
            #ffffff 100%
          )
        `,
      }}
    >
      <Container maxWidth="xl">
        <Grid container spacing={{ xs: 7, md: 8 }} alignItems="center">
          {/* CONTENIDO */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Stack
              spacing={3}
              alignItems={{ xs: "center", md: "flex-start" }}
              textAlign={{ xs: "center", md: "left" }}
            >
              <Chip
                label="Sistema de gestión y facturación electrónica"
                sx={{
                  px: 1,
                  fontWeight: 700,
                  color: "#1d4ed8",
                  bgcolor: "rgba(37, 99, 235, 0.10)",
                  border: "1px solid rgba(37, 99, 235, 0.16)",
                }}
              />

              <Typography
                component="h1"
                sx={{
                  maxWidth: 720,
                  fontSize: {
                    xs: "2.65rem",
                    sm: "3.5rem",
                    md: "4.25rem",
                  },
                  lineHeight: 1.05,
                  letterSpacing: "-0.045em",
                  fontWeight: 800,
                  color: "#0f172a",
                }}
              >
                Administrá tu empresa de forma{" "}
                <Box
                  component="span"
                  sx={{
                    color: "#2563eb",
                  }}
                >
                  simple e inteligente.
                </Box>
              </Typography>

              <Typography
                sx={{
                  maxWidth: 650,
                  fontSize: {
                    xs: "1.05rem",
                    md: "1.2rem",
                  },
                  lineHeight: 1.75,
                  color: "#475569",
                }}
              >
                Facturación electrónica, control de stock, clientes, proveedores
                y reportes, todo en un solo lugar.
              </Typography>

              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                sx={{
                  width: { xs: "100%", sm: "auto" },
                }}
              >
                <Button
                  variant="contained"
                  onClick={abrirWhatsAppDemo}
                  size="large"
                  endIcon={<ArrowForwardRoundedIcon />}
                  sx={{
                    minHeight: 52,
                    px: 3.5,
                    borderRadius: 3,
                    textTransform: "none",
                    fontWeight: 700,
                    fontSize: "1rem",
                    bgcolor: "#10b981",
                    boxShadow: "0 12px 30px rgba(16, 185, 129, 0.28)",
                    "&:hover": {
                      bgcolor: "#059669",
                      boxShadow: "0 15px 35px rgba(16, 185, 129, 0.34)",
                    },
                  }}
                >
                  Solicitar una demostración
                </Button>

                <Button
                  variant="outlined"
                  size="large"
                  startIcon={<LoginRoundedIcon />}
                  href="/login"
                  sx={{
                    minHeight: 52,
                    px: 3.5,
                    borderRadius: 3,
                    textTransform: "none",
                    fontWeight: 700,
                    fontSize: "1rem",
                    color: "#0f172a",
                    borderColor: "#cbd5e1",
                    bgcolor: "rgba(255, 255, 255, 0.72)",
                    "&:hover": {
                      borderColor: "#2563eb",
                      bgcolor: "#ffffff",
                    },
                  }}
                >
                  Ingresar
                </Button>
              </Stack>

              <Stack
                direction="row"
                useFlexGap
                flexWrap="wrap"
                spacing={2}
                justifyContent={{ xs: "center", md: "flex-start" }}
                sx={{ pt: 1 }}
              >
                {beneficiosRapidos.map((beneficio) => (
                  <Stack
                    key={beneficio}
                    direction="row"
                    spacing={0.8}
                    alignItems="center"
                  >
                    <CheckCircleOutlineRoundedIcon
                      sx={{
                        fontSize: 20,
                        color: "#10b981",
                      }}
                    />

                    <Typography
                      sx={{
                        fontSize: "0.92rem",
                        fontWeight: 600,
                        color: "#475569",
                      }}
                    >
                      {beneficio}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </Stack>
          </Grid>

          {/* PRESENTACIÓN DEL SISTEMA */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Box
              onMouseEnter={() => setPausado(true)}
              onMouseLeave={() => setPausado(false)}
              id="capturas"
              sx={{
                position: "relative",
                width: "100%",
                maxWidth: 760,
                mx: "auto",
                transition: "transform 250ms ease",
                "&:hover": {
                  transform: "scale(1.025)",
                },
              }}
            >
              <Box
                sx={{
                  position: "absolute",
                  inset: "14% 8% -5%",
                  borderRadius: "50%",
                  bgcolor: "rgba(37, 99, 235, 0.18)",
                  filter: "blur(65px)",
                }}
              />

              <Box
                sx={{
                  position: "relative",
                  p: { xs: 1, sm: 1.4 },
                  borderRadius: { xs: 3, md: 4 },
                  bgcolor: "#0f172a",
                  boxShadow: "0 35px 80px rgba(15, 23, 42, 0.28)",
                  transform: {
                    xs: "none",
                    md: "perspective(1200px) rotateY(-4deg) rotateX(1deg)",
                  },
                }}
              >
                <Box
                  sx={{
                    aspectRatio: "16 / 10",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    borderRadius: { xs: 2, md: 3 },
                    bgcolor: "#f8fafc",
                  }}
                >
                  <Box
                    component="img"
                    src={pantallas[pantallaActual].imagen}
                    alt={`Pantalla de ${pantallas[pantallaActual].nombre} de Avance Fiscal`}
                    onClick={() => {
                      setImagenAbierta(true);
                      setPausado(true);
                    }}
                    sx={{
                      width: "100%",
                      height: "100%",
                      display: "block",
                      objectFit: "contain",
                      objectPosition: "center",
                      bgcolor: "#ffffff",
                      p: { xs: 0.4, md: 0.7 },
                      boxSizing: "border-box",
                      opacity: visible ? 1 : 0,
                      transform: visible ? "scale(1)" : "scale(0.985)",
                      transition: "opacity 350ms ease, transform 350ms ease",
                      cursor: "zoom-in",
                    }}
                  />
                </Box>
                <Stack
                  direction="row"
                  spacing={1}
                  justifyContent="center"
                  sx={{ mt: 2, mb: 2 }}
                >
                  {pantallas.map((pantalla, index) => (
                    <Box
                      key={pantalla.nombre}
                      onClick={() => setPantallaActual(index)}
                      sx={{
                        width: pantallaActual === index ? 24 : 10,
                        height: 10,
                        borderRadius: 999,
                        cursor: "pointer",
                        bgcolor:
                          pantallaActual === index ? "#2563eb" : "#cbd5e1",
                        transition: "all .3s ease",
                        "&:hover": {
                          bgcolor:
                            pantallaActual === index ? "#2563eb" : "#94a3b8",
                        },
                      }}
                    />
                  ))}
                </Stack>
              </Box>

              <Box
                sx={{
                  position: "relative",
                  width: "78%",
                  height: 14,
                  mx: "auto",
                  borderRadius: "0 0 18px 18px",
                  bgcolor: "#cbd5e1",
                  boxShadow: "0 16px 28px rgba(15, 23, 42, 0.22)",
                }}
              />
            </Box>
          </Grid>
        </Grid>
      </Container>
      <Dialog
        open={imagenAbierta}
        onClose={() => {
          setImagenAbierta(false);
          setPausado(false);
        }}
        maxWidth="xl"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: "#0f172a",
            borderRadius: { xs: 2, md: 4 },
            overflow: "hidden",
            maxWidth: "1400px",
          },
        }}
      >
        <Box
          sx={{
            position: "relative",
            bgcolor: "#0f172a",
            p: { xs: 1, sm: 2, md: 3 },
          }}
        >
          <IconButton
            onClick={() => {
              setImagenAbierta(false);
              setPausado(false);
            }}
            sx={{
              position: "absolute",
              top: 12,
              right: 12,
              zIndex: 10,
              bgcolor: "rgba(15,23,42,0.85)",
              color: "#ffffff",

              "&:hover": {
                bgcolor: "#1e293b",
              },
            }}
          >
            <CloseRoundedIcon />
          </IconButton>

          <Box
            component="img"
            src={pantallas[pantallaActual].imagen}
            alt={`Pantalla ampliada de ${pantallas[pantallaActual].nombre}`}
            sx={{
              width: "100%",
              maxHeight: "85vh",
              display: "block",
              objectFit: "contain",
              borderRadius: { xs: 1, md: 2 },
              bgcolor: "#ffffff",
            }}
          />

          <Typography
            sx={{
              mt: 2,
              textAlign: "center",
              color: "#e2e8f0",
              fontWeight: 700,
            }}
          >
            {pantallas[pantallaActual].nombre}
          </Typography>
        </Box>
      </Dialog>
    </Box>
  );
}
