import { useEffect, useState } from "react";
import { Card, CardContent, Typography, Box } from "@mui/material";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { supabase } from "../../hook/supabaseClient";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export default function GraficoVentas({ idEmpresa }) {
  const [datos, setDatos] = useState({
    labels: [],
    values: [],
  });

  useEffect(() => {
    if (!idEmpresa) return;

    const cargarVentas = async () => {
      const hoy = new Date();
      const desde = new Date(hoy.getFullYear(), hoy.getMonth() - 11, 1)
        .toISOString()
        .slice(0, 10);

      const { data, error } = await supabase
        .from("facturas")
        .select("fecha, total, tipo_comprobante")
        .eq("idempresa", idEmpresa)
        .eq("estado_fiscal", "autorizada")
        .gte("fecha", desde);

      if (error) {
        console.log("Error gráfico ventas:", error);
        return;
      }

      const meses = [];

      for (let i = 11; i >= 0; i--) {
        const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
        const key = `${fecha.getFullYear()}-${String(
          fecha.getMonth() + 1,
        ).padStart(2, "0")}`;

        meses.push({
          key,
          label: fecha.toLocaleDateString("es-AR", {
            month: "short",
            year: "2-digit",
          }),
          total: 0,
        });
      }

      (data || []).forEach((f) => {
        const key = String(f.fecha).slice(0, 7);
        const mes = meses.find((m) => m.key === key);

        if (mes) {
          const total = Number(f.total || 0);

          if (f.tipo_comprobante === "nota_de_credito") {
            mes.total -= total;
          } else {
            mes.total += total;
          }
        }
      });

      setDatos({
        labels: meses.map((m) => m.label),
        values: meses.map((m) => m.total),
      });
    };

    cargarVentas();
  }, [idEmpresa]);
  return (
    <Card
      sx={{
        height: 380,
        borderRadius: 3,
        boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
      }}
    >
      <CardContent sx={{ height: "100%" }}>
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" fontWeight="bold">
            Ventas últimos 12 meses
          </Typography>

          <Typography variant="body2" color="text.secondary">
            Facturación autorizada por mes
          </Typography>
        </Box>

        <Box sx={{ height: 280 }}>
          <Bar
            data={{
              labels: datos.labels,
              datasets: [
                {
                  label: "Ventas",
                  data: datos.values,
                  borderRadius: 8,
                  barThickness: 28,
                  maxBarThickness: 34,
                  backgroundColor: "#1976d2",
                  hoverBackgroundColor: "#0d47a1",
                },
              ],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  display: false,
                },
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
                  grid: {
                    display: false,
                  },
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
