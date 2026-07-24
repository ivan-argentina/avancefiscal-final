import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { supabase } from "../hook/supabaseClient";

import {
  Alert,
  Box,
  Button,
  CircularProgress,
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
import LockResetIcon from "@mui/icons-material/LockReset";

export default function CambiarPassword() {
  const navigate = useNavigate();
  const location = useLocation();

  /*
   * Este mismo componente trabaja en dos modos:
   *
   * /cambiar-password:
   * cambio obligatorio luego del primer ingreso.
   *
   * /restablecer-password:
   * recuperación iniciada desde el email de Supabase.
   */
  const esRecuperacion = location.pathname === "/restablecer-password";

  const [passwordNueva, setPasswordNueva] = useState("");

  const [repetirPassword, setRepetirPassword] = useState("");

  const [mostrarPassword, setMostrarPassword] = useState(false);

  const [mostrarRepeticion, setMostrarRepeticion] = useState(false);

  const [guardando, setGuardando] = useState(false);

  /*
   * Solo se utiliza al ingresar desde el email
   * de recuperación.
   */
  const [verificandoSesion, setVerificandoSesion] = useState(esRecuperacion);

  const [sesionRecuperacionValida, setSesionRecuperacionValida] =
    useState(!esRecuperacion);

  /*
   * NOTIFICACIONES
   */
  const [mensaje, setMensaje] = useState("");
  const [tipoMensaje, setTipoMensaje] = useState("error");

  const [openMensaje, setOpenMensaje] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

  const mostrarNotificacion = (texto, tipo = "error") => {
    setMensaje(texto);
    setTipoMensaje(tipo);
    setOpenMensaje(true);
  };

  /*
   * Cuando el usuario llega desde el email,
   * Supabase procesa el enlace y crea una sesión
   * temporal de recuperación.
   */
  useEffect(() => {
    if (!esRecuperacion) {
      return undefined;
    }

    let componenteActivo = true;
    let temporizador = null;

    const marcarSesion = (session) => {
      if (!componenteActivo) {
        return;
      }

      if (session?.access_token) {
        setSesionRecuperacionValida(true);
        setVerificandoSesion(false);

        if (temporizador) {
          clearTimeout(temporizador);
        }
      }
    };

    const validarSesionInicial = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        if (session?.access_token) {
          marcarSesion(session);
          return;
        }

        /*
         * Le damos unos instantes a Supabase para
         * procesar el token incluido en la URL.
         */
        temporizador = setTimeout(() => {
          if (!componenteActivo) {
            return;
          }

          setSesionRecuperacionValida(false);
          setVerificandoSesion(false);
        }, 1500);
      } catch (error) {
        console.error("Error validando la recuperación:", error);

        if (componenteActivo) {
          setSesionRecuperacionValida(false);
          setVerificandoSesion(false);
        }
      }
    };

    /*
     * PASSWORD_RECOVERY se dispara cuando Supabase
     * reconoce correctamente el enlace enviado.
     */
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((evento, session) => {
      if (evento === "PASSWORD_RECOVERY" || evento === "SIGNED_IN") {
        marcarSesion(session);
      }
    });

    validarSesionInicial();

    return () => {
      componenteActivo = false;

      if (temporizador) {
        clearTimeout(temporizador);
      }

      subscription.unsubscribe();
    };
  }, [esRecuperacion]);

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
   * FORTALEZA VISUAL
   */
  const fortaleza = useMemo(() => {
    let puntos = 0;

    if (requisitos.largoMinimo) {
      puntos += 25;
    }

    if (requisitos.tieneMayuscula) {
      puntos += 25;
    }

    if (requisitos.tieneMinuscula) {
      puntos += 25;
    }

    if (requisitos.tieneNumero) {
      puntos += 25;
    }

    return puntos;
  }, [requisitos]);

  const textoFortaleza = useMemo(() => {
    if (!passwordNueva) {
      return "Sin ingresar";
    }

    if (fortaleza <= 25) {
      return "Débil";
    }

    if (fortaleza <= 50) {
      return "Regular";
    }

    if (fortaleza <= 75) {
      return "Buena";
    }

    return "Muy segura";
  }, [fortaleza, passwordNueva]);

  /*
   * CAMBIO O RESTABLECIMIENTO
   */
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

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      if (!session?.access_token) {
        throw new Error(
          esRecuperacion
            ? "El enlace venció o no es válido. Solicitá uno nuevo."
            : "La sesión venció. Iniciá sesión nuevamente.",
        );
      }

      if (esRecuperacion) {
        /*
         * RECUPERACIÓN POR EMAIL
         *
         * La sesión temporal fue generada por el enlace
         * enviado por Supabase.
         */
        const { error: updateError } = await supabase.auth.updateUser({
          password: passwordNueva,
        });

        if (updateError) {
          throw updateError;
        }

        mostrarNotificacion(
          "Contraseña restablecida correctamente.",
          "success",
        );

        /*
         * Cerramos la sesión temporal de recuperación.
         */
        setTimeout(async () => {
          await supabase.auth.signOut();

          localStorage.removeItem("usuario");
          localStorage.removeItem("empresa");
          localStorage.removeItem("empresaActiva");

          navigate("/", {
            replace: true,
          });
        }, 1500);

        return;
      }

      /*
       * PRIMER INGRESO
       *
       * El backend cambia la contraseña y actualiza:
       * debe_cambiar_password = false.
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
       * Actualizamos también el usuario guardado
       * localmente.
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

  const volverAlLogin = async () => {
    await supabase.auth.signOut();

    localStorage.removeItem("usuario");
    localStorage.removeItem("empresa");
    localStorage.removeItem("empresaActiva");

    navigate("/", {
      replace: true,
    });
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

  /*
   * ESPERA MIENTRAS SUPABASE PROCESA EL ENLACE
   */
  if (esRecuperacion && verificandoSesion) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          gap: 2,
          background:
            "linear-gradient(135deg, #eef5ff 0%, #f8fafc 50%, #edf7f4 100%)",
        }}
      >
        <CircularProgress />

        <Typography color="text.secondary">
          Validando el enlace de recuperación...
        </Typography>
      </Box>
    );
  }

  /*
   * ENLACE VENCIDO O INVÁLIDO
   */
  if (esRecuperacion && !sesionRecuperacionValida) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          px: 2,
          background:
            "linear-gradient(135deg, #eef5ff 0%, #f8fafc 50%, #edf7f4 100%)",
        }}
      >
        <Paper
          elevation={6}
          sx={{
            width: "100%",
            maxWidth: 460,
            p: 4,
            borderRadius: 4,
            textAlign: "center",
          }}
        >
          <CancelIcon
            color="error"
            sx={{
              fontSize: 64,
              mb: 1,
            }}
          />

          <Typography variant="h5" fontWeight="bold">
            Enlace no válido
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 1, mb: 3 }}
          >
            El enlace de recuperación venció, ya fue utilizado o no es válido.
            Solicitá uno nuevo desde el login.
          </Typography>

          <Button variant="contained" fullWidth onClick={volverAlLogin}>
            VOLVER AL LOGIN
          </Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: esRecuperacion ? "100vh" : "calc(100vh - 100px)",
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
        elevation={6}
        sx={{
          width: "100%",
          maxWidth: 470,
          p: {
            xs: 3,
            sm: 4,
          },
          borderRadius: 4,
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <Box
          sx={{
            width: 64,
            height: 64,
            borderRadius: "20px",
            bgcolor: "primary.main",
            color: "primary.contrastText",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            mx: "auto",
            mb: 2,
            boxShadow: 3,
          }}
        >
          <LockResetIcon sx={{ fontSize: 34 }} />
        </Box>

        <Typography
          variant="h5"
          fontWeight="bold"
          textAlign="center"
          color="primary.main"
        >
          {esRecuperacion ? "Restablecer contraseña" : "Cambiar contraseña"}
        </Typography>

        <Typography
          variant="body2"
          color="text.secondary"
          textAlign="center"
          sx={{ mt: 1, mb: 3 }}
        >
          {esRecuperacion
            ? "Ingresá una nueva contraseña para volver a acceder a Avance Fiscal."
            : "Por seguridad, debés reemplazar la contraseña provisoria antes de continuar."}
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
          startIcon={
            guardando ? <CircularProgress size={18} color="inherit" /> : null
          }
        >
          {guardando
            ? esRecuperacion
              ? "RESTABLECIENDO..."
              : "CAMBIANDO..."
            : esRecuperacion
              ? "RESTABLECER CONTRASEÑA"
              : "CAMBIAR CONTRASEÑA"}
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
