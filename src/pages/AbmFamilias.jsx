import {
  Box,
  Button,
  Container,
  IconButton,
  List,
  ListItem,
  ListItemText,
  TextField,
  Typography,
  Paper,
  Divider,
} from "@mui/material";
import { supabase } from "../hook/supabaseClient";
import DeleteIcon from "@mui/icons-material/Delete";
import Notificaciones from "./Notificaciones";
import { useEffect, useState } from "react";
import { obtenerEmpresa } from "../utils/obtenerEmpresa";

export default function AbmFamilias() {
  const [familias, setFamilias] = useState([]);
  const [nombre, setNombre] = useState("");
  const [editId, setEditId] = useState(null);
  const [tipo, setTipo] = useState("success");
  const [open, setOpen] = useState(false);
  const [mensaje, setMensaje] = useState("");
  useEffect(() => {
    cargarFamilias();
  }, []);

  async function cargarFamilias() {
    const usuarioGuardado = JSON.parse(localStorage.getItem("usuario"));

    const idEmpresa = await obtenerEmpresa(usuarioGuardado.id);

    const { data } = await supabase
      .from("familias")
      .select("*")
      .eq("idempresa", idEmpresa)
      .order("nombre");
    setFamilias(data);
  }

  //Cargo/Guardo Familias
  async function guardar() {
    const usuarioGuardado = JSON.parse(localStorage.getItem("usuario"));

    const idEmpresa = await obtenerEmpresa(usuarioGuardado.id);
    if (editId) {
      await supabase
        .from("familias")
        .update({ nombre })
        .eq("id", editId)
        .eq("idempresa", idEmpresa);
    } else {
      await supabase.from("familias").insert({ nombre, idempresa: idEmpresa });
      setMensaje("Familia Guardada correctamente");
      setTipo("success");
      setOpen(true);
    }
    setNombre("");
    setEditId(null);
    cargarFamilias();
  }

  async function eliminar(id) {
    const usuarioGuardado = JSON.parse(localStorage.getItem("usuario"));

    const idEmpresa = await obtenerEmpresa(usuarioGuardado.id);

    if (!confirm("Eliminar Familia?")) return;
    await supabase
      .from("familias")
      .delete()
      .eq("id", id)
      .eq("idempresa", idEmpresa);

    setMensaje("Ciudad Eliminada");
    setTipo("info");
    setOpen(true);
    cargarFamilias();
  }

  function editar(f) {
    setNombre(f.nombre);
    setEditId(editId.id);
  }
  return (
    <Container maxWidth="sm">
      <Typography variant="h4" sx={{ mt: 4, mb: 3 }}>
        ABM Familias
      </Typography>
      <Notificaciones
        open={open}
        mensaje={mensaje}
        tipo={tipo}
        onClose={() => setOpen(false)}
      />
      <Box
        component="form"
        onSubmit={guardar}
        sx={{ display: "flex", gap: 2, mb: 3 }}
      >
        <TextField
          label="Nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />

        <Button variant="contained" onClick={guardar}>
          {editId ? "Actualizar" : "Agregar"}
        </Button>
      </Box>

      <Paper
        elevation={3}
        sx={{
          p: 2,
          borderRadius: 3,
          mt: 2,
        }}
      >
        <List>
          {familias.map((f, index) => (
            <Box key={f.id}>
              <ListItem
                secondaryAction={
                  <IconButton
                    edge="end"
                    color="error"
                    onClick={() => eliminar(f.id)}
                  >
                    <DeleteIcon />
                  </IconButton>
                }
              >
                <ListItemText primary={f.nombre} />
              </ListItem>

              {index < familias.length - 1 && <Divider />}
            </Box>
          ))}
        </List>
      </Paper>
    </Container>
  );
}
