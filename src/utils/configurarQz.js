import qz from "qz-tray";

const API_URL = import.meta.env.VITE_API_URL;

let configurado = false;

export const configurarQz = () => {
  if (configurado) return;

  qz.security.setCertificatePromise(async () => {
    const response = await fetch(
      `${API_URL}/api/qz/certificate`,
      {
        cache: "no-store",
      },
    );

    if (!response.ok) {
      throw new Error(
        "No se pudo obtener el certificado de QZ Tray",
      );
    }

    return await response.text();
  });

  qz.security.setSignatureAlgorithm("SHA512");

  qz.security.setSignaturePromise(async (toSign) => {
    const response = await fetch(
      `${API_URL}/api/qz/sign`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          request: toSign,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(
        "No se pudo firmar la solicitud de QZ Tray",
      );
    }

    return await response.text();
  });

  configurado = true;
};