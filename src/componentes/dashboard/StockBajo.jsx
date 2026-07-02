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

export default function StockBajo({ idEmpresa }) {
  const [articulos, setArticulos] = useState([]);

  useEffect(() => {
    if (!idEmpresa) return;

    const cargarStockBajo = async () => {
      const { data, error } = await supabase
        .from("articulos")
        .select("id, codigo, descripcion, stock, stock_minimo")
        .eq("idempresa", idEmpresa);

      if (error) {
        console.log("Error stock bajo:", error);
        return;
      }

      const filtrados = (data || [])
        .filter((a) => Number(a.stock || 0) <= Number(a.stock_minimo || 0))
        .sort((a, b) => Number(a.stock || 0) - Number(b.stock || 0))
        .slice(0, 6);

      setArticulos(filtrados);
    };

    cargarStockBajo();
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
          Stock bajo
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Artículos por debajo del mínimo
        </Typography>

        {articulos.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No hay artículos con stock bajo.
          </Typography>
        ) : (
          articulos.map((articulo, index) => {
            const stock = Number(articulo.stock || 0);
            const minimo = Number(articulo.stock_minimo || 0);
            const critico = stock <= 0;

            return (
              <Box key={articulo.id} sx={{ mb: 1.7 }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 1,
                    alignItems: "center",
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" fontWeight="600" noWrap>
                      {articulo.descripcion}
                    </Typography>

                    <Typography variant="caption" color="text.secondary">
                      Código: {articulo.codigo || "-"} · Mín: {minimo}
                    </Typography>
                  </Box>

                  <Chip
                    label={`Stock: ${stock}`}
                    color={critico ? "error" : "warning"}
                    size="small"
                    sx={{ fontWeight: 700 }}
                  />
                </Box>

                {index < articulos.length - 1 && <Divider sx={{ mt: 1.3 }} />}
              </Box>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
