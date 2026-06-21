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
  if (!fs.existsSync(TA_PATH)) return null;

  const ta = JSON.parse(fs.readFileSync(TA_PATH, "utf8"));

  if (ta?.token && ta?.sign && new Date() < new Date(ta.expirationTime)) {
    return {
      token: ta.token,
      sign: ta.sign,
    };
  }

  return null;
};

export const obtenerTokenSign = async (cuitEmpresa) => {
  const TA_PATH = `./ta/ta-${cuitEmpresa}.json`;

  const taGuardado = leerTA(TA_PATH);

  if (taGuardado) {
    return taGuardado;
  }

  const { cert, key } = await obtenerCertificadosEmpresa(cuitEmpresa);

  const now = new Date();

  const loginTicketRequest = `
    <loginTicketRequest version="1.0">
      <header>
        <uniqueId>${Math.floor(Date.now() / 1000)}</uniqueId>
        <generationTime>${new Date(now.getTime() - 600000).toISOString()}</generationTime>
        <expirationTime>${new Date(now.getTime() + 10 * 60 * 1000).toISOString()}</expirationTime>
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
      { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
      { type: forge.pki.oids.messageDigest },
      { type: forge.pki.oids.signingTime, value: new Date() },
    ],
  });

  p7.sign();

  const cms = forge.util.encode64(forge.asn1.toDer(p7.toAsn1()).getBytes());

  const client = await soap.createClientAsync(WSAA_URL);
  const [result] = await client.loginCmsAsync({ in0: cms });

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

  fs.mkdirSync("./ta", { recursive: true });
  fs.writeFileSync(TA_PATH, JSON.stringify(ta, null, 2));

  return {
    token,
    sign,
  };
};
