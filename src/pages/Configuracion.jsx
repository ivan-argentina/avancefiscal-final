import {
  Container,
  Paper,
  Typography,
  Grid,
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  Alert,
} from "@mui/material";
import { configurarQz } from "../utils/configurarQz";
import { useState, useEffect } from "react";
import { TextField } from "@mui/material";
import { supabase } from "../hook/supabaseClient";
import Notificaciones from "./Notificaciones";
import { obtenerEmpresa } from "../utils/obtenerEmpresa";

import SaveIcon from "@mui/icons-material/Save";
import qz from "qz-tray";

export default function Configuracion() {
  const [tipoImpresion, setTipoImpresion] = useState("laser");
  const [open, setOpen] = useState(false);
  const [tipo, setTipo] = useState("success");
  const [impresoras, setImpresoras] = useState([]);
  const [impresoraComandera, setImpresoraComandera] = useState("");

  const [mensaje, setMensaje] = useState("");
  const [tipoMensaje, setTipoMensaje] = useState("success");
  const [openMensaje, setOpenMensaje] = useState(false);

  const mostrarMensaje = (texto, tipo = "success") => {
    setMensaje(texto);
    setTipoMensaje(tipo);
    setOpenMensaje(true);
  };

  useEffect(() => {
    if (tipoImpresion === "comandera") {
      cargarImpresoras();
    }
  }, [tipoImpresion]);

  const probarImpresora = async () => {
    try {
      configurarQz();
      if (!impresoraComandera) {
        mostrarMensaje("Seleccioná una impresora.", "warning");
        return;
      }

      if (!qz.websocket.isActive()) {
        await qz.websocket.connect();
      }

      const impresorasDisponibles = await qz.printers.find();

      const existe = impresorasDisponibles.some(
        (nombre) =>
          String(nombre).trim().toLowerCase() ===
          String(impresoraComandera).trim().toLowerCase(),
      );

      if (!existe) {
        mostrarMensaje(
          `La impresora "${impresoraComandera}" no está disponible en esta PC.`,
          "error",
        );
        return;
      }

      const config = qz.configs.create(impresoraComandera, {
        encoding: "CP850",
        copies: 1,
      });

      const datosPrueba = [
        {
          type: "raw",
          format: "command",
          flavor: "hex",
          data: "1B40",
        },
        {
          type: "raw",
          format: "command",
          flavor: "plain",
          data:
            "\n" +
            "          AVANCE FISCAL\n" +
            "------------------------------------------\n" +
            "Prueba de impresion\n" +
            `Impresora: ${impresoraComandera}\n` +
            "Configuracion correcta\n" +
            "------------------------------------------\n" +
            "\n\n\n",
        },
        {
          type: "raw",
          format: "command",
          flavor: "hex",
          data: "1D564100",
        },
      ];

      await qz.print(config, datosPrueba);

      mostrarMensaje("Prueba de impresión enviada correctamente.", "success");
    } catch (error) {
      console.error("Error en prueba de impresión:", error);

      alert(error?.message || "No se pudo realizar la prueba de impresión.");
    }
  };

  const cargarImpresoras = async () => {
    try {
      configurarQz();
      if (!qz.websocket.isActive()) {
        await qz.websocket.connect();
      }

      const lista = await qz.printers.find();

      setImpresoras(lista || []);
    } catch (error) {
      console.error("Error al detectar impresoras:", error);
    }
  };

  const guardarConfiguracion = async () => {
    const usuarioGuardado = JSON.parse(localStorage.getItem("usuario"));
    const idEmpresa = await obtenerEmpresa(usuarioGuardado.id);

    const { error } = await supabase
      .from("empresas")
      .update({
        tipo_impresion: tipoImpresion,
        impresora_comandera: impresoraComandera,
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

    if (!usuarioGuardado?.id) return;

    const idEmpresa = await obtenerEmpresa(usuarioGuardado.id);

    const { data, error } = await supabase
      .from("empresas")
      .select("tipo_impresion, impresora_comandera")
      .eq("id", idEmpresa)
      .single();

    if (error) {
      console.error("Error al cargar configuración:", error);
      return;
    }

    setTipoImpresion(data.tipo_impresion || "laser");
    setImpresoraComandera(data.impresora_comandera || "");
  };
  useEffect(() => {
    cargarConfiguracion();
  }, []);

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
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              flexWrap: "wrap",
            }}
          >
            {/* TIPO DE IMPRESIÓN */}
            <TextField
              select
              label="Tipo de impresión"
              value={tipoImpresion}
              onChange={(e) => setTipoImpresion(e.target.value)}
              size="small"
              sx={{ width: 200 }}
            >
              <MenuItem value="laser">Láser</MenuItem>
              <MenuItem value="comandera">Comandera</MenuItem>
            </TextField>

            {/* IMPRESORA DE COMANDERA */}
            {tipoImpresion === "comandera" && (
              <FormControl size="small" sx={{ width: 260 }}>
                <InputLabel>Impresora de comandera</InputLabel>

                <Select
                  value={
                    impresoras.includes(impresoraComandera)
                      ? impresoraComandera
                      : ""
                  }
                  label="Impresora de comandera"
                  onChange={(e) => setImpresoraComandera(e.target.value)}
                >
                  {impresoras.map((impresora) => (
                    <MenuItem key={impresora} value={impresora}>
                      {impresora}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {/* BOTÓN GUARDAR */}
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={guardarConfiguracion}
              sx={{
                height: 40,
                px: 3,
                whiteSpace: "nowrap",
              }}
            >
              GUARDAR
            </Button>
            <Button
              variant="outlined"
              onClick={probarImpresora}
              disabled={!impresoraComandera}
              sx={{
                height: 40,
                px: 2.5,
                whiteSpace: "nowrap",
              }}
            >
              PROBAR IMPRESIÓN
            </Button>
          </Box>
        </Grid>
      </Grid>
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
          onClose={() => setOpenMensaje(false)}
          severity={tipoMensaje}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {mensaje}
        </Alert>
      </Snackbar>
    </Container>
  );
}
