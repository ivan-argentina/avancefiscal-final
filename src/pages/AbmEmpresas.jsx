import { useEffect, useState } from "react";
import { supabase } from "../hook/supabaseClient";
import {
  Box,
  Button,
  Grid,
  Paper,
  TextField,
  Typography,
  IconButton,
  MenuItem,
  Snackbar,
  Alert,
  Tooltip,
} from "@mui/material";
import Chip from "@mui/material/Chip";
import { DataGrid } from "@mui/x-data-grid";
import { validarCuit } from "../utils/validarCuit";
import { formatearCuit } from "../utils/formatearCuit";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import ConfirmDialog from "../componentes/ConfirmDialog";

export default function AbmEmpresas() {
  const [empresas, setEmpresas] = useState([]);
  const [razonSocial, setRazonSocial] = useState("");
  const [nombreFantacia, setNombreFantacia] = useState("");
  const [cuit, setCuit] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [direccion, setDireccion] = useState("");
  const [editandoId, setEditandoId] = useState(null);
  const [errorCuit, setErrorCuit] = useState("");
  const [condicionIva, setCondicionIva] = useState("");
  const [categoriaMonotributo, setCategoriaMonotributo] = useState("");
  const [idCiudad, setIdCiudad] = useState("");
  const [ciudades, setCiudades] = useState([]);
  const [activo, setActivo] = useState(true);
  const [archivoCertificado, setArchivoCertificado] = useState(null);
  const [archivoKey, setArchivoKey] = useState(null);
  const [archivoLogo, setArchivoLogo] = useState(null);
  const [logoUrl, setLogoUrl] = useState("");
  const [certificadoVencimiento, setCertificadoVencimiento] = useState("");
  const [certificadoCrt, setCertificadoCrt] = useState("");
  const [certificadoKey, setCertificadoKey] = useState("");
  const [ingresosBrutos, setIngresosBrutos] = useState("");
  const [inicioActividades, setInicioActividades] = useState("");
  const [puntoVenta, setPuntoVenta] = useState("");
  const [ambienteFiscal, setAmbienteFiscal] = useState("homologacion");
  const [mensaje, setMensaje] = useState("");
  const [tipoMensaje, setTipoMensaje] = useState("info");
  const [openMensaje, setOpenMensaje] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    titulo: "",
    mensaje: "",
    textoConfirmar: "Aceptar",
    color: "error",
    accion: null,
  });

  const mostrarNotificacion = (texto, tipo = "info") => {
    setMensaje(texto);
    setTipoMensaje(tipo);
    setOpenMensaje(true);
  };
  const handleCuitChange = (e) => {
    const valor = e.target.value.replace(/\D/g, "");
    setCuit(valor);

    if (valor.length === 11) {
      if (!validarCuit(valor)) {
        setErrorCuit("CUIT inválido");
      } else {
        setErrorCuit("");
      }
    } else {
      setErrorCuit("");
    }
  };

  const cargarCiudades = async () => {
    const { data, error } = await supabase
      .from("ciudades")
      .select("id, nombre, idempresa, activo")
      .eq("activo", true)
      .order("nombre", { ascending: true });

    if (error) {
      console.error("Error al cargar ciudades:", error);
      setCiudades([]);
      return;
    }

    setCiudades(data || []);
  };

  useEffect(() => {
    cargarCiudades();
  }, []);

  const cargarEmpresas = async () => {
    const { data, error } = await supabase
      .from("empresas")
      .select("*")
      .order("razon_social", { ascending: true });

    if (error) {
      console.error("Error al cargar empresas:", error);
      return;
    }

    setEmpresas([...data]);
  };

  useEffect(() => {
    cargarEmpresas();
  }, []);

  const limpiarFormulario = () => {
    setRazonSocial("");
    setNombreFantacia("");
    setCuit("");
    setTelefono("");
    setEmail("");
    setDireccion("");
    setIdCiudad("");
    setCondicionIva("");
    setCategoriaMonotributo("");
    setEditandoId(null);
    setActivo(true);
    setPuntoVenta("");
    setAmbienteFiscal("homologacion");
    setArchivoCertificado(null);
    setArchivoKey(null);
    setCertificadoVencimiento("");
    setCertificadoCrt("");
    setCertificadoKey("");
    setIngresosBrutos("");
    setInicioActividades("");
    setArchivoLogo(null);
    setLogoUrl("");
    setErrorCuit("");
  };
  const guardarEmpresa = async () => {
    const razonSocialLimpia = String(razonSocial || "").trim();
    const cuitLimpio = String(cuit || "").replace(/\D/g, "");

    if (!razonSocialLimpia) {
      mostrarNotificacion("Ingresá la razón social", "warning");
      return;
    }

    if (cuitLimpio.length !== 11 || !validarCuit(cuitLimpio)) {
      mostrarNotificacion("Ingresá un CUIT válido", "warning");
      return;
    }

    if (!direccion.trim()) {
      mostrarNotificacion("Ingresá la dirección", "warning");
      return;
    }

    if (!idCiudad) {
      mostrarNotificacion("Seleccioná una ciudad", "warning");
      return;
    }

    if (!condicionIva) {
      mostrarNotificacion("Seleccioná la condición de IVA", "warning");
      return;
    }

    if (condicionIva === "Monotributista" && !categoriaMonotributo) {
      mostrarNotificacion("Seleccioná la categoría de Monotributo", "warning");
      return;
    }

    if (!puntoVenta || Number(puntoVenta) < 1) {
      mostrarNotificacion("Ingresá un punto de venta válido", "warning");
      return;
    }

    try {
      setGuardando(true);

      let rutaCertificado = null;
      let rutaKey = null;
      let nuevaLogoUrl = logoUrl || null;
      /*
       * SUBIR LOGO
       */
      if (archivoLogo) {
        const extension = archivoLogo.name.split(".").pop()?.toLowerCase();

        if (!["jpg", "jpeg", "png", "webp"].includes(extension)) {
          throw new Error("El logo debe ser JPG, PNG o WEBP");
        }

        const rutaLogo = `${cuitLimpio}/logo.${extension}`;

        const { error: errorLogo } = await supabase.storage
          .from("logos")
          .upload(rutaLogo, archivoLogo, {
            upsert: true,
            contentType: archivoLogo.type,
          });

        if (errorLogo) {
          throw errorLogo;
        }

        const { data: logoPublico } = supabase.storage
          .from("logos")
          .getPublicUrl(rutaLogo);

        nuevaLogoUrl = logoPublico.publicUrl;
      }

      /*
       * SUBIR CERTIFICADO
       */
      if (archivoCertificado) {
        rutaCertificado = `${cuitLimpio}/certificado.crt`;

        const { error: errorCertificado } = await supabase.storage
          .from("afip-certificados")
          .upload(rutaCertificado, archivoCertificado, {
            upsert: true,
          });

        if (errorCertificado) {
          throw errorCertificado;
        }
      }

      /*
       * SUBIR CLAVE PRIVADA
       */
      if (archivoKey) {
        rutaKey = `${cuitLimpio}/privada.key`;

        const { error: errorKey } = await supabase.storage
          .from("afip-certificados")
          .upload(rutaKey, archivoKey, {
            upsert: true,
          });

        if (errorKey) {
          throw errorKey;
        }
      }

      /*
       * DATOS DE LA EMPRESA
       */
      const payload = {
        razon_social: razonSocialLimpia,
        nombre_fantasia: String(nombreFantacia || "").trim(),
        cuit: cuitLimpio,
        telefono: String(telefono || "").trim(),
        email: String(email || "").trim(),
        direccion: String(direccion || "").trim(),
        logo_url: nuevaLogoUrl,
        punto_venta: Number(puntoVenta),
        ambiente_fiscal: ambienteFiscal,
        idciudad: Number(idCiudad),
        activo,
        condicion_iva: condicionIva,

        categoria_monotributo:
          condicionIva === "Monotributista" ? categoriaMonotributo : null,

        ingresos_brutos: String(ingresosBrutos || "").trim(),
        inicio_actividades: inicioActividades || null,
        certificado_vencimiento: certificadoVencimiento || null,
      };

      /*
       * Solo reemplaza certificados si se subieron nuevos archivos.
       */
      if (rutaCertificado) {
        payload.certificado_crt = rutaCertificado;
      }

      if (rutaKey) {
        payload.certificado_key = rutaKey;
      }

      if (editandoId) {
        const { data: empresaActualizada, error: errorActualizar } =
          await supabase
            .from("empresas")
            .update(payload)
            .eq("id", editandoId)
            .select()
            .single();

        if (errorActualizar) {
          throw errorActualizar;
        }

        if (!empresaActualizada) {
          throw new Error("Supabase no devolvió la empresa actualizada");
        }

        mostrarNotificacion("Empresa actualizada correctamente", "success");
      } else {
        /*
         * NUEVA EMPRESA
         */
        const { data: empresaCreada, error: errorInsertar } = await supabase
          .from("empresas")
          .insert([payload])
          .select()
          .single();

        if (errorInsertar) {
          throw errorInsertar;
        }

        mostrarNotificacion("Empresa creada correctamente", "success");
      }

      await cargarEmpresas();
      limpiarFormulario();
    } catch (error) {
      console.error("Error al guardar empresa:", error);

      mostrarNotificacion(
        editandoId
          ? `No se pudo actualizar la empresa: ${error.message}`
          : `No se pudo crear la empresa: ${error.message}`,
        "error",
      );
    } finally {
      setGuardando(false);
    }
  };

  const editarEmpresa = (empresa) => {
    setEditandoId(empresa.id);
    setRazonSocial(empresa.razon_social || "");
    setNombreFantacia(empresa.nombre_fantasia || "");
    setCuit(empresa.cuit || "");
    setTelefono(empresa.telefono || "");
    setEmail(empresa.email || "");
    setDireccion(empresa.direccion || "");
    setIdCiudad(
      empresa.idciudad !== null && empresa.idciudad !== undefined
        ? String(empresa.idciudad)
        : "",
    );
    setCondicionIva(empresa.condicion_iva || "");
    setCategoriaMonotributo(empresa.categoria_monotributo || "");
    setPuntoVenta(empresa.punto_venta || "");
    setAmbienteFiscal(empresa.ambiente_fiscal || "homologacion");
    setActivo(empresa.activo ?? true);

    setArchivoCertificado(null);
    setArchivoKey(null);
    setArchivoLogo(null);
    setLogoUrl(empresa.logo_url || "");

    setCertificadoVencimiento(
      empresa.certificado_vencimiento
        ? String(empresa.certificado_vencimiento).split("T")[0]
        : "",
    );

    setCertificadoCrt(empresa.certificado_crt || "");
    setCertificadoKey(empresa.certificado_key || "");

    setIngresosBrutos(
      empresa.ingresos_brutos !== null && empresa.ingresos_brutos !== undefined
        ? String(empresa.ingresos_brutos)
        : "",
    );

    setInicioActividades(
      empresa.inicio_actividades
        ? String(empresa.inicio_actividades).split("T")[0]
        : "",
    );

    setErrorCuit("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const cambiarEstadoEmpresa = async (empresa) => {
    if (!empresa?.id) {
      mostrarNotificacion("No se pudo identificar la empresa", "error");
      return;
    }

    const nuevoEstado = !empresa.activo;

    try {
      const { error } = await supabase
        .from("empresas")
        .update({
          activo: nuevoEstado,
        })
        .eq("id", empresa.id);

      if (error) throw error;

      mostrarNotificacion(
        nuevoEstado
          ? "Empresa activada correctamente"
          : "Empresa desactivada correctamente",
        "success",
      );

      await cargarEmpresas();
    } catch (error) {
      console.error("Error al cambiar estado de la empresa:", error);

      mostrarNotificacion(
        nuevoEstado
          ? "No se pudo activar la empresa"
          : "No se pudo desactivar la empresa",
        "error",
      );
    }
  };

  const columns = [
    { field: "razon_social", headerName: "Razon Social", flex: 1 },
    { field: "nombre_fantasia", headerName: "Fantasia", flex: 1 },
    { field: "cuit", headerName: "CUIT", width: 140 },
    { field: "telefono", headerName: "Telefono", width: 140 },
    { field: "email", headerName: "Email", flex: 1 },
    {
      field: "acciones",
      headerName: "Acciones",
      width: 180,
      renderCell: (params) => (
        <Box>
          <Tooltip title="Editar empresa">
            <IconButton
              onClick={() => editarEmpresa(params.row)}
              color="primary"
              size="small"
            >
              <EditIcon />
            </IconButton>
          </Tooltip>
          <Tooltip
            title={params.row.activo ? "Desactivar empresa" : "Activar empresa"}
          >
            <IconButton
              onClick={() =>
                setConfirmDialog({
                  open: true,
                  titulo: params.row.activo
                    ? "Desactivar empresa"
                    : "Activar empresa",
                  mensaje: params.row.activo
                    ? `¿Deseás desactivar la empresa "${params.row.razon_social}"?`
                    : `¿Deseás activar nuevamente la empresa "${params.row.razon_social}"?`,
                  textoConfirmar: params.row.activo ? "Desactivar" : "Activar",
                  color: params.row.activo ? "warning" : "success",
                  accion: async () => {
                    await cambiarEstadoEmpresa(params.row);
                  },
                })
              }
              color={params.row.activo ? "warning" : "success"}
              size="small"
            >
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
    {
      field: "activo",
      headerName: "Estado",
      width: 120,
      renderCell: (params) => {
        const activo = params.value;

        return (
          <Chip
            label={activo ? "Activa" : "Inactiva"}
            color={activo ? "success" : "error"}
            size="small"
          />
        );
      },
    },
  ];

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" mb={2}>
        Empresas
      </Typography>
      <Paper sx={{ p: 2, mb: 2, borderRadius: 3 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              label="Razon Social"
              fullWidth
              size="small"
              value={razonSocial}
              onChange={(e) => setRazonSocial(e.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              label="Nombre de Fantasia"
              fullWidth
              size="small"
              value={nombreFantacia}
              onChange={(e) => setNombreFantacia(e.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              label="Cuit"
              fullWidth
              size="small"
              value={formatearCuit(cuit)}
              onChange={handleCuitChange}
              error={!!errorCuit}
              helperText={errorCuit}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              label="Direccion"
              fullWidth
              size="small"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 2 }}>
            <TextField
              select
              label="Ciudad"
              value={idCiudad}
              onChange={(e) => setIdCiudad(e.target.value)}
              fullWidth
              size="small"
            >
              <MenuItem value="">Seleccione una ciudad</MenuItem>

              {ciudades.map((ciudad) => (
                <MenuItem key={ciudad.id} value={String(ciudad.id)}>
                  {ciudad.nombre}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, md: 2 }}>
            <TextField
              label="Teléfono"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              fullWidth
              size="small"
            />
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              label="Email"
              fullWidth
              size="small"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 2 }}>
            <TextField
              select
              label="Condición IVA"
              value={condicionIva}
              onChange={(e) => setCondicionIva(e.target.value)}
              fullWidth
              size="small"
              slotProps={{
                htmlInput: {
                  inputMode: "numeric",
                },
              }}
            >
              <MenuItem value="Responsable Inscripto">
                Responsable Inscripto
              </MenuItem>
              <MenuItem value="Monotributista">Monotributista</MenuItem>
              <MenuItem value="Exento">Exento</MenuItem>
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, md: 1 }}>
            {condicionIva === "Monotributista" && (
              <TextField
                select
                label="Categoría"
                value={categoriaMonotributo}
                onChange={(e) => setCategoriaMonotributo(e.target.value)}
                fullWidth
                size="small"
              >
                {["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K"].map(
                  (cat) => (
                    <MenuItem key={cat} value={cat}>
                      {cat}
                    </MenuItem>
                  ),
                )}
              </TextField>
            )}
          </Grid>
          <Grid size={{ xs: 12, md: 2 }}>
            <TextField
              label="Ingresos Brutos"
              fullWidth
              size="small"
              value={ingresosBrutos}
              onChange={(e) => setIngresosBrutos(e.target.value)}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 2 }}>
            <TextField
              label="Inicio de Actividades"
              type="date"
              fullWidth
              size="small"
              value={inicioActividades}
              onChange={(e) => setInicioActividades(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 2 }}>
            <TextField
              select
              label="Estado"
              value={String(activo)}
              onChange={(e) => setActivo(e.target.value === "true")}
              fullWidth
              size="small"
            >
              <MenuItem value="true">Activa</MenuItem>
              <MenuItem value="false">Inactiva</MenuItem>
            </TextField>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mt: 1 }}>
              Logo de la empresa
            </Typography>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Button
              component="label"
              variant="outlined"
              fullWidth
              size="small"
              sx={{ height: 40 }}
            >
              {archivoLogo ? archivoLogo.name : "Subir logo"}
              <input
                hidden
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => {
                  const archivo = e.target.files?.[0] || null;
                  setArchivoLogo(archivo);

                  if (archivo) {
                    setLogoUrl(URL.createObjectURL(archivo));
                  }
                }}
              />
            </Button>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            {logoUrl && (
              <Box
                component="img"
                src={logoUrl}
                alt="Vista previa del logo"
                sx={{
                  width: 160,
                  height: 90,
                  objectFit: "contain",
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 2,
                  p: 1,
                  backgroundColor: "background.paper",
                }}
              />
            )}
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mt: 1 }}>
              Configuración AFIP
            </Typography>
          </Grid>

          <Grid container spacing={2} size={{ xs: 12 }}>
            <Grid size={{ xs: 12, md: 2 }}>
              <TextField
                label="Punto de Venta"
                type="number"
                fullWidth
                size="small"
                value={puntoVenta}
                onChange={(e) => setPuntoVenta(e.target.value)}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 2 }}>
              <TextField
                select
                label="Ambiente"
                fullWidth
                size="small"
                value={ambienteFiscal}
                onChange={(e) => setAmbienteFiscal(e.target.value)}
              >
                <MenuItem value="homologacion">Homologación</MenuItem>
                <MenuItem value="produccion">Producción</MenuItem>
              </TextField>
            </Grid>

            <Grid size={{ xs: 12, md: 2 }}>
              <Button
                component="label"
                variant="outlined"
                fullWidth
                size="small"
                sx={{ height: 40 }}
              >
                Subir certificado (.crt)
                <input
                  hidden
                  type="file"
                  accept=".crt,.cer,.pem"
                  onChange={(e) => setArchivoCertificado(e.target.files[0])}
                />
              </Button>
            </Grid>

            <Grid size={{ xs: 12, md: 2 }}>
              <Button
                component="label"
                variant="outlined"
                fullWidth
                size="small"
                sx={{ height: 40 }}
              >
                Subir clave privada (.key)
                <input
                  hidden
                  type="file"
                  accept=".key,.pem"
                  onChange={(e) => setArchivoKey(e.target.files[0])}
                />
              </Button>
            </Grid>

            <Grid size={{ xs: 12, md: 2 }}>
              <TextField
                label="Vencimiento certificado"
                type="date"
                value={certificadoVencimiento}
                onChange={(e) => setCertificadoVencimiento(e.target.value)}
                fullWidth
                size="small"
                slotProps={{
                  inputLabel: { shrink: true },
                }}
              />
            </Grid>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Box sx={{ display: "flex", gap: 2, mt: 1 }}>
              {certificadoCrt && (
                <Typography variant="caption" color="success.main">
                  ✓ Certificado cargado
                </Typography>
              )}

              {certificadoKey && (
                <Typography variant="caption" color="success.main">
                  ✓ Clave privada cargada
                </Typography>
              )}
            </Box>
          </Grid>
          <Grid
            size={{ xs: 12 }}
            sx={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 1,
              mt: 1,
            }}
          >
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={guardarEmpresa}
              disabled={guardando}
            >
              {guardando
                ? "Guardando..."
                : editandoId
                  ? "Actualizar"
                  : "Guardar"}
            </Button>

            <Button sx={{ ml: 1 }} onClick={limpiarFormulario}>
              Cancelar
            </Button>
          </Grid>
        </Grid>
      </Paper>
      <Paper sx={{ height: 420, width: "100%", borderRadius: 3 }}>
        <DataGrid
          rows={empresas}
          columns={columns}
          getRowId={(row) => row.id}
          initialState={{
            pagination: {
              paginationModel: { pageSize: 10, page: 0 },
            },
          }}
          pageSizeOptions={[10, 20, 50, 100]}
        />
      </Paper>
    </Box>
  );
}
