import { Box, Container, Grid, Paper, Stack, Typography } from "@mui/material";

import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import Groups2RoundedIcon from "@mui/icons-material/Groups2Rounded";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import CloudDoneRoundedIcon from "@mui/icons-material/CloudDoneRounded";

const funciones = [
  {
    titulo: "Facturación electrónica",
    descripcion:
      "Emití facturas y notas de crédito con CAE y QR de AFIP de forma rápida y segura.",
    icono: ReceiptLongRoundedIcon,
  },
  {
    titulo: "Control de stock",
    descripcion:
      "Actualizá automáticamente las existencias y detectá productos con stock bajo.",
    icono: Inventory2RoundedIcon,
  },
  {
    titulo: "Clientes y proveedores",
    descripcion:
      "Centralizá datos comerciales, compras, ventas y toda la información de contacto.",
    icono: Groups2RoundedIcon,
  },
  {
    titulo: "Cuentas corrientes",
    descripcion:
      "Controlá saldos pendientes, pagos recibidos y movimientos de cada cliente.",
    icono: AccountBalanceWalletRoundedIcon,
  },
  {
    titulo: "Dashboard inteligente",
    descripcion:
      "Consultá ventas, alertas, indicadores y datos clave de tu empresa en tiempo real.",
    icono: InsightsRoundedIcon,
  },
  {
    titulo: "Acceso desde cualquier lugar",
    descripcion:
      "Trabajá desde cualquier computadora con conexión a internet, sin instalaciones.",
    icono: CloudDoneRoundedIcon,
  },
];

export default function Features() {
  return (
    <Box
      component="section"
      id="funciones"
      sx={{
        pt: { xs: 4, md: 14 },
        pb: { xs: 9, md: 14 },
        bgcolor: "#f8fafc",
      }}
    >
      <Container maxWidth="lg">
        <Stack
          spacing={2}
          alignItems="center"
          textAlign="center"
          sx={{
            maxWidth: 780,
            mx: "auto",
            mb: { xs: 6, md: 8 },
          }}
        >
          <Typography
            sx={{
              color: "#2563eb",
              fontWeight: 800,
              fontSize: "0.85rem",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            Todo en un solo lugar
          </Typography>

          <Typography
            component="h2"
            sx={{
              fontSize: {
                xs: "2rem",
                sm: "2.6rem",
                md: "3.2rem",
              },
              lineHeight: 1.12,
              letterSpacing: "-0.035em",
              fontWeight: 800,
              color: "#0f172a",
            }}
          >
            Todo lo que necesitás para administrar tu empresa
          </Typography>

          <Typography
            sx={{
              maxWidth: 680,
              fontSize: { xs: "1rem", md: "1.12rem" },
              lineHeight: 1.75,
              color: "#64748b",
            }}
          >
            Gestioná facturación, stock, clientes, proveedores y cuentas
            corrientes desde una plataforma simple, moderna y segura.
          </Typography>
        </Stack>

        <Grid container spacing={3}>
          {funciones.map(({ titulo, descripcion, icono: Icono }) => (
            <Grid key={titulo} size={{ xs: 12, sm: 6, md: 4 }}>
              <Paper
                elevation={0}
                sx={{
                  height: "100%",
                  p: { xs: 3, md: 3.5 },
                  borderRadius: 4,
                  border: "1px solid #e2e8f0",
                  bgcolor: "#ffffff",
                  transition:
                    "transform 250ms ease, box-shadow 250ms ease, border-color 250ms ease",
                  "&:hover": {
                    transform: "translateY(-7px)",
                    borderColor: "rgba(37, 99, 235, 0.35)",
                    boxShadow: "0 22px 55px rgba(15, 23, 42, 0.10)",
                  },
                }}
              >
                <Stack spacing={2.2}>
                  <Box
                    sx={{
                      width: 54,
                      height: 54,
                      borderRadius: 3,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#2563eb",
                      bgcolor: "rgba(37, 99, 235, 0.10)",
                    }}
                  >
                    <Icono sx={{ fontSize: 29 }} />
                  </Box>

                  <Typography
                    component="h3"
                    sx={{
                      fontSize: "1.18rem",
                      fontWeight: 800,
                      color: "#0f172a",
                    }}
                  >
                    {titulo}
                  </Typography>

                  <Typography
                    sx={{
                      fontSize: "0.98rem",
                      lineHeight: 1.7,
                      color: "#64748b",
                    }}
                  >
                    {descripcion}
                  </Typography>
                </Stack>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}
