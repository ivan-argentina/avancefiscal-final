import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
} from "@mui/material";

import { supabase } from "../hook/supabaseClient";
import { obtenerEmpresa } from "../utils/obtenerEmpresa";

export default function Caja() {
  const hoy = new Date().toISOString().split("T")[0];

  const [desde, setDesde] = useState(hoy);
  const [hasta, setHasta] = useState(hoy);
  const [movimientos, setMovimientos] = useState([]);
  const [saldoAnterior, setSaldoAnterior] = useState(0);
  const [cargando, setCargando] = useState(false);

  const formatoMoneda = (valor) =>
    Number(valor || 0).toLocaleString("es-AR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  useEffect(() => {
    cargarCaja();
  }, [desde, hasta]);

  const cargarCaja = async () => {
    setCargando(true);

    try {
      const usuarioGuardado = JSON.parse(localStorage.getItem("usuario"));

      if (!usuarioGuardado) {
        setMovimientos([]);
        setSaldoAnterior(0);
        return;
      }
      const idEmpresa = await obtenerEmpresa(usuarioGuardado.id);

      if (!idEmpresa) {
        console.error("No hay una empresa activa seleccionada");
        setMovimientos([]);
        setSaldoAnterior(0);
        return;
      }

      console.log("Empresa Caja:", idEmpresa);
      // Movimientos del período seleccionado
      const { data, error } = await supabase
        .from("movimientos_caja")
        .select("*")
        .eq("idempresa", idEmpresa)
        .gte("fecha", desde)
        .lte("fecha", hasta)
        .order("fecha", { ascending: true })
        .order("created_at", { ascending: true });

      console.log("Movimientos Caja:", data);
      console.log("Error Caja:", error);
      if (error) throw error;

      setMovimientos(data || []);

      // Movimientos anteriores al período
      const { data: anteriores, error: errorAnteriores } = await supabase
        .from("movimientos_caja")
        .select("tipo, importe")
        .eq("idempresa", idEmpresa)
        .lt("fecha", desde);

      if (errorAnteriores) throw errorAnteriores;

      const saldo = (anteriores || []).reduce((acum, mov) => {
        const importe = Number(mov.importe || 0);

        return mov.tipo === "ingreso" ? acum + importe : acum - importe;
      }, 0);

      setSaldoAnterior(saldo);
    } catch (error) {
      console.error("Error al cargar Caja:", error);
      setMovimientos([]);
      setSaldoAnterior(0);
    } finally {
      setCargando(false);
    }
  };

  const totalIngresos = movimientos
    .filter((mov) => mov.tipo === "ingreso")
    .reduce((total, mov) => total + Number(mov.importe || 0), 0);

  const totalEgresos = movimientos
    .filter((mov) => mov.tipo === "egreso")
    .reduce((total, mov) => total + Number(mov.importe || 0), 0);

  const saldoFinal = saldoAnterior + totalIngresos - totalEgresos;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>
        Caja
      </Typography>

      {/* Filtros de fecha */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box
          sx={{
            display: "flex",
            gap: 2,
            flexWrap: "wrap",
          }}
        >
          <TextField
            label="Desde"
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />

          <TextField
            label="Hasta"
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </Box>
      </Paper>

      {/* Resumen */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            md: "repeat(4, 1fr)",
          },
          gap: 2,
          mb: 3,
        }}
      >
        <Paper sx={{ p: 2 }}>
          <Typography color="text.secondary">Saldo anterior</Typography>
          <Typography variant="h6">$ {formatoMoneda(saldoAnterior)}</Typography>
        </Paper>

        <Paper sx={{ p: 2 }}>
          <Typography color="text.secondary">Ingresos</Typography>
          <Typography variant="h6">$ {formatoMoneda(totalIngresos)}</Typography>
        </Paper>

        <Paper sx={{ p: 2 }}>
          <Typography color="text.secondary">Egresos</Typography>
          <Typography variant="h6">$ {formatoMoneda(totalEgresos)}</Typography>
        </Paper>

        <Paper sx={{ p: 2 }}>
          <Typography color="text.secondary">Saldo final</Typography>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            $ {formatoMoneda(saldoFinal)}
          </Typography>
        </Paper>
      </Box>

      {/* Movimientos */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Fecha</TableCell>
              <TableCell>Comprobante</TableCell>
              <TableCell>Concepto</TableCell>
              <TableCell>Medio de pago</TableCell>
              <TableCell align="right">Ingreso</TableCell>
              <TableCell align="right">Egreso</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {cargando ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <CircularProgress size={28} />
                </TableCell>
              </TableRow>
            ) : movimientos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No hay movimientos en el período seleccionado.
                </TableCell>
              </TableRow>
            ) : (
              movimientos.map((mov) => (
                <TableRow key={mov.id}>
                  <TableCell>{mov.fecha}</TableCell>

                  <TableCell>{mov.numero_comprobante || "-"}</TableCell>

                  <TableCell>{mov.concepto}</TableCell>

                  <TableCell>{mov.medio_pago || "-"}</TableCell>

                  <TableCell align="right">
                    {mov.tipo === "ingreso"
                      ? `$ ${formatoMoneda(mov.importe)}`
                      : "-"}
                  </TableCell>

                  <TableCell align="right">
                    {mov.tipo === "egreso"
                      ? `$ ${formatoMoneda(mov.importe)}`
                      : "-"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
