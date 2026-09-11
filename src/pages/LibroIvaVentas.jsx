import { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Stack,
  TextField,
  Typography,
  Button,
  Tooltip,
  IconButton,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { supabase } from "../hook/supabaseClient";
import { obtenerEmpresa } from "../utils/obtenerEmpresa";
import * as XLSX from "xlsx";
import { FaFileExcel } from "react-icons/fa";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { FaFilePdf } from "react-icons/fa";

export default function LibroIvaVentas() {
  const hoy = new Date();

  const [mes, setMes] = useState(hoy.getMonth() + 1);
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [filas, setFilas] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    cargarLibro();
  }, [mes, anio]);

  const cargarLibro = async () => {
    try {
      setLoading(true);

      const desde = `${anio}-${String(mes).padStart(2, "0")}-01`;

      const siguienteMes = mes === 12 ? 1 : mes + 1;
      const siguienteAnio = mes === 12 ? anio + 1 : anio;

      const hasta = `${siguienteAnio}-${String(siguienteMes).padStart(
        2,
        "0",
      )}-01`;

      const usuarioGuardado = JSON.parse(localStorage.getItem("usuario"));
      const idEmpresa = await obtenerEmpresa(usuarioGuardado.id);

      const { data, error } = await supabase
        .from("facturas")
        .select(
          `
          id,
          fecha,
          tipo_comprobante,
          letra_comprobante,
          punto_venta,
          numero_fiscal,
          neto_gravado,
          iva_21,
          importe_exento,
          importe_no_gravado,
          total,
          estado_fiscal,
          clientes (
            nombre,
            cuit
          )
        `,
        )
        .gte("fecha", desde)
        .lt("fecha", hasta)
        .eq("estado_fiscal", "autorizada")
        .eq("idempresa", idEmpresa)
        .order("fecha", { ascending: true });

      if (error) {
        console.error("Error al cargar Libro IVA Ventas:", error);
        return;
      }

      const filasFormateadas = (data || []).map((item) => {
        const esNotaCredito = item.tipo_comprobante === "nota_de_credito";
        const signo = esNotaCredito ? -1 : 1;

        return {
          id: item.id,
          fecha: item.fecha,
          tipo: item.tipo_comprobante === "nota_de_credito" ? "NC" : "Factura",
          letra: item.letra_comprobante || "",
          puntoVenta: item.punto_venta || "",
          numero: `${String(item.punto_venta || 0).padStart(4, "0")}-${String(
            item.numero_fiscal || 0,
          ).padStart(8, "0")}`,
          cliente: item.clientes?.nombre || "",
          cuit: item.clientes?.cuit || "",
          netoGravado: Number(item.neto_gravado || 0) * signo,
          iva21: Number(item.iva_21 || 0) * signo,
          exento: Number(item.importe_exento || 0) * signo,
          noGravado: Number(item.importe_no_gravado || 0) * signo,
          total: Number(item.total || 0) * signo,
        };
      });

      setFilas(filasFormateadas);
    } catch (error) {
      console.error("Error inesperado:", error);
    } finally {
      setLoading(false);
    }
  };

  const moneda = (valor) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(valor || 0);

  const totales = filas.reduce(
    (acc, fila) => {
      acc.netoGravado += Number(fila.netoGravado || 0);
      acc.iva21 += Number(fila.iva21 || 0);
      acc.exento += Number(fila.exento || 0);
      acc.noGravado += Number(fila.noGravado || 0);
      acc.total += Number(fila.total || 0);

      return acc;
    },
    {
      netoGravado: 0,
      iva21: 0,
      exento: 0,
      noGravado: 0,
      total: 0,
    },
  );

  const exportarExcel = () => {
    const datosExcel = filas.map((fila) => ({
      Fecha: fila.fecha ? fila.fecha.split("-").reverse().join("/") : "",
      Tipo: fila.tipo,
      Letra: fila.letra,
      Número: fila.numero,
      Cliente: fila.cliente,
      CUIT: fila.cuit,
      "Neto Gravado": fila.netoGravado,
      "IVA 21%": fila.iva21,
      Exento: fila.exento,
      "No Gravado": fila.noGravado,
      Total: fila.total,
    }));

    datosExcel.push({
      Fecha: "",
      Tipo: "",
      Letra: "",
      Número: "",
      Cliente: "TOTALES",
      CUIT: "",
      "Neto Gravado": totales.netoGravado,
      "IVA 21%": totales.iva21,
      Exento: totales.exento,
      "No Gravado": totales.noGravado,
      Total: totales.total,
    });

    const hoja = XLSX.utils.json_to_sheet(datosExcel);
    hoja["!cols"] = [
      { wch: 12 }, // Fecha
      { wch: 12 }, // Tipo
      { wch: 8 }, // Letra
      { wch: 18 }, // Número
      { wch: 30 }, // Cliente
      { wch: 16 }, // CUIT
      { wch: 16 }, // Neto Gravado
      { wch: 14 }, // IVA 21%
      { wch: 14 }, // Exento
      { wch: 16 }, // No Gravado
      { wch: 16 }, // Total
    ];
    const libro = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(libro, hoja, "Libro IVA Ventas");

    XLSX.writeFile(
      libro,
      `Libro-IVA-Ventas-${String(mes).padStart(2, "0")}-${anio}.xlsx`,
    );
  };

  const exportarPdf = () => {
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    doc.setFontSize(16);
    doc.text("Libro IVA Ventas", 14, 15);

    doc.setFontSize(10);
    doc.text(`Período: ${String(mes).padStart(2, "0")}/${anio}`, 14, 22);

    const cuerpo = filas.map((fila) => [
      fila.fecha ? fila.fecha.split("-").reverse().join("/") : "",
      fila.tipo,
      fila.letra,
      fila.numero,
      fila.cliente,
      fila.cuit,
      moneda(fila.netoGravado),
      moneda(fila.iva21),
      moneda(fila.exento),
      moneda(fila.noGravado),
      moneda(fila.total),
    ]);

    cuerpo.push([
      "",
      "",
      "",
      "",
      "TOTALES",
      "",
      moneda(totales.netoGravado),
      moneda(totales.iva21),
      moneda(totales.exento),
      moneda(totales.noGravado),
      moneda(totales.total),
    ]);

    autoTable(doc, {
      startY: 28,
      head: [
        [
          "Fecha",
          "Tipo",
          "Letra",
          "Número",
          "Cliente",
          "CUIT",
          "Neto Gravado",
          "IVA 21%",
          "Exento",
          "No Gravado",
          "Total",
        ],
      ],
      body: cuerpo,
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fontStyle: "bold",
      },
    });

    doc.save(`Libro-IVA-Ventas-${String(mes).padStart(2, "0")}-${anio}.pdf`);
  };

  const columnas = [
    {
      field: "fecha",
      headerName: "Fecha",
      width: 110,
      valueFormatter: (value) => {
        if (!value) return "";

        const [anio, mes, dia] = value.split("-");
        return `${dia}/${mes}/${anio}`;
      },
    },
    { field: "tipo", headerName: "Tipo", width: 100 },
    { field: "letra", headerName: "Letra", width: 70 },
    { field: "numero", headerName: "Número", width: 110 },
    { field: "cliente", headerName: "Cliente", width: 220 },
    { field: "cuit", headerName: "CUIT", width: 130 },
    {
      field: "netoGravado",
      headerName: "Neto Gravado",
      width: 140,
      valueFormatter: (value) => moneda(value),
    },
    {
      field: "iva21",
      headerName: "IVA 21%",
      width: 130,
      valueFormatter: (value) => moneda(value),
    },
    {
      field: "exento",
      headerName: "Exento",
      width: 120,
      valueFormatter: (value) => moneda(value),
    },
    {
      field: "noGravado",
      headerName: "No Gravado",
      width: 130,
      valueFormatter: (value) => moneda(value),
    },
    {
      field: "total",
      headerName: "Total",
      width: 140,
      valueFormatter: (value) => moneda(value),
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight={700} mb={2}>
        Libro IVA Ventas
      </Typography>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            label="Mes"
            type="number"
            value={mes}
            onChange={(e) => setMes(Number(e.target.value))}
            inputProps={{ min: 1, max: 12 }}
            sx={{ width: 140 }}
          />

          <TextField
            label="Año"
            type="number"
            value={anio}
            onChange={(e) => setAnio(Number(e.target.value))}
            sx={{ width: 140 }}
          />
          <Tooltip title="Exportar a Excel">
            <IconButton onClick={exportarExcel} color="success" size="large">
              <FaFileExcel size={28} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Exportar a PDF">
            <IconButton onClick={exportarPdf} color="error" size="large">
              <FaFilePdf size={28} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Paper>

      <Paper sx={{ height: 560 }}>
        <DataGrid
          rows={filas}
          columns={columnas}
          loading={loading}
          pageSizeOptions={[10, 25, 50]}
          initialState={{
            pagination: {
              paginationModel: {
                pageSize: 10,
                page: 0,
              },
            },
          }}
          disableRowSelectionOnClick
        />
      </Paper>

      <Paper sx={{ p: 2, mt: 2 }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={3}
          justifyContent="flex-end"
          flexWrap="wrap"
        >
          <Typography>
            <strong>Neto Gravado:</strong> {moneda(totales.netoGravado)}
          </Typography>

          <Typography>
            <strong>IVA 21%:</strong> {moneda(totales.iva21)}
          </Typography>

          <Typography>
            <strong>Exento:</strong> {moneda(totales.exento)}
          </Typography>

          <Typography>
            <strong>No Gravado:</strong> {moneda(totales.noGravado)}
          </Typography>

          <Typography>
            <strong>Total:</strong> {moneda(totales.total)}
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
}
