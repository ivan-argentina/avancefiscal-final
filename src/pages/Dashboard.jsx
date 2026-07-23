import { useEffect, useState } from "react";
import GraficoVentas from "../componentes/dashboard/GraficoVentas";
import DashboardHeader from "../componentes/dashboard/DashboardHeader";
import UltimasFacturas from "../componentes/dashboard/UltimasFacturas";
import GraficoVentasDiarias from "../componentes/dashboard/GraficoVentasDiarias";
import TarjetaMonotributo from "../componentes/dashboard/TarjetaMonotributo";
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
import { API_URL } from "../config";

export default function Dashboard() {
  const [empresa, setEmpresa] = useState(null);
  const [idEmpresa, setIdEmpresa] = useState(null);
  const [certificado, setCertificado] = useState(null);
  const [resumen, setResumen] = useState({
    ventasMes: 0,
    saldoCobrar: 0,
    comprobantesMes: 0,
    pendientesAfip: 0,
    stockBajo: 0,
    stockNegativo: 0,
    clientes: 0,
    articulos: 0,
  });
  const [monotributo, setMonotributo] = useState({
    condicionIva: "",
    categoria: "",
    limite: 0,
    facturado12Meses: 0,
    disponible: 0,
    porcentaje: 0,
  });

  const cargarEmpresa = async () => {
    const usuarioGuardado = JSON.parse(localStorage.getItem("usuario"));

    if (!usuarioGuardado?.id) {
      console.log("No se encontró el usuario logueado");
      setEmpresa(null);
      setIdEmpresa(null);
      return;
    }

    const idEmpresa = await obtenerEmpresa(usuarioGuardado.id);

    if (!idEmpresa) {
      console.log("No hay una empresa activa seleccionada");
      setEmpresa(null);
      setIdEmpresa(null);
      return;
    }

    setIdEmpresa(idEmpresa);

    const { data, error } = await supabase
      .from("empresas")
      .select("*")
      .eq("id", idEmpresa)
      .maybeSingle();

    if (error) {
      console.log("Error cargando empresa:", error);
      setEmpresa(null);
      return;
    }

    if (!data) {
      console.log("No se encontró la empresa activa");
      setEmpresa(null);
      return;
    }

    setEmpresa(data);
  };

  const cargarResumen = async () => {
    const usuarioGuardado = JSON.parse(localStorage.getItem("usuario"));
    const empresaActiva = JSON.parse(localStorage.getItem("empresaActiva"));

    const idEmpresa =
      empresaActiva?.id ||
      usuarioGuardado?.idempresa ||
      usuarioGuardado?.empresa?.id;
    if (!idEmpresa || idEmpresa === "null" || idEmpresa === "undefined") {
      console.log("Dashboard: no hay empresa válida seleccionada");
      return;
    }

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

    const { data: articulosStock } = await supabase
      .from("articulos")
      .select("stock, stock_minimo")
      .eq("idempresa", idEmpresa);

    const stockBajo =
      articulosStock?.filter(
        (a) => Number(a.stock || 0) <= Number(a.stock_minimo || 0),
      ).length || 0;

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
    try {
      const usuarioGuardado = JSON.parse(localStorage.getItem("usuario"));

      if (!usuarioGuardado?.id) {
        console.log("No hay usuario logueado");
        return;
      }

      const idEmpresa = await obtenerEmpresa(usuarioGuardado.id);

      if (!idEmpresa) {
        console.log("No se encontró la empresa");
        return;
      }

      /*
       * CARGAR EMPRESA
       */
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
        setMonotributo(null);
        return;
      }

      const categoriaEmpresa = String(empresa?.categoria_monotributo || "")
        .trim()
        .toUpperCase();

      if (!categoriaEmpresa) {
        console.log("La empresa no tiene categoría de monotributo cargada");
        setMonotributo(null);
        return;
      }

      /*
       * CARGAR ÚLTIMO LÍMITE DE LA CATEGORÍA
       */
      const { data: categoria, error: errorCategoria } = await supabase
        .from("categorias_monotributo")
        .select("categoria, limite_facturacion, vigente_desde")
        .eq("categoria", categoriaEmpresa)
        .lte("vigente_desde", new Date().toISOString().slice(0, 10))
        .order("vigente_desde", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (errorCategoria) {
        console.log("Error categoría monotributo:", errorCategoria);
        return;
      }

      if (!categoria) {
        console.log(
          `No se encontró la categoría ${categoriaEmpresa} en categorias_monotributo`,
        );
        setMonotributo(null);
        return;
      }

      const limite = Number(categoria.limite_facturacion || 0);

      if (limite <= 0) {
        console.log("El límite de facturación no es válido:", categoria);
        setMonotributo(null);
        return;
      }

      /*
       * RANGO DE LOS ÚLTIMOS 12 MESES
       */
      const hoy = new Date();
      const desde12Meses = new Date(hoy);
      desde12Meses.setFullYear(hoy.getFullYear() - 1);

      const desde = desde12Meses.toISOString().slice(0, 10);
      const hasta = hoy.toISOString().slice(0, 10);

      /*
       * FACTURACIÓN AUTORIZADA
       */
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

      const facturado12Meses = (facturas || []).reduce((acumulado, factura) => {
        const total = Number(factura.total || 0);

        if (factura.tipo_comprobante === "nota_de_credito") {
          return acumulado - total;
        }

        return acumulado + total;
      }, 0);

      const porcentaje = (facturado12Meses / limite) * 100;
      const disponible = limite - facturado12Meses;

      setMonotributo({
        condicionIva: empresa.condicion_iva,
        categoria: categoriaEmpresa,
        limite,
        facturado12Meses,
        disponible,
        porcentaje,
      });
    } catch (error) {
      console.error("Error al cargar monotributo:", error);
      setMonotributo(null);
    }
  };

  const cargarEstadoCertificado = async () => {
    if (!empresa?.id) {
      return;
    }
    try {
      const usuario = JSON.parse(localStorage.getItem("usuario"));

      if (!usuario?.id) return;

      let cuitEmpresa = null;

      /*
       * SUPERUSUARIO:
       * usa la empresa seleccionada en el selector.
       */
      const esSuperAdmin =
        String(usuario?.rol_global || "")
          .trim()
          .toLowerCase() === "superadmin";

      /*
       * SUPERADMIN:
       * usa la empresa seleccionada en el selector.
       */
      if (esSuperAdmin) {
        const empresaActiva = JSON.parse(localStorage.getItem("empresaActiva"));

        cuitEmpresa = empresaActiva?.cuit || null;
      } else {
        /*
         * USUARIO NORMAL:
         * usa su empresa asociada.
         */
        const { data: relacion, error } = await supabase
          .from("usuario_empresa")
          .select("empresas(cuit)")
          .eq("idusuario", usuario.id)
          .limit(1)
          .maybeSingle();

        if (error) {
          throw error;
        }

        cuitEmpresa = relacion?.empresas?.cuit || null;
      }

      if (!cuitEmpresa) {
        console.warn("No se encontró el CUIT de la empresa activa");
        setCertificado(null);
        return;
      }

      const cuitLimpio = String(cuitEmpresa).replace(/\D/g, "");

      const res = await fetch(
        `${API_URL}/api/fiscal/certificado/estado/${cuitLimpio}`,
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "No se pudo consultar el certificado");
      }

      if (data.ok) {
        setCertificado(data);
      } else {
        setCertificado(null);
      }
    } catch (error) {
      console.log("Error certificado:", error);
      setCertificado(null);
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
    <Box
      sx={{
        p: 2,
        overflowY: "auto",
        height: "calc(100vh - 64px)",
      }}
    >
      <DashboardHeader empresa={empresa} />

      <KpiBar resumen={resumen} />

      {/* TOP CLIENTES Y STOCK BAJO */}
      <Grid container spacing={3} sx={{ mt: 3 }}>
        <Grid
          size={{ xs: 12, lg: 8 }}
          sx={{
            display: "flex",
            "& > *": {
              width: "100%",
            },
          }}
        >
          <TopClientes idEmpresa={idEmpresa} />
        </Grid>

        <Grid
          size={{ xs: 12, lg: 4 }}
          sx={{
            display: "flex",
            "& > *": {
              width: "100%",
            },
          }}
        >
          <StockBajo idEmpresa={idEmpresa} />
        </Grid>
      </Grid>

      {/* MONOTRIBUTO Y ÚLTIMAS FACTURAS */}
      <Grid container spacing={3} sx={{ mt: 3 }}>
        <Grid
          size={{ xs: 12, lg: 6 }}
          sx={{
            display: "flex",
            "& > *": {
              width: "100%",
            },
          }}
        >
          {monotributo && <TarjetaMonotributo monotributo={monotributo} />}
        </Grid>

        <Grid
          size={{ xs: 12, lg: 6 }}
          sx={{
            display: "flex",
            "& > *": {
              width: "100%",
            },
          }}
        >
          <UltimasFacturas idEmpresa={idEmpresa} />
        </Grid>
      </Grid>

      {/* VENTAS DIARIAS Y ALERTAS */}
      <Grid container spacing={3} sx={{ mt: 3 }}>
        <Grid
          size={{ xs: 12, lg: 6 }}
          sx={{
            display: "flex",
            "& > *": {
              width: "100%",
            },
          }}
        >
          <GraficoVentasDiarias idEmpresa={idEmpresa} />
        </Grid>

        <Grid
          size={{ xs: 12, lg: 6 }}
          sx={{
            display: "flex",
            "& > *": {
              width: "100%",
            },
          }}
        >
          <AlertasDashboard certificado={certificado} resumen={resumen} />
        </Grid>
      </Grid>
    </Box>
  );
}
