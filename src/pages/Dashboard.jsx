import { useEffect, useState } from "react";
import GraficoVentas from "../componentes/dashboard/GraficoVentas";
import DashboardHeader from "../componentes/dashboard/DashboardHeader";
import UltimasFacturas from "../componentes/dashboard/UltimasFacturas";
import GraficoVentasDiarias from "../componentes/dashboard/GraficoVentasDiarias";
import {
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  Typography,
  LinearProgress,
  MenuItem,
  TextField,
  Button,
} from "@mui/material";
import { supabase } from "../hook/supabaseClient";
import { obtenerEmpresa } from "../utils/obtenerEmpresa";
import DashBoardCards from "../componentes/dashboard/DashboardCards";
import TopClientes from "../componentes/dashboard/TopClientes";
import StockBajo from "../componentes/dashboard/StockBajo";
import AlertasDashboard from "../componentes/dashboard/AlertasDashboard";
import KpiBar from "../componentes/dashboard/KpiBar";

const API_URL = "https://gestion-production-e3f6.up.railway.app";

export default function Dashboard() {
  const [empresa, setEmpresa] = useState(null);
  const [idEmpresa, setIdEmpresa] = useState(null);
  const [certificado, setCertificado] = useState(null);
  const [resumen, setResumen] = useState({
    ventasMes: 0,
    saldoCobrar: 0,
    comprobantesMes: 0,
  });
  const [monotributo, setMonotributo] = useState({
    condicionIva: "",
    categoria: "",
    limite: 0,
    facturado12Meses: 0,
    disponible: 0,
    porcentaje: 0,
  });
  const [tipoImpresora, setTipoImpresora] = useState(
    localStorage.getItem("tipoImpresora") || "comandera",
  );

  const cambiarTipoImpresora = (valor) => {
    setTipoImpresora(valor);
    localStorage.setItem("tipoImpresora", valor);
  };
  const cargarEmpresa = async () => {
    try {
      const usuarioGuardado = JSON.parse(localStorage.getItem("usuario"));

      if (!usuarioGuardado?.id) return;

      const idEmpresa = await obtenerEmpresa(usuarioGuardado.id);

      setIdEmpresa(idEmpresa);

      const { data, error } = await supabase
        .from("empresas")
        .select("*")
        .eq("id", idEmpresa)
        .single();

      if (error) {
        console.log("Error cargando empresa:", error);
        return;
      }

      setEmpresa(data);
    } catch (error) {
      console.error(error);
    }
  };

  const cargarResumen = async () => {
    const usuarioGuardado = JSON.parse(localStorage.getItem("usuario"));
    const idEmpresa = await obtenerEmpresa(usuarioGuardado.id);

    const hoy = new Date();
    const desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
      .toISOString()
      .slice(0, 10);

    const hasta = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)
      .toISOString()
      .slice(0, 10);

    const { count: cantidadClientes } = await supabase
      .from("clientes")
      .select("*", { count: "exact", head: true })
      .eq("idempresa", idEmpresa);

    const { count: cantidadArticulos } = await supabase
      .from("articulos")
      .select("*", { count: "exact", head: true })
      .eq("idempresa", idEmpresa);

    const { count: facturasPendientes } = await supabase
      .from("facturas")
      .select("*", { count: "exact", head: true })
      .eq("idempresa", idEmpresa)
      .eq("estado_fiscal", "pendiente");

    const { count: stockBajo } = await supabase
      .from("articulos")
      .select("*", { count: "exact", head: true })
      .eq("idempresa", idEmpresa)
      .filter("stock", "lte", "stock_minimo");

    const { count: stockNegativo } = await supabase
      .from("articulos")
      .select("*", { count: "exact", head: true })
      .eq("idempresa", idEmpresa)
      .lt("stock", 0);
    const { data, error } = await supabase
      .from("facturas")
      .select("total, saldo, estado_fiscal, fecha")
      .eq("idempresa", idEmpresa)
      .gte("fecha", desde)
      .lte("fecha", hasta);

    if (error) {
      console.log("Error resumen:", error);
      return;
    }

    const facturas = data || [];

    const ventasMes = facturas
      .filter((f) => f.estado_fiscal === "autorizada")
      .reduce((acc, f) => acc + Number(f.total || 0), 0);

    const comprobantesMes = facturas.filter(
      (f) => f.estado_fiscal === "autorizada",
    ).length;

    const ticketPromedio =
      comprobantesMes > 0 ? ventasMes / comprobantesMes : 0;

    const { data: pendientes } = await supabase
      .from("facturas")
      .select("saldo")
      .eq("idempresa", idEmpresa)
      .gt("saldo", 0);

    const saldoCobrar = (pendientes || []).reduce(
      (acc, f) => acc + Number(f.saldo || 0),
      0,
    );

    setResumen({
      ventasMes,
      saldoCobrar,
      comprobantesMes,
      ticketPromedio,
      cantidadClientes,
      cantidadArticulos,
      facturasPendientes,
      stockBajo,
      stockNegativo,
    });
  };
  const cargarMonotributo = async () => {
    const usuarioGuardado = JSON.parse(localStorage.getItem("usuario"));
    const idEmpresa = await obtenerEmpresa(usuarioGuardado.id);

    const { data: empresa, error: errorEmpresa } = await supabase
      .from("empresas")
      .select("condicion_iva, categoria_monotributo")
      .eq("id", idEmpresa)
      .maybeSingle();

    if (errorEmpresa) {
      console.log("Error empresa monotributo:", errorEmpresa);
      return;
    }

    if (empresa?.condicion_iva !== "Monotributista") {
      return;
    }

    const { data: categoria, error: errorCategoria } = await supabase
      .from("categorias_monotributo")
      .select("limite_facturacion")
      .eq("categoria", empresa.categoria_monotributo?.trim().toUpperCase())
      .order("vigente_desde", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data, error } = await supabase
      .from("categorias_monotributo")
      .select("*");

    if (errorCategoria) {
      console.log("Error categoría monotributo:", errorCategoria);
      return;
    }

    const hoy = new Date();
    const desde12Meses = new Date(hoy);
    desde12Meses.setFullYear(hoy.getFullYear() - 1);

    const desde = desde12Meses.toISOString().slice(0, 10);
    const hasta = hoy.toISOString().slice(0, 10);

    const { data: facturas, error: errorFacturas } = await supabase
      .from("facturas")
      .select("total, tipo_comprobante, estado_fiscal, fecha")
      .eq("idempresa", idEmpresa)
      .eq("estado_fiscal", "autorizada")
      .gte("fecha", desde)
      .lte("fecha", hasta);

    if (errorFacturas) {
      console.log("Error facturas monotributo:", errorFacturas);
      return;
    }

    const facturado12Meses = (facturas || []).reduce((acc, f) => {
      const total = Number(f.total || 0);

      if (f.tipo_comprobante === "nota_de_credito") {
        return acc - total;
      }

      return acc + total;
    }, 0);

    const limite = Number(categoria?.limite_facturacion || 0);
    const porcentaje = limite ? (facturado12Meses / limite) * 100 : 0;
    const disponible = limite - facturado12Meses;

    setMonotributo({
      condicionIva: empresa.condicion_iva,
      categoria: empresa.categoria_monotributo,
      limite,
      facturado12Meses,
      disponible,
      porcentaje,
    });
  };

  const cargarEstadoCertificado = async () => {
    try {
      const usuario = JSON.parse(localStorage.getItem("usuario"));

      if (!usuario?.id) {
        console.log("No hay usuario logueado");
        return;
      }

      const { data: relacion, error } = await supabase
        .from("usuario_empresa")
        .select("empresas(cuit)")
        .eq("idusuario", usuario.id)
        .single();

      if (error) throw error;

      const cuitEmpresa = relacion?.empresas?.cuit;

      if (!cuitEmpresa) return;

      const res = await fetch(
        `${API_URL}/api/fiscal/certificado/estado/${cuitEmpresa}`,
      );

      const data = await res.json();

      if (data.ok) {
        setCertificado(data);
      }
    } catch (error) {
      console.log("Error certificado:", error);
    }
  };

  useEffect(() => {
    cargarEmpresa();
    cargarEstadoCertificado();
    cargarResumen();
    cargarMonotributo();
  }, []);

  const configCertificado = {
    vigente: {
      label: "Certificado vigente",
      color: "success",
    },
    por_vencer: {
      label: "Certificado por vencer",
      color: "warning",
    },
    vencido: {
      label: "Certificado vencido",
      color: "error",
    },
  };

  const estadoCert = certificado?.estado || "vigente";
  const config = configCertificado[estadoCert];

  return (
    <Box sx={{ p: 2, overflowY: "auto", height: "calc(100vh - 64px)" }}>
      <DashboardHeader empresa={empresa} />
      <KpiBar resumen={resumen} />

      <Grid container spacing={3} sx={{ mt: 3 }}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <TopClientes idEmpresa={idEmpresa} />
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <StockBajo idEmpresa={idEmpresa} />
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mt: 3 }}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <UltimasFacturas idEmpresa={idEmpresa} />
        </Grid>

        <Grid size={{ xs: 12, lg: 6 }}>
          <AlertasDashboard certificado={certificado} resumen={resumen} />
        </Grid>
        <Grid container spacing={3} sx={{ mt: 3 }}>
          <Grid size={{ xs: 12 }}>
            <GraficoVentasDiarias idEmpresa={idEmpresa} />
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
}
