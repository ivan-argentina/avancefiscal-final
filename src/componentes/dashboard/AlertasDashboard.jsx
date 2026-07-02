import { Card, CardContent, Typography, Stack, Box, Chip } from "@mui/material";

import VerifiedIcon from "@mui/icons-material/Verified";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";

export default function AlertasDashboard({ certificado, resumen }) {
  return (
    <Card
      sx={{
        height: 320,
        borderRadius: 3,
        boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
      }}
    >
      <CardContent>
        <Typography variant="h6" fontWeight="bold">
          Centro de Alertas
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
          Información importante del sistema
        </Typography>

        <Stack spacing={1.3}>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            <Box display="flex" alignItems="center" gap={1}>
              <VerifiedIcon color="success" fontSize="small" />
              <Typography variant="body2">Certificado AFIP</Typography>
            </Box>

            <Chip
              color="success"
              size="small"
              label={`${certificado?.diasRestantes ?? "-"} días`}
            />
          </Box>

          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            <Box display="flex" alignItems="center" gap={1}>
              <WarningAmberIcon color="warning" fontSize="small" />
              <Typography variant="body2">Facturas pendientes AFIP</Typography>
            </Box>

            <Chip
              size="small"
              color="warning"
              label={resumen.facturasPendientes}
            />
          </Box>

          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            <Box display="flex" alignItems="center" gap={1}>
              <WarningAmberIcon color="warning" fontSize="small" />
              <Typography variant="body2">Stock bajo</Typography>
            </Box>

            <Chip size="small" color="warning" label={resumen.stockBajo} />
          </Box>

          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            <Box display="flex" alignItems="center" gap={1}>
              <ErrorOutlineIcon color="error" fontSize="small" />
              <Typography variant="body2">Stock negativo</Typography>
            </Box>

            <Chip size="small" color="error" label={resumen.stockNegativo} />
          </Box>

          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            <Box display="flex" alignItems="center" gap={1}>
              <AccountBalanceWalletIcon color="info" fontSize="small" />
              <Typography variant="body2">Cuentas por cobrar</Typography>
            </Box>

            <Chip
              size="small"
              color="info"
              label={resumen.saldoCobrar.toLocaleString("es-AR", {
                style: "currency",
                currency: "ARS",
              })}
            />
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
