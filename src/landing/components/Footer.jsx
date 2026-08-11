import {
  Box,
  Container,
  Divider,
  Stack,
  Typography,
  Link,
} from "@mui/material";
import { abrirWhatsAppDemo } from "../utils/whatsapp";

export default function Footer() {
  const irA = (id) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
    });
  };

  return (
    <Box
      component="footer"
      sx={{
        bgcolor: "#0b1120",
        color: "#ffffff",
        pt: { xs: 6, md: 7 },
        pb: 3,
      }}
    >
      <Container maxWidth="lg">
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          spacing={{ xs: 5, md: 8 }}
        >
          {/* MARCA */}
          <Box sx={{ maxWidth: 420 }}>
            <Typography
              sx={{
                fontSize: "1.45rem",
                fontWeight: 900,
                letterSpacing: "-0.03em",
                mb: 1.5,
              }}
            >
              Avance Fiscal
            </Typography>

            <Typography
              sx={{
                color: "#94a3b8",
                lineHeight: 1.7,
                fontSize: "0.95rem",
              }}
            >
              Facturación, stock y gestión en un solo lugar. Una plataforma
              simple para administrar tu negocio.
            </Typography>
          </Box>

          {/* NAVEGACIÓN */}
          <Stack spacing={1.5}>
            <Typography
              sx={{
                fontWeight: 800,
                mb: 0.5,
              }}
            >
              Avance Fiscal
            </Typography>

            <Link
              component="button"
              onClick={() => irA("funciones")}
              underline="none"
              sx={linkStyle}
            >
              Funciones
            </Link>

            <Link
              component="button"
              onClick={() => irA("beneficios")}
              underline="none"
              sx={linkStyle}
            >
              Beneficios
            </Link>

            <Link
              component="button"
              onClick={() => irA("planes")}
              underline="none"
              sx={linkStyle}
            >
              Plan
            </Link>

            <Link
              component="button"
              onClick={() => irA("contacto")}
              underline="none"
              sx={linkStyle}
            >
              Contacto
            </Link>
          </Stack>

          {/* CONTACTO */}
          <Stack spacing={1.5}>
            <Typography
              sx={{
                fontWeight: 800,
                mb: 0.5,
              }}
            >
              Contacto
            </Typography>

            <Typography
              sx={{
                color: "#94a3b8",
                fontSize: "0.95rem",
              }}
            >
              ¿Querés conocer Avance Fiscal?
            </Typography>

            <Link
              component="button"
              onClick={() => irA("contacto")}
              underline="none"
              sx={{
                ...linkStyle,
                color: "#60a5fa",
                fontWeight: 700,
              }}
            >
              Solicitar demostración →
            </Link>
          </Stack>
        </Stack>

        <Divider
          sx={{
            my: 4,
            borderColor: "rgba(255,255,255,0.10)",
          }}
        />

        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
          spacing={1}
        >
          <Typography
            sx={{
              color: "#64748b",
              fontSize: "0.85rem",
            }}
          >
            © {new Date().getFullYear()} Avance Fiscal. Todos los derechos
            reservados.
          </Typography>

          <Typography
            sx={{
              color: "#64748b",
              fontSize: "0.85rem",
            }}
          >
            Gestión inteligente para tu empresa.
          </Typography>
        </Stack>
      </Container>
    </Box>
  );
}

const linkStyle = {
  color: "#94a3b8",
  fontSize: "0.95rem",
  textAlign: "left",
  justifyContent: "flex-start",
  p: 0,
  cursor: "pointer",
  transition: "color 180ms ease",

  "&:hover": {
    color: "#ffffff",
  },
};
