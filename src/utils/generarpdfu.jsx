import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export const generarpdfU = async (
  elemento,
  nombre = "factura.pdf",
  opciones = {},
) => {
  if (!elemento) {
    console.log("No hay elemento para generar PDF");
    return null;
  }

  const canvas = await html2canvas(elemento, {
    scale: 2,
    backgroundColor: "#ffffff",
    useCORS: true,
  });

  if (!canvas.width || !canvas.height) {
    console.log("El elemento no tiene tamaño válido para PDF");
    return null;
  }

  const imgData = canvas.toDataURL("image/jpeg", 1.0);
  const pdf = new jsPDF("p", "mm", "a4");

  const imgWidth = 210;
  const pageHeight = 297;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, imgHeight);

  let heightLeft = imgHeight - pageHeight;
  let position = 0;

  while (heightLeft > 0) {
    position -= pageHeight;
    pdf.addPage();
    pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  const base64 = pdf.output("datauristring").split(",")[1];

  if (opciones.descargar !== false) {
    pdf.save(nombre);
  }

  return {
    pdfBase64: base64,
    filename: nombre,
  };
};
