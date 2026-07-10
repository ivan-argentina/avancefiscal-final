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
import ConfirmDialog from "../componentes/ConfirmDialog";

export default function AbmFamilias() {
  const [familias, setFamilias] = useState([]);
  const [nombre, setNombre] = useState("");
  const [editId, setEditId] = useState(null);
  const [tipo, setTipo] = useState("success");
  const [open, setOpen] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    titulo: "",
    mensaje: "",
    textoConfirmar: "Aceptar",
    color: "primary",
    accion: null,
  });
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
      .eq("activo", true)
      .order("nombre");
    setFamilias(data);
  }

  //Cargo/Guardo Familias
  async function guardar() {
    const usuarioGuardado = JSON.parse(localStorage.getItem("usuario"));
    const idEmpresa = await obtenerEmpresa(usuarioGuardado.id);

    if (!nombre.trim()) {
      setMensaje("Ingrese el nombre de la familia");
      setTipo("warning");
      setOpen(true);
      return;
    }

    let error;

    if (editId) {
      const resultado = await supabase
        .from("familias")
        .update({ nombre: nombre.trim() })
        .eq("id", editId)
        .eq("idempresa", idEmpresa);

      error = resultado.error;
    } else {
      const resultado = await supabase.from("familias").insert({
        nombre: nombre.trim(),
        idempresa: idEmpresa,
      });

      error = resultado.error;
    }

    if (error) {
      console.error(error);
      setMensaje("Error al guardar la familia");
      setTipo("error");
      setOpen(true);
      return;
    }

    setMensaje(
      editId
        ? "Familia actualizada correctamente"
        : "Familia guardada correctamente",
    );
    setTipo("success");
    setOpen(true);

    setNombre("");
    setEditId(null);

    await cargarFamilias();
  }

  async function eliminar(id) {
    const usuarioGuardado = JSON.parse(localStorage.getItem("usuario"));
    const idEmpresa = await obtenerEmpresa(usuarioGuardado.id);

    const { data: articulosAsociados, error: errorArticulos } = await supabase
      .from("articulos")
      .select("id")
      .eq("idfamilia", id)
      .eq("idempresa", idEmpresa);

    if (errorArticulos) {
      console.error(errorArticulos);
      setMensaje("Error al verificar artículos asociados");
      setTipo("error");
      setOpen(true);
      return;
    }

    if (articulosAsociados && articulosAsociados.length > 0) {
      const { error } = await supabase
        .from("familias")
        .update({ activo: false })
        .eq("id", id)
        .eq("idempresa", idEmpresa);

      if (error) {
        console.error(error);
        setMensaje("Error al desactivar la familia");
        setTipo("error");
        setOpen(true);
        return;
      }

      setMensaje("Familia desactivada correctamente");
      setTipo("success");
      setOpen(true);

      await cargarFamilias();
      return;
    }

    const { error } = await supabase
      .from("familias")
      .delete()
      .eq("id", id)
      .eq("idempresa", idEmpresa);

    if (error) {
      console.error(error);
      setMensaje("Error al eliminar la familia");
      setTipo("error");
      setOpen(true);
      return;
    }

    setMensaje("Familia eliminada correctamente");
    setTipo("success");
    setOpen(true);

    await cargarFamilias();
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
                    onClick={() =>
                      setConfirmDialog({
                        open: true,
                        titulo: "Eliminar familia",
                        mensaje:
                          "Si la familia tiene artículos asociados será desactivada. Si no tiene artículos, será eliminada definitivamente. ¿Deseás continuar?",
                        textoConfirmar: "Aceptar",
                        color: "error",
                        accion: () => eliminar(params.row.id),
                      })
                    }
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
      <ConfirmDialog
        open={confirmDialog.open}
        titulo={confirmDialog.titulo}
        mensaje={confirmDialog.mensaje}
        textoConfirmar={confirmDialog.textoConfirmar}
        colorConfirmar={confirmDialog.color}
        onClose={() =>
          setConfirmDialog((prev) => ({
            ...prev,
            open: false,
          }))
        }
        onConfirm={async () => {
          setConfirmDialog((prev) => ({
            ...prev,
            open: false,
          }));

          if (confirmDialog.accion) {
            await confirmDialog.accion();
          }
        }}
      />
    </Container>
  );
}
