import fs from "fs";
import forge from "node-forge";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { obtenerTokenSign } from "./wsaa.js";
import { obtenerUltimoComprobante, autorizarFactura } from "./wsfe.js";
import soap from "soap";

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const app = express();

app.use(cors());
app.use(express.json());

const prepararFacturaFiscal = (factura) => {
  const empresa = factura.empresas;
  const cliente = factura.clientes;
  const detalle = factura.detalle_factura || [];

  return {
    empresa: {
      cuit: empresa.cuit,
      razonSocial: empresa.razon_social,
      puntoVenta: empresa.punto_venta,
      condicionIva: empresa.condicion_iva,
    },

    cliente: {
      nombre: cliente.nombre,
      cuit: cliente.cuit,
      condicionIva: cliente.idciva,
    },
    comprobante: {
      idFactura: factura.id,
      tipo_comprobante: factura.tipo_comprobante,

      idfactura_origen: factura.idfactura_origen,
      numero_origen: factura.numero_origen,

      letra:
        empresa.condicion_iva === "Responsable Monotributo"
          ? "C"
          : factura.letra_comprobante,

      fecha: factura.fecha,
      total: Number(factura.total || 0),
      subtotal: Number(factura.subtotal || 0),
    },

    detalle: detalle.map((item) => ({
      codigo: item.codigo || "",
      descripcion: item.descripcion || "",
      cantidad: Number(item.cantidad || 0),
      precio: Number(item.precio || 0),
      subtotal: Number(item.subtotal || 0),
    })),
  };
};

app.get("/", (req, res) => {
  res.send("Backend fiscal funcionando");
});

