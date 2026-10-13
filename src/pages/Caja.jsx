import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  IconButton,
  Tooltip,
  Alert,
} from "@mui/material";

import ConfirmDialog from "../componentes/ConfirmDialog";
import { supabase } from "../hook/supabaseClient";
import { obtenerEmpresa } from "../utils/obtenerEmpresa";
import DeleteIcon from "@mui/icons-material/Delete";

export default function Caja() {
  const hoy = new Date().toISOString().split("T")[0];

  const [desde, setDesde] = useState(hoy);
  const [hasta, setHasta] = useState(hoy);
  const [movimientos, setMovimientos] = useState([]);
  const [saldoAnterior, setSaldoAnterior] = useState(0);
  const [cargando, setCargando] = useState(false);
  const [idEmpresaActiva, setIdEmpresaActiva] = useState(null);
  const [errorPagosMercadoPago, setErrorPagosMercadoPago] = useState(null);
  const [mercadoPagoConectado, setMercadoPagoConectado] = useState(false);
  const [openPagosMercadoPago, setOpenPagosMercadoPago] = useState(false);
  const [pagosMercadoPago, setPagosMercadoPago] = useState([]);
  const [cargandoPagosMercadoPago, setCargandoPagosMercadoPago] =
    useState(false);
  const [consultandoMercadoPago, setConsultandoMercadoPago] = useState(false);
  const [mercadoPagoUsuario, setMercadoPagoUsuario] = useState(null);
  const [errorMercadoPago, setErrorMercadoPago] = useState(null);
  const [openMovimiento, setOpenMovimiento] = useState(false);
  const [tipoMovimiento, setTipoMovimiento] = useState("egreso");
  const [fechaMovimiento, setFechaMovimiento] = useState(hoy);
  const [conceptoMovimiento, setConceptoMovimiento] = useState("");
  const [medioPagoMovimiento, setMedioPagoMovimiento] = useState("Efectivo");
  const [importeMovimiento, setImporteMovimiento] = useState("");
  const [observacionesMovimiento, setObservacionesMovimiento] = useState("");
  const [guardandoMovimiento, setGuardandoMovimiento] = useState(false);
  const [openResumen, setOpenResumen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    titulo: "",
    mensaje: "",
    textoConfirmar: "Aceptar",
    color: "primary",
    accion: null,
  });

  const formatoMoneda = (valor) =>
    Number(valor || 0).toLocaleString("es-AR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const formatoFecha = (fecha) => {
    if (!fecha) return "-";

    const [anio, mes, dia] = fecha.split("-");

    return `${dia}/${mes}/${anio}`;
  };

  useEffect(() => {
    cargarCaja();
  }, [desde, hasta]);

  useEffect(() => {
    if (!idEmpresaActiva) {
      setMercadoPagoConectado(false);
      setMercadoPagoUsuario(null);
      setErrorMercadoPago(null);
      return;
    }

    consultarEstadoMercadoPago(idEmpresaActiva);
  }, [idEmpresaActiva]);

  const consultarEstadoMercadoPago = async (idEmpresa) => {
    setConsultandoMercadoPago(true);
    setErrorMercadoPago(null);

    try {
      setMercadoPagoConectado(false);
      setMercadoPagoUsuario(null);

      if (!idEmpresa) return;

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        throw new Error("La sesión no es válida.");
      }

      const apiUrl = import.meta.env.VITE_API_URL;

      if (!apiUrl) {
        throw new Error("No está configurada la URL del backend.");
      }

      const respuesta = await fetch(
        `${apiUrl.replace(/\/$/, "")}/api/mercadopago/estado?idempresa=${encodeURIComponent(idEmpresa)}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        },
      );

      const resultado = await respuesta.json();

      if (!respuesta.ok || !resultado.ok) {
        throw new Error(
          resultado.error || "No se pudo consultar Mercado Pago.",
        );
      }

      setMercadoPagoConectado(resultado.conectado === true);
      setMercadoPagoUsuario(resultado.mp_user_id || null);
    } catch (error) {
      console.error("Error consultando Mercado Pago:", error);
      setErrorMercadoPago(error.message);
    } finally {
      setConsultandoMercadoPago(false);
    }
  };

  const consultarPagosMercadoPago = async () => {
    if (!idEmpresaActiva || !mercadoPagoConectado) return;

    setOpenPagosMercadoPago(true);
    setCargandoPagosMercadoPago(true);
    setPagosMercadoPago([]);
    setErrorPagosMercadoPago(null);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        throw new Error("La sesión no es válida.");
      }

      const apiUrl = import.meta.env.VITE_API_URL;

      if (!apiUrl) {
        throw new Error("No está configurada la URL del backend.");
      }

      const respuesta = await fetch(
        `${apiUrl.replace(/\/$/, "")}/api/mercadopago/pagos?idempresa=${encodeURIComponent(idEmpresaActiva)}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        },
      );

      const resultado = await respuesta.json();

      if (!respuesta.ok || !resultado.ok) {
        throw new Error(
          resultado.error || "No se pudieron consultar los pagos.",
        );
      }

      setPagosMercadoPago(resultado.pagos || []);
    } catch (error) {
      console.error("Error consultando pagos Mercado Pago:", error);
      setErrorPagosMercadoPago(error.message);
    } finally {
      setCargandoPagosMercadoPago(false);
    }
  };

  const desconectarMercadoPago = async () => {
    if (!idEmpresaActiva || !mercadoPagoConectado) return;

    const confirmado = window.confirm(
      "¿Querés desconectar la cuenta de Mercado Pago de esta empresa?",
    );

    if (!confirmado) return;

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        throw new Error("La sesión no es válida.");
      }

      const apiUrl = import.meta.env.VITE_API_URL;

      if (!apiUrl) {
        throw new Error("No está configurada la URL del backend.");
      }

      const respuesta = await fetch(
        `${apiUrl.replace(/\/$/, "")}/api/mercadopago/desconectar`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            idempresa: idEmpresaActiva,
          }),
        },
      );

      const resultado = await respuesta.json();

      if (!respuesta.ok || !resultado.ok) {
        throw new Error(
          resultado.error || "No se pudo desconectar Mercado Pago.",
        );
      }

      await consultarEstadoMercadoPago(idEmpresaActiva);
      alert("Mercado Pago desconectado correctamente.");
    } catch (error) {
      alert(error.message);
    }
  };

  const conectarMercadoPago = async () => {
    try {
      if (!idEmpresaActiva) {
        throw new Error("No hay una empresa activa seleccionada.");
      }

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        throw new Error("La sesión no es válida.");
      }

      const apiUrl = import.meta.env.VITE_API_URL;

      if (!apiUrl) {
        throw new Error("No está configurada la URL del backend.");
      }

      const respuesta = await fetch(
        `${apiUrl.replace(/\/$/, "")}/api/mercadopago/oauth/iniciar`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            idempresa: idEmpresaActiva,
          }),
        },
      );

      const resultado = await respuesta.json();

      if (!respuesta.ok || !resultado.ok || !resultado.url) {
        throw new Error(
          resultado.error || "No se pudo iniciar la conexión con Mercado Pago.",
        );
      }

      window.location.assign(resultado.url);
    } catch (error) {
      alert(error.message);
    }
  };

  const cargarCaja = async () => {
    setCargando(true);

    try {
      const usuarioGuardado = JSON.parse(localStorage.getItem("usuario"));

      if (!usuarioGuardado) {
        setIdEmpresaActiva(null);
        setMovimientos([]);
        setSaldoAnterior(0);
        return;
      }
      const idEmpresa = await obtenerEmpresa(usuarioGuardado.id);
      console.log("ID empresa obtenido:", idEmpresa);
      console.log("Tipo de ID:", typeof idEmpresa);
      setIdEmpresaActiva(idEmpresa || null);
      if (!idEmpresa) {
        console.error("No hay una empresa activa seleccionada");
        setMovimientos([]);
        setSaldoAnterior(0);
        return;
      }

      // Movimientos del período seleccionado
      const { data, error } = await supabase
        .from("movimientos_caja")
        .select("*")
        .eq("idempresa", idEmpresa)
        .gte("fecha", desde)
        .lte("fecha", hasta)
        .order("fecha", { ascending: true })
        .order("created_at", { ascending: true });

      if (error) throw error;

      setMovimientos(data || []);

      // Movimientos anteriores al período
      const { data: anteriores, error: errorAnteriores } = await supabase
        .from("movimientos_caja")
        .select("tipo, importe")
        .eq("idempresa", idEmpresa)
        .lt("fecha", desde);

      if (errorAnteriores) throw errorAnteriores;

      const saldo = (anteriores || []).reduce((acum, mov) => {
        const importe = Number(mov.importe || 0);

        return mov.tipo === "ingreso" ? acum + importe : acum - importe;
      }, 0);

      setSaldoAnterior(saldo);
    } catch (error) {
      console.error("Error al cargar Caja:", error);
      setMovimientos([]);
      setSaldoAnterior(0);
    } finally {
      setCargando(false);
    }
  };

  {
    /** */
  }
  const guardarMovimiento = async () => {
    if (!conceptoMovimiento.trim()) {
      alert("Ingrese un concepto.");
      return;
    }

    const importeNumero = Number(importeMovimiento);

    if (!importeNumero || importeNumero <= 0) {
      alert("Ingrese un importe válido.");
      return;
    }

    setGuardandoMovimiento(true);

    try {
      const usuarioGuardado = JSON.parse(
        localStorage.getItem("usuario") || "null",
      );

      if (!usuarioGuardado?.id) {
        throw new Error("No se encontró el usuario logueado.");
      }

      const idEmpresa = await obtenerEmpresa(usuarioGuardado.id);

      if (!idEmpresa) {
        throw new Error("No se encontró la empresa.");
      }

      const { error } = await supabase.from("movimientos_caja").insert([
        {
          idempresa: idEmpresa,
          idusuario: usuarioGuardado.id,
          fecha: fechaMovimiento,
          tipo: tipoMovimiento,
          origen: "manual",
          id_origen: null,
          numero_comprobante: null,
          concepto: conceptoMovimiento.trim(),
          medio_pago: medioPagoMovimiento,
          importe: importeNumero,
          observaciones: observacionesMovimiento.trim() || null,
        },
      ]);

      if (error) throw error;

      setOpenMovimiento(false);

      // Limpiamos para el próximo movimiento
      setTipoMovimiento("egreso");
      setFechaMovimiento(hoy);
      setConceptoMovimiento("");
      setMedioPagoMovimiento("Efectivo");
      setImporteMovimiento("");
      setObservacionesMovimiento("");

      // Actualizamos inmediatamente la Caja
      await cargarCaja();
    } catch (error) {
      console.error("Error al guardar movimiento manual:", error);
      alert(`No se pudo guardar el movimiento: ${error.message}`);
    } finally {
      setGuardandoMovimiento(false);
    }
  };

  const eliminarMovimiento = async (mov) => {
    try {
      const usuarioGuardado = JSON.parse(
        localStorage.getItem("usuario") || "null",
      );

      if (!usuarioGuardado?.id) {
        throw new Error("No se encontró el usuario logueado.");
      }

      const idEmpresa = await obtenerEmpresa(usuarioGuardado.id);

      if (!idEmpresa) {
        throw new Error("No se encontró la empresa.");
      }

      const { error } = await supabase
        .from("movimientos_caja")
        .delete()
        .eq("id", mov.id)
        .eq("idempresa", idEmpresa)
        .eq("origen", "manual");

      if (error) throw error;

      setConfirmDialog((prev) => ({
        ...prev,
        open: false,
        accion: null,
      }));

      await cargarCaja();
    } catch (error) {
      console.error("Error al eliminar movimiento:", error);
    }
  };

  const totalIngresos = movimientos
    .filter((mov) => mov.tipo === "ingreso")
    .reduce((total, mov) => total + Number(mov.importe || 0), 0);

  const totalEgresos = movimientos
    .filter((mov) => mov.tipo === "egreso")
    .reduce((total, mov) => total + Number(mov.importe || 0), 0);

  const saldoFinal = saldoAnterior + totalIngresos - totalEgresos;
  const obtenerResumenMedio = (medio) => {
    const filtrados = movimientos.filter(
      (mov) =>
        mov.tipo !== "informativo" &&
        String(mov.medio_pago || "").toLowerCase() === medio.toLowerCase(),
    );

    const ingresos = filtrados
      .filter((mov) => mov.tipo === "ingreso")
      .reduce((acc, mov) => acc + Number(mov.importe || 0), 0);

    const egresos = filtrados
      .filter((mov) => mov.tipo === "egreso")
      .reduce((acc, mov) => acc + Number(mov.importe || 0), 0);

    return {
      ingresos,
      egresos,
      neto: ingresos - egresos,
    };
  };

  const mediosResumen = ["Efectivo", "Transferencia", "Débito", "Otro"];

  const solicitarEliminarMovimiento = (mov) => {
    if (mov.origen !== "manual") return;

    setConfirmDialog({
      open: true,
      titulo: "Eliminar movimiento",
      mensaje:
        `¿Está seguro que desea eliminar este movimiento?\n\n` +
        `${mov.concepto}\n` +
        `${formatoFecha(mov.fecha)}\n` +
        `$ ${formatoMoneda(mov.importe)}`,
      textoConfirmar: "Eliminar",
      color: "error",
      accion: () => eliminarMovimiento(mov),
    });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>
        Caja
      </Typography>
      {/* Conexión Mercado Pago */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          Mercado Pago
        </Typography>

        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Vinculá la cuenta de Mercado Pago de tu empresa para recibir pagos.
        </Typography>

        {consultandoMercadoPago ? (
          <CircularProgress size={24} />
        ) : (
          <>
            <Typography sx={{ mb: 2 }}>
              Estado:{" "}
              <strong>
                {errorMercadoPago
                  ? "Error al consultar"
                  : mercadoPagoConectado
                    ? "Conectado"
                    : "Sin conectar"}
              </strong>
            </Typography>

            {errorMercadoPago && (
              <Typography color="error" sx={{ mb: 2 }}>
                {errorMercadoPago}
              </Typography>
            )}

            {mercadoPagoConectado && mercadoPagoUsuario && (
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                Cuenta Mercado Pago: {mercadoPagoUsuario}
              </Typography>
            )}

            {!mercadoPagoConectado && (
              <Button
                variant="contained"
                color="success"
                onClick={conectarMercadoPago || !!errorMercadoPago}
                disabled={!idEmpresaActiva}
              >
                Conectar Mercado Pago
              </Button>
            )}
            {mercadoPagoConectado && (
              <Button
                variant="outlined"
                color="error"
                onClick={desconectarMercadoPago}
                disabled={!idEmpresaActiva}
              >
                Desconectar Mercado Pago
              </Button>
            )}
            {mercadoPagoConectado && (
              <Button
                variant="contained"
                color="primary"
                onClick={consultarPagosMercadoPago}
                sx={{ ml: 2 }}
              >
                Ver pagos de Mercado Pago
              </Button>
            )}
          </>
        )}
      </Paper>

      {/* Filtros de fecha */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box
          sx={{
            display: "flex",
            gap: 2,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <TextField
            label="Desde"
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />

          <TextField
            label="Hasta"
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />

          <Box sx={{ flexGrow: 1 }} />
          <Button variant="outlined" onClick={() => setOpenResumen(true)}>
            Resumen
          </Button>
          <Button variant="contained" onClick={() => setOpenMovimiento(true)}>
            Nuevo movimiento
          </Button>
        </Box>
      </Paper>

      {/* Resumen */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            md: "repeat(4, 1fr)",
          },
          gap: 2,
          mb: 3,
        }}
      >
        <Paper sx={{ p: 2 }}>
          <Typography color="text.secondary">Saldo anterior</Typography>
          <Typography variant="h6">$ {formatoMoneda(saldoAnterior)}</Typography>
        </Paper>

        <Paper sx={{ p: 2 }}>
          <Typography color="text.secondary">Ingresos</Typography>
          <Typography variant="h6">$ {formatoMoneda(totalIngresos)}</Typography>
        </Paper>

        <Paper sx={{ p: 2 }}>
          <Typography color="text.secondary">Egresos</Typography>
          <Typography variant="h6">$ {formatoMoneda(totalEgresos)}</Typography>
        </Paper>

        <Paper sx={{ p: 2 }}>
          <Typography color="text.secondary">Saldo final</Typography>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            $ {formatoMoneda(saldoFinal)}
          </Typography>
        </Paper>
      </Box>

      {/* Movimientos */}
      <TableContainer
        component={Paper}
        sx={{
          maxHeight: 500,
          overflowY: "auto",
          overflowX: "auto",
        }}
      >
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Fecha</TableCell>
              <TableCell>Comprobante</TableCell>
              <TableCell>Concepto</TableCell>
              <TableCell>Medio de pago</TableCell>
              <TableCell align="right">Importe</TableCell>
              <TableCell align="right">Ingreso</TableCell>
              <TableCell align="right">Egreso</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {cargando ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <CircularProgress size={28} />
                </TableCell>
              </TableRow>
            ) : movimientos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  No hay movimientos en el período seleccionado.
                </TableCell>
              </TableRow>
            ) : (
              movimientos.map((mov) => (
                <TableRow key={mov.id}>
                  <TableCell>{formatoFecha(mov.fecha)}</TableCell>

                  <TableCell>{mov.numero_comprobante || "-"}</TableCell>

                  <TableCell>{mov.concepto}</TableCell>

                  <TableCell>{mov.medio_pago || "-"}</TableCell>

                  <TableCell align="right">
                    $ {formatoMoneda(mov.importe)}
                  </TableCell>

                  <TableCell align="right">
                    {mov.tipo === "ingreso"
                      ? `$ ${formatoMoneda(mov.importe)}`
                      : "-"}
                  </TableCell>

                  <TableCell align="right">
                    {mov.tipo === "egreso"
                      ? `$ ${formatoMoneda(mov.importe)}`
                      : "-"}
                  </TableCell>
                  <TableCell align="center">
                    {mov.origen === "manual" ? (
                      <Tooltip title="Eliminar movimiento" arrow>
                        <IconButton
                          color="error"
                          size="small"
                          onClick={() => solicitarEliminarMovimiento(mov)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      {/* Modal*/}
      {/* Nuevo movimiento manual */}
      <Dialog
        open={openMovimiento}
        onClose={() => setOpenMovimiento(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Nuevo movimiento de Caja</DialogTitle>

        <DialogContent>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
              mt: 1,
            }}
          >
            <TextField
              select
              label="Tipo"
              value={tipoMovimiento}
              onChange={(e) => setTipoMovimiento(e.target.value)}
              fullWidth
            >
              <MenuItem value="ingreso">Ingreso</MenuItem>
              <MenuItem value="egreso">Egreso</MenuItem>
            </TextField>

            <TextField
              label="Fecha"
              type="date"
              value={fechaMovimiento}
              onChange={(e) => setFechaMovimiento(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />

            <TextField
              label="Concepto"
              value={conceptoMovimiento}
              onChange={(e) => setConceptoMovimiento(e.target.value)}
              fullWidth
            />

            <TextField
              select
              label="Medio de pago"
              value={medioPagoMovimiento}
              onChange={(e) => setMedioPagoMovimiento(e.target.value)}
              fullWidth
            >
              <MenuItem value="Efectivo">Efectivo</MenuItem>
              <MenuItem value="Transferencia">Transferencia</MenuItem>
              <MenuItem value="Débito">Débito</MenuItem>
              <MenuItem value="Otro">Otro</MenuItem>
            </TextField>

            <TextField
              label="Importe"
              type="number"
              value={importeMovimiento}
              onChange={(e) => setImporteMovimiento(e.target.value)}
              inputProps={{ min: 0, step: "0.01" }}
              fullWidth
            />

            <TextField
              label="Observaciones"
              value={observacionesMovimiento}
              onChange={(e) => setObservacionesMovimiento(e.target.value)}
              multiline
              rows={3}
              fullWidth
            />
          </Box>
        </DialogContent>

        <DialogActions>
          <Button
            onClick={() => setOpenMovimiento(false)}
            disabled={guardandoMovimiento}
          >
            Cancelar
          </Button>

          <Button
            variant="contained"
            onClick={guardarMovimiento}
            disabled={guardandoMovimiento}
          >
            {guardandoMovimiento ? "Guardando..." : "Guardar"}
          </Button>
        </DialogActions>
      </Dialog>
      {/* Resumen de Caja */}
      <Dialog
        open={openResumen}
        onClose={() => setOpenResumen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Resumen de Caja</DialogTitle>

        <DialogContent>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Desde {formatoFecha(desde)} hasta {formatoFecha(hasta)}
          </Typography>

          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Medio de pago</TableCell>
                  <TableCell align="right">Ingresos</TableCell>
                  <TableCell align="right">Egresos</TableCell>
                  <TableCell align="right">Neto</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {mediosResumen.map((medio) => {
                  const resumen = obtenerResumenMedio(medio);

                  return (
                    <TableRow key={medio}>
                      <TableCell>{medio}</TableCell>

                      <TableCell align="right">
                        $ {formatoMoneda(resumen.ingresos)}
                      </TableCell>

                      <TableCell align="right">
                        $ {formatoMoneda(resumen.egresos)}
                      </TableCell>

                      <TableCell align="right">
                        $ {formatoMoneda(resumen.neto)}
                      </TableCell>
                    </TableRow>
                  );
                })}

                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>TOTAL</TableCell>

                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    $ {formatoMoneda(totalIngresos)}
                  </TableCell>

                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    $ {formatoMoneda(totalEgresos)}
                  </TableCell>

                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    $ {formatoMoneda(totalIngresos - totalEgresos)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpenResumen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
      <ConfirmDialog
        open={confirmDialog.open}
        titulo={confirmDialog.titulo}
        mensaje={confirmDialog.mensaje}
        textoConfirmar={confirmDialog.textoConfirmar}
        colorConfirmar={confirmDialog.color}
        onClose={() =>
          setConfirmDialog((prev) => ({
            ...prev,
            open: false,
            accion: null,
          }))
        }
        onConfirm={() => {
          if (confirmDialog.accion) {
            confirmDialog.accion();
          }
        }}
      />
      {/* Ventana de pagos de Mercado Pago */}
      <Dialog
        open={openPagosMercadoPago}
        onClose={() => setOpenPagosMercadoPago(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Pagos recibidos por Mercado Pago</DialogTitle>

        <DialogContent dividers>
          {errorPagosMercadoPago ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {errorPagosMercadoPago}
            </Alert>
          ) : cargandoPagosMercadoPago ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
              <CircularProgress />
            </Box>
          ) : pagosMercadoPago.length === 0 ? (
            <Typography>No se encontraron pagos para mostrar.</Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Operación</TableCell>
                    <TableCell>Pagador</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell align="right">Importe</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {pagosMercadoPago.map((pago) => (
                    <TableRow key={pago.id}>
                      <TableCell>
                        {pago.fecha
                          ? new Date(pago.fecha).toLocaleString("es-AR")
                          : "-"}
                      </TableCell>
                      <TableCell>{pago.id}</TableCell>
                      <TableCell>{pago.pagador || "No informado"}</TableCell>
                      <TableCell>{pago.estado}</TableCell>
                      <TableCell align="right">
                        $ {formatoMoneda(pago.importe)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpenPagosMercadoPago(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
