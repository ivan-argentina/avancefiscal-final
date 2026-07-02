import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  FormControl,
  Select,
  MenuItem,
} from "@mui/material";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { supabase } from "../../hook/supabaseClient";

ChartJS.register(
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  BarElement,
  Tooltip,
  Legend,
);

export default function GraficoVentasDiarias({ idEmpresa }) {
  const [periodo, setPeriodo] = useState(7);
  const [datos, setDatos] = useState({
    labels: [],
    values: [],
  });

  useEffect(() => {
    if (!idEmpresa) return;

    const cargarVentasDiarias = async () => {
      const hoy = new Date();

      const desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
        .toISOString()
        .slice(0, 10);

      const hasta = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)
        .toISOString()
        .slice(0, 10);

      const { data, error } = await supabase
        .from("facturas")
        .select("fecha, total, estado_fiscal, tipo_comprobante")
        .eq("idempresa", idEmpresa)
        .gte("fecha", desde)
        .lte("fecha", hasta);
      console.log("VENTAS DIARIAS:", data);

      if (error) {
        console.log("Error ventas diarias:", error);
        return;
      }

      const diasDelMes = new Date(
        hoy.getFullYear(),
        hoy.getMonth() + 1,
        0,
      ).getDate();

      const mapa = {};

      (data || []).forEach((f) => {
        if (f.estado_fiscal !== "autorizada") return;

        const dia = Number(String(f.fecha).split("-")[2]);
        const total = Number(f.total || 0);

        const importe =
          f.tipo_comprobante === "nota_de_credito" ? -total : total;

        mapa[dia] = (mapa[dia] || 0) + importe;
      });

      const inicio =
        periodo === 999 ? 1 : Math.max(1, hoy.getDate() - periodo + 1);

      const labels = [];
      const values = [];

      for (let i = inicio; i <= hoy.getDate(); i++) {
        labels.push(`${i}/${hoy.getMonth() + 1}`);
        values.push(mapa[i] || 0);
      }

      setDatos({ labels, values });
    };

    cargarVentasDiarias();
  }, [idEmpresa, periodo]);

  return (
    <Card
      sx={{
        height: 320,
        borderRadius: 3,
        boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
      }}
    >
      <CardContent sx={{ height: "100%" }}>
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" fontWeight="bold">
            Ventas diarias
          </Typography>

          <Typography variant="body2" color="text.secondary">
            Facturación autorizada del mes actual
          </Typography>
        </Box>
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <Select value={periodo} onChange={(e) => setPeriodo(e.target.value)}>
            <MenuItem value={7}>Últimos 7 días</MenuItem>
            <MenuItem value={15}>Últimos 15 días</MenuItem>
            <MenuItem value={30}>Últimos 30 días</MenuItem>
            <MenuItem value={999}>Este mes</MenuItem>
          </Select>
        </FormControl>
        <Box sx={{ height: 230 }}>
          <Bar
            data={{
              labels: datos.labels,
              datasets: [
                {
                  label: "Ventas",
                  data: datos.values,
                  backgroundColor: "#1976d2",
                  hoverBackgroundColor: "#1565c0",
                  borderRadius: 8,
                  barThickness: 35,
                  maxBarThickness: 45,
                  categoryPercentage: 0.6,
                  barPercentage: 0.7,
                },
              ],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
                tooltip: {
                  callbacks: {
                    label: (context) =>
                      Number(context.raw || 0).toLocaleString("es-AR", {
                        style: "currency",
                        currency: "ARS",
                      }),
                  },
                },
              },
              scales: {
                x: {
                  grid: { display: false },
                },
                y: {
                  beginAtZero: true,
                  ticks: {
                    callback: (value) =>
                      Number(value || 0).toLocaleString("es-AR", {
                        style: "currency",
                        currency: "ARS",
                        maximumFractionDigits: 0,
                      }),
                  },
                },
              },
            }}
          />
        </Box>
      </CardContent>
    </Card>
  );
}
