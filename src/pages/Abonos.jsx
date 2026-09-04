import PaidIcon from "@mui/icons-material/Paid";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import UndoIcon from "@mui/icons-material/Undo";
import jsPDF from "jspdf";
import logoAvanceFiscal from "../assets/logo-avance-fiscal.png";
import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tooltip,
} from "@mui/material";
import { supabase } from "../hook/supabaseClient";

export default function Abonos() {
  const [abonos, setAbonos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const fechaActual = new Date();
  const mesActual = fechaActual.getMonth() + 1;
  const anioActual = fechaActual.getFullYear();
  const [mesSeleccionado, setMesSeleccionado] = useState(mesActual);
  const [anioSeleccionado, setAnioSeleccionado] = useState(anioActual);
  const [openPago, setOpenPago] = useState(false);
  const [abonoSeleccionado, setAbonoSeleccionado] = useState(null);
  const [medioPago, setMedioPago] = useState("efectivo");

  const meses = [
    { numero: 1, nombre: "Enero" },
    { numero: 2, nombre: "Febrero" },
    { numero: 3, nombre: "Marzo" },
    { numero: 4, nombre: "Abril" },
    { numero: 5, nombre: "Mayo" },
    { numero: 6, nombre: "Junio" },
    { numero: 7, nombre: "Julio" },
    { numero: 8, nombre: "Agosto" },
    { numero: 9, nombre: "Septiembre" },
    { numero: 10, nombre: "Octubre" },
    { numero: 11, nombre: "Noviembre" },
    { numero: 12, nombre: "Diciembre" },
  ];

  const anios = [anioActual - 2, anioActual - 1, anioActual, anioActual + 1];

  const nombreMes = `${meses.find((mes) => mes.numero === mesSeleccionado)?.nombre} ${anioSeleccionado}`;

  useEffect(() => {
    cargarAbonos();
  }, [mesSeleccionado, anioSeleccionado]);

  const cargarAbonos = async () => {
    try {
      setCargando(true);
      setError("");

      // 1. Buscar todas las empresas
      const { data: empresas, error: errorEmpresas } = await supabase
        .from("empresas")
        .select("id, razon_social, abono_mensual")
        .order("razon_social")
        .eq("activo", true);

      if (errorEmpresas) {
        throw errorEmpresas;
      }

      // 2. Buscar abonos ya creados para este mes
      const { data: abonosExistentes, error: errorAbonos } = await supabase
        .from("abonos_empresas")
        .select("*")
        .eq("anio", anioSeleccionado)
        .eq("mes", mesSeleccionado);

      if (errorAbonos) {
        throw errorAbonos;
      }

      const empresasConAbono = new Set(
        abonosExistentes?.map((abono) => abono.idempresa),
      );

      // 3. Detectar cuáles empresas todavía no tienen abono
      const empresasFaltantes = empresas.filter(
        (empresa) => !empresasConAbono.has(empresa.id),
      );

      // 4. Crear automáticamente los abonos faltantes

      const esMesActual =
        mesSeleccionado === mesActual && anioSeleccionado === anioActual;

      if (esMesActual && empresasFaltantes.length > 0) {
        const nuevosAbonos = empresasFaltantes.map((empresa) => ({
          idempresa: empresa.id,
          anio: anioSeleccionado,
          mes: mesSeleccionado,
          importe: Number(empresa.abono_mensual || 40000),
          estado: "pendiente",
        }));

        const { error: errorInsert } = await supabase
          .from("abonos_empresas")
          .insert(nuevosAbonos);

        if (errorInsert) {
          throw errorInsert;
        }
      }

      // 5. Traer nuevamente los abonos con los datos de la empresa
      const { data: datosFinales, error: errorFinal } = await supabase
        .from("abonos_empresas")
        .select(
          `
          id,
          idempresa,
          anio,
          mes,
          importe,
          estado,
          fecha_pago,
          medio_pago,
          numero_recibo,
          observaciones,
          empresas (
            razon_social,
            telefono
          )
        `,
        )
        .eq("anio", anioSeleccionado)
        .eq("mes", mesSeleccionado)
        .order("id");

      if (errorFinal) {
        throw errorFinal;
      }

      setAbonos(datosFinales || []);
    } catch (err) {
      console.error("Error cargando abonos:", err);
      setError(err.message || "Error al cargar los abonos");
    } finally {
      setCargando(false);
    }
  };
  const abrirDialogPago = (abono) => {
    setAbonoSeleccionado(abono);
    setMedioPago("efectivo");
    setOpenPago(true);
  };

  const confirmarPago = async () => {
    try {
      setError("");

      if (!abonoSeleccionado) return;

      const hoy = new Date();

      const fechaPago =
        `${hoy.getFullYear()}-` +
        `${String(hoy.getMonth() + 1).padStart(2, "0")}-` +
        `${String(hoy.getDate()).padStart(2, "0")}`;

      const { error: errorPago } = await supabase.rpc("registrar_pago_abono", {
        p_id: abonoSeleccionado.id,
        p_medio_pago: medioPago,
        p_fecha_pago: fechaPago,
      });

      if (errorPago) {
        throw errorPago;
      }

      setOpenPago(false);
      setAbonoSeleccionado(null);

      await cargarAbonos();
    } catch (err) {
      console.error("Error registrando pago:", err);
      setError(err.message || "No se pudo registrar el pago");
    }
  };
  const volverAPendiente = async (abono) => {
    try {
      setError("");

      const { error: errorUpdate } = await supabase
        .from("abonos_empresas")
        .update({
          estado: "pendiente",
          fecha_pago: null,
        })
        .eq("id", abono.id);

      if (errorUpdate) {
        throw errorUpdate;
      }

      await cargarAbonos();
    } catch (err) {
      console.error("Error volviendo abono a pendiente:", err);
      setError(err.message || "No se pudo modificar el abono");
    }
  };

  const generarReciboPdf = (abono) => {
    try {
      setError("");

      if (!abono.numero_recibo) {
        setError("Este pago no tiene número de recibo");
        return;
      }

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a5",
      });

      const empresa = abono.empresas?.razon_social || "";
      const numeroRecibo = String(abono.numero_recibo).padStart(6, "0");

      const fechaPago = abono.fecha_pago
        ? formatearFecha(abono.fecha_pago)
        : "-";

      const medioPago =
        abono.medio_pago === "efectivo"
          ? "Efectivo"
          : abono.medio_pago === "transferencia"
            ? "Transferencia"
            : "Otro";

      const importe = Number(abono.importe || 0).toLocaleString("es-AR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

      // Marco
      doc.setLineWidth(0.4);
      doc.rect(10, 10, 128, 115);

      // Logo
      doc.addImage(logoAvanceFiscal, "PNG", 54, 15, 40, 18);

      // Encabezado
      doc.setFont("helvetica", "bold");

      doc.setFontSize(13);
      doc.text("RECIBO DE PAGO", 74, 40, {
        align: "center",
      });

      doc.setFontSize(11);
      doc.text(`RECIBO N.º ${numeroRecibo}`, 74, 48, {
        align: "center",
      });

      // Línea
      doc.line(18, 54, 130, 54);

      // Datos
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);

      doc.text(`Fecha: ${fechaPago}`, 18, 58);

      doc.text("Recibí de:", 18, 69);
      doc.setFont("helvetica", "bold");
      doc.text(empresa, 42, 69);

      doc.setFont("helvetica", "normal");
      doc.text("Concepto:", 18, 80);
      doc.text("Abono mensual Avance Fiscal", 42, 80);

      doc.text("Período:", 18, 91);
      doc.text(nombreMes, 42, 91);

      doc.text("Medio de pago:", 18, 102);
      doc.text(medioPago, 48, 102);

      // Total
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text(`TOTAL: $ ${importe}`, 130, 116, {
        align: "right",
      });

      doc.save(`Recibo-${numeroRecibo}-${empresa}.pdf`);
    } catch (err) {
      console.error("Error generando recibo:", err);
      setError("No se pudo generar el recibo");
    }
  };

  const enviarWhatsApp = (abono) => {
    const telefono = abono.empresas?.telefono;

    if (!telefono) {
      setError("La empresa no tiene un teléfono cargado");
      return;
    }

    let numero = String(telefono).replace(/\D/g, "");

    // Sacar código de país si ya fue cargado
    if (numero.startsWith("549")) {
      numero = numero.slice(3);
    } else if (numero.startsWith("54")) {
      numero = numero.slice(2);
    }

    // Sacar 0 inicial
    if (numero.startsWith("0")) {
      numero = numero.slice(1);
    }

    // Sacar el 15 de números argentinos cargados en formato antiguo
    numero = numero.replace(/^(\d{2,4})15/, "$1");

    // Formato WhatsApp Argentina
    numero = `549${numero}`;

    const empresa = abono.empresas?.razon_social || "";

    const mensaje =
      `Hola ${empresa}, ¿cómo estás? ` +
      `Te recordamos que se encuentra pendiente el abono de Avance Fiscal ` +
      `correspondiente a ${nombreMes} por ` +
      `$${Number(abono.importe).toLocaleString("es-AR")}. ` +
      `Muchas gracias.`;

    const url = `https://web.whatsapp.com/send?phone=${numero}&text=${encodeURIComponent(mensaje)}`;

    window.open(url, "_blank");
  };

  const totalACobrar = abonos.reduce(
    (total, abono) => total + Number(abono.importe || 0),
    0,
  );

  const totalCobrado = abonos
    .filter((abono) => abono.estado === "pagado")
    .reduce((total, abono) => total + Number(abono.importe || 0), 0);

  const totalPendiente = abonos
    .filter((abono) => abono.estado === "pendiente")
    .reduce((total, abono) => total + Number(abono.importe || 0), 0);

  if (cargando) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          mt: 5,
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  const formatearFecha = (fecha) => {
    if (!fecha) return "-";

    const [anio, mes, dia] = fecha.split("-");
    return `${dia}/${mes}/${anio}`;
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" sx={{ mb: 1 }}>
        Abonos mensuales
      </Typography>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          mb: 3,
          flexWrap: "wrap",
        }}
      >
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Mes</InputLabel>

          <Select
            value={mesSeleccionado}
            label="Mes"
            onChange={(e) => setMesSeleccionado(Number(e.target.value))}
          >
            {meses.map((mes) => (
              <MenuItem key={mes.numero} value={mes.numero}>
                {mes.nombre}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Año</InputLabel>

          <Select
            value={anioSeleccionado}
            label="Año"
            onChange={(e) => setAnioSeleccionado(Number(e.target.value))}
          >
            {anios.map((anio) => (
              <MenuItem key={anio} value={anio}>
                {anio}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Typography fontWeight="bold">{nombreMes}</Typography>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(3, 1fr)",
          },
          gap: 2,
          mb: 3,
        }}
      >
        <Paper sx={{ p: 2 }}>
          <Typography color="text.secondary">Total a cobrar</Typography>

          <Typography variant="h5" fontWeight="bold">
            ${totalACobrar.toLocaleString("es-AR")}
          </Typography>
        </Paper>

        <Paper sx={{ p: 2 }}>
          <Typography color="text.secondary">Cobrado</Typography>

          <Typography variant="h5" fontWeight="bold" color="success.main">
            ${totalCobrado.toLocaleString("es-AR")}
          </Typography>
        </Paper>

        <Paper sx={{ p: 2 }}>
          <Typography color="text.secondary">Pendiente</Typography>

          <Typography variant="h5" fontWeight="bold" color="error.main">
            ${totalPendiente.toLocaleString("es-AR")}
          </Typography>
        </Paper>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: "bold" }}>Empresa</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Importe</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Estado</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Fecha de pago</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Acción</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {abonos.map((abono) => (
              <TableRow key={abono.id} hover>
                <TableCell>{abono.empresas?.razon_social}</TableCell>

                <TableCell>
                  ${Number(abono.importe).toLocaleString("es-AR")}
                </TableCell>

                <TableCell>
                  <Chip
                    label={abono.estado === "pagado" ? "Pagado" : "Pendiente"}
                    color={abono.estado === "pagado" ? "success" : "error"}
                    size="small"
                  />
                </TableCell>

                <TableCell>{formatearFecha(abono.fecha_pago)}</TableCell>

                <TableCell>
                  {abono.estado === "pagado" ? (
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <Tooltip title="Generar Recibo" arrow>
                        <Button
                          variant="contained"
                          color="primary"
                          size="small"
                          onClick={() => generarReciboPdf(abono)}
                        >
                          <PictureAsPdfIcon />
                        </Button>
                      </Tooltip>

                      <Tooltip title="Volver a pendiente" arrow>
                        <Button
                          variant="outlined"
                          color="warning"
                          size="small"
                          onClick={() => volverAPendiente(abono)}
                        >
                          <UndoIcon />
                        </Button>
                      </Tooltip>
                    </Box>
                  ) : (
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <Tooltip title="Marcar como pagado" arrow>
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => abrirDialogPago(abono)}
                        >
                          <PaidIcon />{" "}
                        </Button>
                      </Tooltip>

                      <Tooltip title="Enviar por WhatsApp" arrow>
                        <Button
                          variant="contained"
                          color="success"
                          size="small"
                          onClick={() => enviarWhatsApp(abono)}
                        >
                          <WhatsAppIcon />{" "}
                        </Button>
                      </Tooltip>
                    </Box>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Dialog
        open={openPago}
        onClose={() => setOpenPago(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Registrar pago</DialogTitle>

        <DialogContent>
          <Typography sx={{ mb: 1 }}>
            Empresa:{" "}
            <strong>{abonoSeleccionado?.empresas?.razon_social}</strong>
          </Typography>

          <Typography sx={{ mb: 1 }}>
            Período: <strong>{nombreMes}</strong>
          </Typography>

          <Typography sx={{ mb: 2 }}>
            Importe:{" "}
            <strong>
              ${Number(abonoSeleccionado?.importe || 0).toLocaleString("es-AR")}
            </strong>
          </Typography>

          <TextField
            select
            label="Medio de pago"
            value={medioPago}
            onChange={(e) => setMedioPago(e.target.value)}
            fullWidth
            size="small"
          >
            <MenuItem value="efectivo">Efectivo</MenuItem>
            <MenuItem value="transferencia">Transferencia</MenuItem>
            <MenuItem value="otro">Otro</MenuItem>
          </TextField>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpenPago(false)}>Cancelar</Button>

          <Button variant="contained" onClick={confirmarPago}>
            Registrar pago
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
