import { useRef, useEffect, useState, forwardRef } from "react";
import { supabase } from "../hook/supabaseClient";
import { obtenerEmpresa } from "../utils/obtenerEmpresa";
import QRCode from "qrcode";
import CircularProgress from "@mui/material/CircularProgress";
import {
  Grid,
  MenuItem,
  TextField,
  Button,
  Typography,
  Box,
  IconButton,
  Paper,
  Autocomplete,
} from "@mui/material";

import { DataGrid } from "@mui/x-data-grid";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import VisibilityIcon from "@mui/icons-material/Visibility";

import GenerarPdf from "../componentes/GenerarPdf";
import { generarpdfU } from "../utils/generarpdfu";
import ModalImagen from "../componentes/ModalImagen";
import { imprimirTicketFactura } from "../utils/imprimirTicketFactura";
import { API_URL } from "../config";
import Notificaciones from "./Notificaciones";

export default function Factura() {
  const [clientes, setClientes] = useState([]);
  const [articulos, setArticulos] = useState([]);

  const [clienteId, setClienteId] = useState("");
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);

  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [tipoComprobante, setTipoComprobante] = useState("factura");
  const [formaPago, setFormaPago] = useState("Contado");
  const [medioPago, setMedioPago] = useState("efectivo");
  const [observaciones, setObservaciones] = useState("");
  const [validezPresupuesto, setValidezPresupuesto] = useState(15);

  const [articuloId, setArticuloId] = useState("");
  const [articuloSeleccionado, setArticuloSeleccionado] = useState(null);
  const [inputArticulo, setInputArticulo] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [precio, setPrecio] = useState("");
  const [descuento, setDescuento] = useState(0);
  const [detalle, setDetalle] = useState([]);

  const [openFoto, setOpenFoto] = useState(false);
  const [fotoSeleccionada, setFotoSeleccionada] = useState("");

  const [numeroFactura, setNumeroFactura] = useState("");
  const [letraComprobante, setLetraComprobante] = useState("B");
  const [empresa, setEmpresa] = useState(null);
  const [pdfData, setPdfData] = useState(null);
  const [generarPdfPendiente, setGenerarPdfPendiente] = useState(false);
  const [condicionIva, setCondicionIva] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [idFacturaOrigen, setIdFacturaOrigen] = useState(null);
  const [numeroFacturaOrigen, setNumeroFacturaOrigen] = useState(null);
  const [idPresupuestoOrigen, setIdPresupuestoOrigen] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [tipo, setTipo] = useState("success");
  const [open, setOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    titulo: "",
    mensaje: "",
    textoConfirmar: "Aceptar",
    color: "primary",
    accion: null,
  });

  const [notificacion, setNotificacion] = useState({
    open: false,
    mensaje: "",
    tipo: "success",
  });
  const inputArticuloRef = useRef(null);
  const facturaPdfRef = useRef(null);
  const articuloRef = useRef(null);
  const cantidadRef = useRef(null);
  const precioRef = useRef(null);
  const descuentoRef = useRef(null);

  const drawerWidth = 200;
  const mostrarNotificacion = (mensaje, tipo = "success") => {
    setNotificacion({
      open: true,
      mensaje,
      tipo,
    });
  };
  useEffect(() => {
    const cargarEmpresa = async () => {
      try {
        const usuario = JSON.parse(localStorage.getItem("usuario"));

        if (!usuario?.id) return;

        const idEmpresa = await obtenerEmpresa(usuario.id);

        if (!idEmpresa) {
          console.error("No hay una empresa activa seleccionada");
          setEmpresa(null);
          return;
        }

        const { data, error } = await supabase
          .from("empresas")
          .select(
            `
        *,
        ciudades!empresas_idciudad_fkey(nombre)
      `,
          )
          .eq("id", idEmpresa)
          .maybeSingle();

        if (error) {
          throw error;
        }

        if (!data) {
          console.error("No se encontró la empresa activa");
          setEmpresa(null);
          return;
        }

        setEmpresa(data);
      } catch (error) {
        console.error("Error cargando empresa en factura:", error);
        setEmpresa(null);
      }
    };

    cargarEmpresa();

    cargarEmpresa();
  }, []);

  useEffect(() => {
    if (!generarPdfPendiente || !pdfData) return;
    const timer = setTimeout(async () => {
      try {
        if (pdfData.tipoImpresion === "comandera") {
          await imprimirTicketFactura(pdfData);
          setGenerarPdfPendiente(false);
          return;
        }

        if (!facturaPdfRef.current) {
          console.error("Todavía no está listo el PDF");
          return;
        }

        const nombreComprobante =
          pdfData.tipoComprobante === "nota_de_credito"
            ? "nota-credito"
            : "factura";

        generarpdfU(
          facturaPdfRef.current,
          `${nombreComprobante}-${String(pdfData.puntoVenta).padStart(
            4,
            "0",
          )}-${String(pdfData.numeroFactura).padStart(8, "0")}.pdf`,
        );

        setGenerarPdfPendiente(false);
      } catch (error) {
        console.error("Error al imprimir:", error);

        setMensaje("Error al imprimir el comprobante");
        setTipo("error");
        setOpen(true);

        setGenerarPdfPendiente(false);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [generarPdfPendiente, pdfData]);

  const obtenerLetraComprobante = (tipoComprobante, clienteSeleccionado) => {
    if (!empresa) return "B";

    const condicionEmpresa = empresa?.condicion_iva || empresa?.condicionIva;

    const condicionCliente =
      clienteSeleccionado?.condicion_iva?.descripcion ||
      clienteSeleccionado?.condicion_iva ||
      clienteSeleccionado?.condicionIva ||
      "";

    if (tipoComprobante === "remito" || tipoComprobante === "presupuesto") {
      return "X";
    }

    if (condicionEmpresa === "Monotributista") {
      return "C";
    }

    if (
      condicionEmpresa === "Responsable Inscripto" &&
      condicionCliente === "Responsable Inscripto"
    ) {
      return "A";
    }

    return "B";
  };
  useEffect(() => {
    if (!empresa || !clienteSeleccionado) return;

    const letra = obtenerLetraComprobante(tipoComprobante, clienteSeleccionado);
    setLetraComprobante(letra);
  }, [tipoComprobante, clienteSeleccionado, empresa]);

  const seleccionarArticulo = (articulo) => {
    if (!articulo) return;

    setArticuloId(articulo.id);
    setArticuloSeleccionado(articulo);
    setInputArticulo(articulo.descripcion || "");
    setPrecio(Number(articulo.precio) || 0);
    setCantidad(1);
  };

  const buscarPorCodigoODescripcion = (valor) => {
    const texto = String(valor || "")
      .trim()
      .toLowerCase();

    if (!texto) return null;

    const encontrado = articulos.find((a) => {
      const codigo = String(a.codigo || "")
        .trim()
        .toLowerCase();
      const descripcion = String(a.descripcion || "")
        .trim()
        .toLowerCase();

      return codigo === texto || descripcion.includes(texto);
    });

    return encontrado || null;
  };

  const obtenerUrlImagen = (path) => {
    if (!path) return "";
    const { data } = supabase.storage.from("articulos").getPublicUrl(path);
    return data?.publicUrl || "";
  };

  const abrirFoto = (foto) => {
    const url = obtenerUrlImagen(foto);
    setFotoSeleccionada(url);
    setOpenFoto(true);
  };

  const cerrarFoto = () => {
    setOpenFoto(false);
    setFotoSeleccionada("");
  };

  const cargarClientes = async () => {
    const usuarioGuardado = JSON.parse(localStorage.getItem("usuario"));
    const idEmpresa = await obtenerEmpresa(usuarioGuardado.id);

    if (!idEmpresa) {
      console.error("No hay una empresa activa seleccionada");
      return;
    }

    const { data, error } = await supabase
      .from("clientes")
      .select(
        `
      id,
      nombre,
      direccion,
      cuit,
      telefono,
      idciudad,
      ciudades:fk_clientes_ciudad(
        id,
        nombre
      ),
      condicion_iva:fk_clientes_civa(
        id,
        descripcion
      )
    `,
      )
      .eq("idempresa", idEmpresa)
      .order("nombre");

    if (error) {
      console.error("Error al cargar clientes:", error);
      return;
    }

    setClientes(data || []);
  };

  const cargarArticulos = async () => {
    const usuarioGuardado = JSON.parse(localStorage.getItem("usuario"));
    const idEmpresa = await obtenerEmpresa(usuarioGuardado.id);

    const { data, error } = await supabase
      .from("articulos")
      .select("*")
      .eq("idempresa", idEmpresa)
      .order("descripcion", { ascending: true });

    if (error) {
      console.error("Error al cargar artículos:", error);
      return;
    }

    setArticulos(data || []);
  };

  const manejarCliente = (id) => {
    setClienteId(id);

    const cli = clientes.find((c) => String(c.id) === String(id));
    setClienteSeleccionado(cli || null);
  };
  useEffect(() => {
    const notaOrigen = localStorage.getItem("notaCreditoOrigen");

    if (!notaOrigen) return;
    if (clientes.length === 0) return;

    const factura = JSON.parse(notaOrigen);

    setTipoComprobante("nota_de_credito");
    setIdFacturaOrigen(factura.id);
    manejarCliente(factura.idcliente);
    setNumeroFacturaOrigen(factura.numero_fiscal || factura.numero);

    const detalleNota = (factura.detalle_factura || []).map((item, index) => ({
      id: item.id || index + 1,
      idarticulo: item.idarticulo,
      articulo: item.articulos?.descripcion || item.descripcion || "",
      descripcion: item.articulos?.descripcion || item.descripcion || "",
      cantidad: item.cantidad,
      precio: item.precio,
      subtotal: item.subtotal,
    }));

    setDetalle(detalleNota);

    setObservaciones("");

    localStorage.removeItem("notaCreditoOrigen");
  }, [clientes]);

  useEffect(() => {
    const presupuestoGuardado = localStorage.getItem("presupuestoOrigen");

    if (!presupuestoGuardado) return;
    if (clientes.length === 0) return;

    const presupuesto = JSON.parse(presupuestoGuardado);

    setTipoComprobante("factura");
    setIdPresupuestoOrigen(presupuesto.id);

    manejarCliente(presupuesto.idcliente);

    setFormaPago(presupuesto.forma_pago || "Contado");

    setMedioPago(
      presupuesto.forma_pago === "Contado"
        ? presupuesto.medio_pago || "efectivo"
        : "",
    );

    setObservaciones(presupuesto.observaciones || "");

    const detallePresupuesto = (presupuesto.detalle_factura || []).map(
      (item, index) => {
        const descuentoItem = Number(
          item.descuento_porcentaje ?? item.descuento ?? 0,
        );

        return {
          id: item.id || index + 1,
          idarticulo: item.idarticulo,
          codigo: item.codigo || item.articulos?.codigo || "",
          articulo: item.articulos?.descripcion || item.descripcion || "",
          descripcion: item.articulos?.descripcion || item.descripcion || "",
          cantidad: Number(item.cantidad || 0),
          precio: Number(item.precio || 0),
          descuento: descuentoItem,
          descuento_porcentaje: descuentoItem,
          subtotal: Number(item.subtotal || 0),
        };
      },
    );

    setDetalle(detallePresupuesto);

    localStorage.removeItem("presupuestoOrigen");
  }, [clientes]);
  // CONTROL TEMPORAL
  useEffect(() => {
    console.log("ID presupuesto de origen actual:", idPresupuestoOrigen);
  }, [idPresupuestoOrigen]);

  const agregarDetalle = () => {
    const art =
      articuloSeleccionado || articulos.find((a) => a.id === articuloId);

    if (!art) {
      //mostrarNotificacion("Seleccione un artículo", "warning");
      return;
    }

    if (Number(cantidad) <= 0) {
      //mostrarNotificacion("Ingrese una cantidad válida", "warning");
      return;
    }

    const permiteDescuento =
      tipoComprobante === "factura" || tipoComprobante === "presupuesto";

    const bruto = Number(cantidad) * Number(precio);

    const descuentoAplicado = permiteDescuento ? Number(descuento) || 0 : 0;
    if (descuentoAplicado < 0 || descuentoAplicado > 100) {
      //mostrarNotificacion("El descuento debe estar entre 0% y 100%", "warning");
      return;
    }

    const subtotalConDescuento = bruto - (bruto * descuentoAplicado) / 100;

    const nuevoItem = {
      id: Date.now(),
      idarticulo: art.id,
      articulo: art.descripcion,
      descripcion: art.descripcion,
      cantidad: Number(cantidad),
      precio: Number(precio),
      descuento_porcentaje: descuentoAplicado,
      subtotal: subtotalConDescuento,
      imagen_url: art.imagen_url || "",
      codigo: art.codigo || "",
    };

    setDetalle((prev) => [...prev, nuevoItem]);

    setArticuloId("");
    setArticuloSeleccionado(null);
    setInputArticulo("");
    setCantidad(1);
    setPrecio("");
    setDescuento(0);

    setTimeout(() => {
      inputArticuloRef.current?.focus();
    }, 0);
  };

  const eliminarDetalle = (id) => {
    setDetalle((prev) => prev.filter((item) => item.id !== id));
  };

  const totalFactura = detalle.reduce(
    (acc, item) => acc + Number(item.subtotal || 0),
    0,
  );

  const limpiarFormulario = () => {
    setClienteId("");
    setClienteSeleccionado(null);
    setFecha(new Date().toISOString().slice(0, 10));
    setTipoComprobante("factura");
    setFormaPago("Contado");
    setMedioPago("efectivo");
    setObservaciones("");
    setArticuloId("");
    setArticuloSeleccionado(null);
    setInputArticulo("");
    setCantidad(1);
    setPrecio("");
    setDescuento(0);
    setNumeroFacturaOrigen(null);
    setDetalle([]);
    setIdFacturaOrigen(null);
    setIdPresupuestoOrigen(null);
  };

  const guardarFactura = async () => {
    if (guardando) return;
    setGuardando(true);
    try {
      if (!clienteId) {
        mostrarNotificacion("Seleccione un cliente", "warning");
        return;
      }

      if (detalle.length === 0) {
        mostrarNotificacion("Agregue al menos un artículo", "warning");
        return;
      }

      const totalCalc = detalle.reduce(
        (acc, item) => acc + Number(item.subtotal || 0),
        0,
      );

      const usuarioGuardado = JSON.parse(localStorage.getItem("usuario"));
      const idEmpresa = await obtenerEmpresa(usuarioGuardado.id);

      const { data: empresa } = await supabase
        .from("empresas")
        .select("proximo_remito, proximo_presupuesto")
        .eq("id", idEmpresa)
        .single();

      const numeroRemito = empresa.proximo_remito;
      const numeroPresupuesto = Number(empresa?.proximo_presupuesto || 1);
      const numeroComprobante =
        tipoComprobante === "presupuesto" ? numeroPresupuesto : numeroRemito;
      if (
        tipoComprobante === "presupuesto" &&
        (!validezPresupuesto || Number(validezPresupuesto) < 1)
      ) {
        alert("Ingresá la cantidad de días de validez del presupuesto.");
        return;
      }
      const facturaNueva = {
        fecha,
        idcliente: clienteId,
        tipo_comprobante: tipoComprobante,
        letra_comprobante: obtenerLetraComprobante(
          tipoComprobante,
          clienteSeleccionado,
        ),
        forma_pago: formaPago,
        medio_pago: formaPago === "Contado" ? medioPago : null,
        observaciones: observaciones || "",
        validez_dias:
          tipoComprobante === "presupuesto" ? Number(validezPresupuesto) : null,
        subtotal: totalCalc,
        total: totalCalc,
        saldo: formaPago === "Cuenta corriente" ? totalCalc : 0,
        estado_pago: formaPago === "Cuenta corriente" ? "pendiente" : "pagada",
        idempresa: idEmpresa,
        numero: numeroComprobante,
        idusuario: usuarioGuardado.id,

        idfactura_origen:
          tipoComprobante === "nota_de_credito" ? idFacturaOrigen : null,

        numero_origen:
          tipoComprobante === "nota_de_credito" ? numeroFacturaOrigen : null,

        idpresupuesto_origen:
          tipoComprobante === "factura" ? idPresupuestoOrigen : null,

        estado_presupuesto:
          tipoComprobante === "presupuesto" ? "pendiente" : null,
      };
      console.log("Factura nueva antes de guardar:", facturaNueva);

      const { data, error } = await supabase
        .from("facturas")
        .insert([facturaNueva])
        .select()
        .single();

      if (error) {
        console.error("Error al guardar factura:", error);
        mostrarNotificacion("Error al guardar la factura", "error");
        return;
      }

      const facturaId = data.id;

      if (tipoComprobante === "presupuesto") {
        const siguientePresupuesto = Number(numeroPresupuesto) + 1;

        const { data: empresaActualizada, error: errorPresupuesto } =
          await supabase
            .from("empresas")
            .update({
              proximo_presupuesto: siguientePresupuesto,
            })
            .eq("id", idEmpresa)
            .select();

        console.log("empresaActualizada:", empresaActualizada);
        console.log("errorPresupuesto:", errorPresupuesto);

        if (errorPresupuesto) {
          console.error(
            "Error al actualizar próximo presupuesto:",
            errorPresupuesto,
          );
        } else {
          setEmpresa((prev) => ({
            ...prev,
            proximo_presupuesto: siguientePresupuesto,
          }));
        }
      }

      const numeroGenerado = data.numero;

      const detalleInsert = detalle.map((item) => ({
        idfactura: facturaId,
        idarticulo: item.idarticulo,
        codigo: item.codigo,
        descripcion: item.descripcion || item.articulo || "",
        cantidad: Number(item.cantidad),
        precio: Number(item.precio),
        descuento_porcentaje: Number(item.descuento_porcentaje) || 0,
        subtotal: Number(item.subtotal),
        idempresa: idEmpresa,
      }));
      const { error: errorDetalle } = await supabase
        .from("detalle_factura")
        .insert(detalleInsert)
        .select();

      if (errorDetalle) {
        console.error("Error al guardar el detalle:", errorDetalle);
        alert(`Error al guardar el detalle: ${errorDetalle.message}`);
        return;
      }
      if (tipoComprobante === "presupuesto") {
        const { data: empresaCompleta, error: errorEmpresa } = await supabase
          .from("empresas")
          .select(
            `
      *,
      ciudades!empresas_idciudad_fkey(nombre)
    `,
          )
          .eq("id", idEmpresa)
          .single();

        if (errorEmpresa) {
          console.error("Error cargando empresa completa:", errorEmpresa);
        }

        const datosPdfPresupuesto = {
          empresa: {
            ...empresaCompleta,
            localidad: empresaCompleta?.ciudades?.nombre || "-",
          },
          tipoImpresion: empresaCompleta?.tipo_impresion || "laser",

          // Número independiente del presupuesto
          numeroFactura: numeroPresupuesto,

          fecha,
          tipoComprobante,
          letraComprobante: "",
          formaPago,
          clienteSeleccionado,
          detalle,
          totalFactura: totalCalc,
          observaciones,
          validezDias: Number(validezPresupuesto) || 15,

          // Un presupuesto no tiene datos fiscales
          puntoVenta: null,
          cae: null,
          vencimientoCae: null,
          numeroOrigen: null,
        };

        setNumeroFactura(numeroPresupuesto);
        setPdfData(datosPdfPresupuesto);
        setGenerarPdfPendiente(true);
        limpiarFormulario();

        return;
      }

      //Factura Electronica
      const responseFiscal = await fetch(`${API_URL}/api/fiscal/autorizar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          idFactura: facturaId,
        }),
      });

      const respuestaFiscal = await responseFiscal.json();

      if (!respuestaFiscal.ok) {
        alert(
          respuestaFiscal.mensaje || respuestaFiscal.error || "Error fiscal",
        );
        return;
      }

      const letraFiscal = respuestaFiscal.factura.letra_comprobante;

      const esConIva = letraFiscal === "A" || letraFiscal === "B";

      const neto = esConIva ? Number((totalCalc / 1.21).toFixed(2)) : totalCalc;

      const iva = esConIva ? Number((totalCalc - neto).toFixed(2)) : 0;

      const empresaPdf = empresa || respuestaFiscal.factura.empresas;

      const { data: empresaCompleta, error: errorEmpresa } = await supabase
        .from("empresas")
        .select(
          `
    *,
    ciudades!empresas_idciudad_fkey(nombre)
  `,
        )
        .eq("id", idEmpresa)
        .single();

      if (errorEmpresa) {
        console.error("Error cargando empresa completa:", errorEmpresa);
      }
      const datosPdfFiscal = {
        empresa: {
          ...empresaCompleta,
          localidad: empresaCompleta?.ciudades?.nombre || "-",
        },
        tipoImpresion: empresaCompleta?.tipo_impresion || "laser",
        numeroFactura: respuestaFiscal.afip.numeroFiscal,
        fecha: respuestaFiscal.factura.fecha,
        tipoComprobante: respuestaFiscal.factura.tipo_comprobante,
        letraComprobante:
          empresaCompleta?.condicion_iva === "Monotributista"
            ? "C"
            : respuestaFiscal.factura.letra_comprobante,
        formaPago: respuestaFiscal.factura.forma_pago,
        clienteSeleccionado,
        detalle,
        totalFactura: totalCalc,
        neto,
        iva,
        observaciones,
        puntoVenta: respuestaFiscal.afip.puntoVenta,
        cae: respuestaFiscal.afip.cae,
        vencimientoCae: respuestaFiscal.afip.caeVto,
        numeroOrigen: numeroFacturaOrigen,
      };

      setPdfData(datosPdfFiscal);
      setGenerarPdfPendiente(true);

      await supabase
        .from("empresas")
        .update({
          proximo_remito: numeroRemito + 1,
        })
        .eq("id", idEmpresa);

      // Movimiento de stock
      if (
        tipoComprobante === "factura" ||
        tipoComprobante === "remito" ||
        tipoComprobante === "nota_de_credito"
      ) {
        const itemsStock = detalle.map((item) => ({
          idarticulo: item.idarticulo,
          cantidad: Number(item.cantidad),
        }));

        const usuarioGuardado = JSON.parse(localStorage.getItem("usuario"));
        const idEmpresa = await obtenerEmpresa(usuarioGuardado.id);

        const funcionStock =
          tipoComprobante === "nota_de_credito"
            ? "devolver_stock_multiple"
            : "descontar_stock_multiple";

        const { error: errorStock } = await supabase.rpc(funcionStock, {
          items: itemsStock,
          p_idempresa: idEmpresa,
        });

        if (errorStock) {
          mostrarNotificacion("Error al actualizar el stock", "error");
          return;
        }
      }

      // Si la factura proviene de un presupuesto,
      // lo marcamos como facturado.
      const idPresupuestoParaActualizar =
        data?.idpresupuesto_origen || idPresupuestoOrigen;

      console.log(
        "Presupuesto que se marcará como facturado:",
        idPresupuestoParaActualizar,
      );

      if (idPresupuestoParaActualizar) {
        const { data: presupuestoActualizado, error: errorPresupuesto } =
          await supabase
            .from("facturas")
            .update({
              estado_presupuesto: "facturado",
            })
            .eq("id", idPresupuestoParaActualizar)
            .select("id, estado_presupuesto")
            .single();

        console.log("Presupuesto actualizado:", presupuestoActualizado);

        if (errorPresupuesto) {
          console.error(
            "La factura se generó, pero no se pudo marcar el presupuesto:",
            errorPresupuesto,
          );

          mostrarNotificacion(
            "La factura se generó, pero no se pudo actualizar el presupuesto",
            "warning",
          );
        }
      }

      setNumeroFactura(numeroGenerado);

      const datosPdfRemito = {
        numeroFactura: respuestaFiscal.afip.numeroFiscal,
        fecha,
        tipoComprobante,
        letraComprobante: "C",
        formaPago,
        clienteSeleccionado,
        detalle,
        totalFactura: totalCalc,
        observaciones,
        puntoVenta: respuestaFiscal.afip.puntoVenta,
        cae: respuestaFiscal.afip.cae,
        vencimientoCae: respuestaFiscal.afip.caeVto,
      };
      limpiarFormulario();
    } catch (error) {
      console.error(error);
      mostrarNotificacion(
        error.message || "Ocurrió un error inesperado",
        "error",
      );
    } finally {
      setGuardando(false);
    }
  };

  useEffect(() => {
    const cargarEmpresa = async () => {
      const data = await obtenerEmpresa();
      setEmpresa(data);
    };

    cargarEmpresa();
  }, []);

  useEffect(() => {
    cargarClientes();
    cargarArticulos();
  }, []);

  useEffect(() => {
    const cargarEmpresa = async () => {
      const data = await obtenerEmpresa();
      setEmpresa(data);
    };
    cargarEmpresa();
  }, []);

  const columnasDetalle = [
    { field: "articulo", headerName: "Artículo", flex: 5 },
    {
      field: "cantidad",
      headerName: "Cantidad",
      flex: 1.5,
      align: "right",
      headerAlign: "right",
    },
    {
      field: "precio",
      headerName: "Precio",
      flex: 2,
      align: "right",
      headerAlign: "right",
      renderCell: (params) =>
        `$ ${new Intl.NumberFormat("es-AR").format(
          Number(params.row.precio) || 0,
        )}`,
    },

    {
      field: "descuento",
      headerName: "Descuento",
      flex: 1.7,
      align: "right",
      headerAlign: "right",
      sortable: false,
      renderCell: (params) => {
        const porcentaje = Number(params.row.descuento_porcentaje) || 0;

        const bruto =
          Number(params.row.cantidad || 0) * Number(params.row.precio || 0);

        const importe = bruto * (porcentaje / 100);

        return `${porcentaje}% / $ ${new Intl.NumberFormat("es-AR").format(
          importe,
        )}`;
      },
    },

    {
      field: "subtotal",
      headerName: "Subtotal",
      flex: 2,
      align: "right",
      headerAlign: "right",
      renderCell: (params) =>
        `$ ${new Intl.NumberFormat("es-AR").format(
          Number(params.row.subtotal) || 0,
        )}`,
    },
    {
      field: "acciones",
      headerName: "Acciones",
      flex: 1.5,
      sortable: false,
      filterable: false,
      align: "center",
      renderCell: (params) => (
        <Box sx={{ display: "flex", gap: 0.5 }}>
          <IconButton
            size="small"
            color="primary"
            onClick={() => abrirFoto(params.row.imagen_url)}
          >
            <VisibilityIcon fontSize="small" />
          </IconButton>

          <IconButton
            color="error"
            onClick={() => eliminarDetalle(params.row.id)}
          >
            <DeleteIcon />
          </IconButton>
        </Box>
      ),
    },
  ];
  const elegirArticulo = (articulo) => {
    if (!articulo) return;

    seleccionarArticulo(articulo);

    setTimeout(() => {
      cantidadRef.current?.focus();
      cantidadRef.current?.select();
    }, 100);
  };

  return (
    <Box
      sx={{
        p: 1,
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          borderRadius: 2,
          mb: 2,
          flexShrink: 0,
        }}
      >
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Autocomplete
              size="small"
              options={clientes}
              value={
                clientes.find((c) => String(c.id) === String(clienteId)) || null
              }
              getOptionLabel={(option) => option?.nombre || ""}
              isOptionEqualToValue={(option, value) =>
                String(option.id) === String(value.id)
              }
              filterOptions={(options, { inputValue }) => {
                const texto = inputValue.toLowerCase().trim();
                const textoSinGuiones = texto.replace(/-/g, "");

                return options.filter((c) => {
                  const nombre = (c.nombre || "").toLowerCase();
                  const cuit = (c.cuit || "").toLowerCase();
                  const cuitSinGuiones = cuit.replace(/-/g, "");

                  return (
                    nombre.includes(texto) ||
                    cuit.includes(texto) ||
                    cuitSinGuiones.includes(textoSinGuiones)
                  );
                });
              }}
              onChange={(event, nuevoCliente) => {
                manejarCliente(nuevoCliente?.id ? String(nuevoCliente.id) : "");

                setTimeout(() => {
                  inputArticuloRef.current?.focus();
                }, 100);
              }}
              slotProps={{
                paper: {
                  sx: {
                    "& .MuiAutocomplete-option": {
                      minHeight: 36,
                      py: 0.4,
                      fontSize: 13,
                    },
                  },
                },
              }}
              renderOption={(props, option) => (
                <li {...props} key={option.id}>
                  <Box>
                    <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                      {option.nombre}
                    </Typography>
                    <Typography sx={{ fontSize: 11, color: "text.secondary" }}>
                      CUIT: {option.cuit || "-"}
                    </Typography>
                  </Box>
                </li>
              )}
              renderInput={(params) => (
                <TextField {...params} label="Cliente" fullWidth />
              )}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 2 }}>
            <TextField
              select
              label="Forma de pago"
              fullWidth
              size="small"
              value={formaPago}
              onChange={(e) => setFormaPago(e.target.value)}
            >
              <MenuItem value="Contado">Contado</MenuItem>
              <MenuItem value="Cuenta corriente">Cuenta corriente</MenuItem>
            </TextField>
          </Grid>

          <Grid size={{ xs: 12, md: 2 }}>
            <TextField
              select
              label="Medio de pago"
              fullWidth
              size="small"
              value={medioPago}
              onChange={(e) => setMedioPago(e.target.value)}
              disabled={formaPago !== "Contado"}
            >
              <MenuItem value="efectivo">Efectivo</MenuItem>
              <MenuItem value="debito">Débito</MenuItem>
              <MenuItem value="credito">Crédito</MenuItem>
              <MenuItem value="transferencia">Transferencia</MenuItem>
            </TextField>
          </Grid>

          <Grid size={{ xs: 12, md: 2 }}>
            <TextField
              select
              label="Comprobante"
              fullWidth
              size="small"
              value={tipoComprobante}
              onChange={(e) => setTipoComprobante(e.target.value)}
            >
              <MenuItem value="factura">Factura</MenuItem>
              <MenuItem value="nota_de_credito">Nota de crédito</MenuItem>
              <MenuItem value="presupuesto">Presupuesto</MenuItem>
            </TextField>
          </Grid>
          {tipoComprobante === "presupuesto" && (
            <Grid size={{ xs: 12, md: 2 }}>
              <TextField
                label="Validez (días)"
                type="number"
                fullWidth
                size="small"
                value={validezPresupuesto}
                onChange={(e) => {
                  const valor = e.target.value;

                  if (valor === "") {
                    setValidezPresupuesto("");
                    return;
                  }

                  setValidezPresupuesto(Math.max(1, Number(valor)));
                }}
                slotProps={{
                  htmlInput: {
                    min: 1,
                    max: 365,
                  },
                }}
              />
            </Grid>
          )}

          <Grid size={{ xs: 12 }}>
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: 2,
                backgroundColor: "#fafafa",
              }}
            >
              <Grid container spacing={1}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Typography variant="body2">
                    <strong>Dirección:</strong>{" "}
                    {clienteSeleccionado?.direccion || "-"}
                  </Typography>
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                  <Typography variant="body2">
                    <strong>
                      Ciudad: {clienteSeleccionado?.ciudades.nombre || "-"}
                    </strong>{" "}
                  </Typography>
                </Grid>
                <Typography variant="body2">
                  Condición IVA:{" "}
                  {clienteSeleccionado?.condicion_iva?.descripcion || "-"}
                </Typography>

                <Grid size={{ xs: 12, md: 4 }}>
                  <Typography variant="body2">
                    <strong>CUIT:</strong> {clienteSeleccionado?.cuit || "-"}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      </Paper>

      <Paper
        variant="outlined"
        sx={{
          flex: 1,
          minHeight: 0,
          borderRadius: 2,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          pb: "110px",
        }}
      >
        <Box
          sx={{
            p: 2,
            flexShrink: 0,
            borderBottom: "1px solid #e0e0e0",
            backgroundColor: "#fafafa",
          }}
        >
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 4.5 }}>
              <Autocomplete
                options={articulos || []}
                size="small"
                fullWidth
                value={articuloSeleccionado}
                inputValue={inputArticulo}
                onInputChange={(event, newInputValue) => {
                  setInputArticulo(newInputValue);
                }}
                onChange={(event, newValue) => {
                  elegirArticulo(newValue);
                }}
                getOptionLabel={(option) =>
                  option
                    ? `${option.codigo || ""} - ${option.descripcion || ""}`
                    : ""
                }
                isOptionEqualToValue={(option, value) => option.id === value.id}
                filterOptions={(options, state) => {
                  const texto = state.inputValue.toLowerCase().trim();

                  return options.filter((option) => {
                    const codigo = String(option.codigo || "").toLowerCase();
                    const descripcion = String(
                      option.descripcion || "",
                    ).toLowerCase();

                    return (
                      codigo.includes(texto) || descripcion.includes(texto)
                    );
                  });
                }}
                renderOption={(props, option) => (
                  <li {...props} key={option.id}>
                    {option.codigo} - {option.descripcion}
                  </li>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    inputRef={inputArticuloRef}
                    label="Artículo o código de barras"
                    fullWidth
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();

                        const texto = inputArticulo.trim();
                        if (!texto) return;

                        const articulo = buscarPorCodigoODescripcion(texto);

                        if (articulo) {
                          elegirArticulo(articulo);
                        } else {
                          mostrarNotificacion(
                            "Artículo no encontrado",
                            "warning",
                          );
                        }
                      }
                    }}
                  />
                )}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 4, md: 1.25 }}>
              <TextField
                label="Cantidad"
                type="number"
                fullWidth
                size="small"
                value={cantidad}
                inputRef={cantidadRef}
                onChange={(e) => setCantidad(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    precioRef.current?.focus();
                  }
                }}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 4, md: 1.75 }}>
              <TextField
                label="Precio"
                type="number"
                fullWidth
                size="small"
                value={precio}
                inputRef={precioRef}
                onChange={(e) => setPrecio(e.target.value)}
                onFocus={(e) => e.target.select()}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();

                    if (
                      tipoComprobante === "factura" ||
                      tipoComprobante === "presupuesto"
                    ) {
                      descuentoRef.current?.focus();
                    } else {
                      agregarDetalle();
                    }
                  }
                }}
              />
            </Grid>
            {(tipoComprobante === "factura" ||
              tipoComprobante === "presupuesto") && (
              <Grid size={{ xs: 12, sm: 4, md: 1.25 }}>
                <TextField
                  label="Desc. %"
                  type="number"
                  fullWidth
                  size="small"
                  value={descuento}
                  inputRef={descuentoRef}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setDescuento(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      agregarDetalle();
                    }
                  }}
                  inputProps={{
                    min: 0,
                    max: 100,
                    step: 1,
                  }}
                />
              </Grid>
            )}

            <Grid
              size={{
                xs: 12,
                sm: 4,
                md:
                  tipoComprobante === "factura" ||
                  tipoComprobante === "presupuesto"
                    ? 1.5
                    : 2,
              }}
            >
              <TextField
                label="Subtotal"
                fullWidth
                size="small"
                value={new Intl.NumberFormat("es-AR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }).format(
                  Number(cantidad || 0) *
                    Number(precio || 0) *
                    (1 -
                      (tipoComprobante === "factura" ||
                      tipoComprobante === "presupuesto"
                        ? Number(descuento || 0)
                        : 0) /
                        100),
                )}
                InputProps={{ readOnly: true }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 1.5 }}>
              <Button
                fullWidth
                variant="contained"
                onClick={agregarDetalle}
                sx={{ height: 40 }}
              >
                Agregar
              </Button>
            </Grid>
          </Grid>
        </Box>

        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            px: 2,
            pb: 2,
          }}
        >
          <DataGrid
            rows={detalle}
            columns={columnasDetalle}
            hideFooter
            disableRowSelectionOnClick
            rowHeight={44}
            sx={{
              height: "100%",
              border: 0,
              "& .MuiDataGrid-columnHeaders": {
                backgroundColor: "#f5f5f5",
                fontWeight: 600,
                minHeight: "40px !important",
                maxHeight: "40px !important",
              },
              "& .MuiDataGrid-cell": {
                display: "flex",
                alignItems: "center",
              },
            }}
            localeText={{ noRowsLabel: "No hay artículos cargados" }}
          />

          <ModalImagen
            open={openFoto}
            onClose={cerrarFoto}
            imagen={fotoSeleccionada}
          />
        </Box>
      </Paper>

      <Paper
        variant="outlined"
        sx={{
          position: "fixed",
          bottom: 0,
          left: { xs: 0, md: `${drawerWidth}px` },
          width: { xs: "100%", md: `calc(100% - ${drawerWidth}px)` },
          bgcolor: "background.paper",
          borderTop: "1px solid #ddd",
          borderRadius: 0,
          p: 2,
          minHeight: "90px",
          zIndex: 1000,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            flexWrap: "wrap",
          }}
        >
          <Box sx={{ flex: 1, minWidth: 260 }}>
            <TextField
              label="Observaciones"
              fullWidth
              multiline
              rows={2}
              size="small"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Opcional"
            />
          </Box>

          <Box sx={{ display: "flex", justifyContent: "center" }}>
            <Button
              variant="contained"
              color="success"
              disabled={guardando}
              startIcon={
                guardando ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  <SaveIcon />
                )
              }
              onClick={guardarFactura}
            >
              {guardando ? "Guardando..." : "GUARDAR"}
            </Button>
          </Box>

          <Box sx={{ minWidth: 180, textAlign: "right" }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Total: ${new Intl.NumberFormat("es-AR").format(totalFactura)}
            </Typography>
          </Box>
        </Box>
      </Paper>

      {pdfData && (
        <GenerarPdf
          ref={facturaPdfRef}
          empresa={pdfData.empresa}
          numeroFactura={pdfData.numeroFactura}
          fecha={pdfData.fecha}
          tipoComprobante={pdfData.tipoComprobante}
          letraComprobante={pdfData.letraComprobante}
          formaPago={pdfData.formaPago}
          clienteSeleccionado={pdfData.clienteSeleccionado}
          detalle={pdfData.detalle}
          totalFactura={pdfData.totalFactura}
          neto={pdfData.neto}
          iva={pdfData.iva}
          observaciones={pdfData.observaciones}
          validezDias={pdfData.validezDias}
          puntoVenta={pdfData.puntoVenta}
          cae={pdfData.cae}
          vencimientoCae={pdfData.vencimientoCae}
          numeroOrigen={pdfData.numeroOrigen}
        />
      )}
      <Notificaciones
        open={notificacion.open}
        mensaje={notificacion.mensaje}
        tipo={notificacion.tipo}
        onClose={() =>
          setNotificacion((prev) => ({
            ...prev,
            open: false,
          }))
        }
      />
    </Box>
  );
}
