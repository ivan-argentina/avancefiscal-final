import dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import forge from "node-forge";
import soap from "soap";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const URLS_WSAA = {
  homologacion: "https://wsaahomo.afip.gov.ar/ws/services/LoginCms?WSDL",

  produccion: "https://wsaa.afip.gov.ar/ws/services/LoginCms?WSDL",
};

/*
 * Normaliza el valor guardado en empresas.ambiente_fiscal.
 *
 * Cualquier valor distinto de "produccion" utiliza homologación,
 * para evitar entrar accidentalmente en producción.
 */
const normalizarAmbiente = (ambienteFiscal) => {
  const ambiente = String(ambienteFiscal || "")
    .trim()
    .toLowerCase();

  return ambiente === "produccion" ? "produccion" : "homologacion";
};

/*
 * Obtiene la configuración fiscal y descarga los certificados
 * correspondientes a la empresa.
 */
const obtenerConfiguracionEmpresa = async (cuitEmpresa) => {
  const cuitNormalizado = String(cuitEmpresa || "").replace(/\D/g, "");

  if (!cuitNormalizado) {
    throw new Error("No se recibió el CUIT de la empresa");
  }

  const { data: empresa, error: empresaError } = await supabase
    .from("empresas")
    .select(
      `
      id,
      cuit,
      ambiente_fiscal,
      certificado_crt,
      certificado_key
      `,
    )
    .eq("cuit", cuitNormalizado)
    .maybeSingle();

  if (empresaError) {
    console.error(
      "Error buscando configuración fiscal de la empresa:",
      empresaError,
    );

    throw empresaError;
  }

  if (!empresa) {
    throw new Error(
      `No se encontró la empresa correspondiente al CUIT ${cuitNormalizado}`,
    );
  }

  if (!empresa.certificado_crt || !empresa.certificado_key) {
    throw new Error(
      "La empresa no tiene certificado y clave privada AFIP cargados",
    );
  }

  const ambienteFiscal = normalizarAmbiente(empresa.ambiente_fiscal);

  const wsaaUrl = URLS_WSAA[ambienteFiscal];

  /*
   * Descargar certificado.
   */
  const { data: certFile, error: certError } = await supabase.storage
    .from("afip-certificados")
    .download(empresa.certificado_crt);

  if (certError) {
    console.error("Error descargando certificado AFIP:", certError);

    throw new Error(
      `No se pudo descargar el certificado AFIP: ${
        certError.message || "error desconocido"
      }`,
    );
  }

  /*
   * Descargar clave privada.
   */
  const { data: keyFile, error: keyError } = await supabase.storage
    .from("afip-certificados")
    .download(empresa.certificado_key);

  if (keyError) {
    console.error("Error descargando clave privada AFIP:", keyError);

    throw new Error(
      `No se pudo descargar la clave privada AFIP: ${
        keyError.message || "error desconocido"
      }`,
    );
  }

  const cert = Buffer.from(await certFile.arrayBuffer()).toString("utf8");

  const key = Buffer.from(await keyFile.arrayBuffer()).toString("utf8");

  return {
    cert,
    key,
    ambienteFiscal,
    wsaaUrl,
    cuitNormalizado,
  };
};

/*
 * Lee un Ticket de Acceso previamente guardado.
 */
const leerTA = (taPath) => {
  if (!fs.existsSync(taPath)) {
    return null;
  }

  try {
    const ta = JSON.parse(fs.readFileSync(taPath, "utf8"));

    const tieneDatos = ta?.token && ta?.sign && ta?.expirationTime;

    const sigueVigente = tieneDatos && new Date() < new Date(ta.expirationTime);

    if (sigueVigente) {
      console.log(
        `TA válido encontrado: ${ta.ambienteFiscal || "sin ambiente"}`,
      );

      return {
        token: ta.token,
        sign: ta.sign,
      };
    }

    console.log("El TA guardado está vencido");
  } catch (error) {
    console.log("Error leyendo TA:", error.message);
  }

  return null;
};

