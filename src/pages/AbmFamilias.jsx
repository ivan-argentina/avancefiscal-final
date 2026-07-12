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
import { DataGrid } from "@mui/x-data-grid";
import SearchIcon from "@mui/icons-material/Search";
import EditIcon from "@mui/icons-material/Edit";
import InputAdornment from "@mui/material/InputAdornment";
import CircularProgress from "@mui/material/CircularProgress";
import SaveIcon from "@mui/icons-material/Save";

export default function AbmFamilias() {
  const [familias, setFamilias] = useState([]);
  const [nombre, setNombre] = useState("");
  const [editId, setEditId] = useState(null);
  const [tipo, setTipo] = useState("success");
  const [open, setOpen] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [buscar, setBuscar] = useState("");
  const [guardando, setGuardando] = useState(false);
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
  const familiasFiltradas = familias.filter((familia) =>
    familia.nombre?.toLowerCase().includes(buscar.toLowerCase()),
  );
  //Cargo/Guardo Familias
  async function guardar(e) {
    e?.preventDefault();

    if (!nombre.trim()) {
      setMensaje("Ingrese el nombre de la familia");
      setTipo("warning");
      setOpen(true);
      return;
    }

    if (guardando) return;

    setGuardando(true);

    try {
      const usuarioGuardado = JSON.parse(localStorage.getItem("usuario"));
      const idEmpresa = await obtenerEmpresa(usuarioGuardado.id);

      let error;

      if (editId !== null) {
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
          activo: true,
        });

        error = resultado.error;
      }

      if (error) {
        throw error;
      }

      setMensaje(
        editId !== null
          ? "Familia actualizada correctamente"
          : "Familia guardada correctamente",
      );
      setTipo("success");
      setOpen(true);

      setNombre("");
      setEditId(null);

      await cargarFamilias();
    } catch (error) {
      console.error("Error al guardar familia:", error);

      setMensaje("Error al guardar la familia");
      setTipo("error");
      setOpen(true);
    } finally {
      setGuardando(false);
    }
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

  function editar(familia) {
    if (!familia) return;
    setEditId(familia.id);
    setNombre(familia.nombre);
  }
  const columnas = [
    {
      field: "nombre",
      headerName: "Familia",
      flex: 1,
      minWidth: 250,
    },
    {
      field: "editar",
      headerName: "",
      width: 70,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <IconButton
          color="primary"
          size="small"
          onClick={() => editar(params.row)}
          title="Modificar familia"
        >
          <EditIcon fontSize="small" />
        </IconButton>
      ),
    },
    {
      field: "eliminar",
      headerName: "",
      width: 70,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <IconButton
          color="error"
          size="small"
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
          title="Eliminar familia"
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      ),
    },
  ];
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

        <Button
          type="submit"
          variant="contained"
          disabled={guardando}
          startIcon={
            guardando ? (
              <CircularProgress size={18} color="inherit" />
            ) : (
              <SaveIcon />
            )
          }
        >
          {guardando
            ? "Guardando..."
            : editId !== null
              ? "Actualizar"
              : "Agregar"}
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
        <TextField
          label="Buscar familia"
          size="small"
          fullWidth
          value={buscar}
          onChange={(e) => setBuscar(e.target.value)}
          sx={{ mb: 1 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />

        <Box sx={{ height: 430, width: "100%" }}>
          <DataGrid
            rows={familiasFiltradas}
            columns={columnas}
            getRowId={(row) => row.id}
            rowHeight={38}
            density="compact"
            initialState={{
              pagination: {
                paginationModel: {
                  pageSize: 50,
                  page: 0,
                },
              },
            }}
            pageSizeOptions={[20, 50, 100]}
            disableRowSelectionOnClick
            sx={{
              backgroundColor: "#fff",
              borderRadius: 2,
              "& .MuiDataGrid-cell": {
                py: 0.5,
                fontSize: 12,
                display: "flex",
                alignItems: "center",
              },
              "& .MuiDataGrid-columnHeaderTitle": {
                fontWeight: 700,
              },
              "& .MuiDataGrid-columnHeaders": {
                backgroundColor: "#f3f3f3",
                fontSize: 13,
                fontWeight: 700,
              },
            }}
          />
        </Box>
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
