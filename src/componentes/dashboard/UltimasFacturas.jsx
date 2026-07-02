import { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  Typography,
} from "@mui/material";
import { supabase } from "../../hook/supabaseClient";

export default function UltimasFacturas({ idEmpresa }) {
  const [facturas, setFacturas] = useState([]);

  useEffect(() => {
    if (!idEmpresa) return;

    const cargarFacturas = async () => {
      const { data, error } = await supabase
        .from("facturas")
        .select(
          `
          id,
          fecha,
          numero_fiscal,
          letra_comprobante,
          tipo_comprobante,
          total,
          estado_fiscal,
          clientes(nombre)
        `,
        )
        .eq("idempresa", idEmpresa)
        .order("fecha", { ascending: false })
        .limit(5);

      if (error) {
        console.log(error);
        return;
      }

      setFacturas(data || []);
    };

    cargarFacturas();
  }, [idEmpresa]);

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
          Últimas facturas
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Comprobantes más recientes
        </Typography>

        {facturas.length === 0 ? (
          <Typography color="text.secondary">Sin comprobantes.</Typography>
        ) : (
          facturas.map((f, index) => (
            <Box key={f.id} sx={{ mb: 0.8 }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Box>
                  <Typography fontWeight="600">
                    {f.letra_comprobante || "C"}{" "}
                    {String(f.numero_fiscal || 0).padStart(8, "0")}
                  </Typography>

                  <Typography variant="body2" color="text.secondary">
                    {f.clientes?.nombre || "Consumidor Final"}
                  </Typography>

                  <Typography variant="caption" color="text.secondary">
                    {new Date(f.fecha).toLocaleDateString("es-AR")}
                  </Typography>
                </Box>

                <Box textAlign="right">
                  <Typography fontWeight="bold">
                    {Number(f.total).toLocaleString("es-AR", {
                      style: "currency",
                      currency: "ARS",
                    })}
                  </Typography>

                  <Chip
                    label={f.estado_fiscal}
                    size="small"
                    color={
                      f.estado_fiscal === "autorizada"
                        ? "success"
                        : f.estado_fiscal === "pendiente"
                          ? "warning"
                          : "error"
                    }
                  />
                </Box>
              </Box>

              {index < facturas.length - 1 && <Divider sx={{ mt: 0.7 }} />}
            </Box>
          ))
        )}
      </CardContent>
    </Card>
  );
}
