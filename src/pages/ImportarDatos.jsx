import { importarCiudades } from "../utils/importador/importarCiudades";
import { supabase } from "../hook/supabaseClient";
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

  const agregarLog = (texto) => {
    setLogImportacion((prev) => [...prev, texto]);
  };
  const iniciarImportacion = async () => {
    try {
      setImportando(true);
      setMensaje("");

      const ciudades = XLSX.utils.sheet_to_json(workbook.Sheets["Ciudad"]);

      const mapaCiudades = await importarCiudades(ciudades, empresa.id);

      console.log("MAPA CIUDADES:", mapaCiudades);

      setMensaje("Ciudades importadas correctamente.");
    } catch (error) {
      console.error(error);
      setMensaje(error.message);
    } finally {
      setImportando(false);
    }
  };
  const importar = async () => {
    const ciudades = XLSX.utils.sheet_to_json(workbook.Sheets["Ciudad"]);

    const resultado = await importarCiudades(ciudades);

    console.log(resultado);
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
      console.log(ciudades[0]);
    }

    // Vista previa Clientes
    if (wb.Sheets["Clientes"]) {
      const clientes = XLSX.utils.sheet_to_json(wb.Sheets["Clientes"]);

      console.log("CLIENTES EXCEL:", clientes[0]);

      setPreviewClientes(
        clientes.slice(0, 10).map((c, index) => ({
          id: index + 1,
          ...c,
        })),
      );
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight="bold" sx={{ mb: 2 }}>
        Importar datos
      </Typography>

      <Card sx={{ borderRadius: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
            Seleccionar archivo Excel
          </Typography>
          <Alert severity="info" sx={{ mb: 3 }}>
            Este asistente importará automáticamente la información desde un
            archivo Excel.
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
            <>
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

              {previewCiudades.length > 0 && (
                <>
                  <Typography variant="h6" sx={{ mt: 4, mb: 1 }}>
                    Vista previa - Ciudades
                  </Typography>

                  <Box sx={{ height: 250 }}>
                    <DataGrid
                      rows={previewCiudades}
                      columns={[
                        { field: "Id", headerName: "ID", width: 90 },
                        { field: "Ciudad", headerName: "Ciudad", flex: 1 },
                      ]}
                      hideFooter
                    />
                  </Box>
                </>
              )}
              {previewClientes.length > 0 && (
                <>
                  <Typography variant="h6" sx={{ mt: 4, mb: 1 }}>
                    Vista previa - Clientes
                  </Typography>

                  <Box sx={{ height: 300 }}>
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
            </>
          )}
        </CardContent>
      </Card>
      <Button
        variant="contained"
        color="success"
        size="large"
        fullWidth
        disabled={importando}
        onClick={iniciarImportacion}
        sx={{
          mt: 4,
          height: 55,
          borderRadius: 3,
          fontWeight: "bold",
        }}
      >
        {importando ? "Importando..." : "Importar Datos"}
      </Button>
      {mensaje && (
        <Alert severity="success" sx={{ mt: 2 }}>
          {mensaje}
        </Alert>
      )}
    </Box>
  );
}
