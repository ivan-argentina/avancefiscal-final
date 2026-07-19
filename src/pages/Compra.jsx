import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { supabase } from "../hook/supabaseClient";
import { obtenerEmpresa } from "../utils/obtenerEmpresa";

import {
  Autocomplete,
  Box,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Button,
  CircularProgress,
  Snackbar,
  Alert,
} from "@mui/material";

import { DataGrid } from "@mui/x-data-grid";
import VisibilityIcon from "@mui/icons-material/Visibility";
import SearchIcon from "@mui/icons-material/Search";
import SaveIcon from "@mui/icons-material/Save";
import DeleteIcon from "@mui/icons-material/Delete";

export default function Compra() {
  const drawerWidth = 240;
  const inputArticuloRef = useRef(null);
  const Compra = useRef(null);
  const [proveedores, setProveedores] = useState([]);
  const [articulos, setArticulos] = useState([]);

  const [proveedorId, setProveedorId] = useState("");
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState(null);

  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [formaPago, setFormaPago] = useState("Contado");
  const [medioPago, setMedioPago] = useState("efectivo");
  const [tipoComprobante, setTipoComprobante] = useState("factura");
  const [letraComprobante, setLetraComprobante] = useState("A");
  const [numeroComprobante, setNumeroComprobante] = useState("");
  const [observaciones, setObservaciones] = useState("");

  const [articuloSeleccionado, setArticuloSeleccionado] = useState(null);
  const [inputArticulo, setInputArticulo] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [precio, setPrecio] = useState("");
  const [detalle, setDetalle] = useState([]);
  const [articuloId, setArticuloId] = useState("");
  const [precioCosto, setPrecioCosto] = useState(0);
  const [puntoVenta, setPuntoVenta] = useState("1");
  const [mensaje, setMensaje] = useState("");
  const [tipo, setTipo] = useState("");
  const [open, setOpen] = useState("");
  const [guardando, setGuardando] = useState(false);
  const cantidadRef = useRef(null);
  const totalCompra = useMemo(() => {
    return detalle.reduce((acc, item) => acc + Number(item.subtotal || 0), 0);
  }, [detalle]);

  const mostrarNotificacion = useCallback((mensaje, tipo) => {
    setMensaje(mensaje);
    setTipo(tipo);
    setOpen(true);
  }, []);
  const formatoNumero = (valor) =>
    new Intl.NumberFormat("es-AR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(valor ?? 0));

  const cargarProveedores = useCallback(async () => {
    try {
      const usuarioGuardado = JSON.parse(
        localStorage.getItem("usuario") || "null",
      );

      if (!usuarioGuardado?.id) {
        setProveedores([]);
        mostrarNotificacion("No hay un usuario identificado", "warning");
        return;
      }

      const idEmpresa = await obtenerEmpresa(usuarioGuardado.id);

      if (!idEmpresa) {
        setProveedores([]);
        mostrarNotificacion("No se pudo identificar la empresa", "error");
        return;
      }

      const { data, error } = await supabase
        .from("proveedores")
        .select(
          `
        id,
        nombre,
        direccion,
        telefono,
        email,
        cuit,
        idciudad,
        idciva,
        ciudades(nombre),
        condicion_iva(descripcion)
      `,
        )
        .eq("idempresa", idEmpresa)
        .eq("activo", true)
        .order("nombre", { ascending: true });

      if (error) {
        console.error("Error al cargar proveedores:", error);
        setProveedores([]);
        setMensaje("Error al cargar los proveedores");
        setTipo("error");
        setOpen(true);
        return;
      }
      setProveedores(data ?? []);
    } catch (error) {
      console.error("Error inesperado cargando proveedores:", error);
      setProveedores([]);
      //mostrarNotificacion("No se pudieron cargar los proveedores", "error");
      setMensaje("No se pudieron cargar los proveedores");
      setTipo("error");
      setOpen(true);
    }
  }, []);

  const cargarArticulos = useCallback(async () => {
    try {
      const usuarioGuardado = JSON.parse(
        localStorage.getItem("usuario") || "null",
      );

      if (!usuarioGuardado?.id) {
        setArticulos([]);
        mostrarNotificacion("No hay un usuario identificado", "warning");
        return;
      }

      const idEmpresa = await obtenerEmpresa(usuarioGuardado.id);

      if (!idEmpresa) {
        setArticulos([]);
        mostrarNotificacion("No se pudo identificar la empresa", "error");
        return;
      }

      const { data, error } = await supabase
        .from("articulos")
        .select(
          `
        id,
        codigo,
        descripcion,
        precio,
        precio_costo,
        stock,
        stock_minimo,
        idfamilia,
        imagen_url
      `,
        )
        .eq("idempresa", idEmpresa)
        .eq("activo", true)
        .order("descripcion", { ascending: true });

      if (error) {
        console.error("Error al cargar artículos:", error);
        setArticulos([]);
        mostrarNotificacion("Error al cargar los artículos", "error");
        return;
      }

      setArticulos(data ?? []);
    } catch (error) {
      console.error("Error inesperado al cargar artículos:", error);
      setArticulos([]);
      mostrarNotificacion("No se pudieron cargar los artículos", "error");
    }
  }, []);

  useEffect(() => {
    cargarProveedores();
    cargarArticulos();
  }, [cargarProveedores, cargarArticulos]);

  const agregarDetalle = () => {
    if (!articuloSeleccionado?.id) {
      setMensaje("Seleccione un artículo");
      setTipo("warning");
      setOpen(true);
      return;
    }

    const cantidadNumerica = Number(cantidad);
    const precioNumerico = Number(precio);

    if (!Number.isFinite(cantidadNumerica) || cantidadNumerica <= 0) {
      setMensaje("Ingrese una cantidad válida");
      setTipo("warning");
      setOpen(true);
      return;
    }

    if (!Number.isFinite(precioNumerico) || precioNumerico <= 0) {
      setMensaje("Ingrese un precio válido");
      setTipo("warning");
      setOpen(true);
      return;
    }

    setDetalle((detalleActual) => {
      const itemExistente = detalleActual.find(
        (item) => item.idarticulo === articuloSeleccionado.id,
      );

      if (itemExistente) {
        return detalleActual.map((item) => {
          if (item.idarticulo !== articuloSeleccionado.id) {
            return item;
          }

          const nuevaCantidad = Number(item.cantidad) + cantidadNumerica;

          const nuevoSubtotal = Number(
            (nuevaCantidad * precioNumerico).toFixed(2),
          );

          return {
            ...item,
            cantidad: nuevaCantidad,
            precio: precioNumerico,
            subtotal: nuevoSubtotal,
          };
        });
      }

      const subtotal = Number((cantidadNumerica * precioNumerico).toFixed(2));

      return [
        ...detalleActual,
        {
          id: articuloSeleccionado.id,
          idarticulo: articuloSeleccionado.id,
          codigo: articuloSeleccionado.codigo ?? "",
          descripcion: articuloSeleccionado.descripcion ?? "",
          cantidad: cantidadNumerica,
          precio: precioNumerico,
          subtotal,
        },
      ];
    });

    setArticuloSeleccionado(null);
    setInputArticulo("");
    setCantidad("");
    setPrecio("");

    setTimeout(() => {
      inputArticuloRef.current?.focus();
    }, 100);
  };

  const eliminarDetalle = (id) => {
    setDetalle((prev) => prev.filter((item) => item.id !== id));
  };
  const guardarCompra = async () => {
    if (!proveedorId) {
      setMensaje("Seleccione un proveedor");
      setTipo("warning");
      setOpen(true);
      return;
    }

    if (detalle.length === 0) {
      setMensaje("Ingrese al menos un artículo");
      setTipo("warning");
      setOpen(true);
      return;
    }

    if (guardando) return;

    setGuardando(true);

    try {
      const usuarioGuardado = JSON.parse(localStorage.getItem("usuario"));
      const idEmpresa = await obtenerEmpresa(usuarioGuardado.id);

      if (!idEmpresa) {
        setMensaje("No se encontró ninguna empresa");
        setTipo("warning");
        setOpen(true);
        return;
      }

      const compraNueva = {
        fecha,
        idproveedor: proveedorId,
        tipo_comprobante: tipoComprobante,
        letra_comprobante: letraComprobante,
        punto_venta: puntoVenta,
        numero_comprobante: numeroComprobante,
        forma_pago: formaPago,
        medio_pago: medioPago,
        observaciones,
        subtotal: totalCompra,
        total: totalCompra,
        saldo: formaPago === "Cuenta corriente" ? totalCompra : 0,
        estado_pago: formaPago === "Cuenta corriente" ? "pendiente" : "pagada",
        idempresa: idEmpresa,
        idusuario: usuarioGuardado.id,
      };

      const { data: compraGuardada, error: errorCompra } = await supabase
        .from("compras")
        .insert([compraNueva])
        .select()
        .single();

      if (errorCompra) {
        throw errorCompra;
      }

      const detalleCompra = detalle.map((item) => ({
        idcompra: compraGuardada.id,
        idarticulo: item.idarticulo,
        cantidad: item.cantidad,
        precio: item.precio,
        subtotal: item.subtotal,
      }));

      const { error: errorDetalle } = await supabase
        .from("detalle_compras")
        .insert(detalleCompra);

      if (errorDetalle) {
        throw errorDetalle;
      }

      for (const item of detalle) {
        const articulo = articulos.find((a) => a.id === item.idarticulo);
        const stockActual = Number(articulo?.stock || 0);
        const nuevoStock = stockActual + Number(item.cantidad);

        const costoAnterior = Number(articulo?.precio_costo || 0);
        const precioVentaAnterior = Number(articulo?.precio || 0);
        const costoNuevo = Number(item.precio);

        let precioVentaNuevo = precioVentaAnterior;

        // Mantiene el mismo porcentaje de margen
        if (costoAnterior > 0 && precioVentaAnterior > 0) {
          const factorMargen = precioVentaAnterior / costoAnterior;
          precioVentaNuevo = Number((costoNuevo * factorMargen).toFixed(2));
        }

        const { error: errorStock } = await supabase
          .from("articulos")
          .update({
            stock: nuevoStock,
            precio_costo: costoNuevo,
            precio: precioVentaNuevo,
          })
          .eq("id", item.idarticulo)
          .eq("idempresa", idEmpresa);

        if (errorStock) {
          throw errorStock;
        }
      }

      setProveedorId("");
      setProveedorSeleccionado(null);
      setFormaPago("Contado");
      setMedioPago("efectivo");
      setTipoComprobante("factura");
      setLetraComprobante("A");
      setNumeroComprobante("");
      setObservaciones("");
      setDetalle([]);

      await cargarArticulos();

      setMensaje("Compra guardada correctamente");
      setTipo("success");
      setOpen(true);
    } catch (error) {
      console.error("Error al guardar la compra:", error);

      setMensaje(error.message || "Error al guardar la compra");
      setTipo("error");
      setOpen(true);
    } finally {
      setGuardando(false);
    }
  };

  const columnasDetalle = [
    {
      field: "codigo",
      headerName: "Código",
      width: 120,
    },
    {
      field: "descripcion",
      headerName: "Artículo",
      flex: 1,
      minWidth: 180,
    },
    {
      field: "cantidad",
      headerName: "Cantidad",
      width: 110,
      align: "right",
      headerAlign: "right",
    },
    {
      field: "precio",
      headerName: "Precio",
      width: 130,
      align: "right",
      headerAlign: "right",
      valueFormatter: (value) => `$ ${formatoNumero(value ?? 0)}`,
    },
    {
      field: "subtotal",
      headerName: "Subtotal",
      width: 140,
      align: "right",
      headerAlign: "right",
      valueFormatter: (value) => `$ ${formatoNumero(value ?? 0)}`,
    },
    {
      field: "eliminar",
      headerName: "",
      width: 70,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      align: "center",
      renderCell: (params) => (
        <IconButton
          color="error"
          size="small"
          aria-label={`Eliminar ${params.row.descripcion}`}
          onClick={() => eliminarDetalle(params.row.id)}
        >
          <DeleteIcon />
        </IconButton>
      ),
    },
  ];

  return (
    <Box
      sx={{
        p: 1,
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          borderRadius: 2,
          mb: 2,
          flesShrink: 0,
        }}
      >
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 3 }}>
            <Autocomplete
              options={proveedores}
              value={proveedorSeleccionado}
              getOptionLabel={(option) => {
                if (!option) return "";

                return option.cuit
                  ? `${option.nombre} - ${option.cuit}`
                  : option.nombre || "";
              }}
              isOptionEqualToValue={(option, value) => option.id === value?.id}
              filterOptions={(options, state) => {
                const busqueda = state.inputValue.toLowerCase().trim();

                const busquedaSinGuiones = busqueda.replace(/\D/g, "");

                return options.filter((proveedor) => {
                  const nombre = String(proveedor.nombre || "").toLowerCase();

                  const cuit = String(proveedor.cuit || "").replace(/\D/g, "");

                  const coincideNombre = nombre.includes(busqueda);

                  const coincideCuit =
                    busquedaSinGuiones && cuit.includes(busquedaSinGuiones);

                  return coincideNombre || coincideCuit;
                });
              }}
              onChange={(event, nuevoProveedor) => {
                setProveedorSeleccionado(nuevoProveedor);
                setProveedorId(nuevoProveedor?.id ?? "");
              }}
              noOptionsText="No se encontraron proveedores"
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Proveedor"
                  fullWidth
                  size="small"
                  placeholder="Buscar por nombre o CUIT"
                />
              )}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 2 }}>
            <TextField
              type="date"
              label="Fecha"
              fullWidth
              size="small"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 2 }}>
            <TextField
              select
              label="Forma de pago"
              fullWidth
              size="small"
              value={formaPago}
              onChange={(e) => setFormaPago(e.target.value)}
            >
              <MenuItem value="Contado">Contado</MenuItem>
              <MenuItem value="Cuenta corriente">Cuenta corriente</MenuItem>
            </TextField>
          </Grid>

          <Grid size={{ xs: 12, md: 2 }}>
            <TextField
              select
              label="Medio de pago"
              fullWidth
              size="small"
              value={medioPago}
              onChange={(e) => setMedioPago(e.target.value)}
              disabled={formaPago !== "Contado"}
            >
              <MenuItem value="efectivo">Efectivo</MenuItem>
              <MenuItem value="debito">Debito</MenuItem>
              <MenuItem value="credito">Credito</MenuItem>
              <MenuItem value="transferencia">transferencia</MenuItem>
            </TextField>
          </Grid>
          <Grid size={{ sx: 12, md: 2 }}>
            <TextField
              select
              label="Comprobante"
              fullWidth
              size="small"
              value={tipoComprobante}
              onChange={(e) => setTipoComprobante(e.target.value)}
            >
              <MenuItem value="factura">Factura</MenuItem>
              <MenuItem value="nota_de_credito">Nota de credito</MenuItem>
              <MenuItem value="remito">Remito</MenuItem>
              <MenuItem value="ticket">Ticket</MenuItem>
            </TextField>
          </Grid>

          <Grid size={{ xs: 12, md: 1.5 }}>
            <TextField
              label="Pto.Venta"
              fullWidth
              size="small"
              value={puntoVenta}
              onChange={(e) => setPuntoVenta(e.target.value)}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 2 }}>
            <TextField
              label="N° Comprobante"
              fullWidth
              size="small"
              value={numeroComprobante}
              onChange={(e) => setNumeroComprobante(e.target.value)}
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: 2,
                backgroundColor: "#fafafa",
              }}
            >
              <Grid container spacing={1}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Typography variant="body2">
                    <strong>Direccion:</strong>
                    {""}
                    {proveedorSeleccionado?.direccion || "-"}
                  </Typography>
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                  <Typography variant="body2">
                    <strong>Ciudad:</strong>
                    {""}
                    {proveedorSeleccionado?.ciudades?.nombre || "-"}
                  </Typography>
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                  <Typography variant="body2">
                    <strong>Condicion Iva:</strong>
                    {""}
                    {proveedorSeleccionado?.condicion_iva?.descripcion || "-"}
                  </Typography>
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                  <Typography variant="body2">
                    <strong>Cuit:</strong>
                    {""}
                    {proveedorSeleccionado?.cuit || "-"}
                  </Typography>
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                  <Typography variant="body2">
                    <strong>Telefono:</strong>
                    {""}
                    {proveedorSeleccionado?.telefono || "-"}
                  </Typography>
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                  <Typography variant="body2">
                    <strong>Email:</strong>
                    {""}
                    {proveedorSeleccionado?.email || "-"}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      </Paper>

      <Paper
        variant="outlined"
        sx={{
          flex: 1,
          minHeight: 0,
          borderRadius: 2,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          pb: "110px",
        }}
      >
        <Box
          sx={{
            p: 2,
            flexShrink: 0,
            borderBotom: "1px solid #e0e0e0",
            backgroundColor: "#fafafa",
          }}
        >
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 5 }}>
              <Autocomplete
                options={articulos}
                value={articuloSeleccionado}
                inputValue={inputArticulo}
                autoHighlight
                getOptionLabel={(option) =>
                  `${option?.codigo ?? ""} - ${option?.descripcion ?? ""}`
                }
                isOptionEqualToValue={(option, value) =>
                  option.id === value?.id
                }
                filterOptions={(options, state) => {
                  const busqueda = state.inputValue.toLowerCase().trim();

                  return options.filter((articulo) => {
                    const codigo = String(articulo.codigo ?? "").toLowerCase();
                    const descripcion = String(
                      articulo.descripcion ?? "",
                    ).toLowerCase();

                    return (
                      codigo.includes(busqueda) ||
                      descripcion.includes(busqueda)
                    );
                  });
                }}
                onInputChange={(_, nuevoValor, motivo) => {
                  if (motivo !== "reset") {
                    setInputArticulo(nuevoValor);
                  }
                }}
                onChange={(_, nuevoArticulo) => {
                  if (!nuevoArticulo) {
                    setArticuloId("");
                    setArticuloSeleccionado(null);
                    setInputArticulo("");
                    setPrecio("");
                    setCantidad(1);
                    return;
                  }

                  setArticuloId(nuevoArticulo.id);
                  setArticuloSeleccionado(nuevoArticulo);
                  setInputArticulo(
                    `${nuevoArticulo.codigo ?? ""} - ${
                      nuevoArticulo.descripcion ?? ""
                    }`,
                  );
                  setPrecio(nuevoArticulo.precio_costo ?? 0);
                  setCantidad(1);

                  setTimeout(() => {
                    cantidadRef.current?.focus();
                    cantidadRef.current?.select();
                  }, 0);
                }}
                noOptionsText="No se encontraron artículos"
                renderInput={(params) => (
                  <TextField
                    {...params}
                    inputRef={inputArticuloRef}
                    label="Artículo"
                    placeholder="Buscar por código o descripción"
                    fullWidth
                    size="small"
                  />
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4, md: 1.5 }}>
              <TextField
                label="Cantidad"
                type="number"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                inputRef={cantidadRef}
                fullWidth
                size="small"
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 4, md: 2 }}>
              <TextField
                label="Precio Compra"
                type="number"
                fullWidth
                size="small"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4, md: 2 }}>
              <TextField
                label="Subtotal"
                fullWidth
                size="small"
                value={formatoNumero(
                  Number(cantidad || 0) * Number(precio || 0),
                )}
                inputProps={{ readOnly: true }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 1.5 }}>
              <Button
                fullWidth
                variant="contained"
                onClick={agregarDetalle}
                sx={{ height: 40 }}
              >
                Agregar
              </Button>
            </Grid>
          </Grid>
        </Box>
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            px: 2,
            pb: 2,
          }}
        >
          <DataGrid
            rows={detalle}
            columns={columnasDetalle}
            hideFooter
            disableRowSelectionOnClick
            rowHeight={44}
            sx={{
              height: "100%",
              border: 0,
              "& .MuiDataGrid-columnHeaders": {
                backgroundColor: "#f5f5f5",
                fontWeight: 600,
                minHeight: "40px !important",
                maxHeight: "40px !important",
              },
              "& .MuiDataGrid-cell": {
                display: "flex",
                alignItems: "center",
              },
            }}
            localeText={{ noRowsLabel: "No hay Articulos cargados" }}
          />
        </Box>
      </Paper>
      <Paper
        variant="outlined"
        sx={{
          position: "fixed",
          bottom: 0,
          left: { xs: 0, md: `${drawerWidth}px` },
          width: { xs: "100%", md: `calc(100% - ${drawerWidth}px)` },
          bgColor: "background.paper",
          borderTop: "1px solid #ddd",
          borderRadius: 0,
          p: 2,
          minHeight: "90px",
          zIndex: 1000,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            flexWrap: "wrap",
          }}
        >
          <Box sx={{ flex: 1, minWidth: 260 }}>
            <TextField
              label="Observaciones"
              fullWidth
              multiline
              rows={2}
              size="small"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Opcional"
            />
          </Box>
          <Box sx={{ display: "flex", justifyContent: "center" }}>
            <Button
              type="button"
              onClick={guardarCompra}
              variant="contained"
              disabled={guardando}
              startIcon={
                guardando ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  <SaveIcon />
                )
              }
            >
              {guardando ? "Guardando..." : "Guardar"}
            </Button>
          </Box>

          <Box sx={{ minWidth: 180, textAlign: "right" }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Total: ${formatoNumero(totalCompra)}
            </Typography>
          </Box>
        </Box>
      </Paper>
      <Snackbar
        open={open}
        autoHideDuration={3000}
        onClose={() => setOpen(false)}
        anchorOrigin={{
          vertical: "top",
          horizontal: "center",
        }}
      >
        <Alert
          onClose={() => setOpen(false)}
          severity={tipo}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {mensaje}
        </Alert>
      </Snackbar>
    </Box>
  );
}
