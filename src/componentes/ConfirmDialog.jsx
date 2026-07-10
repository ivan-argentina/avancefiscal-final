import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from "@mui/material";

export default function ConfirmDialog({
  open,
  titulo,
  mensaje,
  textoCancelar = "Cancelar",
  textoConfirmar = "Aceptar",
  colorConfirmar = "primary",
  onClose,
  onConfirm,
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{titulo}</DialogTitle>

      <DialogContent>
        <DialogContentText sx={{ whiteSpace: "pre-line" }}>
          {mensaje}
        </DialogContentText>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}> {textoCancelar} </Button>

        <Button onClick={onConfirm} variant="contained" color={colorConfirmar}>
          {textoConfirmar}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