app.get("/api/fiscal/token", async (req, res) => {
  try {
    const auth = await obtenerTokenSign();

    res.json({
      ok: true,
      auth,
    });
  } catch (error) {
    console.log("Error WSAA:", error);

    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});
app.get("/api/fiscal/ultimo", async (req, res) => {
  try {
    const resultado = await obtenerUltimoComprobante({
      cuit: process.env.AFIP_CUIT,
      puntoVenta: process.env.AFIP_PTO_VTA,
      tipoComprobante: process.env.AFIP_CBTE_TIPO,
    });

    res.json({
      ok: true,
      resultado,
    });
  } catch (error) {
    console.log("Error WSFE:", error);

    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

app.post("/api/fiscal/autorizar", async (req, res) => {
  try {
     console.log("VERSION BACKEND NUEVA - 21/06/2026");
    const { idFactura } = req.body;

    const { data, error } = await supabase
      .from("facturas")
      .select(
        `
        *,
        empresas!facturas_idempresa_fkey(
        id,
        razon_social,
        cuit,
        punto_venta,
        condicion_iva
        ),
        clientes!fk_facturas_cliente(*),
        detalle_factura(*)
      `,
      )
      .eq("id", idFactura)
      .single();

    if (error) {
      return res.status(400).json({
        ok: false,
        error: error.message,
      });
    }

    if (data.estado_fiscal === "autorizada" && data.cae) {
      return res.json({
        ok: true,
        mensaje: "Factura ya autorizada",
        afip: {
          cae: data.cae,
          caeVto: data.cae_vencimiento,
          numeroFiscal: data.numero_fiscal,
          puntoVenta: data.punto_venta,
        },
        factura: data,
      });
    }

    const fiscal = prepararFacturaFiscal(data);

    const cuitEmpresa = String(fiscal.empresa.cuit).replace(/\D/g, "");
    const puntoVenta = fiscal.empresa.puntoVenta;
    const total = fiscal.comprobante.total;

    const cuitCliente = fiscal.cliente.cuit
      ? String(fiscal.cliente.cuit).replace(/\D/g, "")
      : "";

    let docTipo = 99;
    let docNro = 0;

    if (fiscal.comprobante.letra === "A" || fiscal.comprobante.letra === "B") {
      if (cuitCliente && cuitCliente.length === 11) {
        docTipo = 80; // CUIT
        docNro = Number(cuitCliente);
      }
    }

    console.log("Datos para AFIP:", {
      cuitEmpresa,
      puntoVenta,
      total,
      docTipo,
      docNro,
      tipoComprobante: fiscal.comprobante.tipo_comprobante,
    });
    console.log("CONDICION IVA:", fiscal.empresa.condicionIva);
    console.log("LETRA:", fiscal.comprobante.letra);
    console.log("TIPO:", fiscal.comprobante.tipo_comprobante);

    const resultadoAfip = await autorizarFactura({
      cuit: cuitEmpresa,
      puntoVenta,
      total,
      docTipo,
      docNro,
      tipoComprobante: fiscal.comprobante.tipo_comprobante,
      letraComprobante: fiscal.comprobante.letra,
      comprobanteAsociadoTipo:
        fiscal.comprobante.letra === "A"
          ? 1
          : fiscal.comprobante.letra === "B"
            ? 6
            : 11,
      comprobanteAsociadoPtoVta: puntoVenta,
      comprobanteAsociadoNumero: fiscal.comprobante.numero_origen,
    });

    const detalleAfip = resultadoAfip?.FeDetResp?.FECAEDetResponse?.[0];

    const tipoComprobante = fiscal.comprobante.tipo_comprobante;
    const letraComprobante = fiscal.comprobante.letra;

    if (!detalleAfip || detalleAfip.Resultado !== "A") {
      const obs = detalleAfip?.Observaciones?.Obs || [];

      const primerError = Array.isArray(obs) ? obs[0] : obs;

      const afipErrorCode = primerError?.Code ? String(primerError.Code) : "";
      const afipErrorMsg = primerError?.Msg || "AFIP rechazó el comprobante";

      await supabase
        .from("facturas")
        .update({
          estado_fiscal: "rechazada",
          afip_error_code: afipErrorCode,
          afip_error_msg: afipErrorMsg,
        })
        .eq("id", idFactura);

      return res.status(400).json({
        ok: false,
        mensaje: "AFIP rechazó la factura",
        errorAfip: {
          code: afipErrorCode,
          msg: afipErrorMsg,
        },
        resultadoAfip,
      });
    }

    const cae = detalleAfip.CAE;
    const caeVto = detalleAfip.CAEFchVto;
    const numeroFiscal = detalleAfip.CbteDesde;

    const { error: updateError } = await supabase
      .from("facturas")
      .update({
        cae,
        cae_vencimiento: caeVto,
        numero_fiscal: numeroFiscal,
        punto_venta: puntoVenta,
        estado_fiscal: "autorizada",
        letra_comprobante: fiscal.comprobante.letra,
      })
      .eq("id", idFactura);

    if (updateError) {
      return res.status(400).json({
        ok: false,
        error: updateError.message,
        resultadoAfip,
      });
    }

    res.json({
      ok: true,
      mensaje: "Factura fiscal autorizada",
      factura: data,
      fiscal,
      afip: {
        cae,
        caeVto,
        numeroFiscal,
        puntoVenta,
        resultadoAfip,
      },
    });
  } catch (err) {
    console.log("Error backend:", err);

    res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
});

app.get("/api/fiscal/condiciones-iva", async (req, res) => {
  try {
    const auth = await obtenerTokenSign();
    const client = await soap.createClientAsync(
      "https://wswhomo.afip.gov.ar/wsfev1/service.asmx?WSDL",
    );

    const [result] = await client.FEParamGetCondicionIvaReceptorAsync({
      Auth: {
        Token: auth.token,
        Sign: auth.sign,
        Cuit: Number(process.env.AFIP_CUIT),
      },
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});
app.get("/api/fiscal/certificado/estado", (req, res) => {
  try {
    const certPath = "./certificados/empresa-prueba/certificado.crt";

    const certPem = fs.readFileSync(certPath, "utf8");
    const cert = forge.pki.certificateFromPem(certPem);

    const vence = cert.validity.notAfter;
    const hoy = new Date();

    const diasRestantes = Math.ceil(
      (vence.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24),
    );

    let estado = "vigente";

    if (diasRestantes <= 0) {
      estado = "vencido";
    } else if (diasRestantes <= 30) {
      estado = "por_vencer";
    }

    res.json({
      ok: true,
      estado,
      vence,
      diasRestantes,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

app.listen(3001, () => {
  console.log("Servidor backend en http://localhost:3001");
});
