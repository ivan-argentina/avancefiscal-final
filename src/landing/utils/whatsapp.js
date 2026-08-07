export const abrirWhatsAppDemo = () => {
  const telefono = "5493498618901";

  const mensaje =
    "Hola, quisiera conocer Avance Fiscal y solicitar una demostración.";

  const url = `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`;

  window.open(url, "_blank", "noopener,noreferrer");
};
