import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../hook/supabaseClient";
import { Box, Button, Paper, TextField, Typography } from "@mui/material";

export default function Login() {
  const navigate = useNavigate();

  const [usuarioLogin, setUsuarioLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const ingresar = async () => {
    setError("");

    const { data, error } = await supabase.from("usuarios").select("*");

    if (error) {
      console.log(error);
      setError("Error al iniciar sesion");
      return;
    }

    const usuario = data?.find(
      (u) =>
        u.usuario?.trim().toLowerCase() === usuarioLogin.trim().toLowerCase(),
    );

    if (!usuario) {
      setError("Usuario inexistente");
      return;
    }

    if (usuario.password?.trim() !== password.trim()) {
      setError("Contraseña incorrecta");
      return;
    }

    localStorage.setItem("usuario", JSON.stringify(usuario));

    navigate("/dashboard");
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
          sx={{ mb: 2 }}
          value={usuarioLogin}
          onChange={(e) => setUsuarioLogin(e.target.value)}
        />

        <TextField
          label="Contraseña"
          type="password"
          fullWidth
          size="small"
          sx={{ mb: 2 }}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && (
          <Typography color="error" mb={2}>
            {error}
          </Typography>
        )}

        <Button variant="contained" fullWidth onClick={ingresar}>
          Ingresar
        </Button>
      </Paper>
    </Box>
  );
}
