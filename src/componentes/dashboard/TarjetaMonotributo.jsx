import {
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Box,
  Chip,
} from "@mui/material";

export default function TarjetaMonotributo({ monotributo }) {
  if (monotributo.condicionIva !== "Monotributista") {
    return null;
  }

  const porcentaje = Number(monotributo.porcentaje || 0);

  let color = "success";

  if (porcentaje >= 95) color = "error";
  else if (porcentaje >= 85) color = "warning";
  else if (porcentaje >= 70) color = "info";

  return (
    <Card sx={{ height: "100%" }}>
      <CardContent>
        <Typography variant="h6" fontWeight="bold">
          📊 Límite Monotributo
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Categoría {monotributo.categoria}
        </Typography>

        <Box sx={{ mt: 2 }}>
          <LinearProgress
            variant="determinate"
            value={Math.min(porcentaje, 100)}
            color={color}
            sx={{ height: 10, borderRadius: 5 }}
          />
        </Box>

        <Typography sx={{ mt: 2 }}>
          <strong>
            ${Number(monotributo.facturado12Meses).toLocaleString("es-AR")}
          </strong>
        </Typography>

        <Typography color="text.secondary">
          de ${Number(monotributo.limite).toLocaleString("es-AR")}
        </Typography>

        <Typography sx={{ mt: 1 }}>{porcentaje.toFixed(1)} %</Typography>

        <Typography sx={{ mt: 2 }}>Disponible:</Typography>

        <Typography fontWeight="bold">
          ${Number(monotributo.disponible).toLocaleString("es-AR")}
        </Typography>

        <Box sx={{ mt: 2 }}>
          <Chip
            color={color}
            label={
              porcentaje >= 95
                ? "Límite casi agotado"
                : porcentaje >= 85
                  ? "Atención"
                  : "Dentro del límite"
            }
          />
        </Box>
      </CardContent>
    </Card>
  );
}
