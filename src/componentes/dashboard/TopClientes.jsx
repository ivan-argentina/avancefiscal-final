import { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Divider,
  LinearProgress,
  Typography,
} from "@mui/material";
import { supabase } from "../../hook/supabaseClient";

export default function TopClientes({ idEmpresa }) {
  const [clientes, setClientes] = useState([]);

  useEffect(() => {
    if (!idEmpresa) return;

    const cargarTopClientes = async () => {
      const hoy = new Date();
      const desde = new Date(hoy.getFullYear(), hoy.getMonth() - 11, 1)
        .toISOString()
        .slice(0, 10);

      const { data, error } = await supabase
        .from("facturas")
        .select(
          `
          total,
          tipo_comprobante,
          estado_fiscal,
          clientes(nombre)
        `,
        )
        .eq("idempresa", idEmpresa)
        .eq("estado_fiscal", "autorizada")
        .gte("fecha", desde);

      if (error) {
        console.log("Error top clientes:", error);
        return;
      }

      const mapa = {};

      (data || []).forEach((f) => {
        const nombre = f.clientes?.nombre || "Sin cliente";
        const total = Number(f.total || 0);
        const importe =
          f.tipo_comprobante === "nota_de_credito" ? -total : total;

        mapa[nombre] = (mapa[nombre] || 0) + importe;
      });

      const ordenados = Object.entries(mapa)
        .map(([nombre, total]) => ({ nombre, total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

      setClientes(ordenados);
    };

    cargarTopClientes();
  }, [idEmpresa]);

  const maximo = Math.max(...clientes.map((c) => c.total), 1);

  return (
    <Card
      sx={{
        height: 280,
        borderRadius: 3,
        boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
      }}
    >
      <CardContent>
        <Typography variant="h6" fontWeight="bold">
          Top clientes
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Últimos 12 meses
        </Typography>

        {clientes.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No hay ventas autorizadas para mostrar.
          </Typography>
        ) : (
          clientes.map((cliente, index) => (
            <Box key={cliente.nombre} sx={{ mb: 1.8 }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 1,
                  mb: 0.5,
                }}
              >
                <Typography variant="body2" fontWeight="600" noWrap>
                  {index + 1}. {cliente.nombre}
                </Typography>

                <Typography variant="body2" fontWeight="bold">
                  {cliente.total.toLocaleString("es-AR", {
                    style: "currency",
                    currency: "ARS",
                    maximumFractionDigits: 0,
                  })}
                </Typography>
              </Box>

              <LinearProgress
                variant="determinate"
                value={(cliente.total / maximo) * 100}
                sx={{
                  height: 8,
                  borderRadius: 5,
                  backgroundColor: "#bbdefb",
                  "& .MuiLinearProgress-bar": {
                    backgroundColor: "#1976d2",
                    borderRadius: 5,
                  },
                }}
              />

              {index < clientes.length - 1 && <Divider sx={{ mt: 1.4 }} />}
            </Box>
          ))
        )}
      </CardContent>
    </Card>
  );
}
