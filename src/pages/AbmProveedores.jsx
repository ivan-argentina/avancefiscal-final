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
import { useEffect, useState, useCallback } from "react";

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

  const cargarCondicionIva = useCallback(async () => {
    const { data, error } = await supabase
      .from("condicion_iva")
      .select("id, descripcion")
      .order("descripcion", { ascending: true });

    if (error) {
      console.error("Error al cargar condición de IVA", error);
      return [];
    }

    return data || [];
  }, []);

  const cargarCiudades = useCallback(async () => {
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
  }, []);

  const cargarProveedores = useCallback(async () => {
    try {
      const usuarioGuardado = JSON.parse(
        localStorage.getItem("usuario") || "null",
      );

      if (!usuarioGuardado?.id) {
        return [];
      }

      const idEmpresa = await obtenerEmpresa(usuarioGuardado.id);

      if (!idEmpresa) {
        return [];
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
        return [];
      }

      return data ?? [];
    } catch (error) {
      console.error("Error inesperado:", error);
      return [];
    }
  }, []);

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
    if (!proveedor?.id) {
      setMensaje("No se pudo identificar el proveedor");
      setTipo("error");
      setOpen(true);
      return;
    }

    setEditandoId(proveedor.id);
    setNombre(proveedor.nombre ?? "");
    setDireccion(proveedor.direccion ?? "");
    setTelefono(proveedor.telefono ?? "");
    setEmail(proveedor.email ?? "");
    setCiudadId(proveedor.idciudad ?? "");
    setCondicionIvaId(proveedor.idciva ?? "");
    setCuit(proveedor.cuit ?? "");

    setError("");
    setErrorCuit("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const cancelarEdicion = () => {
    limpiarFormulario();
    setMensaje("Edición cancelada");
    setTipo("info");
    setOpen(true);

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const eliminarProveedor = async (id) => {
    if (!id) {
      setMensaje("No se pudo identificar el proveedor");
      setTipo("error");
      setOpen(true);
      return;
    }

    try {
      const usuarioGuardado = JSON.parse(
        localStorage.getItem("usuario") || "null",
      );

      if (!usuarioGuardado?.id) {
        setMensaje("No hay un usuario identificado");
        setTipo("warning");
        setOpen(true);
        return;
      }

      const idEmpresa = await obtenerEmpresa(usuarioGuardado.id);

      if (!idEmpresa) {
        setMensaje("No se pudo identificar la empresa");
        setTipo("error");
        setOpen(true);
        return;
      }

      const { count, error: errorCompras } = await supabase
        .from("compras")
        .select("id", { count: "exact", head: true })
        .eq("idproveedor", id)
        .eq("idempresa", idEmpresa);

      if (errorCompras) {
        throw errorCompras;
      }

      if ((count ?? 0) > 0) {
        const { error } = await supabase
          .from("proveedores")
          .update({ activo: false })
          .eq("id", id)
          .eq("idempresa", idEmpresa);

        if (error) {
          throw error;
        }

        setMensaje("Proveedor desactivado correctamente");
        setTipo("success");
        setOpen(true);
      } else {
        const { error } = await supabase
          .from("proveedores")
          .delete()
          .eq("id", id)
          .eq("idempresa", idEmpresa);

        if (error) {
          throw error;
        }

        setMensaje("Proveedor eliminado correctamente");
        setTipo("success");
        setOpen(true);
      }

      const proveedoresActualizados = await cargarProveedores();
      setProveedores(proveedoresActualizados);
    } catch (error) {
      console.error("Error eliminando proveedor:", error);

      setMensaje("No se pudo eliminar o desactivar el proveedor");
      setTipo("error");
      setOpen(true);
    }
  };

  const guardarProveedor = async (e) => {
    e.preventDefault();

    const nombreLimpio = nombre.trim();
    const direccionLimpia = direccion.trim();
    const telefonoLimpio = telefono.trim();
    const emailLimpio = email.trim();
    const cuitLimpio = String(cuit || "").replace(/\D/g, "");

    setError("");
    setErrorCuit("");

    if (!nombreLimpio || !telefonoLimpio || !ciudadId || !direccionLimpia) {
      setError("Complete los campos obligatorios");
      return;
    }

    if (cuitLimpio) {
      if (cuitLimpio.length !== 11) {
        setErrorCuit("El CUIT debe tener 11 dígitos");
        return;
      }

      if (!validarCuit(cuitLimpio)) {
        setErrorCuit("CUIT inválido");
        return;
      }
    }

    try {
      const usuarioGuardado = JSON.parse(
        localStorage.getItem("usuario") || "null",
      );

      if (!usuarioGuardado?.id) {
        setMensaje("No hay un usuario identificado");
        setTipo("warning");
        setOpen(true);
        return;
      }

      const idEmpresa = await obtenerEmpresa(usuarioGuardado.id);

      if (!idEmpresa) {
        setMensaje("No se pudo identificar la empresa");
        setTipo("error");
        setOpen(true);
        return;
      }

      if (cuitLimpio) {
        let consultaCuit = supabase
          .from("proveedores")
          .select("id")
          .eq("idempresa", idEmpresa)
          .eq("cuit", cuitLimpio);

        if (editandoId) {
          consultaCuit = consultaCuit.neq("id", editandoId);
        }

        const { data: proveedorExistente, error: errorCuit } =
          await consultaCuit.maybeSingle();

        if (errorCuit) {
          throw errorCuit;
        }

        if (proveedorExistente) {
          setErrorCuit("Ya existe un proveedor con ese CUIT");
          return;
        }
      }

      const proveedor = {
        nombre: nombreLimpio,
        direccion: direccionLimpia,
        telefono: telefonoLimpio,
        email: emailLimpio || null,
        cuit: cuitLimpio || null,
        idciudad: ciudadId,
        idciva: condicionIvaId || null,
        idempresa: idEmpresa,
      };

      if (editandoId) {
        const { error } = await supabase
          .from("proveedores")
          .update(proveedor)
          .eq("id", editandoId)
          .eq("idempresa", idEmpresa);

        if (error) {
          throw error;
        }

        setMensaje("Proveedor actualizado correctamente");
        setTipo("success");
        setOpen(true);
      } else {
        const { error } = await supabase.from("proveedores").insert([
          {
            ...proveedor,
            activo: true,
          },
        ]);

        if (error) {
          throw error;
        }

        setMensaje("Proveedor guardado correctamente");
        setTipo("success");
        setOpen(true);
      }

      limpiarFormulario();

      const proveedoresActualizados = await cargarProveedores();
      setProveedores(proveedoresActualizados);
    } catch (error) {
      console.error("Error al guardar el proveedor:", error);

      setMensaje(
        editandoId
          ? "Error al actualizar el proveedor"
          : "Error al guardar el proveedor",
      );
      setTipo("error");
      setOpen(true);
    }
  };

  const proveedoresFiltrados = proveedores.filter((p) =>
    p.nombre?.toLowerCase().includes(buscar.toLowerCase()),
  );

  const columnas = [
    {
      field: "nombre",
      headerName: "Proveedor",
      flex: 1,
      minWidth: 180,
    },
    {
      field: "ciudad",
      headerName: "Ciudad",
      flex: 1,
      minWidth: 140,
      valueGetter: (value, row) => row?.ciudades?.nombre ?? "",
    },
    {
      field: "cuit",
      headerName: "CUIT",
      width: 140,
    },
    {
      field: "telefono",
      headerName: "Teléfono",
      width: 140,
    },
    {
      field: "condicion_iva",
      headerName: "Cond. IVA",
      flex: 1,
      minWidth: 170,
      valueGetter: (value, row) => row?.condicion_iva?.descripcion ?? "",
    },
    {
      field: "email",
      headerName: "Email",
      minWidth: 220,
      flex: 1,
    },
    {
      field: "editar",
      headerName: "",
      width: 70,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      align: "center",
      renderCell: (params) => (
        <IconButton
          color="primary"
          size="small"
          aria-label={`Editar proveedor ${params.row.nombre}`}
          onClick={() => editarProveedor(params.row)}
        >
          <EditIcon />
        </IconButton>
      ),
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
          aria-label={`Eliminar proveedor ${params.row.nombre}`}
          onClick={() =>
            setConfirmDialog({
              open: true,
              titulo: "Eliminar proveedor",
              mensaje: `Si el proveedor "${params.row.nombre}" tiene compras asociadas, será desactivado. Si no tiene movimientos, será eliminado definitivamente.
               ¿Deseás continuar?`,
              textoConfirmar: "Continuar",
              color: "error",
              accion: async () => {
                await eliminarProveedor(params.row.id);
              },
            })
          }
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
  }, [cargarCiudades, cargarProveedores, cargarCondicionIva]);

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
            getRowId={(row) => row.id}
            pageSizeOptions={[10, 20, 50]}
            initialState={{
              pagination: {
                paginationModel: {
                  pageSize: 10,
                },
              },
            }}
            density="compact"
            disableRowSelectionOnClick
            localeText={{
              noRowsLabel: "No hay proveedores cargados",
            }}
            sx={{
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
