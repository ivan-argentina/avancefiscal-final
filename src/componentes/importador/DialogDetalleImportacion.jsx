import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
} from "@mui/material";

export default function DialogDetalleImportacion({ open, onClose, log }) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Detalle de importación</DialogTitle>

      <DialogContent dividers>
        <Box
          sx={{
            maxHeight: 500,
            overflowY: "auto",
          }}
        >
          {log.map((item, index) => {
            if (item.tipo === "titulo") {
              return (
                <Typography
                  key={index}
                  variant="h6"
                  sx={{
                    mt: 2,
                    mb: 1,
                    fontWeight: "bold",
                    color: "primary.main",
                    borderBottom: "1px solid #ddd",
                    pb: 0.5,
                  }}
                >
                  {item.mensaje}
                </Typography>
              );
            }

            return (
              <Typography
                key={index}
                variant="body2"
                sx={{
                  mb: 0.8,
                  color:
                    item.tipo === "ok"
                      ? "success.main"
                      : item.tipo === "duplicado"
                        ? "warning.main"
                        : "error.main",
                }}
              >
                {item.tipo === "ok" && "✅ "}
                {item.tipo === "duplicado" && "⚠️ "}
                {item.tipo === "error" && "❌ "}
                {item.mensaje}
              </Typography>
            );
          })}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}
