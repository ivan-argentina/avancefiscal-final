import { useEffect, useMemo, useRef, useState } from "react";
import {
  Chip,
  IconButton,
  Autocomplete,
  Box,
  Button,
  Grid,
  Paper,
  TextField,
  Typography,
  DialogTitle,
  DialogContent,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Table,
  Dialog,
  MenuItem,
} from "@mui/material";

import DescriptionIcon from "@mui/icons-material/Description";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import CloseIcon from "@mui/icons-material/Close";
import PrintIcon from "@mui/icons-material/Print";
import Notificaciones from "./Notificaciones";

import { DataGrid } from "@mui/x-data-grid";
import { supabase } from "../hook/supabaseClient";
import GenerarPdf from "../componentes/GenerarPdf";
import { generarpdfU } from "../utils/generarpdfu";

import Tooltip from "@mui/material/Tooltip";
import { obtenerEmpresa } from "../utils/obtenerEmpresa";
import { formatoNumero } from "../utils/formato";

export default function ResumenClientes() {
  const [clientes, setClientes] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [clienteId, setClienteId] = useState("");

  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  const [facturas, setFacturas] = useState([]);
  const [pagos, setPagos] = useState([]);

  const [loadingClientes, setLoadingClientes] = useState(false);
  const [loadingFacturas, setLoadingFacturas] = useState(false);
  const [loadingPagos, setLoadingPagos] = useState(false);

  const [error, setError] = useState("");

  const [detalleFactura, setDetalleFactura] = useState([]);
  const [facturaSeleccionada, setFacturaSeleccionada] = useState(null);
  const [openDetalle, setOpenDetalle] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [tipo, setTipo] = useState("");
  const [open, setOpen] = useState("");

  const [openPago, setOpenPago] = useState(false);
  const [facturasPendientes, setFacturasPendientes] = useState([]);
  const [importeRecibido, setImporteRecibido] = useState("");
  const [formaPago, setFormaPago] = useState("Efectivo");
  const [observaciones, setObservaciones] = useState("");
  const [guardandoPago, setGuardandoPago] = useState(false);
  const [filtroFacturas, setFiltroFacturas] = useState("conSaldo");
  const [empresa, setEmpresa] = useState(null);
  const facturaPdfRef = useRef(null);
  const [pdfData, setPdfData] = useState({
    numeroFactura: "",
    fecha: "",
    tipoComprobante: "",
    letraComprobante: "X",
    formaPago: "",
    clienteSeleccionado: null,
    detalle: [],
    totalFactura: 0,
    observaciones: "",
    puntoVenta: 1,
  });

  useEffect(() => {
    const cargarEmpresa = async () => {
      const data = await obtenerEmpresa();
      setEmpresa(data);
    };
    cargarEmpresa();
  }, []);
  useEffect(() => {
    cargarClientes();
  }, []);

  useEffect(() => {
    if (openPago && clienteId) {
      cargarFacturasPendientes(clienteId);
    }
  }, [openPago, clienteId]);

  const facturasFiltradas = (facturas || []).filter((factura) => {
    const saldo = Number(factura?.saldo || 0);

    if (filtroFacturas === "conSaldo") {
      return saldo > 0;
    }

    if (filtroFacturas === "pagadas") {
      return saldo === 0;
    }

    return true;
  });

  const formatearMoneda = (valor) => {
    return `$ ${Number(valor || 0).toLocaleString("es-AR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return "-";

    const partes = fecha.split("-");
    if (partes.length !== 3) return fecha;

    const [anio, mes, dia] = partes;
    return `${dia}/${mes}/${anio}`;
  };

  const cargarClientes = async () => {
    setLoadingClientes(true);
    setError("");

    try {
      const usuarioGuardado = JSON.parse(
        localStorage.getItem("usuario") || "null",
      );

      if (!usuarioGuardado?.id) {
        setClientes([]);
        setError("No hay un usuario identificado.");
        return;
      }

      const idEmpresa = await obtenerEmpresa(usuarioGuardado.id);

      if (!idEmpresa) {
        setClientes([]);
        setError("No se pudo identificar la empresa.");
        return;
      }

      const { data, error } = await supabase
        .from("clientes")
        .select(
          `
        id,
        nombre,
        direccion,
        telefono,
        cuit,
        idciudad,
        idciva,
        ciudades(id, nombre),
        condicion_iva(id, descripcion)
      `,
        )
        .eq("idempresa", idEmpresa)
        .eq("activo", true)
        .order("nombre", { ascending: true });

      if (error) {
        throw error;
      }

      setClientes(data ?? []);
    } catch (error) {
      console.error("Error al cargar clientes:", error);
      setClientes([]);
      setError("No se pudieron cargar los clientes.");
    } finally {
      setLoadingClientes(false);
    }
  };

  const cargarPagos = async (idClienteParam) => {
    const idClienteFinal = idClienteParam || clienteId;

    if (!idClienteFinal) {
      setPagos([]);
      return;
    }

    setLoadingPagos(true);

    try {
      const usuarioGuardado = JSON.parse(
        localStorage.getItem("usuario") || "null",
      );

      if (!usuarioGuardado?.id) {
        setPagos([]);
        setError("No hay un usuario identificado.");
        return;
      }

      const idEmpresa = await obtenerEmpresa(usuarioGuardado.id);

      if (!idEmpresa) {
        setPagos([]);
        setError("No se pudo identificar la empresa.");
        return;
      }

      let consulta = supabase
        .from("pagos_clientes")
        .select(
          `
        id,
        fecha,
        importe,
        forma_pago,
        observaciones
      `,
        )
        .eq("idcliente", idClienteFinal)
        .eq("idempresa", idEmpresa)
        .order("fecha", { ascending: false });

      if (fechaDesde && fechaHasta) {
        consulta = consulta.gte("fecha", fechaDesde).lte("fecha", fechaHasta);
      }

      const { data, error } = await consulta;

      if (error) {
        throw error;
      }

      setPagos(data ?? []);
    } catch (error) {
      console.error("Error al cargar pagos:", error);
      setPagos([]);
      setError("No se pudieron cargar los pagos del cliente.");
    } finally {
      setLoadingPagos(false);
    }
  };

  const cargarFacturasPendientes = async (idClienteParam) => {
    if (!idClienteParam) {
      setFacturasPendientes([]);
      return;
    }
    const usuarioGuardado = JSON.parse(localStorage.getItem("usuario"));

    const idEmpresa = await obtenerEmpresa(usuarioGuardado.id);
    const { data, error } = await supabase
      .from("facturas")
      .select("id, fecha, numero, tipo_comprobante, total, saldo, estado_pago")
      .eq("idcliente", idClienteParam)
      .eq("estado_pago", "pendiente")
      .eq("idempresa", idEmpresa)
      .gt("saldo", 0)
      .order("fecha", { ascending: true });

    if (error) {
      console.error("Error al cargar facturas pendientes:", error);
      setFacturasPendientes([]);
      return;
    }

    const facturasConPago = (data || []).map((f) => ({
      ...f,
      pagar: 0,
    }));

    setFacturasPendientes(facturasConPago);
  };

  const buscarResumen = async () => {
    setError("");
    setFacturas([]);
    setPagos([]);

    if (!clienteSeleccionado?.id) {
      setError("Tenés que seleccionar un cliente.");
      return;
    }

    if (!fechaDesde || !fechaHasta) {
      setError("Tenés que ingresar fecha desde y fecha hasta.");
      return;
    }

    if (fechaDesde > fechaHasta) {
      setError("La fecha desde no puede ser mayor que la fecha hasta.");
      return;
    }

    setLoadingFacturas(true);

    try {
      const usuarioGuardado = JSON.parse(
        localStorage.getItem("usuario") || "null",
      );

      if (!usuarioGuardado?.id) {
        setError("No hay un usuario identificado.");
        return;
      }

      const idEmpresa = await obtenerEmpresa(usuarioGuardado.id);

      if (!idEmpresa) {
        setError("No se pudo identificar la empresa.");
        return;
      }

      const { data, error } = await supabase
        .from("facturas")
        .select(
          `
        id,
        fecha,
        numero,
        numero_fiscal,
        tipo_comprobante,
        letra_comprobante,
        total,
        saldo,
        forma_pago,
        estado_pago,
        observaciones
      `,
        )
        .eq("idcliente", clienteSeleccionado.id)
        .eq("idempresa", idEmpresa)
        .gte("fecha", fechaDesde)
        .lte("fecha", fechaHasta)
        .order("fecha", { ascending: true })
        .order("numero", { ascending: true });

      if (error) {
        throw error;
      }

      setFacturas(data ?? []);

      await cargarPagos(clienteSeleccionado.id);
    } catch (error) {
      console.error("Error al buscar el resumen del cliente:", error);
      setFacturas([]);
      setPagos([]);
      setError("No se pudo cargar el resumen del cliente.");
    } finally {
      setLoadingFacturas(false);
    }
  };

  const aplicarPagoAutomatico = () => {
    let restante = Number(importeRecibido || 0);

    const actualizadas = facturasPendientes.map((factura) => {
      const saldo = Number(factura.saldo || 0);

      if (restante <= 0) {
        return { ...factura, pagar: 0 };
      }

      const aplicado = Math.min(restante, saldo);
      restante -= aplicado;

      return {
        ...factura,
        pagar: aplicado,
      };
    });

    setFacturasPendientes(actualizadas);
  };

  const manejarPagoFactura = (idfactura, valor) => {
    const numero = Number(valor || 0);

    setFacturasPendientes((prev) =>
      prev.map((f) =>
        f.id === idfactura
          ? {
              ...f,
              pagar: Math.min(Math.max(numero, 0), Number(f.saldo || 0)),
            }
          : f,
      ),
    );
  };

  const totalAplicado = facturasPendientes.reduce(
    (acc, item) => acc + Number(item.pagar || 0),
    0,
  );

  const guardarPago = async () => {
    setError("");

    try {
      const usuarioGuardado = JSON.parse(
        localStorage.getItem("usuario") || "null",
      );

      if (!usuarioGuardado?.id) {
        setError("No hay un usuario identificado.");
        return;
      }

      const idEmpresa = await obtenerEmpresa(usuarioGuardado.id);

      if (!idEmpresa) {
        setError("No se pudo identificar la empresa.");
        return;
      }

      if (!clienteId) {
        setError("Tenés que seleccionar un cliente.");
        return;
      }

      const recibido = Number(importeRecibido ?? 0);

      if (!Number.isFinite(recibido) || recibido <= 0) {
        setError("Ingresá un importe recibido válido.");
        return;
      }

      const detallesAplicados = facturasPendientes.filter(
        (factura) => Number(factura.pagar ?? 0) > 0,
      );

      if (detallesAplicados.length === 0) {
        setError("No hay importes aplicados a facturas.");
        return;
      }

      const aplicacionInvalida = detallesAplicados.find((factura) => {
        const pagar = Number(factura.pagar ?? 0);
        const saldo = Number(factura.saldo ?? 0);

        return !Number.isFinite(pagar) || pagar <= 0 || pagar > saldo;
      });

      if (aplicacionInvalida) {
        setError(
          `El importe aplicado a la factura N° ${
            aplicacionInvalida.numero ?? ""
          } supera su saldo pendiente.`,
        );
        return;
      }

      const totalAplicadoActual = detallesAplicados.reduce(
        (acc, factura) => acc + Number(factura.pagar ?? 0),
        0,
      );

      if (totalAplicadoActual > recibido) {
        setError("El total aplicado no puede ser mayor al importe recibido.");
        return;
      }

      setGuardandoPago(true);

      const { data: pagoCreado, error: errorPago } = await supabase
        .from("pagos_clientes")
        .insert([
          {
            fecha: new Date().toISOString().split("T")[0],
            idcliente: clienteId,
            importe: recibido,
            forma_pago: formaPago,
            observaciones: observaciones.trim() || null,
            idempresa: idEmpresa,
          },
        ])
        .select("id")
        .single();

      if (errorPago) {
        throw errorPago;
      }

      const detalleInsert = detallesAplicados.map((item) => ({
        idpago: pagoCreado.id,
        idfactura: item.id,
        importe_aplicado: Number(item.pagar ?? 0),
      }));

      const { error: errorDetalle } = await supabase
        .from("detalle_pagos_clientes")
        .insert(detalleInsert);

      if (errorDetalle) {
        throw errorDetalle;
      }

      for (const item of detallesAplicados) {
        const saldoActual = Number(item.saldo ?? 0);
        const importeAplicado = Number(item.pagar ?? 0);

        const nuevoSaldo = Math.max(
          0,
          Number((saldoActual - importeAplicado).toFixed(2)),
        );

        const { error: errorFactura } = await supabase
          .from("facturas")
          .update({
            saldo: nuevoSaldo,
            estado_pago: nuevoSaldo === 0 ? "pagada" : "pendiente",
          })
          .eq("id", item.id)
          .eq("idcliente", clienteId)
          .eq("idempresa", idEmpresa);

        if (errorFactura) {
          throw errorFactura;
        }
      }

      await Promise.all([
        cargarFacturasPendientes(clienteId),
        cargarPagos(clienteId),
      ]);

      if (clienteSeleccionado?.id && fechaDesde && fechaHasta) {
        await buscarResumen();
      }

      setOpenPago(false);
      setImporteRecibido("");
      setFormaPago("Efectivo");
      setObservaciones("");
      setFacturasPendientes([]);

      setMensaje("Pago guardado correctamente");
      setTipo("success");
      setOpen(true);
    } catch (error) {
      console.error("Error al guardar el pago:", error);

      setError(error?.message || error?.details || "Error al guardar el pago.");
    } finally {
      setGuardandoPago(false);
    }
  };

  const verDetalle = async (factura) => {
    if (!factura?.id) return;

    setFacturaSeleccionada(factura);
    setDetalleFactura([]);

    const { data, error } = await supabase
      .from("detalle_factura")
      .select(
        `
      id,
      cantidad,
      precio,
      subtotal,
      idarticulo,
      articulos (
        codigo,
        descripcion
      )
    `,
      )
      .eq("idfactura", factura.id);

    if (error) {
      console.error("Error al traer el detalle:", error);
      setDetalleFactura([]);
      setOpenDetalle(true);
      return;
    }

    setDetalleFactura(data ?? []);
    setOpenDetalle(true);
  };

  const limpiarFiltros = () => {
    setClienteSeleccionado(null);
    setClienteId("");
    setFechaDesde("");
    setFechaHasta("");
    setFacturas([]);
    setPagos([]);
    setFacturasPendientes([]);
    setImporteRecibido("");
    setFormaPago("Efectivo");
    setObservaciones("");
    setError("");
  };

  const totalDeuda = useMemo(() => {
    return facturasFiltradas.reduce(
      (acc, item) => acc + Number(item.saldo ?? 0),
      0,
    );
  }, [facturasFiltradas]);

  const columnas = [
    {
      field: "fecha",
      headerName: "Fecha",
      width: 110,
      renderCell: (params) => formatearFecha(params.row.fecha),
    },
    {
      field: "numero",
      headerName: "N°",
      width: 140,
      renderCell: (params) => {
        const num = params.row.numero;
        if (num === null || num === undefined) return "-";

        return Number(num).toString().padStart(4, "0");
      },
    },
    {
      field: "tipo_comprobante",
      headerName: "Tipo",
      width: 130,
      renderCell: (params) => {
        const tipo = params.row.tipo_comprobante || "-";
        return tipo.replaceAll("_", " ");
      },
    },
    {
      field: "total",
      headerName: "Total",
      width: 140,
      renderCell: (params) => (
        <Typography fontWeight="bold">
          {formatearMoneda(params.row.total)}
        </Typography>
      ),
    },
    {
      field: "saldo",
      headerName: "Saldo",
      width: 140,
      renderCell: (params) => {
        const saldo = Number(params.row.saldo || 0);

        return (
          <Typography
            fontWeight="bold"
            color={saldo > 0 ? "error.main" : "success.main"}
          >
            {formatearMoneda(saldo)}
          </Typography>
        );
      },
    },
    {
      field: "forma_pago",
      headerName: "Forma de pago",
      width: 150,
      renderCell: (params) => {
        const forma = params.row.forma_pago || "-";

        return (
          <Chip label={forma} size="small" color="primary" variant="outlined" />
        );
      },
    },
    {
      field: "estado_pago",
      headerName: "Estado",
      width: 130,
      renderCell: (params) => {
        const esPendiente = params.row.estado_pago === "pendiente";

        return (
          <Chip
            label={esPendiente ? "Debe" : "Pagado"}
            color={esPendiente ? "error" : "success"}
            size="small"
          />
        );
      },
    },
    {
      field: "acciones",
      headerName: "",
      width: 120,
      sortable: false,
      renderCell: (params) => (
        <>
          <Tooltip title="Ver Detalle">
            <IconButton
              color="primary"
              size="small"
              onClick={() => verDetalle(params.row)}
              aria-label="Ver detalle"
            >
              <DescriptionIcon />
            </IconButton>
          </Tooltip>
        </>
      ),
    },
  ];

  const columnasPagos = [
    {
      field: "fecha",
      headerName: "Fecha",
      width: 120,
      renderCell: (params) => formatearFecha(params.row.fecha),
    },
    {
      field: "importe",
      headerName: "Importe",
      width: 140,
      renderCell: (params) => {
        const importe = Number(params.row.importe || 0);

        return (
          <Typography fontWeight="bold" color="success.main">
            {formatearMoneda(importe)}
          </Typography>
        );
      },
    },
    {
      field: "forma_pago",
      headerName: "Forma de pago",
      width: 150,
      renderCell: (params) => {
        const forma = params.row.forma_pago || "-";

        return (
          <Chip label={forma} size="small" color="primary" variant="outlined" />
        );
      },
    },
    {
      field: "observaciones",
      headerName: "Observaciones",
      flex: 1,
      minWidth: 180,
      renderCell: (params) => params.row.observaciones || "-",
    },
  ];

  const columnasPagoFactura = [
    {
      field: "fecha",
      headerName: "Fecha",
      width: 110,
      renderCell: (params) => formatearFecha(params.row.fecha),
    },
    {
      field: "numero",
      headerName: "N°",
      width: 100,
      renderCell: (params) => {
        const num = params.row.numero;
        if (num === null || num === undefined) return "-";

        return String(num).padStart(4, "0");
      },
    },
    {
      field: "tipo_comprobante",
      headerName: "Tipo",
      width: 120,
      renderCell: (params) => {
        const tipo = params.row.tipo_comprobante || "-";
        return tipo.replaceAll("_", " ");
      },
    },
    {
      field: "saldo",
      headerName: "Saldo",
      width: 130,
      renderCell: (params) => {
        const saldo = Number(params.row.saldo || 0);

        return (
          <Typography fontWeight="bold" color="error.main">
            {formatearMoneda(saldo)}
          </Typography>
        );
      },
    },
    {
      field: "pagar",
      headerName: "A pagar",
      width: 250,
      renderCell: (params) => (
        <TextField
          size="small"
          type="number"
          value={params.row.pagar}
          onChange={(e) => manejarPagoFactura(params.row.id, e.target.value)}
          inputProps={{
            min: 0,
            max: params.row.saldo,
            step: "0.01",
          }}
          sx={{ width: "100%" }}
        />
      ),
    },
  ];

  return (
    <Box
      sx={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        borderRadius: 3,
      }}
    >
      {/* Header */}
      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          Resumen de Clientes
        </Typography>

        {/*Grid */}
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid size={{ xs: 12, md: 3 }}>
            <Autocomplete
              options={clientes}
              loading={loadingClientes}
              value={clienteSeleccionado}
              onChange={(event, newValue) => {
                setClienteSeleccionado(newValue || null);
                setClienteId(newValue?.id || "");
                setPagos([]);
                setFacturas([]);
              }}
              getOptionLabel={(option) => option?.nombre || ""}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderInput={(params) => (
                <TextField {...params} label="Cliente" fullWidth />
              )}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 1.7 }}>
            <TextField
              label="Desde"
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 1.7 }}>
            <TextField
              label="Hasta"
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          {/*ver facturas*/}
          <Grid size={{ xs: 12, sm: 2 }}>
            <TextField
              select
              size="small"
              label="Mostrar"
              value={filtroFacturas}
              onChange={(e) => setFiltroFacturas(e.target.value)}
            >
              <MenuItem value="conSaldo">Con Saldo</MenuItem>
              <MenuItem value="todas">Todas</MenuItem>
              <MenuItem value="pagadas">Pagadas</MenuItem>
            </TextField>
          </Grid>

          <Grid size={{ xs: 12, md: 3 }}>
            <Box sx={{ display: "flex", gap: 2 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={buscarResumen}
                fullWidth
                startIcon={<SearchIcon />}
                sx={{
                  height: 56,
                  borderRadius: 2,
                  textTransform: "none",
                  fontWeight: "bold",
                }}
              >
                Buscar
              </Button>

              <Button
                variant="contained"
                color="success"
                onClick={() => setOpenPago(true)}
                disabled={!clienteId}
                fullWidth
                startIcon={<SearchIcon />}
                sx={{
                  height: 56,
                  borderRadius: 2,
                  textTransform: "none",
                  fontWeight: "bold",
                }}
              >
                Pago
              </Button>

              <Button
                variant="text"
                color="inherit"
                onClick={limpiarFiltros}
                fullWidth
                startIcon={<ClearIcon />}
                sx={{
                  height: 56,
                  borderRadius: 2,
                  textTransform: "none",
                  fontWeight: "bold",
                }}
              >
                Limpiar
              </Button>
            </Box>
          </Grid>
        </Grid>

        {error && (
          <Typography color="error" sx={{ mt: 2 }}>
            {error}
          </Typography>
        )}
      </Paper>

      <Grid container spacing={2}>
        {/* cuadro de la izquierda */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper
            sx={{
              p: 2,
              borderRadius: 3,
              height: "calc(100vh - 180px)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    textAlign: "center",
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Comprobantes
                  </Typography>

                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {facturasFiltradas.length}
                  </Typography>
                </Paper>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    textAlign: "center",
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Saldo pendiente
                  </Typography>

                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    $ {formatoNumero(totalDeuda)}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            <Box sx={{ flexGrow: 1, width: "100%", minHeight: 0 }}>
              <DataGrid
                rows={facturasFiltradas}
                columns={columnas}
                loading={loadingFacturas}
                disableRowSelectionOnClick
                getRowId={(row) => row.id}
                initialState={{
                  pagination: {
                    paginationModel: { pageSize: 20, page: 0 },
                  },
                }}
                pageSizeOptions={[10, 20, 50]}
                localeText={{
                  noRowsLabel: "No hay facturas para mostrar",
                }}
                sx={{
                  border: 0,
                  "& .MuiDataGrid-columnHeaders": {
                    fontWeight: "bold",
                    backgroundColor: "#f8f9fa",
                  },
                  "& .MuiDataGrid-cell": {
                    display: "flex",
                    alignItems: "center",
                  },
                }}
              />
            </Box>
          </Paper>
        </Grid>
        {/*cuadro derecha */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 2, borderRadius: 3, height: "100%" }}>
            <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
              Pagos realizados
            </Typography>

            <Box sx={{ width: "100%", height: 600 }}>
              <DataGrid
                rows={pagos}
                columns={columnasPagos}
                loading={loadingPagos}
                getRowId={(row) => row.id}
                disableRowSelectionOnClick
                pageSizeOptions={[10, 20, 50]}
                initialState={{
                  pagination: {
                    paginationModel: { pageSize: 20, page: 0 },
                  },
                }}
                localeText={{
                  noRowsLabel: "No hay pagos registrados",
                }}
                sx={{
                  border: 0,
                  "& .MuiDataGrid-columnHeaders": {
                    fontWeight: "bold",
                    backgroundColor: "#f8f9fa",
                  },
                  "& .MuiDataGrid-cell": {
                    display: "flex",
                    alignItems: "center",
                  },
                }}
              />
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <Dialog
        open={openDetalle}
        onClose={() => setOpenDetalle(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          Número: {facturaSeleccionada?.numero || "-"}
        </DialogTitle>
        <DialogContent>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr 100px 130px 130px",
              gap: 2,
              px: 2,
              py: 1,
              borderBottom: "1px solid #ddd",
              fontWeight: 600,
            }}
          >
            <Typography>Artículo</Typography>
            <Typography align="right">Cantidad</Typography>
            <Typography align="right">Precio</Typography>
            <Typography align="right">Subtotal</Typography>
          </Box>

          {detalleFactura.length === 0 ? (
            <Typography
              sx={{
                py: 3,
                textAlign: "center",
                color: "text.secondary",
              }}
            >
              Este comprobante no tiene artículos asociados.
            </Typography>
          ) : (
            detalleFactura.map((item) => (
              <Box
                key={item.id}
                sx={{
                  display: "grid",
                  gridTemplateColumns: "1fr 100px 130px 130px",
                  gap: 2,
                  px: 2,
                  py: 1.5,
                  borderBottom: "1px solid #eee",
                  alignItems: "center",
                }}
              >
                <Box>
                  <Typography sx={{ fontWeight: 600 }}>
                    {item.articulos?.descripcion ?? "Artículo sin descripción"}
                  </Typography>

                  <Typography variant="body2" color="text.secondary">
                    Código: {item.articulos?.codigo ?? "-"}
                  </Typography>
                </Box>

                <Typography align="right">
                  {formatoNumero(item.cantidad)}
                </Typography>

                <Typography align="right">
                  $ {formatoNumero(item.precio)}
                </Typography>

                <Typography align="right" sx={{ fontWeight: 600 }}>
                  $ {formatoNumero(item.subtotal)}
                </Typography>
              </Box>
            ))
          )}

          <Typography sx={{ mt: 2, fontWeight: 700 }}>
            Total: ${" "}
            {formatoNumero(
              detalleFactura.reduce(
                (acc, item) => acc + Number(item.subtotal ?? 0),
                0,
              ),
            )}
          </Typography>
        </DialogContent>
      </Dialog>

      <Dialog
        open={openPago}
        onClose={() => setOpenPago(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>Registrar Pago</DialogTitle>

        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  label="Importe recibido"
                  type="number"
                  fullWidth
                  size="small"
                  value={importeRecibido}
                  onChange={(e) => setImporteRecibido(e.target.value)}
                />
              </Grid>

              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  select
                  label="Forma de pago"
                  fullWidth
                  size="small"
                  value={formaPago}
                  onChange={(e) => setFormaPago(e.target.value)}
                >
                  <MenuItem value="Efectivo">Efectivo</MenuItem>
                  <MenuItem value="Transferencia">Transferencia</MenuItem>
                  <MenuItem value="Tarjeta">Tarjeta</MenuItem>
                  <MenuItem value="Cheque">Cheque</MenuItem>
                </TextField>
              </Grid>

              <Grid size={{ xs: 12, md: 4 }}>
                <Button
                  variant="outlined"
                  fullWidth
                  sx={{ height: 40 }}
                  onClick={aplicarPagoAutomatico}
                >
                  Aplicar automático
                </Button>
              </Grid>

              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Observaciones"
                  fullWidth
                  size="small"
                  multiline
                  minRows={2}
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                />
              </Grid>
            </Grid>

            <Box sx={{ mt: 2, mb: 2 }}>
              <Typography variant="body1">
                <strong>Cliente:</strong> {clienteSeleccionado?.nombre || "-"}
              </Typography>

              <Typography variant="body1">
                <strong>Total aplicado:</strong>{" "}
                {formatearMoneda(totalAplicado)}
              </Typography>
            </Box>

            <Box sx={{ height: 350 }}>
              <DataGrid
                rows={facturasPendientes}
                columns={columnasPagoFactura}
                getRowId={(row) => row.id}
                disableRowSelectionOnClick
                pageSizeOptions={[10, 20, 50, 100]}
                initialState={{
                  pagination: {
                    paginationModel: { pageSize: 100, page: 0 },
                  },
                }}
                localeText={{
                  noRowsLabel: "No hay facturas pendientes",
                }}
                sx={{
                  border: 0,
                  "& .MuiDataGrid-columnHeaders": {
                    fontWeight: "bold",
                    backgroundColor: "#f8f9fa",
                  },
                  "& .MuiDataGrid-cell": {
                    display: "flex",
                    alignItems: "center",
                  },
                }}
              />
            </Box>

            <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
              <Button
                variant="contained"
                onClick={guardarPago}
                disabled={guardandoPago}
              >
                {guardandoPago ? "Guardando..." : "Guardar pago"}
              </Button>

              <Button variant="outlined" onClick={() => setOpenPago(false)}>
                Cancelar
              </Button>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>
      <Box
        sx={{
          position: "absolute",
          left: "-10000px",
          top: 0,
          width: "794px",
          backgroundColor: "#fff",
        }}
      >
        <GenerarPdf
          ref={facturaPdfRef}
          empresa={empresa}
          numeroFactura={pdfData.numeroFactura}
          fecha={pdfData.fecha}
          tipoComprobante={pdfData.tipoComprobante}
          letraComprobante={pdfData.letraComprobante}
          formaPago={pdfData.formaPago}
          clienteSeleccionado={pdfData.clienteSeleccionado}
          detalle={pdfData.detalle}
          totalFactura={pdfData.totalFactura}
          observaciones={pdfData.observaciones}
          puntoVenta={pdfData.puntoVenta}
        />
      </Box>
      <Notificaciones
        open={open}
        mensaje={mensaje}
        tipo={tipo}
        onClose={() => setOpen(false)}
      />
    </Box>
  );
}
