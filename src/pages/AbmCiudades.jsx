import { useEffect, useState } from "react";
import { supabase } from "../hook/supabaseClient";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Divider,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import LocationCityIcon from "@mui/icons-material/LocationCity";
import { obtenerEmpresa } from "../utils/obtenerEmpresa";

export default function AbmCiudades() {
  const [ciudades, setCiudades] = useState([]);
  const [nombreCiudad, setNombreCiudad] = useState("");

  const cargarCiudades = async () => {
    const usuarioGuardado = JSON.parse(localStorage.getItem("usuario"));
    const idEmpresa = await obtenerEmpresa(usuarioGuardado.id);

    const { data, error } = await supabase
      .from("ciudades")
      .select("*")
      .eq("idempresa", idEmpresa)
      .order("nombre", { ascending: true });

    if (error) {
      console.error("Error al cargar ciudades:", error);
      return;
    }

    setCiudades(data || []);
  };

  const guardarCiudad = async () => {
    const usuarioGuardado = JSON.parse(localStorage.getItem("usuario"));
    const idEmpresa = await obtenerEmpresa(usuarioGuardado.id);
    if (!nombreCiudad.trim()) return;

    const { error } = await supabase
      .from("ciudades")
      .insert([{ nombre: nombreCiudad.trim(), idempresa: idEmpresa.trim() }]);

    if (error) {
      console.error("Error al guardar ciudad:", error);
      return;
    }

    setNombreCiudad("");
    cargarCiudades();
  };

  const eliminarCiudad = async (id) => {
    const usuarioGuardado = JSON.parse(localStorage.getItem("usuario"));
    const idEmpresa = await obtenerEmpresa(usuarioGuardado.id);

    const { error } = await supabase
      .from("ciudades")
      .delete()
      .eq("id", id)
      .eq("idempresa", idEmpresa);

    if (error) {
      console.error("Error al eliminar ciudad:", error);
      return;
    }

    cargarCiudades();
  };

  useEffect(() => {
    cargarCiudades();
  }, []);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#f5f7fb",
        py: 4,
        px: 2,
      }}
    >
      <Paper
        elevation={3}
        sx={{
          maxWidth: 700,
          mx: "auto",
          p: 4,
          borderRadius: 4,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            mb: 3,
          }}
        >
          <LocationCityIcon color="primary" />
          <Typography variant="h4" fontWeight={600}>
            ABM Ciudades
          </Typography>
        </Box>

        <Box
          sx={{
            display: "flex",
            gap: 2,
            mb: 3,
          }}
        >
          <TextField
            fullWidth
            label="Ciudad"
            value={nombreCiudad}
            onChange={(e) => setNombreCiudad(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") guardarCiudad();
            }}
          />
          <Button
            variant="contained"
            onClick={guardarCiudad}
            sx={{ minWidth: 130, borderRadius: 2 }}
          >
            Guardar
          </Button>
        </Box>

        <Paper
          variant="outlined"
          sx={{
            borderRadius: 3,
            overflow: "hidden",
            border: "1px solid #E0E0E0",
          }}
        >
          <List disablePadding>
            {ciudades.length === 0 ? (
              <ListItem>
                <ListItemText primary="No hay ciudades cargadas." />
              </ListItem>
            ) : (
              ciudades.map((ciudad, index) => (
                <Box key={ciudad.id}>
                  <ListItem
                    secondaryAction={
                      <IconButton
                        edge="end"
                        color="error"
                        onClick={() => eliminarCiudad(ciudad.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    }
                  >
                    <ListItemText primary={ciudad.nombre} />
                  </ListItem>
                  {index < ciudades.length - 1 && <Divider />}
                </Box>
              ))
            )}
          </List>
        </Paper>
      </Paper>
    </Box>
  );
}
