import { useEffect, useState } from "react";
import { supabase } from "../hook/supabaseClient";
import {
  Box,
  Button,
  Grid,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";

export default function AbmUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [empresas, setEmpresas] = useState([]);

  const [nombre, setNombre] = useState("");
  const [usuario, setUsuario] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [idEmpresa, setIdEmpresa] = useState("");
  const [rol, setRol] = useState("usuario");

  const cargarDatos = async () => {
    const { data: empresasData } = await supabase
      .from("empresas")
      .select("id, razon_social")
      .order("razon_social");

    const { data: usuariosData } = await supabase.from("usuario_empresa")
      .select(`
        id,
        rol,
        usuarios(id, nombre, usuario, email, rol_global),
        empresas(id, razon_social)
      `);

    setEmpresas(empresasData || []);
    setUsuarios(usuariosData || []);
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const limpiar = () => {
    setNombre("");
    setUsuario("");
    setEmail("");
    setPassword("");
    setIdEmpresa("");
    setRol("usuario");
  };

  const guardarUsuario = async () => {
    if (!nombre || !usuario || !password || !idEmpresa) {
      alert("Complete nombre, usuario, contraseña y empresa");
      return;
    }

    const { data: usuarioCreado, error: errorUsuario } = await supabase
      .from("usuarios")
      .insert([
        {
          nombre: nombre.trim(),
          usuario: usuario.trim(),
          email: email.trim() || null,
          password: password.trim(),
          rol_global: "usuario",
          activo: true,
        },
      ])
      .select()
      .single();

    if (errorUsuario) {
      console.log(errorUsuario);
      alert("Error al crear usuario");
      return;
    }

    const { error: errorRelacion } = await supabase
      .from("usuario_empresa")
      .insert([
        {
          idusuario: usuarioCreado.id,
          idempresa: idEmpresa,
          rol,
          activo: true,
        },
      ]);

    if (errorRelacion) {
      console.log(errorRelacion);
      alert("Error al vincular usuario con empresa");
      return;
    }

    limpiar();
    await cargarDatos();
  };

  const columns = [
    {
      field: "nombre",
      headerName: "Nombre",
      flex: 1,
      renderCell: (params) => params.row.usuarios?.nombre || "",
    },
    {
      field: "usuario",
      headerName: "Usuario",
      flex: 1,
      renderCell: (params) => params.row.usuarios?.usuario || "",
    },
    {
      field: "email",
      headerName: "Email",
      flex: 1,
      renderCell: (params) => params.row.usuarios?.email || "",
    },
    {
      field: "empresa",
      headerName: "Empresa",
      flex: 1,
      renderCell: (params) => params.row.empresas?.razon_social || "",
    },
    { field: "rol", headerName: "Rol", width: 120 },
  ];

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" mb={2}>
        Usuarios
      </Typography>

      <Paper sx={{ p: 2, mb: 2, borderRadius: 3 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 3 }}>
            <TextField
              label="Nombre"
              fullWidth
              size="small"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 3 }}>
            <TextField
              label="Usuario"
              fullWidth
              size="small"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 3 }}>
            <TextField
              label="Email"
              fullWidth
              size="small"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 3 }}>
            <TextField
              label="Contraseña"
              type="password"
              fullWidth
              size="small"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              select
              label="Empresa"
              fullWidth
              size="small"
              value={idEmpresa}
              onChange={(e) => setIdEmpresa(e.target.value)}
            >
              {empresas.map((empresa) => (
                <MenuItem key={empresa.id} value={empresa.id}>
                  {empresa.razon_social}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid size={{ xs: 12, md: 3 }}>
            <TextField
              select
              label="Rol"
              fullWidth
              size="small"
              value={rol}
              onChange={(e) => setRol(e.target.value)}
            >
              <MenuItem value="admin">Admin</MenuItem>
              <MenuItem value="usuario">Usuario</MenuItem>
              <MenuItem value="vendedor">Vendedor</MenuItem>
              <MenuItem value="contador">Contador</MenuItem>
            </TextField>
          </Grid>

          <Grid size={{ xs: 12, md: 3 }}>
            <Button variant="contained" onClick={guardarUsuario}>
              Guardar Usuario
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ height: 420, width: "100%", borderRadius: 3 }}>
        <DataGrid
          rows={usuarios}
          columns={columns}
          getRowId={(row) => row.id}
          pageSizeOptions={[10, 20, 50, 100]}
        />
      </Paper>
    </Box>
  );
}
