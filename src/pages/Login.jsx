import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../hook/supabaseClient";

import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  InputAdornment,
  Link,
  Paper,
  Snackbar,
  TextField,
  Typography,
} from "@mui/material";

import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";

export default function Login() {
  const navigate = useNavigate();

  const [usuarioLogin, setUsuarioLogin] = useState("");
  const [password, setPassword] = useState("");

  const [ingresando, setIngresando] = useState(false);
  const [mostrarPassword, setMostrarPassword] = useState(false);

  /*
   * RECUPERACIÓN DE CONTRASEÑA
   */
  const [openRecuperar, setOpenRecuperar] = useState(false);
  const [emailRecuperar, setEmailRecuperar] = useState("");
  const [enviandoRecuperacion, setEnviandoRecuperacion] = useState(false);

  /*
   * NOTIFICACIONES
   */
  const [mensaje, setMensaje] = useState("");
  const [tipoMensaje, setTipoMensaje] = useState("error");
  const [openMensaje, setOpenMensaje] = useState(false);

  const passwordRef = useRef(null);

  /*
   * En desarrollo usa localhost.
   * En producción usa VITE_API_URL configurada en Vercel.
   */
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

  const mostrarNotificacion = (texto, tipo = "error") => {
    setMensaje(texto);
    setTipoMensaje(tipo);
    setOpenMensaje(true);
  };

  /*
   * LOGIN
   */
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
       * Limpiamos cualquier sesión anterior.
       */
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        await supabase.auth.signOut();
      }

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
       * Registramos la sesión en Supabase.
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
       * Conservamos el formato utilizado por los módulos.
       */
      localStorage.setItem("usuario", JSON.stringify(resultado.usuario));

      localStorage.setItem("empresa", JSON.stringify(resultado.empresa));

      localStorage.setItem("empresaActiva", JSON.stringify(resultado.empresa));

      /*
       * Primer ingreso con contraseña provisoria.
       */
      if (resultado.usuario.debe_cambiar_password === true) {
        navigate("/cambiar-password", {
          replace: true,
        });

        return;
      }

      navigate("/dashboard", {
        replace: true,
      });
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

  /*
   * ENVIAR EMAIL DE RECUPERACIÓN
   */
  const enviarRecuperacion = async () => {
    const emailLimpio = emailRecuperar.trim().toLowerCase();

    if (!emailLimpio) {
      mostrarNotificacion("Ingresá el email asociado a tu usuario.", "warning");
      return;
    }

    const formatoEmailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpio);

    if (!formatoEmailValido) {
      mostrarNotificacion("Ingresá un email válido.", "warning");
      return;
    }

    try {
      setEnviandoRecuperacion(true);

      /*
       * En producción:
       * https://avancefiscal.com.ar/restablecer-password
       *
       * En desarrollo:
       * http://localhost:5173/restablecer-password
       */
      const redirectTo = `${window.location.origin}/restablecer-password`;

      const { error } = await supabase.auth.resetPasswordForEmail(emailLimpio, {
        redirectTo,
      });

      if (error) {
        throw error;
      }

      setOpenRecuperar(false);
      setEmailRecuperar("");

      mostrarNotificacion(
        "Si el email está registrado, recibirás un enlace para restablecer la contraseña.",
        "success",
      );
    } catch (error) {
      console.error("Error enviando recuperación:", error);

      mostrarNotificacion(
        "No se pudo enviar el correo de recuperación.",
        "error",
      );
    } finally {
      setEnviandoRecuperacion(false);
    }
  };

  const abrirRecuperacion = () => {
    setEmailRecuperar("");
    setOpenRecuperar(true);
  };

  const cerrarRecuperacion = () => {
    if (!enviandoRecuperacion) {
      setOpenRecuperar(false);
      setEmailRecuperar("");
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        px: 2,
        py: 4,
        background:
          "linear-gradient(135deg, #eef5ff 0%, #f8fafc 50%, #edf7f4 100%)",
      }}
    >
      <Paper
        elevation={8}
        sx={{
          width: "100%",
          maxWidth: 430,
          px: {
            xs: 3,
            sm: 4,
          },
          py: 4,
          borderRadius: 4,
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        {/* LOGO PROVISORIO */}
        <Box
          sx={{
            width: 68,
            height: 68,
            borderRadius: "20px",
            bgcolor: "primary.main",
            color: "primary.contrastText",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mx: "auto",
            mb: 2,
            boxShadow: 3,
          }}
        >
          <Typography variant="h4" fontWeight="bold">
            A
          </Typography>
        </Box>

        <Typography
          variant="h4"
          fontWeight="bold"
          textAlign="center"
          color="primary.main"
        >
          Avance Fiscal
        </Typography>

        <Typography
          variant="body2"
          color="text.secondary"
          textAlign="center"
          sx={{ mt: 0.5 }}
        >
          Facturación, stock y gestión en un solo lugar
        </Typography>

        <Divider sx={{ my: 3 }} />

        <Typography
          variant="h6"
          fontWeight="bold"
          textAlign="center"
          sx={{ mb: 0.5 }}
        >
          Iniciar sesión
        </Typography>

        <Typography
          variant="body2"
          color="text.secondary"
          textAlign="center"
          sx={{ mb: 3 }}
        >
          Ingresá tus datos para acceder al sistema
        </Typography>

        <TextField
          label="Usuario"
          fullWidth
          size="small"
          value={usuarioLogin}
          disabled={ingresando}
          autoComplete="username"
          autoFocus
          onChange={(e) => setUsuarioLogin(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              passwordRef.current?.focus();
            }
          }}
          slotProps={{
            input: {},
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
          sx={{ mt: 2 }}
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
              startAdornment: (
                <InputAdornment position="start">
                  <LockOutlinedIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
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

        <Box
          sx={{
            display: "flex",
            justifyContent: "flex-end",
            mt: 1,
          }}
        >
          <Link
            component="button"
            type="button"
            underline="hover"
            disabled={ingresando}
            onClick={abrirRecuperacion}
            sx={{
              fontSize: "0.875rem",
              cursor: ingresando ? "default" : "pointer",
            }}
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </Box>

        <Button
          variant="contained"
          fullWidth
          size="large"
          sx={{
            mt: 3,
            py: 1.2,
            borderRadius: 2,
            fontWeight: "bold",
          }}
          onClick={ingresar}
          disabled={ingresando}
          startIcon={
            ingresando ? <CircularProgress size={18} color="inherit" /> : null
          }
        >
          {ingresando ? "INGRESANDO..." : "INGRESAR"}
        </Button>

        <Typography
          variant="caption"
          color="text.secondary"
          textAlign="center"
          display="block"
          sx={{ mt: 3 }}
        >
          Gestión inteligente para tu empresa
        </Typography>
      </Paper>

      {/* DIÁLOGO DE RECUPERACIÓN */}
      <Dialog
        open={openRecuperar}
        onClose={cerrarRecuperacion}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle fontWeight="bold">Recuperar contraseña</DialogTitle>

        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Ingresá el email asociado a tu usuario. Te enviaremos un enlace para
            elegir una nueva contraseña.
          </Typography>

          <TextField
            label="Email"
            type="email"
            fullWidth
            autoFocus
            value={emailRecuperar}
            disabled={enviandoRecuperacion}
            autoComplete="email"
            onChange={(e) => setEmailRecuperar(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !enviandoRecuperacion) {
                e.preventDefault();
                enviarRecuperacion();
              }
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailOutlinedIcon color="action" />
                  </InputAdornment>
                ),
              },
            }}
          />
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            pb: 2,
          }}
        >
          <Button
            color="inherit"
            disabled={enviandoRecuperacion}
            onClick={cerrarRecuperacion}
          >
            Cancelar
          </Button>

          <Button
            variant="contained"
            disabled={enviandoRecuperacion}
            onClick={enviarRecuperacion}
          >
            {enviandoRecuperacion ? "ENVIANDO..." : "ENVIAR ENLACE"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={openMensaje}
        autoHideDuration={5000}
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
