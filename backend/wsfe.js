import soap from "soap";
import { obtenerTokenSign } from "./wsaa.js";

const WSFE_URL = "https://wswhomo.afip.gov.ar/wsfev1/service.asmx?WSDL";

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const ejecutarConReintento = async (fn, intentos = 3, esperaMs = 1500) => {
  let ultimoError;

  for (let i = 1; i <= intentos; i++) {
    try {
      return await fn();
    } catch (error) {
      ultimoError = error;

      const codigo = error?.code || error?.cause?.code;
      const mensaje = error?.message || "";

      const esErrorConexion =
        codigo === "ECONNRESET" ||
        codigo === "ETIMEDOUT" ||
        codigo === "ECONNREFUSED" ||
        mensaje.includes("ECONNRESET");

      if (!esErrorConexion || i === intentos) {
        throw error;
      }

      console.log(`AFIP sin respuesta. Reintento ${i + 1}/${intentos}...`);
      await esperar(esperaMs);
    }
  }

  throw ultimoError;
};

export const obtenerUltimoComprobante = async ({
  cuit,
  puntoVenta,
  tipoComprobante,
}) => {
  const auth = await obtenerTokenSign(cuit);
  const client = await soap.createClientAsync(WSFE_URL);

  const [result] = await ejecutarConReintento(() =>
    client.FECompUltimoAutorizadoAsync({
      Auth: {
        Token: auth.token,
        Sign: auth.sign,
        Cuit: Number(cuit),
      },
      PtoVta: Number(puntoVenta),
      CbteTipo: Number(tipoComprobante),
    }),
  );

  return result.FECompUltimoAutorizadoResult;
};

export const autorizarFactura = async ({
  cuit,
  puntoVenta,
  total,
  neto = total,
  iva = 0,
  docTipo,
  docNro,
  tipoComprobante = "factura",
  letraComprobante = "C",
  condicionIVAReceptorId = 5,
  comprobanteAsociadoTipo,
  comprobanteAsociadoPtoVta,
  comprobanteAsociadoNumero,
}) => {
  let tipoComprobanteAfip;

  if (letraComprobante === "A") {
    tipoComprobanteAfip = tipoComprobante === "nota_de_credito" ? 3 : 1;
  } else if (letraComprobante === "B") {
    tipoComprobanteAfip = tipoComprobante === "nota_de_credito" ? 8 : 6;
  } else {
    tipoComprobanteAfip = tipoComprobante === "nota_de_credito" ? 13 : 11;
  }

  const condicionIVAReceptorIdFinal =
    letraComprobante === "A" ? 1 : Number(condicionIVAReceptorId);

  if (
    tipoComprobante === "nota_de_credito" &&
    !Number(comprobanteAsociadoNumero)
  ) {
    throw new Error(
      "Falta numero_origen válido para asociar la Nota de Crédito",
    );
  }

  const auth = await obtenerTokenSign(cuit);
  const client = await soap.createClientAsync(WSFE_URL);

  const ultimo = await obtenerUltimoComprobante({
    cuit,
    puntoVenta,
    tipoComprobante: tipoComprobanteAfip,
  });

  const proximoNumero = Number(ultimo.CbteNro || 0) + 1;
  const fecha = new Date().toISOString().slice(0, 10).replaceAll("-", "");

  const datosAsociados =
    tipoComprobante === "nota_de_credito"
      ? {
          CbtesAsoc: {
            CbteAsoc: {
              Tipo: Number(comprobanteAsociadoTipo || 11),
              PtoVta: Number(comprobanteAsociadoPtoVta || puntoVenta),
              Nro: Number(comprobanteAsociadoNumero),
            },
          },
        }
      : {};

  const esFacturaConIva = letraComprobante === "A" || letraComprobante === "B";

  const netoFinal = esFacturaConIva
    ? Number((Number(total) / 1.21).toFixed(2))
    : Number(total);

  const ivaFinal = esFacturaConIva
    ? Number((Number(total) - netoFinal).toFixed(2))
    : 0;

  const datosIva = esFacturaConIva
    ? {
        Iva: {
          AlicIva: {
            Id: 5,
            BaseImp: netoFinal,
            Importe: ivaFinal,
          },
        },
      }
    : {};

  console.log("ENVIANDO COMPROBANTE:", {
    CbteTipo: tipoComprobanteAfip,
    PtoVta: Number(puntoVenta),
    CbteDesde: proximoNumero,
    CbteHasta: proximoNumero,
  });

  const [result] = await ejecutarConReintento(() =>
    client.FECAESolicitarAsync({
      Auth: {
        Token: auth.token,
        Sign: auth.sign,
        Cuit: Number(cuit),
      },
      FeCAEReq: {
        FeCabReq: {
          CantReg: 1,
          PtoVta: Number(puntoVenta),
          CbteTipo: tipoComprobanteAfip,
        },
        FeDetReq: {
          FECAEDetRequest: {
            Concepto: 1,
            DocTipo: Number(docTipo || 99),
            DocNro: Number(docNro || 0),
            CbteDesde: proximoNumero,
            CbteHasta: proximoNumero,
            CbteFch: fecha,
            ImpTotal: Number(total),
            ImpTotConc: 0,
            ImpNeto: netoFinal,
            ImpOpEx: 0,
            ImpTrib: 0,
            ImpIVA: ivaFinal,
            MonId: "PES",
            MonCotiz: 1,
            CondicionIVAReceptorId: condicionIVAReceptorIdFinal,
            ...datosIva,
            ...datosAsociados,
          },
        },
      },
    }),
  );

  console.log("RESPUESTA AFIP:", JSON.stringify(result, null, 2));
  return result.FECAESolicitarResult;
};
