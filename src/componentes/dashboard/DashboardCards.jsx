import {
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  Typography,
  LinearProgress,
} from "@mui/material";

export default function DashboardCards({
  resumen,
  certificado,
  config,
  monotributo,
}) {
  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      <Grid size={{ xs: 12, md: 3 }}>
        <Card>
          <CardContent>
            <Typography variant="subtitle2" color="text.secondary">
              Ventas del mes
            </Typography>
            <Typography variant="h5" fontWeight="bold">
              {Number(resumen.ventasMes || 0).toLocaleString("es-AR", {
                style: "currency",
                currency: "ARS",
              })}
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 3 }}>
        <Card>
          <CardContent>
            <Typography variant="subtitle2" color="text.secondary">
              Saldo a cobrar
            </Typography>
            <Typography variant="h5" fontWeight="bold">
              {Number(resumen.saldoCobrar || 0).toLocaleString("es-AR", {
                style: "currency",
                currency: "ARS",
              })}
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 3 }}>
        <Card>
          <CardContent>
            <Typography variant="subtitle2" color="text.secondary">
              Comprobantes del mes
            </Typography>
            <Typography variant="h5" fontWeight="bold">
              {resumen.comprobantesMes}
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 3 }}>
        <Card>
          <CardContent>
            <Typography variant="subtitle2" color="text.secondary">
              Estado AFIP
            </Typography>

            <Box sx={{ mt: 1, mb: 1 }}>
              <Chip
                label={config?.label || "Sin estado"}
                color={config?.color || "default"}
                size="small"
                sx={{ fontWeight: 600 }}
              />
            </Box>

            <Typography variant="body2">
              Vence:{" "}
              {certificado?.vence
                ? new Date(certificado.vence).toLocaleDateString("es-AR")
                : "-"}
            </Typography>

            <Typography variant="body2">
              Días restantes: {certificado?.diasRestantes ?? "-"}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, md: 3 }}>
        <Card>
          <CardContent>
            <Typography variant="subtitle2" color="text.secondary">
              Ticket promedio
            </Typography>

            <Typography variant="h5" fontWeight="bold">
              {Number(resumen.ticketPromedio || 0).toLocaleString("es-AR", {
                style: "currency",
                currency: "ARS",
              })}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      {monotributo.condicionIva === "Monotributista" && (
        <Grid size={{ xs: 12, md: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Control Monotributo
              </Typography>

              <Typography variant="h6" fontWeight="bold">
                Categoría {monotributo.categoria || "-"}
              </Typography>

              <Box sx={{ mt: 1, mb: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(monotributo.porcentaje, 100)}
                  color={
                    monotributo.porcentaje >= 90
                      ? "error"
                      : monotributo.porcentaje >= 70
                        ? "warning"
                        : "success"
                  }
                  sx={{ height: 10, borderRadius: 5 }}
                />
              </Box>

              <Typography variant="body2">
                Usado: {monotributo.porcentaje.toFixed(2)}%
              </Typography>

              <Typography variant="body2">
                Disponible:{" "}
                {monotributo.disponible.toLocaleString("es-AR", {
                  style: "currency",
                  currency: "ARS",
                })}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      )}
    </Grid>
  );
}
