import { useNavigate } from "react-router-dom";
import UndoIcon from "@mui/icons-material/Undo";
import EmailIcon from "@mui/icons-material/Email";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import VisibilityIcon from "@mui/icons-material/Visibility";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import { useRef, useEffect, useState } from "react";
import { generarpdfU } from "../utils/generarpdfu";
import GenerarPdf from "../componentes/GenerarPdf";
import { DataGrid } from "@mui/x-data-grid";
import { Button } from "@mui/material";
import { Resend } from "resend";
import { supabase } from "../hook/supabaseClient";
import { obtenerEmpresa } from "../utils/obtenerEmpresa";
import Tooltip from "@mui/material/Tooltip";
import { imprimirTicketFactura } from "../utils/imprimirTicketFactura";
import { API_URL } from "../config";

import {
  Box,
  Paper,
  Typography,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
} from "@mui/material";

export default function Facturas() {
  const [enviandoEmail, setEnviandoEmail] = useState(false);
  const [facturas, setFacturas] = useState([]);
  const [detalleFactura, setDetalleFactura] = useState([]);
  const [facturaSeleccionada, setFacturaSeleccionada] = useState(null);
  const [openDetalle, setOpenDetalle] = useState(false);
  const [filtro, setFiltro] = useState("");
  const [pdfData, setPdfData] = useState(null);
  const [emailPendiente, setEmailPendiente] = useState(null);
  const [pdfNombre, setPdfNombre] = useState("");
  const [modoPdfPendiente, setModoPdfPendiente] = useState(null);
  const [whatsAppPendiente, setWhatsAppPendiente] = useState(null);

  const facturaPdfRef = useRef();

  const navigate = useNavigate();
  const crearNotaCredito = (factura) => {
    localStorage.setItem("notaCreditoOrigen", JSON.stringify(factura));

    navigate("/factura");
  };
  const API_URL = import.meta.env.VITE_API_URL;

  const enviarFacturaEmail = async (factura) => {
    if (enviandoEmail) return;

    const emailCliente = factura.clientes?.email;

    if (!emailCliente) {
      mostrarNotificacion("El cliente no tiene email cargado", "warning");
      return;
    }

    setEnviandoEmail(true);
    await descargarPdfFactura(factura, "email");
  };

  const autorizarFacturaPendiente = async (factura) => {
    const response = await fetch(`${API_URL}/api/fiscal/autorizar`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        idFactura: factura.id,
      }),
    });

    const data = await response.json();
    const detallePdf = data.fiscal.detalle.map((item, index) => ({
      id: index,
      articulo: item.descripcion,
      descripcion: item.descripcion,
      cantidad: item.cantidad,
      precio: item.precio,
      subtotal: item.subtotal,
    }));

    if (!data.ok) {
      mostrarNotificacion(
        data.mensaje || data.error || "Error al autorizar la factura",
        "error",
      );
      return;
    }

    mostrarNotificacion("Factura autorizada correctamente", "success");

    await cargarFacturas();
  };

  const enviarWhatsAppFactura = async (factura) => {
    let telefono = String(factura.clientes?.telefono || "").replace(/\D/g, "");

    if (!telefono) {
      mostrarNotificacion("El cliente no tiene teléfono cargado", "warning");
      return;
    }

    if (telefono.startsWith("54")) {
      telefono = telefono.slice(2);
    }

    if (telefono.startsWith("0")) {
      telefono = telefono.slice(1);
    }

    telefono = telefono.replace(/^15/, "");

    if (!telefono.startsWith("9")) {
      telefono = `9${telefono}`;
    }

    const numeroWhatsApp = `54${telefono}`;

    const mensaje =
      `Hola ${factura.clientes?.nombre || ""}, ` +
      `te enviamos el comprobante N° ` +
      `${factura.numero_fiscal || factura.numero || ""}. ` +
      `El PDF fue descargado para que puedas adjuntarlo.`;

    const ventanaWhatsApp = window.open("", "_blank");

    if (!ventanaWhatsApp) {
      mostrarNotificacion(
        "El navegador bloqueó la ventana de WhatsApp",
        "warning",
      );
      return;
    }

    const urlWhatsApp =
      `https://wa.me/${numeroWhatsApp}` +
      `?text=${encodeURIComponent(mensaje)}`;

    try {
      setWhatsAppPendiente({
        ventana: ventanaWhatsApp,
        url: urlWhatsApp,
      });

      await descargarPdfFactura(factura, "whatsapp");
    } catch (error) {
      ventanaWhatsApp.close();

      console.error("Error al preparar WhatsApp:", error);

      mostrarNotificacion("No se pudo generar el PDF", "error");
    }
  };

  const cargarFacturas = async () => {
    const usuarioGuardado = JSON.parse(localStorage.getItem("usuario"));
    if (!usuarioGuardado?.id) {
      console.log("No hay usuario logueado");
      return;
    }
    const idEmpresa = await obtenerEmpresa(usuarioGuardado.id);
    if (!idEmpresa) {
      console.log("No se encontró empresa para el usuario");
      return;
    }

    const { data, error } = await supabase
      .from("facturas")
      .select(
        `
    id,
    idcliente,
    idfactura_origen,
     numero_origen,
    numero,
    fecha,
    tipo_comprobante,
    letra_comprobante,
    forma_pago,
    observaciones,
    subtotal,
    total,
    punto_venta,
    estado_fiscal,
    numero_fiscal,
    cae,
    cae_vencimiento,
    afip_error_code,
    afip_error_msg,
    
    empresas!facturas_idempresa_fkey(
      razon_social,
      cuit,
      direccion,
      condicion_iva,
      ingresos_brutos,
      inicio_actividades,
      logo_url,
      tipo_impresion,
      ciudades!empresas_idciudad_fkey(nombre)
    ),

    clientes (
      nombre,
      cuit,
      direccion,
      telefono,
      email,
      idciudad,
      ciudades(nombre),
       condicion_iva (
        descripcion
       )
    ),

    detalle_factura (
      id,
      idarticulo,
      cantidad,
      precio,
      subtotal,
      descripcion,
      articulos (
        descripcion
      )
    )
  `,
      )
      .eq("idempresa", idEmpresa)
      .order("id", { ascending: false });

    if (error) {
      console.log("Error al cargar facturas:", error);
      return;
    }

    setFacturas(data || []);
  };

  const verDetalleFactura = async (factura) => {
    const usuarioGuardado = JSON.parse(localStorage.getItem("usuario"));
    const idEmpresa = await obtenerEmpresa(usuarioGuardado.id);

    setFacturaSeleccionada(factura);
    const { data, error } = await supabase
      .from("factura_detalle")
      .select(
        `
        id,
        cantidad,
        precio,
        subtotal,
        articulos(nombre)
      `,
      )
      .eq("idfactura", factura.numero)
      .eq("idempresa", factura.idEmpresa);

    if (error) {
      console.log("Error al cargar detalle:", error);
      return;
    }

    const detalleFormateado = (data || []).map((item) => ({
      id: item.id,
      articulo: item?.articulos?.descripcion || item.descripcion || "-",
      descripcion: item?.articulos?.descripcion || item.descripcion || "-",
      nombre: item?.articulos?.descripcion || item.descripcion || "-",
      cantidad: item.cantidad,
      precio: item.precio,
      subtotal: item.subtotal,
    }));

    setDetalleFactura(detalleFormateado);
    setOpenDetalle(true);
  };

  const descargarPdfFactura = async (factura, modo = "descargar") => {
    try {
      const usuarioGuardado = JSON.parse(localStorage.getItem("usuario"));

      if (!usuarioGuardado?.id) {
        console.log("No hay usuario logueado");
        return;
      }

      const idEmpresa = await obtenerEmpresa(usuarioGuardado.id);

      if (!idEmpresa) {
        console.log("No se encontró la empresa del usuario");
        return;
      }

      /*
       * CARGAR EMPRESA Y CONFIGURACIÓN DE IMPRESIÓN
       */
      const { data: empresaData, error: errorEmpresa } = await supabase
        .from("empresas")
        .select(
          `
        *,
        ciudades!empresas_idciudad_fkey(nombre)
        `,
        )
        .eq("id", idEmpresa)
        .single();

      if (errorEmpresa || !empresaData) {
        console.log("Error al cargar la empresa:", errorEmpresa);
        return;
      }

      /*
       * CARGAR DETALLE DEL COMPROBANTE
       */
      const { data, error } = await supabase
        .from("detalle_factura")
        .select(
          `
        id,
        idarticulo,
        cantidad,
        precio,
        subtotal,
        descripcion,
        articulos(descripcion)
        `,
        )
        .eq("idfactura", factura.id)
        .eq("idempresa", idEmpresa);

      if (error) {
        console.log("Error al cargar detalle para impresión:", error);
        return;
      }

      const detalleFormateado = (data || []).map((item) => {
        const descripcion =
          item?.articulos?.descripcion || item.descripcion || "-";

        return {
          id: item.id,
          idarticulo: item.idarticulo,
          articulo: descripcion,
          descripcion,
          nombre: descripcion,
          cantidad: Number(item.cantidad || 0),
          precio: Number(item.precio || 0),
          subtotal: Number(item.subtotal || 0),
        };
      });

      /*
       * FORMATEAR EMPRESA
       */
      const empresaFormateada = {
        ...empresaData,
        localidad: empresaData?.ciudades?.nombre || "-",
        ciudad: empresaData?.ciudades?.nombre || "-",
      };

      /*
       * FORMATEAR CLIENTE
       */
      const clienteFormateado = {
        ...factura.clientes,

        localidad: factura.clientes?.ciudades?.nombre || "",
        ciudad: factura.clientes?.ciudades?.nombre || "",

        condicion_iva:
          factura.clientes?.condicion_iva?.descripcion ||
          factura.clientes?.condicion_iva ||
          "Consumidor Final",
      };

      /*
       * TIPO DE IMPRESIÓN CONFIGURADO EN LA EMPRESA
       *
       * Valores esperados:
       * - comandera
       * - laser
       */
      const tipoImpresion = String(empresaData?.tipo_impresion || "laser")
        .trim()
        .toLowerCase();

      /*
       * REIMPRESIÓN POR COMANDERA
       *
       * Solo se usa la comandera cuando se presiona imprimir/descargar.
       * Para enviar por email siempre se genera el PDF.
       */
      if (
        modo !== "email" &&
        modo !== "whatsapp" &&
        tipoImpresion === "comandera"
      ) {
        const totalFactura = Number(factura.total || 0);

        const esFacturaConIva =
          factura.letra_comprobante === "A" ||
          factura.letra_comprobante === "B";

        const neto = esFacturaConIva
          ? Number((totalFactura / 1.21).toFixed(2))
          : totalFactura;

        const iva = esFacturaConIva
          ? Number((totalFactura - totalFactura / 1.21).toFixed(2))
          : 0;

        const facturaTicket = {
          ...factura,

          /*
           * Empresa
           */
          empresa: empresaFormateada,
          empresas: empresaFormateada,

          /*
           * Cliente
           */
          cliente: clienteFormateado,
          clientes: clienteFormateado,
          clienteSeleccionado: clienteFormateado,

          /*
           * Detalle
           */
          detalle: detalleFormateado,
          detalle_factura: detalleFormateado,

          /*
           * Número del comprobante
           */
          numero: factura.numero_fiscal || factura.numero,
          numeroFactura: factura.numero_fiscal || factura.numero,
          numero_fiscal: factura.numero_fiscal || factura.numero,

          /*
           * Tipo y letra
           */
          tipoComprobante: factura.tipo_comprobante,
          tipo_comprobante: factura.tipo_comprobante,

          letraComprobante: factura.letra_comprobante || "C",
          letra_comprobante: factura.letra_comprobante || "C",

          /*
           * Punto de venta
           */
          puntoVenta: factura.punto_venta || empresaData.punto_venta || 1,
          punto_venta: factura.punto_venta || empresaData.punto_venta || 1,

          /*
           * Totales
           */
          total: totalFactura,
          totalFactura,
          subtotal: Number(factura.subtotal || neto),
          neto,
          iva,

          /*
           * Datos fiscales
           */
          cae: factura.cae,

          vencimientoCae: factura.cae_vencimiento,
          caeVencimiento: factura.cae_vencimiento,
          cae_vencimiento: factura.cae_vencimiento,

          /*
           * Comprobante asociado para notas de crédito
           */
          numeroOrigen: factura.numero_origen,
          numero_origen: factura.numero_origen,

          /*
           * Otros datos
           */
          fecha: factura.fecha,
          formaPago: factura.forma_pago,
          forma_pago: factura.forma_pago,
          observaciones: factura.observaciones,
        };

        await imprimirTicketFactura(facturaTicket);
        return;
      }

      /*
       * REIMPRESIÓN LÁSER / PDF
       */

      const totalFactura = Number(factura.total || 0);

      const esFacturaConIva =
        factura.letra_comprobante === "A" || factura.letra_comprobante === "B";

      const neto = esFacturaConIva
        ? Number((totalFactura / 1.21).toFixed(2))
        : totalFactura;

      const iva = esFacturaConIva
        ? Number((totalFactura - totalFactura / 1.21).toFixed(2))
        : 0;

      setPdfData({
        empresa: empresaFormateada,

        numeroFactura: factura.numero_fiscal || factura.numero,

        fecha: factura.fecha,

        tipoComprobante: factura.tipo_comprobante,

        letraComprobante: factura.letra_comprobante || "C",

        formaPago: factura.forma_pago,

        clienteSeleccionado: clienteFormateado,

        detalle: detalleFormateado,

        totalFactura,

        neto,

        iva,

        observaciones: factura.observaciones,

        puntoVenta: factura.punto_venta || empresaData.punto_venta || 1,

        cae: factura.cae,

        vencimientoCae: factura.cae_vencimiento,

        numeroOrigen: factura.numero_origen,
      });

      /*
       * NOMBRE DEL ARCHIVO PDF
       */
      const nombreComprobante =
        factura.tipo_comprobante === "nota_de_credito"
          ? "nota-credito"
          : "factura";

      const nombrePdf =
        `${nombreComprobante}-` +
        `${factura.letra_comprobante || "C"}-` +
        `${String(factura.punto_venta || empresaData.punto_venta || 1).padStart(
          4,
          "0",
        )}-` +
        `${String(factura.numero_fiscal || factura.numero || 0).padStart(
          8,
          "0",
        )}.pdf`;

      /*
       * ENVÍO POR EMAIL
       *
       * Aunque la empresa use comandera, el email se envía como PDF.
       */
      if (modo === "email") {
        setEmailPendiente({
          to: factura.clientes?.email,
          filename: nombrePdf,

          subject:
            `Factura ${factura.letra_comprobante || "C"} ` +
            `${String(
              factura.punto_venta || empresaData.punto_venta || 1,
            ).padStart(4, "0")}-` +
            `${String(factura.numero_fiscal || factura.numero || 0).padStart(
              8,
              "0",
            )}`,

          html: `
      <p>Hola ${factura.clientes?.nombre || ""},</p>

      <p>
        Le enviamos adjunto el comprobante correspondiente.
      </p>

      <p>
        <strong>Total:</strong>
        $${totalFactura.toLocaleString("es-AR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </p>

      <p>Muchas gracias.</p>

      <p>
        <strong>
          ${empresaData?.razon_social || "Avance Fiscal"}
        </strong>
      </p>
    `,
        });

        setPdfModo("email");
      } else {
        setPdfNombre(nombrePdf);
        setPdfModo(modo || "descargar");
      }
    } catch (error) {
      console.log("Error al reimprimir el comprobante:", error);
      alert(error?.message || "Ocurrió un error al reimprimir el comprobante.");
    }
  };
  useEffect(() => {
    if (!pdfData || !emailPendiente) return;

    const timer = setTimeout(async () => {
      try {
        const pdf = await generarpdfU(
          facturaPdfRef.current,
          emailPendiente.filename,
          { descargar: false },
        );

        const res = await fetch(`${API_URL}/api/email/factura`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            to: emailPendiente.to,
            subject: emailPendiente.subject,
            html: emailPendiente.html,
            pdfBase64: pdf.pdfBase64,
            filename: pdf.filename,
          }),
        });

        const data = await res.json();

        if (!data.ok) {
          alert(data.error || "No se pudo enviar el email");
          return;
        }

        mostrarNotificacion("Email enviado correctamente.");
      } catch (error) {
        console.log("Error enviando email:", error);
        alert("Error enviando email.");
      } finally {
        setEmailPendiente(null);
        setEnviandoEmail(false);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [pdfData, emailPendiente]);

  useEffect(() => {
    cargarFacturas();
  }, []);

  useEffect(() => {
    if (!pdfData || !pdfNombre) return;

    const timer = setTimeout(() => {
      generarpdfU(facturaPdfRef.current, pdfNombre);
      setPdfNombre("");
    }, 800);

    return () => clearTimeout(timer);
  }, [pdfData, pdfNombre]);
  useEffect(() => {
    if (!pdfData || !pdfNombre || !pdfRef.current) {
      return;
    }

    const procesarPdf = async () => {
      try {
        await new Promise((resolve) => {
          setTimeout(resolve, 300);
        });

        const pdfGenerado = await generarArchivoPdf(pdfRef.current, pdfNombre);

        if (pdfModo === "whatsapp") {
          abrirWhatsAppPendiente();
        }

        if (pdfModo === "email") {
          // enviar email con pdfGenerado
        }
      } catch (error) {
        console.error("Error al procesar el PDF:", error);

        mostrarNotificacion("No se pudo generar el archivo PDF", "error");
      } finally {
        setPdfModo(null);
        setPdfNombre("");
        setPdfData(null);
      }
    };

    procesarPdf();
  }, [pdfData, pdfNombre, pdfModo]);

  const columnas = [
    {
      field: "fecha",
      headerName: "Fecha",
      width: 120,
      renderCell: (params) => {
        if (!params.value) return "-";

        const [anio, mes, dia] = params.value.split("-");

        return `${dia}/${mes}/${anio}`;
      },
    },
    {
      field: "tipo",
      headerName: "Tipo",
      width: 150,
      renderCell: (params) => {
        const tipo = params.row.tipo_comprobante || "";
        const letra = params.row.letra_comprobante || params.row.letra || "";

        if (tipo === "factura") return `Factura ${letra}`;
        if (tipo === "nota_de_credito") return `NC ${letra}`;
        if (tipo === "presupuesto") return "Presupuesto";
        if (tipo === "remito") return "Remito";

        return tipo;
      },
    },
    {
      field: "cliente",
      headerName: "Cliente",
      minWidth: 220,
      renderCell: (params) => params.row?.clientes?.nombre || "Sin Cliente",
    },
    {
      field: "total",
      headerName: "Total",
      flex: 1,
      align: "right",
      headerAlign: "right",
      renderCell: (params) => {
        const valor = Number(params.row.total || 0);

        return `$ ${valor.toLocaleString("es-AR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;
      },
    },
    {
      field: "estado_fiscal",
      headerName: "Estado Fiscal",
      width: 150,
      renderCell: (params) => {
        const estado = params.value || "pendiente";

        const config = {
          autorizada: {
            label: "Autorizada",
            color: "success",
          },
          pendiente: {
            label: "Pendiente",
            color: "warning",
          },
          rechazada: {
            label: "Rechazada",
            color: "error",
          },
        };

        const item = config[estado] || {
          label: estado,
          color: "default",
        };

        return <Chip label={item.label} color={item.color} size="small" />;
      },
    },
    {
      field: "numero_fiscal",
      headerName: "N° Fiscal",
      width: 160,
      renderCell: (params) => {
        const ptoVta = String(params.row.punto_venta || 1).padStart(4, "0");
        const nro = String(params.value || 0).padStart(8, "0");
        return `${ptoVta}-${nro}`;
      },
    },
    {
      field: "cae",
      headerName: "CAE",
      width: 160,
      renderCell: (params) => {
        if (params.row.estado_fiscal !== "autorizada") return "-";
        return params.value || "-";
      },
    },
    {
      field: "afip_error_code",
      headerName: "Error AFIP",
      width: 100,
      renderCell: (params) => {
        const code = params.row.afip_error_code;
        const msg = params.row.afip_error_msg;
        const estado = params.row.estado_fiscal;

        // Factura pendiente
        if (estado === "pendiente") {
          return (
            <Tooltip title="Comprobante aún no enviado a AFIP">
              <Chip
                label="Pend."
                color="warning"
                size="small"
                variant="outlined"
              />
            </Tooltip>
          );
        }

        // Factura autorizada sin errores
        if (!code) {
          return (
            <Tooltip title="Comprobante autorizado correctamente por AFIP">
              <Chip
                label="OK"
                color="success"
                size="small"
                sx={{ fontWeight: 600 }}
              />
            </Tooltip>
          );
        }

        // Factura rechazada con error AFIP
        return (
          <Tooltip title={msg || "Error informado por AFIP"}>
            <Chip
              label={code}
              color="error"
              size="small"
              sx={{ fontWeight: 600 }}
            />
          </Tooltip>
        );
      },
    },
    {
      field: "cae_vencimiento",
      headerName: "Vto. CAE",
      width: 120,
      renderCell: (params) => {
        if (!params.value) return "-";
        const fecha = new Date(params.value);
        return fecha.toLocaleDateString("es-AR");
      },
    },

    {
      field: "pdf",
      headerName: "Acciones",
      width: 170,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <>
          <Tooltip title="Descargar PDF">
            <IconButton
              color="secondary"
              onClick={() => descargarPdfFactura(params.row)}
            >
              <PictureAsPdfIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Enviar por WhatsApp">
            <IconButton
              color="success"
              onClick={() => enviarWhatsAppFactura(params.row)}
            >
              <WhatsAppIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Generar Nota de Credito">
            <IconButton
              color="warning"
              onClick={() => crearNotaCredito(params.row)}
            >
              <UndoIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Enviar por email">
            <IconButton
              color="primary"
              disabled={enviandoEmail}
              onClick={() => enviarFacturaEmail(params.row)}
            >
              <EmailIcon />
            </IconButton>
          </Tooltip>
        </>
      ),
    },

    {
      field: "autorizar",
      headerName: "AFIP",
      width: 120,
      sortable: false,
      filterable: false,
      renderCell: (params) => {
        if (params.row.estado_fiscal === "autorizada") {
          return "-";
        }

        return (
          <Button
            size="small"
            variant="contained"
            color="success"
            onClick={() => autorizarFacturaPendiente(params.row)}
          >
            Autorizar
          </Button>
        );
      },
    },
  ];

  const facturasFiltradas = facturas.filter((f) => {
    const nombreCliente = f.clientes?.nombre || "";
    return nombreCliente.toLowerCase().includes(filtro.toLowerCase());
  });

  return (
    <Box sx={{ p: 2 }}>
      <Paper sx={{ p: 2, borderRadius: 3, width: "100%" }}>
        <Typography variant="h5" gutterBottom>
          Listado de Facturas
        </Typography>

        <Box sx={{ mb: 2 }}>
          <TextField
            label="Buscar por cliente"
            size="small"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
          />
        </Box>

        <Box sx={{ width: "100%", height: 450 }}>
          <DataGrid
            rows={facturasFiltradas}
            columns={columnas}
            pageSizeOptions={[5, 10, 20]}
            initialState={{
              pagination: {
                paginationModel: { pageSize: 10, page: 0 },
              },
            }}
            rowHeight={50}
            disableRowSelectionOnClick
            sx={{
              width: "100%",
              fontSize: 13,
              borderRadius: 2,
            }}
            localeText={{
              noRowsLabel: "No hay facturas cargadas",
            }}
          />
        </Box>
      </Paper>

      <Dialog
        open={openDetalle}
        onClose={() => setOpenDetalle(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Detalle de Factura</DialogTitle>

        <DialogContent>
          {facturaSeleccionada && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Número:</strong> {facturaSeleccionada.numero || "-"}
              </Typography>
              <Typography variant="body2">
                <strong>Fecha:</strong> {facturaSeleccionada.fecha}
              </Typography>
              <Typography variant="body2">
                <strong>Cliente:</strong>{" "}
                {facturaSeleccionada?.clientes?.nombre || "-"}
              </Typography>
              <Typography variant="body2">
                <strong>Tipo:</strong> {facturaSeleccionada.tipo_comprobante}
              </Typography>
              <Typography variant="body2">
                <strong>Forma de pago:</strong> {facturaSeleccionada.forma_pago}
              </Typography>
              <Typography variant="body2">
                <strong>Total:</strong>{" "}
                {new Intl.NumberFormat("es-AR", {
                  style: "currency",
                  currency: "ARS",
                  minimumFractionDigits: 2,
                }).format(facturaSeleccionada.total || 0)}
              </Typography>
            </Box>
          )}

          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Artículo</TableCell>
                <TableCell align="right">Cantidad</TableCell>
                <TableCell align="right">Precio</TableCell>
                <TableCell align="right">Subtotal</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {detalleFactura.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    {item.articulos?.descripcion ||
                      item.articulo ||
                      item.nombre ||
                      item.descripcion ||
                      "-"}
                  </TableCell>
                  <TableCell align="right">{item.cantidad}</TableCell>
                  <TableCell align="right">
                    {new Intl.NumberFormat("es-AR", {
                      style: "currency",
                      currency: "ARS",
                      minimumFractionDigits: 2,
                    }).format(item.precio || 0)}
                  </TableCell>
                  <TableCell align="right">
                    {new Intl.NumberFormat("es-AR", {
                      style: "currency",
                      currency: "ARS",
                      minimumFractionDigits: 2,
                    }).format(item.subtotal || 0)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>

      {pdfData && (
        <GenerarPdf
          ref={facturaPdfRef}
          empresa={pdfData.empresa}
          fecha={pdfData.fecha}
          letraComprobante={pdfData.letraComprobante}
          tipoComprobante={pdfData.tipoComprobante}
          puntoVenta={pdfData.puntoVenta}
          numeroFactura={pdfData.numeroFactura}
          formaPago={pdfData.formaPago}
          clienteSeleccionado={pdfData.clienteSeleccionado}
          detalle={pdfData.detalle}
          totalFactura={pdfData.totalFactura}
          neto={pdfData.neto}
          iva={pdfData.iva}
          observaciones={pdfData.observaciones}
          cae={pdfData.cae}
          vencimientoCae={pdfData.vencimientoCae}
          numeroOrigen={pdfData.numeroOrigen}
        />
      )}
    </Box>
  );
}
