import {
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Box,
  Chip,
} from "@mui/material";

export default function TarjetaMonotributo({ monotributo }) {
  /*
   * Si todavía no cargó la información,
   * o la empresa no tiene categoría configurada,
   * no mostramos la tarjeta.
   */
  if (!monotributo) {
    return null;
  }

  /*
   * Solo mostramos la tarjeta para empresas monotributistas.
   */
  if (monotributo.condicionIva !== "Monotributista") {
    return null;
  }

  const porcentaje = Number(monotributo.porcentaje || 0);
  const facturado = Number(monotributo.facturado12Meses || 0);
  const limite = Number(monotributo.limite || 0);
  const disponible = Number(monotributo.disponible || 0);

  let color = "success";

  if (porcentaje >= 95) {
    color = "error";
  } else if (porcentaje >= 85) {
    color = "warning";
  } else if (porcentaje >= 70) {
    color = "info";
  }

  let textoEstado = "Dentro del límite";

  if (porcentaje >= 100) {
    textoEstado = "Límite superado";
  } else if (porcentaje >= 95) {
    textoEstado = "Límite casi agotado";
  } else if (porcentaje >= 85) {
    textoEstado = "Atención";
  }

  return (
    <Card
      sx={{
        width: "100%",
        height: "100%",
        minHeight: 360,
        borderRadius: 3,
        boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
      }}
    >
      <CardContent
        sx={{
          flex: 1,
          overflow: "hidden",
        }}
      >
        <Typography variant="h6" fontWeight="bold">
          📊 Límite Monotributo
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Categoría {monotributo.categoria || "-"}
        </Typography>

        <Box sx={{ mt: 2 }}>
          <LinearProgress
            variant="determinate"
            value={Math.min(Math.max(porcentaje, 0), 100)}
            color={color}
            sx={{
              height: 10,
              borderRadius: 5,
            }}
          />
        </Box>

        <Typography sx={{ mt: 2 }}>Facturado últimos 12 meses:</Typography>

        <Typography fontWeight="bold">
          $
          {facturado.toLocaleString("es-AR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </Typography>

        <Typography sx={{ mt: 1 }}>Límite de la categoría:</Typography>

        <Typography color="text.secondary">
          $
          {limite.toLocaleString("es-AR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </Typography>

        <Typography variant="h5" fontWeight="bold" sx={{ mt: 1 }}>
          {porcentaje.toFixed(1)} % utilizado
        </Typography>

        <Typography sx={{ mt: 2 }}>Disponible:</Typography>

        <Typography
          fontWeight="bold"
          color={disponible < 0 ? "error.main" : "text.primary"}
        >
          $
          {disponible.toLocaleString("es-AR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </Typography>

        <Box sx={{ mt: 2 }}>
          <Chip color={color} label={textoEstado} />
        </Box>
      </CardContent>
    </Card>
  );
}
