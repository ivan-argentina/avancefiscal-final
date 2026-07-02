import { Box, Paper, Typography } from "@mui/material";

const obtenerSaludo = () => {
  const hora = new Date().getHours();

  if (hora < 12) return "Buenos días";
  if (hora < 20) return "Buenas tardes";
  return "Buenas noches";
};

const formatearFecha = () =>
  new Date().toLocaleDateString("es-AR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

export default function DashboardHeader({ nombreUsuario = "Iván", empresa }) {
  return (
    <Paper
      sx={{
        p: 3,
        mb: 3,
        borderRadius: 3,
        boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
        display: "flex",
        justifyContent: "space-between",
        gap: 2,
        flexWrap: "wrap",
      }}
    >
      <Box>
        <Typography variant="h5" fontWeight="bold">
          {obtenerSaludo()}, {nombreUsuario} 👋
        </Typography>

        <Typography variant="body2" color="text.secondary">
          Bienvenido a Avance Fiscal
        </Typography>
      </Box>

      <Box sx={{ textAlign: { xs: "left", md: "right" } }}>
        <Typography variant="body2" color="text.secondary">
          {formatearFecha()}
        </Typography>

        <Typography variant="body2" fontWeight="bold">
          {empresa?.razon_social || "Empresa no seleccionada"}
        </Typography>

        {empresa?.cuit && (
          <Typography variant="body2" color="text.secondary">
            CUIT: {empresa.cuit}
          </Typography>
        )}
      </Box>
    </Paper>
  );
}