export const obtenerTokenSign = async (cuitEmpresa) => {
  const { cert, key, ambienteFiscal, wsaaUrl, cuitNormalizado } =
    await obtenerConfiguracionEmpresa(cuitEmpresa);

  /*
   * El archivo incluye ambiente y CUIT.
   *
   * Ejemplos:
   * ta-20223611916-homologacion.json
   * ta-20223611916-produccion.json
   */
  const taPath = `./ta/ta-${cuitNormalizado}-${ambienteFiscal}.json`;

  const taGuardado = leerTA(taPath);

  if (taGuardado) {
    return {
      ...taGuardado,
      ambienteFiscal,
    };
  }

  console.log("Solicitando nuevo TA:", {
    cuit: cuitNormalizado,
    ambienteFiscal,
    wsaaUrl,
  });

  const now = new Date();

  const generationTime = new Date(now.getTime() - 10 * 60 * 1000).toISOString();

  const expirationTime = new Date(
    now.getTime() + 12 * 60 * 60 * 1000,
  ).toISOString();

  const loginTicketRequest = `
    <loginTicketRequest version="1.0">
      <header>
        <uniqueId>${Math.floor(Date.now() / 1000)}</uniqueId>
        <generationTime>${generationTime}</generationTime>
        <expirationTime>${expirationTime}</expirationTime>
      </header>
      <service>wsfe</service>
    </loginTicketRequest>
  `.trim();

  /*
   * Firmar TRA con certificado y clave privada.
   */
  const p7 = forge.pkcs7.createSignedData();

  p7.content = forge.util.createBuffer(loginTicketRequest, "utf8");

  p7.addCertificate(cert);

  p7.addSigner({
    key,
    certificate: cert,
    digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [
      {
        type: forge.pki.oids.contentType,
        value: forge.pki.oids.data,
      },
      {
        type: forge.pki.oids.messageDigest,
      },
      {
        type: forge.pki.oids.signingTime,
        value: new Date(),
      },
    ],
  });

  p7.sign();

  const cms = forge.util.encode64(forge.asn1.toDer(p7.toAsn1()).getBytes());

  const client = await soap.createClientAsync(wsaaUrl);

  let result;

  try {
    [result] = await client.loginCmsAsync({
      in0: cms,
    });
  } catch (error) {
    console.error("ERROR WSAA:", {
      ambienteFiscal,
      url: wsaaUrl,
      mensaje: error?.message,
    });

    if (String(error?.message || "").includes("alreadyAuthenticated")) {
      throw new Error(
        "ARCA informa que ya existe un Ticket de Acceso activo para este certificado. Esperá unos minutos e intentá nuevamente.",
      );
    }

    throw error;
  }

  const xml = result?.loginCmsReturn;

  if (!xml) {
    throw new Error("ARCA no devolvió el Ticket de Acceso");
  }

  const token = xml.match(/<token>(.*?)<\/token>/)?.[1];

  const sign = xml.match(/<sign>(.*?)<\/sign>/)?.[1];

  const expirationTimeText = xml.match(
    /<expirationTime>(.*?)<\/expirationTime>/,
  )?.[1];

  if (!token || !sign || !expirationTimeText) {
    console.error("Respuesta WSAA incompleta:", xml);

    throw new Error("La respuesta de autenticación de ARCA está incompleta");
  }

  const ta = {
    token,
    sign,
    expirationTime: expirationTimeText,
    ambienteFiscal,
    cuit: cuitNormalizado,
  };

  fs.mkdirSync("./ta", {
    recursive: true,
  });

  fs.writeFileSync(taPath, JSON.stringify(ta, null, 2));

  console.log("Nuevo TA guardado:", {
    cuit: cuitNormalizado,
    ambienteFiscal,
    expirationTime: expirationTimeText,
  });

  return {
    token,
    sign,
    ambienteFiscal,
  };
};
