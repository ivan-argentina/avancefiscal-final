import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../hook/supabaseClient";
import { Box, Button, Paper, TextField, Typography } from "@mui/material";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

export default function Login() {
  const navigate = useNavigate();
  const [usuarioLogin, setUsuarioLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [tipoMensaje, setTipoMensaje] = useState("error");
  const [openMensaje, setOpenMensaje] = useState(false);
  const [ingresando, setIngresando] = useState(false);
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const passwordRef = useRef(null);

  const mostrarNotificacion = (texto, tipo = "error") => {
    setMensaje(texto);
    setTipoMensaje(tipo);
    setOpenMensaje(true);
  };

  const ingresar = async () => {
    setError("");

    const usuarioBuscado = usuarioLogin.trim().toLowerCase();
    const passwordIngresada = password.trim();

    if (!usuarioBuscado || !passwordIngresada) {
      mostrarNotificacion("Ingresá el usuario y la contraseña.", "warning");
      return;
    }

    try {
      setIngresando(true);
      const { data: usuarioEncontrado, error: errorUsuario } = await supabase
        .from("usuarios")
        .select(
          `
        id,
        nombre,
        usuario,
        email,
        password,
        rol_global,
        activo
      `,
        )
        .ilike("usuario", usuarioBuscado)
        .maybeSingle();

      if (errorUsuario) {
        throw errorUsuario;
      }

      if (!usuarioEncontrado) {
        mostrarNotificacion("Usuario inexistente.", "warning");
        return;
      }

      if (usuarioEncontrado.activo === false) {
        mostrarNotificacion("El usuario está desactivado.", "warning");
        return;
      }

      if (usuarioEncontrado.password?.trim() !== passwordIngresada) {
        mostrarNotificacion("Contraseña incorrecta.", "warning");
        return;
      }

      const { data: relaciones, error: errorRelacion } = await supabase
        .from("usuario_empresa")
        .select(
          `
        id,
        rol,
        activo,
        empresas (
          id,
          razon_social,
          activo
        )
      `,
        )
        .eq("idusuario", usuarioEncontrado.id)
        .eq("activo", true);

      if (errorRelacion) {
        throw errorRelacion;
      }

      const relacionActiva = (relaciones ?? []).find(
        (relacion) => relacion.empresas?.activo === true,
      );

      if (!relacionActiva) {
        mostrarNotificacion(
          "El usuario no tiene una empresa activa asignada.",
          "warning",
        );
        return;
      }

      const usuarioSesion = {
        ...usuarioEncontrado,
        idempresa: relacionActiva.empresas.id,
        empresa: relacionActiva.empresas,
        rol: relacionActiva.rol,
      };

      localStorage.setItem("usuario", JSON.stringify(usuarioSesion));

      localStorage.setItem("empresa", JSON.stringify(relacionActiva.empresas));

      navigate("/dashboard");
    } catch (error) {
      console.error("Error al iniciar sesión:", error);
      setError("No se pudo iniciar sesión.");
    } finally {
      setIngresando(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        bgcolor: "#f5f5f5",
      }}
    >
      <Paper sx={{ p: 4, width: 360, borderRadius: 3 }}>
        <Typography variant="h5" fontWeight="bold" mb={3}>
          Iniciar Sesión
        </Typography>

        <TextField
          label="Usuario"
          fullWidth
          size="small"
          value={usuarioLogin}
          onChange={(e) => setUsuarioLogin(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              document.getElementById("password")?.focus();
            }
          }}
        />

        <TextField
          id="password"
          label="Contraseña"
          type={mostrarPassword ? "text" : "password"}
          fullWidth
          size="small"
          value={password}
          sx={{ mt: 1 }}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !ingresando) {
              e.preventDefault();
              ingresar();
            }
          }}
          slotProps={{
            htmlInput: {
              ref: passwordRef,
            },
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setMostrarPassword((anterior) => !anterior)}
                    onMouseDown={(e) => e.preventDefault()}
                    edge="end"
                    size="small"
                  >
                    {mostrarPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />

        <Button
          variant="contained"
          fullWidth
          sx={{ mt: 2 }}
          onClick={ingresar}
          disabled={ingresando}
        >
          {ingresando ? "INGRESANDO..." : "INGRESAR"}
        </Button>
      </Paper>
      <Snackbar
        open={openMensaje}
        autoHideDuration={4000}
        onClose={() => setOpenMensaje(false)}
        anchorOrigin={{
          vertical: "top",
          horizontal: "center",
        }}
      >
        <Alert
          onClose={() => setOpenMensaje(false)}
          severity={tipoMensaje}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {mensaje}
        </Alert>
      </Snackbar>
    </Box>
  );
}
