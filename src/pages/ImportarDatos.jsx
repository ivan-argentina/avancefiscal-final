import { obtenerEmpresa } from "../utils/obtenerEmpresa";
import { importarClientes } from "../utils/importador/importarClientes";
import { importarCiudades } from "../utils/importador/importarCiudades";
import DialogDetalleImportacion from "../componentes/importador/DialogDetalleImportacion";
import TarjetaResumenImportacion from "../componentes/importador/TarjetaResumenImportacion";
import { importarFamilias } from "../utils/importador/importarFamilias";
import { importarArticulos } from "../utils/importador/importarArticulos";
import { useState } from "react";
import * as XLSX from "xlsx";
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Stack,
  Chip,
  Alert,
  Grid,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";

export default function ImportarDatos() {
  const [archivo, setArchivo] = useState(null);
  const [hojas, setHojas] = useState([]);
  const [workbook, setWorkbook] = useState(null);
  const [previewCiudades, setPreviewCiudades] = useState([]);
  const [previewClientes, setPreviewClientes] = useState([]);
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [progreso, setProgreso] = useState(0);
  const [mensaje, setMensaje] = useState("");
  const [logImportacion, setLogImportacion] = useState([]);
  const [openLog, setOpenLog] = useState(false);
  const [previewArticulos, setPreviewArticulos] = useState([]);

  const iniciarImportacion = async () => {
    try {
      setImportando(true);
      setResultado(null);
      setProgreso(0);
      setLogImportacion([]);
      setMensaje("Importando ciudades...");

      const usuarioGuardado = JSON.parse(localStorage.getItem("usuario"));
      const idEmpresa = await obtenerEmpresa(usuarioGuardado.id);

      const hayArticulos = workbook.Sheets["Articulos"];
      const hayFamilias = workbook.Sheets["Familias"];

      if (hayArticulos && hayFamilias) {
        setMensaje("Importando familias...");

        const familias = XLSX.utils.sheet_to_json(workbook.Sheets["Familias"]);

        const resultadoFamilias = await importarFamilias(
          familias,
          idEmpresa,
          (avance) => {
            setProgreso(avance.porcentaje);
            setMensaje(
              `Importando familias... ${avance.actual} de ${avance.total}`,
            );
          },
        );

        const mapaFamilias = resultadoFamilias.mapaFamilias;

        setMensaje("Importando artículos...");

        const articulos = XLSX.utils.sheet_to_json(
          workbook.Sheets["Articulos"],
        );

        const resultadoArticulos = await importarArticulos(
          articulos,
          mapaFamilias,
          idEmpresa,
          (avance) => {
            setProgreso(avance.porcentaje);
            setMensaje(
              `Importando artículos... ${avance.actual} de ${avance.total}`,
            );
          },
        );

        setResultado(resultadoArticulos);

        setLogImportacion([
          { tipo: "titulo", mensaje: "FAMILIAS" },
          ...(resultadoFamilias.log || []),
          { tipo: "titulo", mensaje: "ARTÍCULOS" },
          ...(resultadoArticulos.log || []),
        ]);

        setProgreso(100);
        setMensaje("✅ Importación finalizada correctamente.");
        return;
      }
      const ciudades = XLSX.utils.sheet_to_json(workbook.Sheets["Ciudad"]);

      const resultadoCiudades = await importarCiudades(
        ciudades,
        idEmpresa,
        (avance) => {
          setProgreso(avance.porcentaje);
          setMensaje(
            `Importando ciudades... ${avance.actual} de ${avance.total}`,
          );
        },
      );

      const mapaCiudades = resultadoCiudades.mapaCiudades;

      setMensaje("Importando clientes...");

      const clientes = XLSX.utils.sheet_to_json(workbook.Sheets["Clientes"]);

      const resultadoClientes = await importarClientes(
        clientes,
        mapaCiudades,
        idEmpresa,
        (avance) => {
          // console.log("AVANCE:", avance);

          setProgreso(() => avance.porcentaje);

          setMensaje(
            `Importando clientes... ${avance.actual} de ${avance.total}`,
          );
        },
      );

      setResultado(resultadoClientes);
      setLogImportacion([
        {
          tipo: "titulo",
          mensaje: "CIUDADES",
        },
        ...(resultadoCiudades.log || []),
        {
          tipo: "titulo",
          mensaje: "CLIENTES",
        },
        ...(resultadoClientes.log || []),
      ]);
      setProgreso(100);

      setMensaje("✅ Importación finalizada correctamente.");
    } catch (error) {
      console.error(error);
      setMensaje(`❌ Error: ${error.message}`);
    } finally {
      setImportando(false);
    }
  };

  const leerArchivo = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setArchivo(file);

    const data = await file.arrayBuffer();
    const wb = XLSX.read(data, { type: "array" });

    setWorkbook(wb);
    setHojas(wb.SheetNames);
    // Vista previa Ciudades
    if (wb.Sheets["Ciudad"]) {
      const ciudades = XLSX.utils.sheet_to_json(wb.Sheets["Ciudad"]);

      setPreviewCiudades(
        ciudades.slice(0, 10).map((c, index) => ({
          id: index + 1,
          ...c,
        })),
      );
      // console.log(ciudades[0]);
    }

    // Vista previa Clientes
    if (wb.Sheets["Clientes"]) {
      const clientes = XLSX.utils.sheet_to_json(wb.Sheets["Clientes"]);

      //  console.log("CLIENTES EXCEL:", clientes[0]);

      setPreviewClientes(
        clientes.slice(0, 10).map((c, index) => ({
          id: index + 1,
          ...c,
        })),
      );
    }
    console.log("HOJAS:", wb.SheetNames);

    wb.SheetNames.forEach((nombreHoja) => {
      const datos = XLSX.utils.sheet_to_json(wb.Sheets[nombreHoja]);
      console.log("HOJA:", nombreHoja);
      console.log("PRIMERA FILA:", datos[0]);
      console.log("COLUMNAS:", Object.keys(datos[0] || {}));
    });

    // Vista previa Artículos
    const hojaArticulos =
      wb.Sheets["Articulos"] ||
      wb.Sheets["Artículos"] ||
      wb.Sheets["Articulo"] ||
      wb.Sheets["Artículo"] ||
      wb.Sheets["Productos"];

    if (hojaArticulos) {
      const articulos = XLSX.utils.sheet_to_json(hojaArticulos);

      console.log("ARTICULOS EXCEL:", articulos[0]);
      console.log("COLUMNAS ARTICULOS:", Object.keys(articulos[0] || {}));

      setPreviewArticulos(
        articulos.slice(0, 10).map((a, index) => ({
          id: index + 1,
          ...a,
        })),
      );
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight="bold" sx={{ mb: 2 }}>
        Asistente de Importación
      </Typography>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
                Archivo Excel
              </Typography>

              <Alert severity="info" sx={{ mb: 3 }}>
                Este asistente importará automáticamente ciudades y clientes
                desde el archivo Excel.
              </Alert>

              <Button variant="contained" component="label">
                Seleccionar Excel
                <input
                  hidden
                  type="file"
                  accept=".xls,.xlsx"
                  onChange={leerArchivo}
                />
              </Button>

              {archivo && (
                <Typography sx={{ mt: 2 }}>
                  Archivo: <strong>{archivo.name}</strong>
                </Typography>
              )}

              {hojas.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Typography fontWeight="bold" sx={{ mb: 1 }}>
                    Hojas encontradas
                  </Typography>

                  <Stack direction="row" spacing={1}>
                    {hojas.map((hoja) => (
                      <Chip key={hoja} label={hoja} color="primary" />
                    ))}
                  </Stack>
                </Box>
              )}

              {previewClientes.length > 0 && (
                <>
                  <Typography variant="h6" sx={{ mt: 4, mb: 1 }}>
                    Vista previa - Clientes
                  </Typography>

                  <Box sx={{ height: 330 }}>
                    <DataGrid
                      rows={previewClientes}
                      columns={[
                        { field: "Id", headerName: "ID", width: 80 },
                        { field: "Cliente", headerName: "Cliente", flex: 1 },
                        {
                          field: "direccion",
                          headerName: "Dirección",
                          flex: 1,
                        },
                        { field: "idciu", headerName: "ID Ciudad", width: 110 },
                        { field: "idciva", headerName: "ID IVA", width: 100 },
                        { field: "cuit", headerName: "CUIT", width: 150 },
                        {
                          field: "telefono",
                          headerName: "Teléfono",
                          width: 140,
                        },
                        { field: "email", headerName: "Email", flex: 1 },
                      ]}
                      hideFooter
                    />
                  </Box>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ borderRadius: 3, height: "100%" }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                Resumen
              </Typography>

              <Typography variant="body2">
                Archivo: <strong>{archivo?.name || "-"}</strong>
              </Typography>

              <Typography variant="body2" sx={{ mt: 1 }}>
                Hojas: <strong>{hojas.length}</strong>
              </Typography>

              <Typography variant="body2" sx={{ mt: 1 }}>
                Ciudades detectadas: <strong>{previewCiudades.length}</strong>
              </Typography>

              <Typography variant="body2" sx={{ mt: 1 }}>
                Clientes detectados: <strong>{previewClientes.length}</strong>
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Artículos detectados: <strong>{previewArticulos.length}</strong>
              </Typography>

              <Box sx={{ mt: 3 }}>
                <Typography fontWeight="bold" sx={{ mb: 1 }}>
                  Progreso
                </Typography>

                <Typography variant="body2" color="text.secondary">
                  {mensaje || "Esperando archivo para importar..."}
                </Typography>
              </Box>
              {(importando || progreso > 0) && (
                <Box sx={{ mt: 2 }}>
                  <LinearProgress
                    variant="determinate"
                    value={Number(progreso) || 0}
                  />

                  <Typography variant="body2" sx={{ mt: 1 }}>
                    {Number(progreso) || 0}%
                  </Typography>
                </Box>
              )}

              {resultado && (
                <Grid container spacing={1.5} sx={{ mt: 2 }}>
                  <Grid size={{ xs: 6 }}>
                    <TarjetaResumenImportacion
                      titulo="Leídos"
                      valor={resultado.leidos}
                    />
                  </Grid>

                  <Grid size={{ xs: 6 }}>
                    <TarjetaResumenImportacion
                      titulo="Importados"
                      valor={resultado.importados}
                      color="success.main"
                    />
                  </Grid>

                  <Grid size={{ xs: 6 }}>
                    <TarjetaResumenImportacion
                      titulo="Duplicados"
                      valor={resultado.salteados}
                      color="warning.main"
                    />
                  </Grid>

                  <Grid size={{ xs: 6 }}>
                    <TarjetaResumenImportacion
                      titulo="Errores"
                      valor={resultado.errores}
                      color="error.main"
                    />
                  </Grid>
                </Grid>
              )}
              {logImportacion.length > 0 && (
                <Button
                  variant="outlined"
                  fullWidth
                  sx={{ mt: 2 }}
                  onClick={() => setOpenLog(true)}
                >
                  📋 Ver detalle de importación
                </Button>
              )}
              {mensaje && (
                <Alert severity="success" sx={{ mt: 2 }}>
                  {mensaje}
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Button
            variant="contained"
            color="success"
            size="large"
            fullWidth
            disabled={importando || !workbook}
            onClick={iniciarImportacion}
            sx={{
              height: 55,
              borderRadius: 3,
              fontWeight: "bold",
              fontSize: 17,
            }}
          >
            {importando ? "Importando..." : "🚀 Iniciar Importación"}
          </Button>
        </Grid>
      </Grid>

      <DialogDetalleImportacion
        open={openLog}
        onClose={() => setOpenLog(false)}
        log={logImportacion}
      />
    </Box>
  );
}
