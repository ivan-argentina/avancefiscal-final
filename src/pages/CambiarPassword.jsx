import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../hook/supabaseClient";

import {
  Alert,
  Box,
  Button,
  IconButton,
  InputAdornment,
  LinearProgress,
  Paper,
  Snackbar,
  TextField,
  Typography,
} from "@mui/material";

import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";

export default function CambiarPassword() {
  const navigate = useNavigate();

  const [passwordNueva, setPasswordNueva] = useState("");
  const [repetirPassword, setRepetirPassword] = useState("");

  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [mostrarRepeticion, setMostrarRepeticion] = useState(false);

  const [guardando, setGuardando] = useState(false);

  const [mensaje, setMensaje] = useState("");
  const [tipoMensaje, setTipoMensaje] = useState("error");
  const [openMensaje, setOpenMensaje] = useState(false);

  const API_URL =
    import.meta.env.VITE_API_URL ||
    "https://gestion-production-e3f6.up.railway.app";

  const mostrarNotificacion = (texto, tipo = "error") => {
    setMensaje(texto);
    setTipoMensaje(tipo);
    setOpenMensaje(true);
  };

  /*
   * POLÍTICA DE CONTRASEÑA
   */
  const requisitos = useMemo(
    () => ({
      largoMinimo: passwordNueva.length >= 8,
      tieneMayuscula: /[A-Z]/.test(passwordNueva),
      tieneMinuscula: /[a-z]/.test(passwordNueva),
      tieneNumero: /\d/.test(passwordNueva),
      coinciden: passwordNueva.length > 0 && passwordNueva === repetirPassword,
    }),
    [passwordNueva, repetirPassword],
  );

  const passwordValida =
    requisitos.largoMinimo &&
    requisitos.tieneMayuscula &&
    requisitos.tieneMinuscula &&
    requisitos.tieneNumero &&
    requisitos.coinciden;

  /*
   * Calculamos una fortaleza visual sencilla.
   */
  const fortaleza = useMemo(() => {
    let puntos = 0;

    if (requisitos.largoMinimo) puntos += 25;
    if (requisitos.tieneMayuscula) puntos += 25;
    if (requisitos.tieneMinuscula) puntos += 25;
    if (requisitos.tieneNumero) puntos += 25;

    return puntos;
  }, [requisitos]);

  const textoFortaleza = useMemo(() => {
    if (!passwordNueva) return "Sin ingresar";

    if (fortaleza <= 25) return "Débil";
    if (fortaleza <= 50) return "Regular";
    if (fortaleza <= 75) return "Buena";

    return "Muy segura";
  }, [fortaleza, passwordNueva]);

  const cambiarPassword = async () => {
    if (!passwordNueva || !repetirPassword) {
      mostrarNotificacion("Complete los dos campos de contraseña.", "warning");
      return;
    }

    if (!passwordValida) {
      mostrarNotificacion(
        "La contraseña no cumple todos los requisitos.",
        "warning",
      );
      return;
    }

    try {
      setGuardando(true);

      /*
       * Obtenemos la sesión autenticada de Supabase.
       */
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      if (!session?.access_token) {
        mostrarNotificacion(
          "La sesión venció. Iniciá sesión nuevamente.",
          "warning",
        );

        localStorage.removeItem("usuario");
        localStorage.removeItem("empresa");
        localStorage.removeItem("empresaActiva");

        await supabase.auth.signOut();

        navigate("/login", {
          replace: true,
        });

        return;
      }

      /*
       * El backend identifica al usuario por el JWT.
       * No enviamos auth_user_id desde React.
       */
      const respuesta = await fetch(`${API_URL}/api/auth/cambiar-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          password: passwordNueva,
        }),
      });

      let resultado;

      try {
        resultado = await respuesta.json();
      } catch {
        throw new Error("El servidor no devolvió una respuesta válida.");
      }

      if (!respuesta.ok || !resultado?.ok) {
        throw new Error(
          resultado?.error || "No se pudo cambiar la contraseña.",
        );
      }

      /*
       * Actualizamos también el usuario guardado localmente,
       * para que la aplicación ya no vuelva a redirigirlo.
       */
      const usuarioGuardado = JSON.parse(
        localStorage.getItem("usuario") || "null",
      );

      if (usuarioGuardado) {
        localStorage.setItem(
          "usuario",
          JSON.stringify({
            ...usuarioGuardado,
            debe_cambiar_password: false,
          }),
        );
      }

      mostrarNotificacion("Contraseña actualizada correctamente.", "success");

      setTimeout(() => {
        navigate("/dashboard", {
          replace: true,
        });
      }, 1200);
    } catch (error) {
      console.error("Error al cambiar la contraseña:", error);

      mostrarNotificacion(
        error?.message || "No se pudo cambiar la contraseña.",
        "error",
      );
    } finally {
      setGuardando(false);
    }
  };

  const Requisito = ({ cumplido, children }) => (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        mb: 0.5,
      }}
    >
      {cumplido ? (
        <CheckCircleIcon color="success" sx={{ fontSize: 19 }} />
      ) : (
        <CancelIcon color="disabled" sx={{ fontSize: 19 }} />
      )}

      <Typography
        variant="body2"
        color={cumplido ? "success.main" : "text.secondary"}
      >
        {children}
      </Typography>
    </Box>
  );

  return (
    <Box
      sx={{
        minHeight: "calc(100vh - 100px)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        px: 2,
        py: 4,
        bgcolor: "#f5f5f5",
      }}
    >
      <Paper
        elevation={4}
        sx={{
          width: "100%",
          maxWidth: 470,
          p: {
            xs: 3,
            sm: 4,
          },
          borderRadius: 3,
        }}
      >
        <Typography variant="h5" fontWeight="bold" textAlign="center">
          Cambiar contraseña
        </Typography>

        <Typography
          variant="body2"
          color="text.secondary"
          textAlign="center"
          sx={{ mt: 1, mb: 3 }}
        >
          Por seguridad, debés reemplazar la contraseña provisoria antes de
          continuar.
        </Typography>

        <TextField
          label="Nueva contraseña"
          type={mostrarPassword ? "text" : "password"}
          fullWidth
          value={passwordNueva}
          disabled={guardando}
          autoComplete="new-password"
          onChange={(e) => setPasswordNueva(e.target.value)}
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    edge="end"
                    disabled={guardando}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setMostrarPassword((anterior) => !anterior)}
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

        <TextField
          label="Repetir contraseña"
          type={mostrarRepeticion ? "text" : "password"}
          fullWidth
          value={repetirPassword}
          disabled={guardando}
          autoComplete="new-password"
          sx={{ mt: 2 }}
          error={
            repetirPassword.length > 0 && passwordNueva !== repetirPassword
          }
          helperText={
            repetirPassword.length > 0 && passwordNueva !== repetirPassword
              ? "Las contraseñas no coinciden"
              : " "
          }
          onChange={(e) => setRepetirPassword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && passwordValida && !guardando) {
              e.preventDefault();
              cambiarPassword();
            }
          }}
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    edge="end"
                    disabled={guardando}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() =>
                      setMostrarRepeticion((anterior) => !anterior)
                    }
                    aria-label={
                      mostrarRepeticion
                        ? "Ocultar contraseña"
                        : "Mostrar contraseña"
                    }
                  >
                    {mostrarRepeticion ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />

        <Box sx={{ mt: 1, mb: 2 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              mb: 0.5,
            }}
          >
            <Typography variant="body2">Fortaleza</Typography>

            <Typography variant="body2" fontWeight="bold">
              {textoFortaleza}
            </Typography>
          </Box>

          <LinearProgress
            variant="determinate"
            value={fortaleza}
            sx={{
              height: 8,
              borderRadius: 5,
            }}
          />
        </Box>

        <Box
          sx={{
            bgcolor: "grey.50",
            borderRadius: 2,
            p: 2,
            mb: 3,
          }}
        >
          <Requisito cumplido={requisitos.largoMinimo}>
            Mínimo 8 caracteres
          </Requisito>

          <Requisito cumplido={requisitos.tieneMayuscula}>
            Al menos una letra mayúscula
          </Requisito>

          <Requisito cumplido={requisitos.tieneMinuscula}>
            Al menos una letra minúscula
          </Requisito>

          <Requisito cumplido={requisitos.tieneNumero}>
            Al menos un número
          </Requisito>

          <Requisito cumplido={requisitos.coinciden}>
            Las contraseñas coinciden
          </Requisito>
        </Box>

        <Button
          variant="contained"
          fullWidth
          size="large"
          disabled={!passwordValida || guardando}
          onClick={cambiarPassword}
        >
          {guardando ? "CAMBIANDO CONTRASEÑA..." : "CAMBIAR CONTRASEÑA"}
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
          severity={tipoMensaje}
          variant="filled"
          onClose={() => setOpenMensaje(false)}
          sx={{ width: "100%" }}
        >
          {mensaje}
        </Alert>
      </Snackbar>
    </Box>
  );
}
