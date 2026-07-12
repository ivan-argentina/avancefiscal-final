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
  Container,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import LocationCityIcon from "@mui/icons-material/LocationCity";
import { obtenerEmpresa } from "../utils/obtenerEmpresa";
import SaveIcon from "@mui/icons-material/Save";
import CircularProgress from "@mui/material/CircularProgress";
import Notificaciones from "./Notificaciones";
import ConfirmDialog from "../componentes/ConfirmDialog";
import InputAdornment from "@mui/material/InputAdornment";
import SearchIcon from "@mui/icons-material/Search";
import { DataGrid } from "@mui/x-data-grid";
import EditIcon from "@mui/icons-material/Edit";

export default function AbmCiudades() {
  const [ciudades, setCiudades] = useState([]);
  const [nombreCiudad, setNombreCiudad] = useState("");
  const [editId, setEditId] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [buscar, setBuscar] = useState("");

  const [open, setOpen] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [tipo, setTipo] = useState("success");
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    titulo: "",
    mensaje: "",
    textoConfirmar: "Aceptar",
    color: "error",
    accion: null,
  });
  const ciudadesFiltradas = ciudades.filter((ciudad) =>
    ciudad.nombre?.toLowerCase().includes(buscar.toLowerCase()),
  );

  const cargarCiudades = async () => {
    const usuarioGuardado = JSON.parse(localStorage.getItem("usuario"));
    const idEmpresa = await obtenerEmpresa(usuarioGuardado.id);

    const { data, error } = await supabase
      .from("ciudades")
      .select("*")
      .eq("idempresa", idEmpresa)
      .eq("activo", true)
      .order("nombre", { ascending: true });

    if (error) {
      console.error("Error al cargar ciudades:", error);
      return;
    }

    setCiudades(data || []);
  };

  const guardarCiudad = async (e) => {
    e?.preventDefault();

    if (!nombreCiudad.trim()) {
      setMensaje("Ingrese el nombre de la ciudad");
      setTipo("warning");
      setOpen(true);
      return;
    }

    if (guardando) return;

    setGuardando(true);

    try {
      const usuarioGuardado = JSON.parse(localStorage.getItem("usuario"));
      const idEmpresa = await obtenerEmpresa(usuarioGuardado.id);

      if (!idEmpresa) {
        throw new Error("No se encontró la empresa");
      }

      let error;

      if (editId !== null) {
        const resultado = await supabase
          .from("ciudades")
          .update({
            nombre: nombreCiudad.trim(),
          })
          .eq("id", editId)
          .eq("idempresa", idEmpresa);

        error = resultado.error;
      } else {
        const resultado = await supabase.from("ciudades").insert([
          {
            nombre: nombreCiudad.trim(),
            idempresa: idEmpresa,
            activo: true,
          },
        ]);

        error = resultado.error;
      }

      if (error) {
        throw error;
      }

      setMensaje(
        editId !== null
          ? "Ciudad actualizada correctamente"
          : "Ciudad guardada correctamente",
      );
      setTipo("success");
      setOpen(true);

      setNombreCiudad("");
      setEditId(null);

      await cargarCiudades();
    } catch (error) {
      console.error("Error al guardar ciudad:", error);

      setMensaje("Error al guardar la ciudad");
      setTipo("error");
      setOpen(true);
    } finally {
      setGuardando(false);
    }
  };
  const editarCiudad = (ciudad) => {
    if (!ciudad) return;

    setEditId(ciudad.id);
    setNombreCiudad(ciudad.nombre);
  };

  const eliminarCiudad = async (id) => {
    const usuarioGuardado = JSON.parse(localStorage.getItem("usuario"));
    const idEmpresa = await obtenerEmpresa(usuarioGuardado.id);

    try {
      const [
        { data: clientes, error: errorClientes },
        { data: proveedores, error: errorProveedores },
        { data: empresas, error: errorEmpresas },
      ] = await Promise.all([
        supabase
          .from("clientes")
          .select("id")
          .eq("idciudad", id)
          .eq("idempresa", idEmpresa)
          .limit(1),

        supabase
          .from("proveedores")
          .select("id")
          .eq("idciudad", id)
          .eq("idempresa", idEmpresa)
          .limit(1),

        supabase
          .from("empresas")
          .select("id")
          .eq("idciudad", id)
          .eq("id", idEmpresa)
          .limit(1),
      ]);

      if (errorClientes || errorProveedores || errorEmpresas) {
        throw errorClientes || errorProveedores || errorEmpresas;
      }

      const ciudadEnUso =
        clientes.length > 0 || proveedores.length > 0 || empresas.length > 0;

      if (ciudadEnUso) {
        const { error } = await supabase
          .from("ciudades")
          .update({ activo: false })
          .eq("id", id)
          .eq("idempresa", idEmpresa);

        if (error) throw error;

        setMensaje("Ciudad desactivada correctamente");
      } else {
        const { error } = await supabase
          .from("ciudades")
          .delete()
          .eq("id", id)
          .eq("idempresa", idEmpresa);

        if (error) throw error;

        setMensaje("Ciudad eliminada correctamente");
      }

      setTipo("success");
      setOpen(true);

      await cargarCiudades();
    } catch (error) {
      console.error("Error al eliminar ciudad:", error);
      setMensaje("Error al eliminar o desactivar la ciudad");
      setTipo("error");
      setOpen(true);
    }
  };

  const columnas = [
    {
      field: "nombre",
      headerName: "Ciudad",
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
          title="Modificar ciudad"
          onClick={() => editarCiudad(params.row)}
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
          title="Eliminar ciudad"
          onClick={() =>
            setConfirmDialog({
              open: true,
              titulo: "Eliminar ciudad",
              mensaje:
                "Si la ciudad está siendo utilizada será desactivada. Si no tiene registros asociados, será eliminada definitivamente. ¿Deseás continuar?",
              textoConfirmar: "Aceptar",
              color: "error",
              accion: () => eliminarCiudad(params.row.id),
            })
          }
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      ),
    },
  ];

  useEffect(() => {
    cargarCiudades();
  }, []);

  return (
    <Container maxWidth="sm">
      <Typography variant="h4" sx={{ mt: 4, mb: 3 }}>
        ABM Ciudades
      </Typography>

      <Notificaciones
        open={open}
        mensaje={mensaje}
        tipo={tipo}
        onClose={() => setOpen(false)}
      />

      {/* FORMULARIO */}
      <Box
        component="form"
        onSubmit={guardarCiudad}
        sx={{
          display: "flex",
          gap: 2,
          mb: 3,
          alignItems: "center",
        }}
      >
        <TextField
          label="Ciudad"
          value={nombreCiudad}
          onChange={(e) => setNombreCiudad(e.target.value)}
          sx={{ width: 300 }}
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

      {/* LISTADO */}
      <Paper
        elevation={3}
        sx={{
          p: 2,
          borderRadius: 3,
          mt: 2,
        }}
      >
        <TextField
          label="Buscar ciudad"
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
            rows={ciudadesFiltradas}
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
          const accion = confirmDialog.accion;

          setConfirmDialog((prev) => ({
            ...prev,
            open: false,
          }));

          if (accion) {
            await accion();
          }
        }}
      />
    </Container>
  );
}
