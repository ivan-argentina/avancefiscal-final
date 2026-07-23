import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../hook/supabaseClient";

import {
  Alert,
  Box,
  Button,
  IconButton,
  InputAdornment,
  Paper,
  Snackbar,
  TextField,
  Typography,
} from "@mui/material";

import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

export default function Login() {
  const navigate = useNavigate();

  const [usuarioLogin, setUsuarioLogin] = useState("");
  const [password, setPassword] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [tipoMensaje, setTipoMensaje] = useState("error");
  const [openMensaje, setOpenMensaje] = useState(false);
  const [ingresando, setIngresando] = useState(false);
  const [mostrarPassword, setMostrarPassword] = useState(false);

  const passwordRef = useRef(null);

  /*
   * En desarrollo usa localhost.
   * En producción usa la variable configurada en Vercel.
   */
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

  const mostrarNotificacion = (texto, tipo = "error") => {
    setMensaje(texto);
    setTipoMensaje(tipo);
    setOpenMensaje(true);
  };

  const ingresar = async () => {
    const usuarioBuscado = usuarioLogin.trim().toLowerCase();
    const passwordIngresada = password;

    if (!usuarioBuscado || !passwordIngresada) {
      mostrarNotificacion("Ingresá el usuario y la contraseña.", "warning");
      return;
    }

    try {
      setIngresando(true);

      /*
       * Limpiamos cualquier sesión anterior antes de iniciar
       * una nueva autenticación.
       */
      await supabase.auth.signOut();

      const respuesta = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          usuario: usuarioBuscado,
          password: passwordIngresada,
        }),
      });

      let resultado;

      try {
        resultado = await respuesta.json();
      } catch {
        throw new Error("El servidor no devolvió una respuesta válida.");
      }

      if (!respuesta.ok || !resultado?.ok) {
        mostrarNotificacion(
          resultado?.error || "Usuario o contraseña incorrectos.",
          respuesta.status === 403 ? "warning" : "error",
        );
        return;
      }

      if (
        !resultado.session?.access_token ||
        !resultado.session?.refresh_token
      ) {
        throw new Error("El servidor no devolvió una sesión válida.");
      }

      /*
       * Registramos la sesión en el cliente de Supabase.
       * A partir de acá, todas las consultas llevan el JWT
       * necesario para que funcionen las políticas RLS.
       */
      const { data: sessionData, error: sessionError } =
        await supabase.auth.setSession({
          access_token: resultado.session.access_token,
          refresh_token: resultado.session.refresh_token,
        });

      if (sessionError || !sessionData?.session) {
        throw sessionError || new Error("No se pudo establecer la sesión.");
      }

      if (!resultado.usuario || !resultado.empresa) {
        await supabase.auth.signOut();

        throw new Error("No se recibieron los datos del usuario o la empresa.");
      }

      /*
       * Conservamos el formato actual para no romper
       * los demás módulos de Avance Fiscal.
       */
      localStorage.setItem("usuario", JSON.stringify(resultado.usuario));
      localStorage.setItem("empresa", JSON.stringify(resultado.empresa));

      /*
       * Al iniciar sesión dejamos seleccionada la primera
       * empresa activa devuelta por el backend.
       */
      localStorage.setItem("empresaActiva", JSON.stringify(resultado.empresa));

      navigate("/dashboard");
    } catch (error) {
      console.error("Error al iniciar sesión:", error);

      await supabase.auth.signOut();

      localStorage.removeItem("usuario");
      localStorage.removeItem("empresa");
      localStorage.removeItem("empresaActiva");

      const mensajeError =
        error instanceof TypeError
          ? "No se pudo conectar con el servidor."
          : error?.message || "No se pudo iniciar sesión.";

      mostrarNotificacion(mensajeError, "error");
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
      <Paper
        sx={{
          p: 4,
          width: 360,
          borderRadius: 3,
        }}
      >
        <Typography variant="h5" fontWeight="bold" mb={3}>
          Iniciar Sesión
        </Typography>

        <TextField
          label="Usuario"
          fullWidth
          size="small"
          value={usuarioLogin}
          disabled={ingresando}
          autoComplete="username"
          onChange={(e) => setUsuarioLogin(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              passwordRef.current?.focus();
            }
          }}
        />

        <TextField
          label="Contraseña"
          type={mostrarPassword ? "text" : "password"}
          fullWidth
          size="small"
          value={password}
          disabled={ingresando}
          autoComplete="current-password"
          sx={{ mt: 1 }}
          inputRef={passwordRef}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !ingresando) {
              e.preventDefault();
              ingresar();
            }
          }}
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setMostrarPassword((anterior) => !anterior)}
                    onMouseDown={(e) => e.preventDefault()}
                    edge="end"
                    size="small"
                    disabled={ingresando}
                    aria-label={
                      mostrarPassword
                        ? "Ocultar contraseña"
                        : "Mostrar contraseña"
                    }
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
