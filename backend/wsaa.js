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

const WSAA_URL = "https://wsaahomo.afip.gov.ar/ws/services/LoginCms?WSDL";

const obtenerCertificadosEmpresa = async (cuitEmpresa) => {
  const { data: empresa, error: empresaError } = await supabase
    .from("empresas")
    .select("certificado_crt, certificado_key")
    .eq("cuit", String(cuitEmpresa))
    .single();

  if (empresaError) throw empresaError;

  if (!empresa?.certificado_crt || !empresa?.certificado_key) {
    throw new Error("La empresa no tiene certificados AFIP cargados");
  }

  const { data: certFile, error: certError } = await supabase.storage
    .from("afip-certificados")
    .download(empresa.certificado_crt);

  if (certError) throw certError;

  const { data: keyFile, error: keyError } = await supabase.storage
    .from("afip-certificados")
    .download(empresa.certificado_key);

  if (keyError) throw keyError;

  const cert = Buffer.from(await certFile.arrayBuffer()).toString("utf8");
  const key = Buffer.from(await keyFile.arrayBuffer()).toString("utf8");

  return { cert, key };
};

const leerTA = (TA_PATH) => {
  if (!fs.existsSync(TA_PATH)) {
    return null;
  }

  try {
    const ta = JSON.parse(fs.readFileSync(TA_PATH, "utf8"));

    if (
      ta?.token &&
      ta?.sign &&
      ta?.expirationTime &&
      new Date() < new Date(ta.expirationTime)
    ) {
      console.log("TA válido encontrado");

      return {
        token: ta.token,
        sign: ta.sign,
      };
    }
  } catch (err) {
    console.log("Error leyendo TA:", err.message);
  }

  return null;
};

export const obtenerTokenSign = async (cuitEmpresa) => {
  console.log("CUIT EMPRESA:", cuitEmpresa);

  const TA_PATH = `./ta/ta-${cuitEmpresa}.json`;

  console.log("Buscando TA:", TA_PATH);
  console.log("Existe TA:", fs.existsSync(TA_PATH));

  const taGuardado = leerTA(TA_PATH);

  if (taGuardado) {
    return taGuardado;
  }

  console.log("Generando nuevo TA...");

  const { cert, key } = await obtenerCertificadosEmpresa(cuitEmpresa);

  const now = new Date();

  const loginTicketRequest = `
    <loginTicketRequest version="1.0">
      <header>
        <uniqueId>${Math.floor(Date.now() / 1000)}</uniqueId>
        <generationTime>${new Date(
          now.getTime() - 600000,
        ).toISOString()}</generationTime>
        <expirationTime>${new Date(
          now.getTime() + 12 * 60 * 60 * 1000,
        ).toISOString()}</expirationTime>
      </header>
      <service>wsfe</service>
    </loginTicketRequest>
  `;

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

  const client = await soap.createClientAsync(WSAA_URL);

  let result;

  try {
    [result] = await client.loginCmsAsync({
      in0: cms,
    });
  } catch (error) {
    console.log("ERROR WSAA:", error.message);

    if (String(error.message).includes("alreadyAuthenticated")) {
      throw new Error(
        "AFIP informa que ya existe un TA activo para este certificado. Esperá unos minutos e intentá nuevamente.",
      );
    }

    throw error;
  }

  const xml = result.loginCmsReturn;

  const token = xml.match(/<token>(.*?)<\/token>/)?.[1];
  const sign = xml.match(/<sign>(.*?)<\/sign>/)?.[1];

  const expirationTimeText = xml.match(
    /<expirationTime>(.*?)<\/expirationTime>/,
  )?.[1];

  const ta = {
    token,
    sign,
    expirationTime: expirationTimeText,
  };

  fs.mkdirSync("./ta", {
    recursive: true,
  });

  fs.writeFileSync(TA_PATH, JSON.stringify(ta, null, 2));

  console.log("Nuevo TA guardado");

  return {
    token,
    sign,
  };
};
