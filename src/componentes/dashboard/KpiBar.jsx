import { Box, Paper, Typography } from "@mui/material";
import PaidIcon from "@mui/icons-material/Paid";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import PeopleIcon from "@mui/icons-material/People";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";

const moneda = (valor) =>
  Number(valor || 0).toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  });

const ItemKpi = ({ icono, titulo, valor, detalle }) => (
  <Box
    sx={{
      flex: 1,
      minWidth: 140,
      display: "flex",
      alignItems: "center",
      gap: 1.5,
    }}
  >
    <Box
      sx={{
        width: 42,
        height: 42,
        borderRadius: 2,
        backgroundColor: "rgba(25, 118, 210, 0.10)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {icono}
    </Box>

    <Box>
      <Typography variant="caption" color="text.secondary">
        {titulo}
      </Typography>

      <Typography variant="h6" fontWeight="bold" lineHeight={1.1}>
        {valor}
      </Typography>

      <Typography variant="caption" color="text.secondary">
        {detalle}
      </Typography>
    </Box>
  </Box>
);

export default function KpiBar({ resumen }) {
  return (
    <Paper
      sx={{
        p: 2,
        mb: 3,
        borderRadius: 3,
        boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
        display: "flex",
        gap: 2,
        flexWrap: "wrap",
        alignItems: "center",
      }}
    >
      <ItemKpi
        icono={<PaidIcon color="success" />}
        titulo="Ventas mes"
        valor={moneda(resumen.ventasMes)}
        detalle="Facturación autorizada"
      />

      <ItemKpi
        icono={<TrendingUpIcon color="primary" />}
        titulo="Ticket promedio"
        valor={moneda(resumen.ticketPromedio)}
        detalle={`${resumen.comprobantesMes || 0} comprobantes`}
      />

      <ItemKpi
        icono={<PeopleIcon color="info" />}
        titulo="Clientes"
        valor={resumen.cantidadClientes || 0}
        detalle="Cargados"
      />

      <ItemKpi
        icono={<Inventory2Icon color="warning" />}
        titulo="Artículos"
        valor={resumen.cantidadArticulos || 0}
        detalle="En stock/lista"
      />

      <ItemKpi
        icono={<ReceiptLongIcon color="secondary" />}
        titulo="Pendientes AFIP"
        valor={resumen.facturasPendientes || 0}
        detalle="Sin autorizar"
      />
    </Paper>
  );
}
