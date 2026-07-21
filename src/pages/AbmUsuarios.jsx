import { useEffect, useState } from "react";
import { supabase } from "../hook/supabaseClient";
import {
  Box,
  Button,
  Grid,
  Chip,
  MenuItem,
  Paper,
  TextField,
  Typography,
  IconButton,
  Tooltip,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import BlockIcon from "@mui/icons-material/Block";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ConfirmDialog from "../componentes/ConfirmDialog";

export default function AbmUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [empresas, setEmpresas] = useState([]);

  const [nombre, setNombre] = useState("");
  const [usuario, setUsuario] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [idEmpresa, setIdEmpresa] = useState("");
  const [rol, setRol] = useState("usuario");
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [tipo, setTipo] = useState("info");
  const [open, setOpen] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [relacionEditandoId, setRelacionEditandoId] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    titulo: "",
    mensaje: "",
    textoConfirmar: "Aceptar",
    color: "error",
    accion: null,
  });

  const editarUsuario = (fila) => {
    if (!fila?.id || !fila?.usuarios?.id) {
      setMensaje("No se pudo identificar el usuario");
      setTipo("error");
      setOpen(true);
      return;
    }

    setEditandoId(fila.usuarios.id);
    setRelacionEditandoId(fila.id);

    setNombre(fila.usuarios.nombre ?? "");
    setUsuario(fila.usuarios.usuario ?? "");
    setEmail(fila.usuarios.email ?? "");
    setPassword("");
    setIdEmpresa(fila.empresas?.id ?? "");
    setRol(fila.rol ?? "usuario");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const cambiarEstadoUsuario = async (fila) => {
    if (!fila?.id) {
      setMensaje("No se pudo identificar la relación del usuario");
      setTipo("error");
      setOpen(true);
      return;
    }

    const nuevoEstado = !fila.activo;

    try {
      const { error } = await supabase
        .from("usuario_empresa")
        .update({ activo: nuevoEstado })
        .eq("id", fila.id);

      if (error) throw error;

      setMensaje(
        nuevoEstado
          ? "Usuario activado correctamente"
          : "Usuario desactivado correctamente",
      );
      setTipo("success");
      setOpen(true);

      await cargarUsuariosYEmpresas();
    } catch (error) {
      console.error("Error al cambiar el estado del usuario:", error);

      setMensaje(
        nuevoEstado
          ? "No se pudo activar el usuario"
          : "No se pudo desactivar el usuario",
      );
      setTipo("error");
      setOpen(true);
    }
  };

  const cargarUsuariosYEmpresas = async () => {
    setLoading(true);

    try {
      const [
        { data: empresasData, error: errorEmpresas },
        { data: usuariosData, error: errorUsuarios },
      ] = await Promise.all([
        supabase
          .from("empresas")
          .select("id, razon_social")
          .order("razon_social"),

        supabase.from("usuario_empresa").select(`
           id,
           rol,
           activo,
           usuarios(
           id,
           nombre,
           usuario,
           email,
           rol_global,
           activo
          ),
           empresas(
           id,
           razon_social,
           activo
         )
          )
        `),
      ]);

      if (errorEmpresas) {
        throw errorEmpresas;
      }

      if (errorUsuarios) {
        throw errorUsuarios;
      }

      setEmpresas(empresasData ?? []);
      setUsuarios(usuariosData ?? []);
    } catch (error) {
      console.error("Error al cargar usuarios y empresas:", error);

      setEmpresas([]);
      setUsuarios([]);

      setMensaje("No se pudieron cargar los usuarios y empresas");
      setTipo("error");
      setOpen(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarUsuariosYEmpresas();
  }, []);

  const limpiar = () => {
    setNombre("");
    setUsuario("");
    setEmail("");
    setPassword("");
    setIdEmpresa("");
    setRol("usuario");
    setEditandoId(null);
    setRelacionEditandoId(null);
  };

  const guardarUsuario = async () => {
    if (!nombre.trim() || !usuario.trim() || !idEmpresa) {
      setMensaje("Complete nombre, usuario y empresa");
      setTipo("warning");
      setOpen(true);
      return;
    }

    if (!editandoId && !password.trim()) {
      setMensaje("Debe ingresar una contraseña");
      setTipo("warning");
      setOpen(true);
      return;
    }

    try {
      if (editandoId) {
        /*
         * EDITAR USUARIO
         */
        const datosUsuario = {
          nombre: nombre.trim(),
          usuario: usuario.trim(),
          email: email.trim() || null,
        };

        if (password.trim()) {
          datosUsuario.password = password.trim();
        }

        const { error: errorUsuario } = await supabase
          .from("usuarios")
          .update(datosUsuario)
          .eq("id", editandoId);

        if (errorUsuario) throw errorUsuario;

        const { error: errorRelacion } = await supabase
          .from("usuario_empresa")
          .update({
            idempresa: idEmpresa,
            rol,
          })
          .eq("id", relacionEditandoId);

        if (errorRelacion) throw errorRelacion;

        setMensaje("Usuario actualizado correctamente");
        setTipo("success");
      } else {
        /*
         * NUEVO USUARIO
         */
        const { data: usuarioCreado, error: errorUsuario } = await supabase
          .from("usuarios")
          .insert([
            {
              nombre: nombre.trim(),
              usuario: usuario.trim(),
              email: email.trim() || null,
              password: password.trim(),
              rol_global: "usuario",
              activo: true,
            },
          ])
          .select()
          .single();

        if (errorUsuario) throw errorUsuario;

        const { error: errorRelacion } = await supabase
          .from("usuario_empresa")
          .insert([
            {
              idusuario: usuarioCreado.id,
              idempresa: idEmpresa,
              rol,
              activo: true,
            },
          ]);

        if (errorRelacion) throw errorRelacion;

        setMensaje("Usuario creado correctamente");
        setTipo("success");
      }

      setOpen(true);

      limpiar();

      setEditandoId(null);
      setRelacionEditandoId(null);

      await cargarUsuariosYEmpresas();
    } catch (error) {
      console.error("Error al guardar usuario:", error);

      setMensaje("No se pudo guardar el usuario");
      setTipo("error");
      setOpen(true);
    }
  };

  const columns = [
    {
      field: "nombre",
      headerName: "Nombre",
      flex: 1,
      renderCell: (params) => params.row.usuarios?.nombre || "",
    },
    {
      field: "usuario",
      headerName: "Usuario",
      flex: 1,
      renderCell: (params) => params.row.usuarios?.usuario || "",
    },
    {
      field: "email",
      headerName: "Email",
      flex: 1,
      renderCell: (params) => params.row.usuarios?.email || "",
    },
    {
      field: "empresa",
      headerName: "Empresa",
      flex: 1,
      renderCell: (params) => params.row.empresas?.razon_social || "",
    },
    { field: "rol", headerName: "Rol", width: 120 },
    {
      field: "editar",
      headerName: "",
      width: 70,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      align: "center",
      renderCell: (params) => (
        <Tooltip title="Editar usuario">
          <IconButton
            color="primary"
            size="small"
            onClick={() => editarUsuario(params.row)}
          >
            <EditIcon />
          </IconButton>
        </Tooltip>
      ),
    },
    {
      field: "estadoAccion",
      headerName: "",
      width: 70,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      align: "center",
      renderCell: (params) => {
        const estaActivo = params.row.activo;

        return (
          <Tooltip
            title={estaActivo ? "Desactivar usuario" : "Activar usuario"}
          >
            <IconButton
              color={estaActivo ? "warning" : "success"}
              size="small"
              onClick={() =>
                setConfirmDialog({
                  open: true,
                  titulo: estaActivo ? "Desactivar usuario" : "Activar usuario",
                  mensaje: estaActivo
                    ? `¿Deseás desactivar al usuario "${
                        params.row.usuarios?.nombre ?? ""
                      }" de la empresa "${
                        params.row.empresas?.razon_social ?? ""
                      }"?`
                    : `¿Deseás activar al usuario "${
                        params.row.usuarios?.nombre ?? ""
                      }" en la empresa "${
                        params.row.empresas?.razon_social ?? ""
                      }"?`,
                  textoConfirmar: estaActivo ? "Desactivar" : "Activar",
                  color: estaActivo ? "warning" : "success",
                  accion: async () => {
                    await cambiarEstadoUsuario(params.row);
                  },
                })
              }
            >
              {estaActivo ? <BlockIcon /> : <CheckCircleIcon />}
            </IconButton>
          </Tooltip>
        );
      },
    },
  ];

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" mb={2}>
        Usuarios
      </Typography>

      <Paper sx={{ p: 2, mb: 2, borderRadius: 3 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 3 }}>
            <TextField
              label="Nombre"
              fullWidth
              size="small"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 3 }}>
            <TextField
              label="Usuario"
              fullWidth
              size="small"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 3 }}>
            <TextField
              label="Email"
              fullWidth
              size="small"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 3 }}>
            <TextField
              label="Contraseña"
              type="password"
              fullWidth
              size="small"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              select
              label="Empresa"
              fullWidth
              size="small"
              value={idEmpresa}
              onChange={(e) => setIdEmpresa(e.target.value)}
            >
              {empresas.map((empresa) => (
                <MenuItem key={empresa.id} value={empresa.id}>
                  {empresa.razon_social}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid size={{ xs: 12, md: 3 }}>
            <TextField
              select
              label="Rol"
              fullWidth
              size="small"
              value={rol}
              onChange={(e) => setRol(e.target.value)}
            >
              <MenuItem value="admin">Admin</MenuItem>
              <MenuItem value="usuario">Usuario</MenuItem>
              <MenuItem value="vendedor">Vendedor</MenuItem>
              <MenuItem value="contador">Contador</MenuItem>
            </TextField>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 2,
                mt: 1,
              }}
            >
              {editandoId && (
                <Button variant="outlined" color="inherit" onClick={limpiar}>
                  Cancelar
                </Button>
              )}

              <Button
                variant="contained"
                onClick={guardarUsuario}
                disabled={loading}
              >
                {editandoId ? "Actualizar Usuario" : "Guardar Usuario"}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ height: 420, width: "100%", borderRadius: 3 }}>
        <DataGrid
          rows={usuarios}
          columns={columns}
          getRowId={(row) => row.id}
          loading={loading}
          pageSizeOptions={[10, 20, 50, 100]}
        />
      </Paper>
      <Snackbar
        open={open}
        autoHideDuration={4000}
        onClose={() => setOpen(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
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
      <ConfirmDialog
        open={confirmDialog.open}
        titulo={confirmDialog.titulo}
        mensaje={confirmDialog.mensaje}
        textoConfirmar={confirmDialog.textoConfirmar}
        color={confirmDialog.color}
        onClose={() =>
          setConfirmDialog((prev) => ({
            ...prev,
            open: false,
            accion: null,
          }))
        }
        onConfirm={async () => {
          const accion = confirmDialog.accion;

          setConfirmDialog((prev) => ({
            ...prev,
            open: false,
            accion: null,
          }));

          if (accion) {
            await accion();
          }
        }}
      />
    </Box>
  );
}
