import {
  Box,
  Button,
  Container,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  TextField,
  Typography,
  Autocomplete,
} from "@mui/material";

import { DataGrid } from "@mui/x-data-grid";
import { useEffect, useState } from "react";

import { supabase } from "../hook/supabaseClient";
import Notificaciones from "./Notificaciones";
import { formatearCuit } from "../utils/formatearCuit";
import { validarCuit } from "../utils/validarCuit";

import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import SearchIcon from "@mui/icons-material/Search";
import { obtenerEmpresa } from "../utils/obtenerEmpresa";
import ConfirmDialog from "../componentes/ConfirmDialog";

export default function AbmProveedores() {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [ciudadId, setCiudadId] = useState("");
  const [cuit, setCuit] = useState("");
  const [condicionIvaId, setCondicionIvaId] = useState("");

  const [proveedores, setProveedores] = useState([]);
  const [ciudades, setCiudades] = useState([]);
  const [condicionesIva, setCondicionesIva] = useState([]);

  const [buscar, setBuscar] = useState("");
  const [editandoId, setEditandoId] = useState(null);

  const [errorCuit, setErrorCuit] = useState("");
  const [error, setError] = useState("");

  const [mensaje, setMensaje] = useState("");
  const [tipo, setTipo] = useState("success");
  const [open, setOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    titulo: "",
    mensaje: "",
    textoConfirmar: "Aceptar",
    color: "primary",
    accion: null,
  });

  const handleCuitChange = (e) => {
    const valor = e.target.value.replace(/\D/g, "");
    setCuit(valor);

    if (valor.length === 11) {
      setErrorCuit(validarCuit(valor) ? "" : "CUIT inválido");
    } else {
      setErrorCuit("");
    }
  };

  const cargarCondicionIva = async () => {
    const { data, error } = await supabase
      .from("condicion_iva")
      .select("id, descripcion")
      .order("descripcion", { ascending: true });

    if (error) {
      console.error("Error al cargar condición de IVA", error);
      return [];
    }

    return data || [];
  };

  const cargarCiudades = async () => {
    const usuarioGuardado = JSON.parse(localStorage.getItem("usuario"));
    const idEmpresa = await obtenerEmpresa(usuarioGuardado.id);
    const { data, error } = await supabase
      .from("ciudades")
      .select("*")
      .eq("idempresa", idEmpresa)
      .order("nombre", { ascending: true });

    if (error) {
      console.error("Error al cargar ciudades", error);
      return [];
    }

    return data || [];
  };

  const cargarProveedores = async () => {
    const usuarioGuardado = JSON.parse(localStorage.getItem("usuario"));
    const idEmpresa = await obtenerEmpresa(usuarioGuardado.id);

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

    console.log("Empresa:", idEmpresa);
    console.log("Proveedores:", data);

    if (error) {
      console.error("Error al cargar proveedores", error);
      return [];
    }

    return data || [];
  };

  const limpiarFormulario = () => {
    setNombre("");
    setEmail("");
    setTelefono("");
    setDireccion("");
    setCiudadId("");
    setCuit("");
    setCondicionIvaId("");
    setEditandoId(null);
    setError("");
    setErrorCuit("");
  };

  const editarProveedor = (proveedor) => {
    setEditandoId(proveedor.id);
    setNombre(proveedor.nombre || "");
    setDireccion(proveedor.direccion || "");
    setTelefono(proveedor.telefono || "");
    setEmail(proveedor.email || "");
    setCiudadId(proveedor.idciudad || "");
    setCondicionIvaId(proveedor.idciva || "");
    setCuit(proveedor.cuit || "");

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelarEdicion = () => {
    limpiarFormulario();
    setMensaje("Edición cancelada");
    setTipo("info");
    setOpen(true);

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const eliminarProveedor = async (id) => {
    const usuarioGuardado = JSON.parse(localStorage.getItem("usuario"));
    const idEmpresa = await obtenerEmpresa(usuarioGuardado.id);

    const { data, error: errorCompras } = await supabase
      .from("compras")
      .select("id")
      .eq("idproveedor", id)
      .eq("idempresa", idEmpresa);

    if (errorCompras) {
      console.error(errorCompras);
      setMensaje("Error al verificar compras asociadas");
      setTipo("error");
      setOpen(true);
      return;
    }

    if (data && data.length > 0) {
      const { error } = await supabase
        .from("proveedores")
        .update({ activo: false })
        .eq("id", id)
        .eq("idempresa", idEmpresa);

      if (error) {
        console.error(error);
        setMensaje("Error al desactivar proveedor");
        setTipo("error");
        setOpen(true);
        return;
      }

      setMensaje("Proveedor desactivado correctamente");
      setTipo("success");
      setOpen(true);

      const proveedoresActualizados = await cargarProveedores();
      setProveedores(proveedoresActualizados);
      return;
    }

    const { error } = await supabase
      .from("proveedores")
      .delete()
      .eq("id", id)
      .eq("idempresa", idEmpresa);

    if (error) {
      console.error(error);
      setMensaje("Error al eliminar proveedor");
      setTipo("error");
      setOpen(true);
      return;
    }

    setMensaje("Proveedor eliminado correctamente");
    setTipo("success");
    setOpen(true);

    const proveedoresActualizados = await cargarProveedores();
    setProveedores(proveedoresActualizados);
  };

  const guardarProveedor = async (e) => {
    e.preventDefault();

    if (!nombre.trim() || !telefono.trim() || !ciudadId || !direccion.trim()) {
      setError("Complete los campos obligatorios");
      return;
    }

    if (cuit && cuit.length === 11 && !validarCuit(cuit)) {
      setErrorCuit("CUIT inválido");
      return;
    }

    const usuarioGuardado = JSON.parse(localStorage.getItem("usuario"));
    const idEmpresa = await obtenerEmpresa(usuarioGuardado.id);

    const proveedor = {
      nombre,
      direccion,
      telefono,
      email,
      cuit,
      idciudad: ciudadId || null,
      idciva: condicionIvaId || null,
      idempresa: idEmpresa || null,
    };

    if (editandoId) {
      const { error } = await supabase
        .from("proveedores")
        .update(proveedor)
        .eq("idempresa", idEmpresa)
        .eq("id", editandoId);

      if (error) {
        console.error(error);
        setMensaje("Error al actualizar el proveedor");
        setTipo("error");
        setOpen(true);
        return;
      }

      setMensaje("Proveedor actualizado");
      setTipo("success");
      setOpen(true);
    } else {
      const { error } = await supabase.from("proveedores").insert([proveedor]);

      if (error) {
        console.error(error);
        setMensaje("Error al guardar el proveedor");
        setTipo("error");
        setOpen(true);
        return;
      }

      setMensaje("Proveedor guardado");
      setTipo("success");
      setOpen(true);
    }

    limpiarFormulario();

    const proveedoresActualizados = await cargarProveedores();
    setProveedores(proveedoresActualizados);
  };

  const proveedoresFiltrados = proveedores.filter((p) =>
    p.nombre?.toLowerCase().includes(buscar.toLowerCase()),
  );

  const columnas = [
    { field: "nombre", headerName: "Proveedor", flex: 1 },
    { field: "direccion", headerName: "Dirección", flex: 1 },
    {
      field: "ciudad",
      headerName: "Ciudad",
      flex: 1,
      valueGetter: (value, row) => row?.ciudades?.nombre || "",
    },
    { field: "cuit", headerName: "CUIT", flex: 1 },
    { field: "telefono", headerName: "Teléfono", flex: 1 },
    {
      field: "condicion_iva",
      headerName: "Cond. IVA",
      flex: 1,
      valueGetter: (value, row) => row?.condicion_iva?.descripcion || "",
    },
    { field: "email", headerName: "Email", width: 200 },
    {
      field: "editar",
      headerName: "",
      width: 70,
      sortable: false,
      renderCell: (params) => (
        <IconButton onClick={() => editarProveedor(params.row)} color="primary">
          <EditIcon />
        </IconButton>
      ),
    },
    {
      field: "eliminar",
      headerName: "",
      width: 70,
      sortable: false,
      renderCell: (params) => (
        <IconButton
          onClick={() =>
            setConfirmDialog({
              open: true,
              titulo: "Eliminar proveedor",
              mensaje:
                "Si el proveedor tiene compras asociadas será desactivado. Si no tiene compras, será eliminado definitivamente. ¿Deseás continuar?",
              textoConfirmar: "Aceptar",
              color: "error",
              accion: () => eliminarProveedor(params.row.id),
            })
          }
          color="error"
        >
          <DeleteIcon />
        </IconButton>
      ),
    },
  ];

  useEffect(() => {
    let activo = true;

    const init = async () => {
      const [ciudadesData, proveedoresData, condicionesIvaData] =
        await Promise.all([
          cargarCiudades(),
          cargarProveedores(),
          cargarCondicionIva(),
        ]);

      if (!activo) return;

      setCiudades(ciudadesData);
      setProveedores(proveedoresData);
      setCondicionesIva(condicionesIvaData);
    };

    init();

    return () => {
      activo = false;
    };
  }, []);

  return (
    <Container maxWidth="lg">
      <Paper sx={{ p: 2, mb: 2, borderRadius: 3 }}>
        <Typography variant="h5" align="center" gutterBottom>
          Carga de Proveedores
        </Typography>

        <Notificaciones
          open={open}
          mensaje={mensaje}
          tipo={tipo}
          onClose={() => setOpen(false)}
        />

        <Grid
          container
          spacing={2}
          component="form"
          onSubmit={guardarProveedor}
        >
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              label="Proveedor"
              fullWidth
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              error={!!error && !nombre.trim()}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              label="Dirección"
              fullWidth
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              error={!!error && !direccion.trim()}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Autocomplete
              options={ciudades}
              getOptionLabel={(option) => option?.nombre || ""}
              value={ciudades.find((c) => c.id === ciudadId) || null}
              onChange={(_, nuevaCiudad) => {
                setCiudadId(nuevaCiudad ? nuevaCiudad.id : "");
              }}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderInput={(params) => (
                <TextField {...params} label="Ciudad" fullWidth size="small" />
              )}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              label="Teléfono"
              fullWidth
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              error={!!error && !telefono.trim()}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              label="Email"
              fullWidth
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              select
              label="Condición IVA"
              fullWidth
              value={condicionIvaId}
              onChange={(e) => setCondicionIvaId(e.target.value)}
            >
              {condicionesIva.map((iva) => (
                <MenuItem key={iva.id} value={iva.id}>
                  {iva.descripcion}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              label="CUIT"
              fullWidth
              size="small"
              value={formatearCuit(cuit)}
              onChange={handleCuitChange}
              error={!!errorCuit}
              helperText={errorCuit}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 8 }}>
            <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
              {editandoId && (
                <Button
                  sx={{ mr: 1 }}
                  variant="outlined"
                  color="inherit"
                  size="small"
                  onClick={cancelarEdicion}
                >
                  Cancelar
                </Button>
              )}

              <Button
                type="submit"
                variant="contained"
                size="small"
                startIcon={<SaveIcon />}
              >
                {editandoId ? "Actualizar Proveedor" : "Guardar Proveedor"}
              </Button>
            </Box>
          </Grid>

          {error && (
            <Grid size={{ xs: 12 }}>
              <Typography color="error" variant="body2">
                {error}
              </Typography>
            </Grid>
          )}
        </Grid>
      </Paper>

      <Paper
        sx={{
          p: 2,
          borderRadius: 3,
          display: "flex",
          flexDirection: "column",
          height: 400,
        }}
      >
        <TextField
          label="Buscar Proveedor"
          size="small"
          fullWidth
          sx={{ mb: 1 }}
          value={buscar}
          onChange={(e) => setBuscar(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />

        <Box sx={{ flexGrow: 1 }}>
          <DataGrid
            rows={proveedoresFiltrados}
            columns={columnas}
            pageSize={5}
            density="compact"
          />
        </Box>
      </Paper>
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
          }))
        }
        onConfirm={async () => {
          setConfirmDialog((prev) => ({
            ...prev,
            open: false,
          }));

          if (confirmDialog.accion) {
            await confirmDialog.accion();
          }
        }}
      />
    </Container>
  );
}
