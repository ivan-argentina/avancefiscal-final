import DownloadIcon from "@mui/icons-material/Download";
import CloseIcon from "@mui/icons-material/Close";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
} from "@mui/material";

export default function DialogDetalleImportacion({
  open,
  onClose,
  log,
  resultado,
  archivo,
}) {
  const descargarLog = () => {
    const fechaHora = new Date().toLocaleString("es-AR");

    const contenido = `
==================================================
                 AVANCE FISCAL
            DETALLE DE IMPORTACIÓN
==================================================

Archivo: ${archivo || "-"}

Fecha: ${fechaHora}

Leídos: ${resultado?.leidos ?? 0}
Importados: ${resultado?.importados ?? 0}
Duplicados: ${resultado?.salteados ?? 0}
Errores: ${resultado?.errores ?? 0}

==================================================
DETALLE
==================================================

${log.map((item) => item.mensaje).join("\n")}
`;

    const blob = new Blob([contenido], {
      type: "text/plain;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;

    const fechaArchivo = new Date()
      .toLocaleDateString("es-AR")
      .replaceAll("/", "-");

    link.download = `Importacion-${fechaArchivo}.txt`;

    link.click();

    URL.revokeObjectURL(url);
  };

  return (
    <DialogActions>
      <Button variant="outlined" onClick={descargarLog}>
        📄 Descargar TXT
      </Button>

      <Button variant="contained" onClick={onClose}>
        Cerrar
      </Button>
    </DialogActions>
  );
}
