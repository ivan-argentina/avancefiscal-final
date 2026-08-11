import { Box, Button, Container, Grid, Stack, Typography } from "@mui/material";

import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import WorkspacePremiumRoundedIcon from "@mui/icons-material/WorkspacePremiumRounded";
import { abrirWhatsAppDemo } from "../utils/whatsapp";

const funciones = [
  "Facturación electrónica",
  "Facturas, notas de crédito, remitos y presupuestos",
  "Comprobantes sin límite",
  "Stock y artículos",
  "Clientes y proveedores",
  "Cuentas corrientes",
  "Compras",
  "Dashboard y reportes",
  "Envío por WhatsApp y email",
  "Impresión láser o comandera",
  "Acceso desde cualquier lugar",
];

export default function Pricing() {
  return (
    <Box
      component="section"
      id="planes"
      sx={{
        pt: { xs: 12, md: 16 },
        pb: { xs: 9, md: 14 },
        bgcolor: "#f8fafc",
      }}
    >
      <Container maxWidth="lg">
        {/* ENCABEZADO */}
        <Stack
          alignItems="center"
          textAlign="center"
          spacing={2}
          sx={{
            maxWidth: 760,
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
            Plan simple, sin vueltas
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
              color: "#0f172a",
            }}
          >
            Todo Avance Fiscal.
            <Box
              component="span"
              sx={{
                display: "block",
                color: "#2563eb",
              }}
            >
              Un solo plan.
            </Box>
          </Typography>

          <Typography
            sx={{
              maxWidth: 650,
              color: "#64748b",
              fontSize: { xs: "1rem", md: "1.12rem" },
              lineHeight: 1.7,
            }}
          >
            Todas las herramientas que necesitás para gestionar tu negocio, sin
            pagar módulos por separado.
          </Typography>
        </Stack>

        {/* TARJETA */}
        <Box
          sx={{
            maxWidth: 850,
            mx: "auto",
            bgcolor: "#ffffff",
            borderRadius: 5,
            overflow: "hidden",
            border: "1px solid #e2e8f0",
            boxShadow: "0 25px 70px rgba(15,23,42,0.10)",
          }}
        >
          <Grid container>
            {/* PRECIO */}
            <Grid size={{ xs: 12, md: 5 }}>
              <Stack
                sx={{
                  height: "100%",
                  p: { xs: 4, md: 5 },
                  bgcolor: "#eff6ff",
                }}
                spacing={3}
              >
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: 3,
                    bgcolor: "#2563eb",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <WorkspacePremiumRoundedIcon sx={{ fontSize: 30 }} />
                </Box>

                <Box>
                  <Typography
                    sx={{
                      fontSize: "1.25rem",
                      fontWeight: 800,
                      color: "#0f172a",
                    }}
                  >
                    Plan Completo
                  </Typography>

                  <Typography
                    sx={{
                      mt: 0.5,
                      color: "#64748b",
                    }}
                  >
                    Avance Fiscal completo
                  </Typography>
                </Box>

                <Box>
                  <Stack direction="row" alignItems="flex-end" spacing={1}>
                    <Typography
                      sx={{
                        fontSize: {
                          xs: "2.8rem",
                          md: "3.6rem",
                        },
                        lineHeight: 1,
                        fontWeight: 900,
                        letterSpacing: "-0.05em",
                        color: "#0f172a",
                      }}
                    >
                      $40.000
                    </Typography>

                    <Typography
                      sx={{
                        color: "#64748b",
                        pb: 0.5,
                      }}
                    >
                      / mes
                    </Typography>
                  </Stack>

                  <Typography
                    sx={{
                      mt: 1,
                      color: "#64748b",
                      fontSize: "0.9rem",
                      fontWeight: 600,
                    }}
                  >
                    Precio final con IVA incluido
                  </Typography>
                </Box>
                <Stack spacing={1}>
                  <Typography
                    sx={{
                      fontWeight: 700,
                      color: "#059669",
                    }}
                  >
                    ✓ Comprobantes sin límite
                  </Typography>

                  <Typography
                    sx={{
                      fontWeight: 700,
                      color: "#059669",
                    }}
                  >
                    ✓ Puesta en marcha incluida
                  </Typography>

                  <Typography
                    sx={{
                      fontWeight: 700,
                      color: "#059669",
                    }}
                  >
                    ✓ Soporte incluido
                  </Typography>

                  <Typography
                    sx={{
                      fontWeight: 700,
                      color: "#059669",
                    }}
                  >
                    ✓ Sin módulos adicionales
                  </Typography>
                </Stack>

                <Button
                  variant="contained"
                  size="large"
                  endIcon={<ArrowForwardRoundedIcon />}
                  onClick={abrirWhatsAppDemo}
                  sx={{
                    mt: "auto",
                    minHeight: 54,
                    borderRadius: 3,
                    textTransform: "none",
                    fontWeight: 800,
                    fontSize: "1rem",
                    bgcolor: "#10b981",
                    boxShadow: "0 12px 30px rgba(16,185,129,0.25)",
                    "&:hover": {
                      bgcolor: "#059669",
                      transform: "translateY(-2px)",
                    },
                  }}
                >
                  Solicitar una demostración
                </Button>
              </Stack>
            </Grid>

            {/* FUNCIONES */}
            <Grid size={{ xs: 12, md: 7 }}>
              <Box
                sx={{
                  p: { xs: 4, md: 5 },
                }}
              >
                <Typography
                  sx={{
                    mb: 3,
                    fontSize: "1.1rem",
                    fontWeight: 800,
                    color: "#0f172a",
                  }}
                >
                  Todo incluido
                </Typography>

                <Grid container spacing={2}>
                  {funciones.map((funcion) => (
                    <Grid key={funcion} size={{ xs: 12, sm: 6 }}>
                      <Stack
                        direction="row"
                        spacing={1.2}
                        alignItems="flex-start"
                      >
                        <CheckCircleRoundedIcon
                          sx={{
                            color: "#10b981",
                            fontSize: 21,
                            mt: "2px",
                          }}
                        />

                        <Typography
                          sx={{
                            color: "#334155",
                            fontSize: "0.94rem",
                            lineHeight: 1.5,
                          }}
                        >
                          {funcion}
                        </Typography>
                      </Stack>
                    </Grid>
                  ))}
                </Grid>

                <Box
                  sx={{
                    mt: 4,
                    p: 2.5,
                    borderRadius: 3,
                    bgcolor: "#f8fafc",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <Typography
                    sx={{
                      textAlign: "center",
                      color: "#475569",
                      fontWeight: 700,
                    }}
                  >
                    Sin permanencia mínima · Actualizaciones incluidas · Sin
                    costos ocultos
                  </Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Container>
    </Box>
  );
}
