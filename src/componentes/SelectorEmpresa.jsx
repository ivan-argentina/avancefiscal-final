import { useEffect, useState } from "react";
import { Box, FormControl, MenuItem, Select, Typography } from "@mui/material";
import { supabase } from "../hook/supabaseClient";

export default function SelectorEmpresa() {
  const [empresas, setEmpresas] = useState([]);
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState("");

  const usuario = JSON.parse(localStorage.getItem("usuario"));

  useEffect(() => {
    const cargarEmpresas = async () => {
      if (!usuario?.superusuario) return;

      const { data, error } = await supabase
        .from("empresas")
        .select("id, razon_social, nombre_fantasia, cuit, activo")
        .eq("activo", true)
        .order("razon_social", { ascending: true });

      if (error) {
        console.error("Error al cargar empresas:", error);
        return;
      }

      const empresasCargadas = data || [];

      setEmpresas(empresasCargadas);

      const empresaGuardada = JSON.parse(localStorage.getItem("empresaActiva"));

      if (empresaGuardada?.id) {
        const existeEmpresa = empresasCargadas.some(
          (empresa) => String(empresa.id) === String(empresaGuardada.id),
        );

        if (existeEmpresa) {
          setEmpresaSeleccionada(String(empresaGuardada.id));
          return;
        }

        localStorage.removeItem("empresaActiva");
      }

      if (empresasCargadas.length > 0) {
        const primeraEmpresa = empresasCargadas[0];

        localStorage.setItem("empresaActiva", JSON.stringify(primeraEmpresa));

        setEmpresaSeleccionada(String(primeraEmpresa.id));
      }
    };

    cargarEmpresas();
  }, []);

  if (!usuario?.superusuario) {
    return null;
  }

  const cambiarEmpresa = (idEmpresa) => {
    const empresa = empresas.find(
      (item) => String(item.id) === String(idEmpresa),
    );

    if (!empresa) return;

    localStorage.setItem("empresaActiva", JSON.stringify(empresa));

    setEmpresaSeleccionada(String(empresa.id));

    window.location.reload();
  };

  return (
    <Box sx={{ px: 2, py: 1 }}>
      <Typography
        variant="caption"
        sx={{
          color: "rgba(255,255,255,0.8)",
          mb: 0.5,
          display: "block",
        }}
      >
        Empresa activa
      </Typography>

      <FormControl fullWidth size="small">
        <Select
          value={empresaSeleccionada}
          onChange={(e) => cambiarEmpresa(e.target.value)}
          displayEmpty
          sx={{
            bgcolor: "rgba(255,255,255,0.08)",
            color: "white",

            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: "rgba(255,255,255,0.25)",
            },

            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: "rgba(255,255,255,0.45)",
            },

            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: "white",
            },

            "& .MuiSvgIcon-root": {
              color: "white",
            },
          }}
        >
          {empresas.length === 0 && (
            <MenuItem value="" disabled>
              No hay empresas activas
            </MenuItem>
          )}

          {empresas.map((empresa) => (
            <MenuItem key={empresa.id} value={String(empresa.id)}>
              {empresa.nombre_fantasia || empresa.razon_social}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
}
