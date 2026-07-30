import { useEffect, useState } from "react";
import { supabase } from "../hook/supabaseClient";

import {
  Alert,
  Box,
  Button,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Snackbar,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";

import { DataGrid } from "@mui/x-data-grid";

import EditIcon from "@mui/icons-material/Edit";
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
            activo,
            auth_user_id
          ),
          empresas(
            id,
            razon_social,
            activo
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
        .update({
          activo: nuevoEstado,
        })
        .eq("id", fila.id);

      if (error) {
        throw error;
      }

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

  const guardarUsuario = async () => {
    if (!nombre.trim() || !usuario.trim() || !email.trim() || !idEmpresa) {
      setMensaje("Complete nombre, usuario, email y empresa");
      setTipo("warning");
      setOpen(true);
      return;
    }

    if (!editandoId && !password.trim()) {
      setMensaje("Debe ingresar una contraseña temporal");
      setTipo("warning");
      setOpen(true);
      return;
    }

    try {
      setLoading(true);

      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

      if (editandoId) {
        /*
         * EDICIÓN:
         * El backend actualiza usuarios,
         * Supabase Auth y usuario_empresa.
         */
        const respuesta = await fetch(
          `${API_URL}/api/auth/usuarios/${editandoId}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              nombre: nombre.trim(),
              usuario: usuario.trim().toLowerCase(),
              email: email.trim().toLowerCase(),
              idEmpresa,
              rol,
            }),
          },
        );

        let resultado;

        try {
          resultado = await respuesta.json();
        } catch {
          throw new Error("El servidor no devolvió una respuesta válida");
        }

        if (!respuesta.ok || !resultado?.ok) {
          throw new Error(
            resultado?.error || "No se pudo actualizar el usuario",
          );
        }

        setMensaje("Usuario actualizado correctamente");
        setTipo("success");
      } else {
        /*
         * NUEVO USUARIO:
         * El backend crea Supabase Auth,
         * usuarios y usuario_empresa.
         */
        const nombreFinal = nombre.trim();
        const usuarioFinal = usuario.trim().toLowerCase();
        const emailFinal = email.trim().toLowerCase();
        const passwordTemporal = password.trim();

        const respuesta = await fetch(`${API_URL}/api/auth/usuarios`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            nombre: nombreFinal,
            usuario: usuarioFinal,
            email: emailFinal,
            password: passwordTemporal,
            idEmpresa,
            rol,
          }),
        });

        let resultado;

        try {
          resultado = await respuesta.json();
        } catch {
          throw new Error("El servidor no devolvió una respuesta válida");
        }

        if (!respuesta.ok || !resultado?.ok) {
          throw new Error(resultado?.error || "No se pudo crear el usuario");
        }

        /*
         * Enviamos el correo con los datos de acceso.
         * Si falla, el usuario igualmente queda creado.
         */
        try {
          console.log("=== ENVIANDO EMAIL DE BIENVENIDA ===");

          const respuestaEmail = await fetch(
            `${API_URL}/api/email/bienvenida-usuario`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                to: emailFinal,
                nombre: nombreFinal,
                usuario: usuarioFinal,
                passwordTemporal,
              }),
            },
          );

          let resultadoEmail;

          try {
            resultadoEmail = await respuestaEmail.json();
          } catch {
            throw new Error("El servidor no devolvió una respuesta válida");
          }

          console.log("Respuesta email:", resultadoEmail);

          if (!respuestaEmail.ok || !resultadoEmail?.ok) {
            throw new Error(
              resultadoEmail?.error ||
                "No se pudo enviar el correo de bienvenida",
            );
          }

          setMensaje(
            "Usuario creado correctamente. Se enviaron los datos de acceso por email.",
          );
          setTipo("success");
        } catch (errorEmail) {
          console.error("Usuario creado, pero falló el email:", errorEmail);

          setMensaje(
            "El usuario fue creado, pero no se pudo enviar el correo de bienvenida.",
          );
          setTipo("warning");
        }
      }

      setOpen(true);
      limpiar();

      await cargarUsuariosYEmpresas();
    } catch (error) {
      console.error("Error al guardar usuario:", error);

      setMensaje(error?.message || "No se pudo guardar el usuario");
      setTipo("error");
      setOpen(true);
    } finally {
      setLoading(false);
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
    {
      field: "rol",
      headerName: "Rol",
      width: 120,
    },
    {
      field: "estado",
      headerName: "Estado",
      width: 110,
      renderCell: (params) => (params.row.activo ? "Activo" : "Inactivo"),
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

      <Paper
        sx={{
          p: 2,
          mb: 2,
          borderRadius: 3,
        }}
      >
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
              type="email"
              fullWidth
              size="small"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 3 }}>
            <TextField
              label={editandoId ? "Nueva contraseña (opcional)" : "Contraseña"}
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
                <Button
                  variant="outlined"
                  color="inherit"
                  onClick={limpiar}
                  disabled={loading}
                >
                  Cancelar
                </Button>
              )}

              <Button
                variant="contained"
                onClick={guardarUsuario}
                disabled={loading}
              >
                {loading
                  ? "GUARDANDO..."
                  : editandoId
                    ? "ACTUALIZAR USUARIO"
                    : "GUARDAR USUARIO"}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      <Paper
        sx={{
          height: 420,
          width: "100%",
          borderRadius: 3,
        }}
      >
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

      <ConfirmDialog
        open={confirmDialog.open}
        titulo={confirmDialog.titulo}
        mensaje={confirmDialog.mensaje}
        textoConfirmar={confirmDialog.textoConfirmar}
        color={confirmDialog.color}
        onClose={() =>
          setConfirmDialog((anterior) => ({
            ...anterior,
            open: false,
            accion: null,
          }))
        }
        onConfirm={async () => {
          const accion = confirmDialog.accion;

          setConfirmDialog((anterior) => ({
            ...anterior,
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
