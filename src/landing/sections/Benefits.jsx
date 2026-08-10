import { Box, Button, Container, Grid, Stack, Typography } from "@mui/material";

import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import SecurityRoundedIcon from "@mui/icons-material/SecurityRounded";
import CloudDoneRoundedIcon from "@mui/icons-material/CloudDoneRounded";
import SupportAgentRoundedIcon from "@mui/icons-material/SupportAgentRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import { abrirWhatsAppDemo } from "../utils/whatsapp";

const beneficios = [
  {
    titulo: "Rápido para trabajar",
    descripcion:
      "Facturá, consultá clientes y gestioná productos sin perder tiempo entre pantallas.",
    icono: BoltRoundedIcon,
  },
  {
    titulo: "Información clara",
    descripcion:
      "Visualizá ventas, stock, saldos y alertas importantes desde un único dashboard.",
    icono: InsightsRoundedIcon,
  },
  {
    titulo: "Información protegida",
    descripcion:
      "Tus datos comerciales y fiscales se gestionan de forma segura en la nube.",
    icono: SecurityRoundedIcon,
  },
  {
    titulo: "Acceso desde cualquier lugar",
    descripcion:
      "Ingresá a Avance Fiscal desde cualquier computadora con conexión a internet.",
    icono: CloudDoneRoundedIcon,
  },
  {
    titulo: "Acompañamiento cercano",
    descripcion:
      "Te ayudamos con la puesta en marcha, configuración e incorporación de tus datos.",
    icono: SupportAgentRoundedIcon,
  },
  {
    titulo: "Preparado para crecer",
    descripcion:
      "Administrá una o varias empresas sin tener que cambiar de plataforma.",
    icono: TrendingUpRoundedIcon,
  },
];

export default function Benefits() {
  return (
    <Box
      component="section"
      id="beneficios"
      sx={{
        position: "relative",
        overflow: "hidden",
        py: { xs: 9, md: 14 },
        background: `
          radial-gradient(
            circle at 15% 20%,
            rgba(96, 165, 250, 0.30),
            transparent 30%
          ),
          radial-gradient(
            circle at 90% 80%,
            rgba(16, 185, 129, 0.20),
            transparent 28%
          ),
          linear-gradient(
            135deg,
            #0f172a 0%,
            #172554 48%,
            #1d4ed8 100%
          )
        `,
      }}
    >
      <Box
        sx={{
          position: "absolute",
          width: 420,
          height: 420,
          borderRadius: "50%",
          bgcolor: "rgba(255,255,255,0.035)",
          top: -180,
          right: -100,
        }}
      />

      <Container maxWidth="lg" sx={{ position: "relative" }}>
        <Stack
          spacing={2}
          alignItems="center"
          textAlign="center"
          sx={{
            maxWidth: 800,
            mx: "auto",
            mb: { xs: 6, md: 8 },
          }}
        >
          <Typography
            sx={{
              color: "#93c5fd",
              fontWeight: 800,
              fontSize: "0.85rem",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            ¿Por qué Avance Fiscal?
          </Typography>

          <Typography
            component="h2"
            sx={{
              fontSize: {
                xs: "2rem",
                sm: "2.6rem",
                md: "3.25rem",
              },
              lineHeight: 1.1,
              letterSpacing: "-0.035em",
              fontWeight: 800,
              color: "#ffffff",
            }}
          >
            Simple para usar.
            <Box
              component="span"
              sx={{
                display: "block",
                color: "#86efac",
              }}
            >
              Potente para gestionar.
            </Box>
          </Typography>

          <Typography
            sx={{
              maxWidth: 670,
              fontSize: { xs: "1rem", md: "1.12rem" },
              lineHeight: 1.75,
              color: "#cbd5e1",
            }}
          >
            De la venta al control del negocio, toda la información conectada
            dentro de una misma plataforma.
          </Typography>
        </Stack>

        <Grid container spacing={{ xs: 2.5, md: 3 }}>
          {beneficios.map(({ titulo, descripcion, icono: Icono }) => (
            <Grid key={titulo} size={{ xs: 12, sm: 6, md: 4 }}>
              <Box
                sx={{
                  height: "100%",
                  p: { xs: 3, md: 3.5 },
                  borderRadius: 4,
                  border: "1px solid rgba(255,255,255,0.12)",
                  bgcolor: "rgba(255,255,255,0.07)",
                  backdropFilter: "blur(12px)",
                  transition:
                    "transform 250ms ease, background-color 250ms ease, border-color 250ms ease",
                  "&:hover": {
                    transform: "translateY(-6px)",
                    bgcolor: "rgba(255,255,255,0.11)",
                    borderColor: "rgba(134,239,172,0.40)",
                  },
                }}
              >
                <Stack spacing={2}>
                  <Box
                    sx={{
                      width: 52,
                      height: 52,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 3,
                      color: "#86efac",
                      bgcolor: "rgba(134,239,172,0.10)",
                      border: "1px solid rgba(134,239,172,0.16)",
                    }}
                  >
                    <Icono sx={{ fontSize: 28 }} />
                  </Box>

                  <Typography
                    component="h3"
                    sx={{
                      fontSize: "1.15rem",
                      fontWeight: 800,
                      color: "#ffffff",
                    }}
                  >
                    {titulo}
                  </Typography>

                  <Typography
                    sx={{
                      fontSize: "0.97rem",
                      lineHeight: 1.7,
                      color: "#cbd5e1",
                    }}
                  >
                    {descripcion}
                  </Typography>
                </Stack>
              </Box>
            </Grid>
          ))}
        </Grid>

        <Stack
          alignItems="center"
          spacing={2}
          sx={{
            mt: { xs: 7, md: 9 },
          }}
        >
          <Typography
            sx={{
              color: "#e2e8f0",
              fontSize: { xs: "1.05rem", md: "1.15rem" },
              fontWeight: 600,
              textAlign: "center",
            }}
          >
            Menos tiempo administrando. Más tiempo haciendo crecer tu empresa.
          </Typography>

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
              fontWeight: 800,
              fontSize: "1rem",
              bgcolor: "#10b981",
              boxShadow: "0 14px 35px rgba(16,185,129,0.28)",
              transition: "all 220ms ease",
              "&:hover": {
                bgcolor: "#059669",
                transform: "translateY(-2px)",
                boxShadow: "0 18px 42px rgba(16,185,129,0.34)",
              },
            }}
          >
            Solicitar una demostración
          </Button>
        </Stack>
      </Container>
    </Box>
  );
}
