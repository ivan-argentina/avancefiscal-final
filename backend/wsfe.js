import soap from "soap";
import { obtenerTokenSign } from "./wsaa.js";

const WSFE_URLS = {
  homologacion: "https://wswhomo.afip.gov.ar/wsfev1/service.asmx?WSDL",

  produccion: "https://servicios1.afip.gov.ar/wsfev1/service.asmx?WSDL",
};

/*
 * Devuelve homologacion o produccion.
 * Cualquier valor desconocido cae en homologación por seguridad.
 */
const normalizarAmbiente = (ambienteFiscal) => {
  const ambiente = String(ambienteFiscal || "")
    .trim()
    .toLowerCase();

  return ambiente === "produccion" ? "produccion" : "homologacion";
};

/*
 * Obtiene el TA y crea el cliente WSFE correspondiente
 * al ambiente configurado en la empresa.
 */
const obtenerClienteWsfe = async (cuit) => {
  const auth = await obtenerTokenSign(cuit);

  const ambienteFiscal = normalizarAmbiente(auth?.ambienteFiscal);

  const wsfeUrl = WSFE_URLS[ambienteFiscal];

  console.log("CONECTANDO A WSFE:", {
    cuit,
    ambienteFiscal,
    wsfeUrl,
  });

  const client = await soap.createClientAsync(wsfeUrl);

  return {
    client,
    auth,
    ambienteFiscal,
  };
};

/*
 * Consulta interna del último comprobante usando
 * un cliente y un TA ya obtenidos.
 */
const consultarUltimoComprobante = async ({
  client,
  auth,
  cuit,
  puntoVenta,
  tipoComprobante,
}) => {
  const [result] = await client.FECompUltimoAutorizadoAsync({
    Auth: {
      Token: auth.token,
      Sign: auth.sign,
      Cuit: Number(cuit),
    },
    PtoVta: Number(puntoVenta),
    CbteTipo: Number(tipoComprobante),
  });

  const respuesta = result?.FECompUltimoAutorizadoResult;

  if (!respuesta) {
    throw new Error("ARCA no devolvió el último comprobante autorizado");
  }

  if (respuesta?.Errors?.Err) {
    const errores = Array.isArray(respuesta.Errors.Err)
      ? respuesta.Errors.Err
      : [respuesta.Errors.Err];

    const mensaje = errores
      .map((error) => `${error?.Code || ""} - ${error?.Msg || "Error de ARCA"}`)
      .join(" | ");

    throw new Error(mensaje);
  }

  return respuesta;
};

export const obtenerUltimoComprobante = async ({
  cuit,
  puntoVenta,
  tipoComprobante,
}) => {
  const { client, auth } = await obtenerClienteWsfe(cuit);

  return consultarUltimoComprobante({
    client,
    auth,
    cuit,
    puntoVenta,
    tipoComprobante,
  });
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
  /*
   * DETERMINAR TIPO DE COMPROBANTE ARCA
   */
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

  console.log("TIPO AFIP:", {
    tipoComprobante,
    letraComprobante,
    tipoComprobanteAfip,
  });

  /*
   * VALIDAR NOTA DE CRÉDITO
   */
  if (
    tipoComprobante === "nota_de_credito" &&
    !Number(comprobanteAsociadoNumero)
  ) {
    throw new Error(
      "Falta numero_origen válido para asociar la Nota de Crédito",
    );
  }

  /*
   * OBTENER CLIENTE Y TA SEGÚN EL AMBIENTE
   */
  const { client, auth, ambienteFiscal } = await obtenerClienteWsfe(cuit);

  /*
   * CONSULTAR ÚLTIMO NÚMERO
   *
   * Se reutilizan el mismo cliente y el mismo TA,
   * evitando autenticar dos veces.
   */
  const ultimo = await consultarUltimoComprobante({
    client,
    auth,
    cuit,
    puntoVenta,
    tipoComprobante: tipoComprobanteAfip,
  });

  const proximoNumero = Number(ultimo?.CbteNro || 0) + 1;

  console.log("ÚLTIMO AFIP COMPLETO:", JSON.stringify(ultimo, null, 2));

  console.log("ÚLTIMO CBTE NRO:", ultimo?.CbteNro);

  console.log("PRÓXIMO NÚMERO CALCULADO:", proximoNumero);

  /*
   * FECHA DEL COMPROBANTE
   */
  const fecha = new Date().toISOString().slice(0, 10).replaceAll("-", "");

  /*
   * COMPROBANTE ASOCIADO PARA NOTA DE CRÉDITO
   */
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

  /*
   * CÁLCULO DE NETO E IVA
   */
  const esFacturaConIva = letraComprobante === "A" || letraComprobante === "B";

  const totalFinal = Number(total || 0);

  const netoFinal = esFacturaConIva
    ? Number((totalFinal / 1.21).toFixed(2))
    : totalFinal;

  const ivaFinal = esFacturaConIva
    ? Number((totalFinal - netoFinal).toFixed(2))
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

  console.log(
    "ENVIANDO A ARCA:",
    JSON.stringify(
      {
        ambienteFiscal,
        tipoComprobanteAfip,
        total: totalFinal,
        netoRecibido: neto,
        ivaRecibido: iva,
        netoFinal,
        ivaFinal,
        docTipo,
        docNro,
        proximoNumero,
        datosIva,
        datosAsociados,
      },
      null,
      2,
    ),
  );

  console.log("ENVIANDO COMPROBANTE:", {
    ambienteFiscal,
    CbteTipo: tipoComprobanteAfip,
    PtoVta: Number(puntoVenta),
    CbteDesde: proximoNumero,
    CbteHasta: proximoNumero,
  });

  /*
   * SOLICITAR CAE
   */
  const [result] = await client.FECAESolicitarAsync({
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

          ImpTotal: totalFinal,
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
  });

  console.log("RESPUESTA ARCA:", JSON.stringify(result, null, 2));

  console.log("CONDICIÓN IVA RECEPTOR FINAL:", condicionIVAReceptorIdFinal);

  const respuesta = result?.FECAESolicitarResult;

  if (!respuesta) {
    throw new Error("ARCA no devolvió una respuesta al solicitar el CAE");
  }

  return respuesta;
};
