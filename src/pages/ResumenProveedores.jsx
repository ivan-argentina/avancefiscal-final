import { useEffect, useMemo, useState } from "react";
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

import VisibilityIcon from "@mui/icons-material/Visibility";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import CloseIcon from "@mui/icons-material/Close";
import PrintIcon from "@mui/icons-material/Print";

import { DataGrid } from "@mui/x-data-grid";
import { supabase } from "../hook/supabaseClient";
import GenerarPdf from "../componentes/GenerarPdf";

import Tooltip from "@mui/material/Tooltip";
import { obtenerEmpresa } from "../utils/obtenerEmpresa";
import Notificaciones from "./Notificaciones";

export default function ResumenProveedores() {
  const [proveedores, setProveedores] = useState([]);
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState(null);
  const [idProveedor, setIdProveedor] = useState("");

  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  const [compras, setCompras] = useState([]);
  const [facturas, setFacturas] = useState([]);
  const [pagos, setPagos] = useState([]);

  const [loadingProveedor, setLoadingProveedor] = useState(false);
  const [loadingFacturas, setLoadingFacturas] = useState(false);
  const [loadingPagos, setLoadingPagos] = useState(false);

  const [error, setError] = useState("");

  const [detalleCompra, setDetalleCompra] = useState([]);
  const [facturaSeleccionada, setFacturaSeleccionada] = useState(null);
  const [openDetalle, setOpenDetalle] = useState(false);

  const [openPago, setOpenPago] = useState(false);
  const [comprasPendientes, setComprasPendientes] = useState([]);

  const [importeRecibido, setImporteRecibido] = useState("");
  const [formaPago, setFormaPago] = useState("Efectivo");
  const [observaciones, setObservaciones] = useState("");
  const [guardandoPago, setGuardandoPago] = useState(false);
  const [filtroFacturas, setFiltroFacturas] = useState("conSaldo");
  const [empresa, setEmpresa] = useState(null);
  const [proveedorId, setProveedorId] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [tipo, setTipo] = useState("");
  const [open, setOpen] = useState("");

  useEffect(() => {
    const cargarEmpresa = async () => {
      const data = await obtenerEmpresa();
      setEmpresa(data);
    };
    cargarEmpresa();
  }, []);
  useEffect(() => {
    cargarProveedores();
  }, []);

  useEffect(() => {
    if (openPago && idProveedor) {
      cargarComprasPendientes(idProveedor);
    }
  }, [openPago, idProveedor]);

  const abrirModalPago = () => {
    setError("");
    setImporteRecibido("");
    setObservaciones("");
    setFormaPago("Efectivo");

    const pendientes = (facturasFiltradas || [])
      .filter((item) => Number(item.saldo || 0) > 0)
      .map((item) => ({
        ...item,
        pagar: "",
      }));

    setComprasPendientes(pendientes);
    setOpenPago(true);
  };

  const facturasFiltradas = (compras || []).filter((factura) => {
    const saldo = Number(factura.saldo || 0);

    if (filtroFacturas === "conSaldo") {
      return saldo > 0;
    }

    if (filtroFacturas === "pagadas") {
      return saldo <= 0;
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

  const cargarProveedores = async () => {
    const usuarioGuardado = JSON.parse(localStorage.getItem("usuario"));
    const idEmpresa = await obtenerEmpresa(usuarioGuardado.id);

    setLoadingProveedor(true);
    setError("");

    const { data, error } = await supabase
      .from("proveedores")
      .select("id, nombre,direccion,telefono,email,cuit")
      .eq("idempresa", idEmpresa)
      .order("nombre", { ascending: true });

    if (error) {
      console.log("Error al cargar Proveedor:", error);
      setError("No se pudieron cargar los Proveedor.");
      setProveedores([]);
      setLoadingProveedor(false);
      return;
    }
    setProveedores(data || []);
    setLoadingProveedor(false);
  };

  const cargarPagos = async (idProveedor) => {
    const usuarioGuardado = JSON.parse(localStorage.getItem("usuario"));
    const idEmpresa = await obtenerEmpresa(usuarioGuardado.id);

    const id = idProveedor || proveedorId;
    if (!id) return;

    setLoadingPagos(true);

    const { data, error } = await supabase
      .from("pago_proveedores")
      .select("id, fecha, idproveedor,importe, forma_pago, observaciones")
      .eq("idproveedor", id)
      .eq("idempresa", idEmpresa)
      .order("fecha", { ascending: false });

    if (error) {
      console.log("Error al cargar pagos:", error);
      setPagos([]);
      setLoadingPagos(false);
      return;
    }

    setPagos(data || []);
    setLoadingPagos(false);
  };

  const cargarComprasPendientes = async (idProveedor) => {
    if (!idProveedor) {
      setComprasPendientes([]);
      return;
    }

    const usuarioGuardado = JSON.parse(localStorage.getItem("usuario"));
    const idEmpresa = await obtenerEmpresa(usuarioGuardado.id);
    const { data, error } = await supabase
      .from("compras")
      .select(
        "id, fecha, numero_comprobante, tipo_comprobante, total, saldo, estado_pago",
      )
      .eq("idproveedor", idProveedor)
      .eq("estado_pago", "pendiente")
      .eq("idempresa", idEmpresa)
      .gt("saldo", 0)
      .order("fecha", { ascending: true });

    if (error) {
      console.log("Error al cargar facturas pendientes:", error);
      setComprasPendientes([]);
      return;
    }

    const facturasConPago = (data || []).map((f) => ({
      ...f,
      pagar: "",
    }));

    setComprasPendientes(facturasConPago);
  };

  const buscarResumen = async () => {
    const usuarioGuardado = JSON.parse(localStorage.getItem("usuario"));
    const idEmpresa = await obtenerEmpresa(usuarioGuardado.id);

    setError("");

    const idProveedorActual = proveedorSeleccionado?.id;

    if (!idProveedorActual) {
      setError("Tenés que seleccionar un proveedor.");
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
      const { data, error } = await supabase
        .from("compras")
        .select(
          `
        id,
        fecha,
        numero_comprobante,
        tipo_comprobante,
        total,
        saldo,
        forma_pago,
        estado_pago,
        observaciones
        `,
        )
        .eq("idproveedor", idProveedorActual)
        .eq("idempresa", idEmpresa)
        .gte("fecha", fechaDesde)
        .lte("fecha", fechaHasta)
        .order("fecha", { ascending: true });

      if (error) {
        throw error;
      }

      setCompras(data || []);

      await cargarPagos(idProveedorActual);
    } catch (error) {
      console.error("Error al buscar facturas:", error);

      setError("No se pudieron cargar las facturas.");
      setCompras([]);
      setPagos([]);
    } finally {
      setLoadingFacturas(false);
    }
  };

  const aplicarPagoAutomatico = () => {
    let restante = Number(importeRecibido || 0);

    const actualizadas = comprasPendientes.map((factura) => {
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

    setComprasPendientes(actualizadas);
  };

  const manejarPagoFactura = (idfactura, valor) => {
    const numero = Number(valor || 0);

    setComprasPendientes((prev) =>
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

  const totalAplicado = comprasPendientes.reduce(
    (acc, item) => acc + Number(item.pagar || 0),
    0,
  );

  const guardarPago = async () => {
    const idProveedorActual = proveedorSeleccionado?.id;

    if (!idProveedorActual) {
      setError("Tenés que seleccionar un proveedor.");
      return;
    }

    const recibido = Number(importeRecibido || 0);

    if (recibido <= 0) {
      setError("Ingresá un importe recibido válido.");
      return;
    }

    const detallesAplicados = (comprasPendientes || []).filter(
      (item) => Number(item.pagar || 0) > 0,
    );

    if (detallesAplicados.length === 0) {
      setError("No hay importes aplicados a facturas.");
      return;
    }

    const totalAplicadoActual = detallesAplicados.reduce(
      (total, item) => total + Number(item.pagar || 0),
      0,
    );

    if (totalAplicadoActual > recibido) {
      setError("El total aplicado no puede ser mayor al importe recibido.");
      return;
    }

    setGuardandoPago(true);
    setError("");

    try {
      const usuarioGuardado = JSON.parse(localStorage.getItem("usuario"));

      if (!usuarioGuardado?.id) {
        throw new Error("No se encontró el usuario logueado.");
      }

      const idEmpresa = await obtenerEmpresa(usuarioGuardado.id);

      if (!idEmpresa) {
        throw new Error("No se encontró la empresa del usuario.");
      }

      /*
       * GUARDAR ENCABEZADO DEL PAGO
       */
      const { data: pagoCreado, error: errorPago } = await supabase
        .from("pago_proveedores")
        .insert([
          {
            fecha: new Date().toISOString().split("T")[0],
            idproveedor: idProveedorActual,
            importe: recibido,
            forma_pago: formaPago,
            observaciones: observaciones || "",
            idempresa: idEmpresa,
            idusuario: usuarioGuardado.id,
          },
        ])
        .select()
        .single();

      if (errorPago) {
        console.error("ERROR ENCABEZADO PAGO:", errorPago);
        throw errorPago;
      }

      /*
       * GUARDAR APLICACIONES DEL PAGO
       */
      const detalleInsert = detallesAplicados.map((item) => ({
        idpago: pagoCreado.id,
        idfactura: item.id,
        importe_aplicado: Number(item.pagar || 0),
        idproveedor: idProveedorActual,
        idempresa: idEmpresa,
      }));

      const { error: errorDetalle } = await supabase
        .from("detalle_pagos_proveedores")
        .insert(detalleInsert);

      if (errorDetalle) {
        console.error("ERROR DETALLE PAGO:", errorDetalle);
        throw errorDetalle;
      }

      /*
       * ACTUALIZAR SALDOS DE LAS COMPRAS
       */
      for (const item of detallesAplicados) {
        const saldoAnterior = Number(item.saldo || 0);
        const importeAplicado = Number(item.pagar || 0);

        const nuevoSaldo = Number(
          Math.max(0, saldoAnterior - importeAplicado).toFixed(2),
        );

        const { error: errorCompra } = await supabase
          .from("compras")
          .update({
            saldo: nuevoSaldo,
            estado_pago: nuevoSaldo <= 0 ? "pagada" : "pendiente",
          })
          .eq("id", item.id)
          .eq("idempresa", idEmpresa);

        if (errorCompra) {
          console.error("ERROR ACTUALIZANDO COMPRA:", errorCompra);
          throw errorCompra;
        }
      }

      /*
       * RECARGAR INFORMACIÓN
       */
      await cargarComprasPendientes(idProveedorActual);
      await cargarPagos(idProveedorActual);

      if (proveedorSeleccionado && fechaDesde && fechaHasta) {
        await buscarResumen();
      }

      /*
       * LIMPIAR MODAL
       */
      setOpenPago(false);
      setImporteRecibido("");
      setFormaPago("Efectivo");
      setObservaciones("");
      setComprasPendientes([]);

      setMensaje("Pago guardado correctamente");
      setTipo("success");
      setOpen(true);
    } catch (error) {
      console.error("Error al guardar pago:", error);

      setError(error?.message || error?.details || "Error al guardar el pago.");
    } finally {
      setGuardandoPago(false);
    }
  };

  const limpiarFiltros = () => {
    setIdProveedor("");
    setFechaDesde("");
    setFechaHasta("");
    setFacturas([]);
    setPagos([]);
    setImporteRecibido("");
    setFormaPago("Efectivo");
    setObservaciones("");
    setError("");
  };

  const totalDeuda = facturasFiltradas.reduce(
    (total, factura) => total + Number(factura.saldo || 0),
    0,
  );

  const columnas = [
    {
      field: "fecha",
      headerName: "Fecha",
      width: 110,
      renderCell: (params) => formatearFecha(params.row.fecha),
    },
    {
      field: "numero_comprobante",
      headerName: "N°",
      width: 100,
      renderCell: (params) => {
        const num = params.row.numero_comprobante;
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
      width: 130,
      renderCell: (params) => (
        <Typography fontWeight="bold">
          {formatearMoneda(params.row.total)}
        </Typography>
      ),
    },
    {
      field: "saldo",
      headerName: "Saldo",
      width: 130,
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
            <IconButton>
              <VisibilityIcon />
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
      field: "numero_comprobante",
      headerName: "N°",
      width: 100,
      renderCell: (params) => {
        const num = params.row.numero_comprobante;
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
          value={params.row.pagar ?? ""}
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
          Resumen de Proveedores
        </Typography>

        {/*Grid */}
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid size={{ xs: 12, md: 3 }}>
            <Autocomplete
              options={proveedores}
              value={proveedorSeleccionado}
              getOptionLabel={(option) => option?.nombre || ""}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              filterOptions={(options, state) => {
                const texto = String(state.inputValue || "")
                  .toLowerCase()
                  .trim();

                const textoNumerico = texto.replace(/\D/g, "");

                return options.filter((proveedor) => {
                  const nombre = String(proveedor.nombre || "").toLowerCase();

                  const cuitOriginal = String(
                    proveedor.cuit || "",
                  ).toLowerCase();

                  const cuitNumerico = cuitOriginal.replace(/\D/g, "");

                  return (
                    nombre.includes(texto) ||
                    cuitOriginal.includes(texto) ||
                    cuitNumerico.includes(textoNumerico)
                  );
                });
              }}
              onChange={(event, nuevoProveedor) => {
                setProveedorSeleccionado(nuevoProveedor);
                setProveedorId(nuevoProveedor?.id || "");
              }}
              renderOption={(props, option) => (
                <li {...props} key={option.id}>
                  <Box>
                    <Typography variant="body2">{option.nombre}</Typography>

                    <Typography variant="caption" color="text.secondary">
                      CUIT: {option.cuit || "Sin CUIT"}
                    </Typography>
                  </Box>
                </li>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Proveedor"
                  size="small"
                  fullWidth
                  placeholder="Buscar por nombre o CUIT"
                />
              )}
              noOptionsText="No se encontraron proveedores"
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
              label="Ver Facturas"
              value={filtroFacturas}
              onChange={(e) => setFiltroFacturas(e.target.value)}
            >
              <MenuItem value="conSaldo">Con Saldo</MenuItem>
              <MenuItem value="todas">Todas</MenuItem>
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
                onClick={abrirModalPago}
                disabled={
                  !proveedorSeleccionado ||
                  facturasFiltradas.length === 0 ||
                  totalDeuda <= 0
                }
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
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Paper sx={{ p: 2, borderRadius: 2 }}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    Cantidad de facturas: {facturasFiltradas.length}
                  </Typography>
                </Paper>
              </Grid>

              <Grid size={{ xs: 12, sm: 4 }}>
                <Paper sx={{ p: 2, borderRadius: 2 }}>
                  <Typography fontWeight="bold">
                    Total deuda: {formatearMoneda(totalDeuda)}
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
          Número: {facturaSeleccionada?._comprobante || "-"}
          <Box>
            <IconButton onClick={() => setOpenDetalle(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Artículo</TableCell>
                <TableCell>Cantidad</TableCell>
                <TableCell>Precio</TableCell>
                <TableCell>Subtotal</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {detalleCompra.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    {item.articulos?.descripcion ||
                      item.articulos?.nombre ||
                      item.descripcion ||
                      item.articulo ||
                      item.nombre ||
                      "-"}
                  </TableCell>

                  <TableCell>{item.cantidad}</TableCell>
                  <TableCell>{formatearMoneda(item.precio)}</TableCell>
                  <TableCell>{formatearMoneda(item.subtotal)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Typography sx={{ mt: 2, fontWeight: "bold" }}>
            Total:{" "}
            {formatearMoneda(
              detalleCompra.reduce(
                (acc, i) => acc + Number(i.subtotal || 0),
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
                <strong>Proveedor:</strong>{" "}
                {proveedorSeleccionado?.nombre || "-"}
              </Typography>

              <Typography variant="body1">
                <strong>Total aplicado:</strong>{" "}
                {formatearMoneda(totalAplicado)}
              </Typography>
            </Box>

            <Box sx={{ height: 350 }}>
              <DataGrid
                rows={comprasPendientes}
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
      ></Box>
      <Notificaciones
        open={open}
        mensaje={mensaje}
        tipo={tipo}
        onClose={() => setOpen(false)}
      />
    </Box>
  );
}
