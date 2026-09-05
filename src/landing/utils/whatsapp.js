export const abrirWhatsAppDemo = () => {
  const telefono = "5493498618901";

  const mensaje =
    "Hola, quisiera conocer Avance Fiscal y solicitar una demostración.";

  const url = `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`;

  // Registrar conversión en Google Ads
  if (typeof window.gtag === "function") {
    window.gtag("event", "conversion", {
      send_to: "AW-18430691673/MVq5CKWvv-4cENmSuNRE",
      value: 1.0,
      currency: "ARS",
    });
  }

  window.open(url, "_blank", "noopener,noreferrer");
};