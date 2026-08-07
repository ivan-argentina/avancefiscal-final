import { Box, Button, Container, Stack, Typography } from "@mui/material";
import { abrirWhatsAppDemo } from "../utils/whatsapp";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";

export default function Contact() {
  return (
    <Box
      component="section"
      id="contacto"
      sx={{
        py: { xs: 7, md: 9 },
        bgcolor: "#ffffff",
      }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            position: "relative",
            overflow: "hidden",
            maxWidth: 1050,
            mx: "auto",
            px: { xs: 3, sm: 6, md: 9 },
            py: { xs: 6, md: 8 },
            borderRadius: { xs: 4, md: 6 },
            bgcolor: "#0f172a",
            boxShadow: "0 30px 70px rgba(15, 23, 42, 0.18)",
          }}
        >
          {/* DECORACIÓN */}
          <Box
            sx={{
              position: "absolute",
              width: 280,
              height: 280,
              borderRadius: "50%",
              bgcolor: "rgba(37, 99, 235, 0.20)",
              top: -140,
              right: -80,
            }}
          />

          <Box
            sx={{
              position: "absolute",
              width: 220,
              height: 220,
              borderRadius: "50%",
              bgcolor: "rgba(16, 185, 129, 0.15)",
              bottom: -130,
              left: -60,
            }}
          />

          <Stack
            spacing={3}
            alignItems="center"
            textAlign="center"
            sx={{
              position: "relative",
              zIndex: 1,
              maxWidth: 760,
              mx: "auto",
            }}
          >
            <Typography
              sx={{
                color: "#60a5fa",
                fontSize: "0.85rem",
                fontWeight: 800,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              Empezá hoy
            </Typography>

            <Typography
              component="h2"
              sx={{
                color: "#ffffff",
                fontWeight: 900,
                fontSize: {
                  xs: "2rem",
                  sm: "2.6rem",
                  md: "3.2rem",
                },
                lineHeight: 1.1,
                letterSpacing: "-0.035em",
              }}
            >
              ¿Querés ver Avance Fiscal
              <Box
                component="span"
                sx={{
                  display: "block",
                  color: "#60a5fa",
                }}
              >
                funcionando en tu negocio?
              </Box>
            </Typography>

            <Typography
              sx={{
                maxWidth: 650,
                color: "#cbd5e1",
                fontSize: { xs: "1rem", md: "1.15rem" },
                lineHeight: 1.7,
              }}
            >
              Te mostramos cómo funciona y te ayudamos a ponerlo en marcha para
              que puedas empezar a facturar y gestionar tu negocio.
            </Typography>

            <Button
              variant="contained"
              size="large"
              startIcon={<WhatsAppIcon />}
              endIcon={<ArrowForwardRoundedIcon />}
              onClick={abrirWhatsAppDemo}
              sx={{
                mt: 1,
                minHeight: 56,
                px: { xs: 3, md: 4 },
                borderRadius: 3,
                bgcolor: "#10b981",
                color: "#ffffff",
                fontWeight: 800,
                fontSize: "1rem",
                textTransform: "none",
                boxShadow: "0 15px 35px rgba(16,185,129,0.28)",
                "&:hover": {
                  bgcolor: "#059669",
                  transform: "translateY(-2px)",
                },
              }}
            >
              Solicitar demostración
            </Button>

            <Typography
              sx={{
                color: "#94a3b8",
                fontSize: "0.9rem",
                fontWeight: 500,
              }}
            >
              Sin compromiso · Atención personalizada · Te ayudamos con la
              puesta en marcha
            </Typography>
          </Stack>
        </Box>
      </Container>
    </Box>
  );
}
