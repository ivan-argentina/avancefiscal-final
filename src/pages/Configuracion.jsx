import { Container, Paper, Typography, Grid } from "@mui/material";
import MenuItem from "@mui/material/MenuItem";
import { useState, useEffect } from "react";
import { TextField } from "@mui/material";
import { supabase } from "../hook/supabaseClient";
import Notificaciones from "./Notificaciones";
import { obtenerEmpresa } from "../utils/obtenerEmpresa";

import { Box, Button } from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";

export default function Configuracion() {
  const [tipoImpresion, setTipoImpresion] = useState("laser");
  const [open, setOpen] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [tipo, setTipo] = useState("success");

  useEffect(() => {
    cargarConfiguracion();
  }, []);

  const guardarConfiguracion = async () => {
    const usuarioGuardado = JSON.parse(localStorage.getItem("usuario"));
    const idEmpresa = await obtenerEmpresa(usuarioGuardado.id);

    const { error } = await supabase
      .from("empresas")
      .update({
        tipo_impresion: tipoImpresion,
      })
      .eq("id", idEmpresa);

    if (error) {
      console.error(error);

      setMensaje("Error al guardar la configuración");
      setTipo("error");
      setOpen(true);
      return;
    }

    setMensaje("Configuración guardada correctamente");
    setTipo("success");
    setOpen(true);
  };
  const cargarConfiguracion = async () => {
    const usuarioGuardado = JSON.parse(localStorage.getItem("usuario"));
    const idEmpresa = await obtenerEmpresa(usuarioGuardado.id);

    const { data, error } = await supabase
      .from("empresas")
      .select("tipo_impresion")
      .eq("id", idEmpresa)
      .single();

    if (error) {
      console.error(error);
      return;
    }

    setTipoImpresion(data.tipo_impresion || "laser");
  };

  return (
    <Container maxWidth="md">
      <Notificaciones
        open={open}
        mensaje={mensaje}
        tipo={tipo}
        onClose={() => setOpen(false)}
      />
      <Typography variant="h4" sx={{ mt: 3, mb: 3 }}>
        Configuración
      </Typography>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12 }}>
          <Paper
            sx={{
              p: 3,
              borderRadius: 3,
            }}
          >
            <Grid container spacing={2} sx={{ mt: 2 }}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  select
                  fullWidth
                  label="Tipo de impresión"
                  value={tipoImpresion}
                  onChange={(e) => setTipoImpresion(e.target.value)}
                >
                  <MenuItem value="laser">Láser</MenuItem>
                  <MenuItem value="comandera">Comandera</MenuItem>
                </TextField>
              </Grid>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "flex-end",
                  mt: 3,
                }}
              >
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={guardarConfiguracion}
                >
                  Guardar
                </Button>
              </Box>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}
