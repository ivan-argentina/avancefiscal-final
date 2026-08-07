import qz from "qz-tray";
import QRCode from "qrcode";

const ANCHO = 42;

// Comandos ESC/POS
const CMD_INICIAR = "1B40";
const CMD_IZQUIERDA = "1B6100";
const CMD_CENTRAR = "1B6101";
const CMD_NORMAL = "1D2100";
const CMD_DOBLE_ALTO = "1D2101";
const CMD_FUENTE_A = "1B4D00";
const CMD_CORTAR = "1D564100";

// Espaciado normal/compacto entre renglones.
// Si después lo querés más separado, probamos otro valor.
const CMD_ESPACIADO_LINEAS = "1B331E";

const comando = (data) => ({
  type: "raw",
  format: "command",
  flavor: "hex",
  data,
});

const texto = (data) => ({
  type: "raw",
  format: "command",
  flavor: "plain",
  data,
});

const linea = () => `${"-".repeat(ANCHO)}\n`;

const cortar = (valor = "", maximo = ANCHO) =>
  String(valor ?? "").substring(0, maximo);

const derecha = (valor = "") => {
  const contenido = cortar(valor, ANCHO);
  return `${contenido.padStart(ANCHO, " ")}\n`;
};

const dosColumnas = (izquierda = "", derechaTexto = "") => {
  const izq = String(izquierda);
  const der = String(derechaTexto);
  const espacios = ANCHO - izq.length - der.length;

  if (espacios <= 0) {
    return `${cortar(izq, ANCHO)}\n${der.padStart(ANCHO, " ")}\n`;
  }

  return `${izq}${" ".repeat(espacios)}${der}\n`;
};

const formatearNumero = (valor) =>
  new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(valor || 0));

const formatearFecha = (fecha) => {
  if (!fecha) return "";

  const fechaTexto = String(fecha).slice(0, 10);
  const partes = fechaTexto.split("-");

  if (partes.length !== 3) return fechaTexto;

  const [anio, mes, dia] = partes;
  return `${dia}/${mes}/${anio}`;
};

const formatearHora = (hora) => {
  if (hora) return String(hora).slice(0, 8);

  return new Date().toLocaleTimeString("es-AR", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const obtenerNombreComprobante = (tipoComprobante) => {
  switch (tipoComprobante) {
    case "nota_de_credito":
      return "Nota de Credito";

    case "remito":
      return "Remito";

    case "presupuesto":
      return "Presupuesto";

    default:
      return "Factura";
  }
};

const obtenerCiudadCliente = (cliente) =>
  cliente?.ciudades?.nombre ||
  cliente?.ciudad?.nombre ||
  cliente?.localidad ||
  "";

const obtenerCondicionIvaCliente = (cliente) =>
  cliente?.condicion_iva?.descripcion ||
  cliente?.condicion_iva?.nombre ||
  cliente?.condicion_iva ||
  cliente?.condicionIva ||
  "Consumidor Final";

const convertirImagenABase64 = async (url) => {
  const respuesta = await fetch(url);

  if (!respuesta.ok) {
    throw new Error(`No se pudo descargar el logo: ${respuesta.status}`);
  }

  const blob = await respuesta.blob();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onloadend = () => {
      const resultado = String(reader.result);
      const partes = resultado.split(",");

      if (partes.length < 2) {
        reject(new Error("El logo no pudo convertirse a Base64"));
        return;
      }

      resolve(partes[1]);
    };

    reader.onerror = () => {
      reject(new Error("Error al leer el archivo del logo"));
    };

    reader.readAsDataURL(blob);
  });
};

export async function imprimirTicketFactura(datos) {
  //Agregamos numeros para el qr
  const soloNumeros = (valor = "") => String(valor).replace(/\D/g, "");

  const obtenerTipoComprobanteAfip = (tipoComprobante, letraComprobante) => {
    const letra = String(letraComprobante || "").toUpperCase();

    if (tipoComprobante === "nota_de_credito") {
      if (letra === "A") return 3;
      if (letra === "B") return 8;
      if (letra === "C") return 13;
    }

    if (letra === "A") return 1;
    if (letra === "B") return 6;
    if (letra === "C") return 11;

    return null;
  };

  const convertirTextoABase64 = (texto) => {
    const bytes = new TextEncoder().encode(texto);
    let binario = "";

    bytes.forEach((byte) => {
      binario += String.fromCharCode(byte);
    });

    return btoa(binario);
  };

  const generarQrFiscalBase64 = async (datos, empresa, cliente) => {
    const cuitEmpresa = soloNumeros(empresa.cuit);
    const cuitCliente = soloNumeros(cliente.cuit);

    const tipoComprobanteAfip = obtenerTipoComprobanteAfip(
      datos.tipoComprobante,
      datos.letraComprobante,
    );

    if (
      !cuitEmpresa ||
      !datos.cae ||
      !tipoComprobanteAfip ||
      !datos.numeroFactura
    ) {
      return null;
    }

    const datosQr = {
      ver: 1,
      fecha: String(datos.fecha).slice(0, 10),
      cuit: Number(cuitEmpresa),
      ptoVta: Number(datos.puntoVenta),
      tipoCmp: tipoComprobanteAfip,
      nroCmp: Number(datos.numeroFactura),
      importe: Number(datos.totalFactura),
      moneda: "PES",
      ctz: 1,
      tipoCodAut: "E",
      codAut: Number(datos.cae),
    };

    if (cuitCliente.length === 11) {
      datosQr.tipoDocRec = 80;
      datosQr.nroDocRec = Number(cuitCliente);
    } else {
      datosQr.tipoDocRec = 99;
      datosQr.nroDocRec = 0;
    }

    const jsonBase64 = convertirTextoABase64(JSON.stringify(datosQr));

    const urlQr = `https://www.arca.gob.ar/fe/qr/?p=${jsonBase64}`;

    const qrDataUrl = await QRCode.toDataURL(urlQr, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 220,
    });

    return qrDataUrl.split(",")[1];
  };
  if (!datos) {
    throw new Error("No se recibieron datos para imprimir");
  }

  const empresa = datos.empresa || {};
  const cliente = datos.clienteSeleccionado || {};
  const detalle = Array.isArray(datos.detalle) ? datos.detalle : [];

  /*
   * CONEXIÓN CON QZ TRAY
   */
  if (!qz.websocket.isActive()) {
    await qz.websocket.connect();
  }

  const impresoras = await qz.printers.find();

  if (!impresoras || impresoras.length === 0) {
    throw new Error("No se encontraron impresoras disponibles");
  }

  console.log("Impresoras detectadas por QZ Tray:", impresoras);

  /*
   * IMPRESORAS VIRTUALES QUE NO QUEREMOS USAR
   */
  const impresorasVirtuales = [
    "microsoft print to pdf",
    "microsoft xps",
    "onenote",
    "fax",
    "qz_tray raw print",
    "qz tray raw print",
  ];

  /*
   * PALABRAS COMUNES EN IMPRESORAS TÉRMICAS
   */
  const palabrasComandera = [
    "pos",
    "thermal",
    "ticket",
    "receipt",
    "slk",
    "xprinter",
    "xp-",
    "epson tm",
    "tm-t",
    "bematech",
    "elgin",
    "gprinter",
  ];

  /*
   * NORMALIZAR NOMBRES
   */
  const normalizar = (valor) =>
    String(valor || "")
      .trim()
      .toLowerCase();

  /*
   * 1. PRIMERO BUSCAMOS LA IMPRESORA GUARDADA
   *    EN LA CONFIGURACIÓN DE LA EMPRESA
   */
  const impresoraGuardada = normalizar(empresa.impresora_comandera);

  let nombreImpresora = null;

  if (impresoraGuardada) {
    nombreImpresora = impresoras.find(
      (nombre) => normalizar(nombre) === impresoraGuardada,
    );

    if (nombreImpresora) {
      console.log("Usando comandera configurada:", nombreImpresora);
    }
  }

  /*
   * 2. SI NO HAY UNA CONFIGURADA,
   *    BUSCAMOS AUTOMÁTICAMENTE
   */
  if (!nombreImpresora) {
    const candidatas = impresoras.filter((nombre) => {
      const nombreNormalizado = normalizar(nombre);

      const esVirtual = impresorasVirtuales.some((virtual) =>
        nombreNormalizado.includes(virtual),
      );

      if (esVirtual) {
        return false;
      }

      return palabrasComandera.some((palabra) =>
        nombreNormalizado.includes(palabra),
      );
    });

    console.log("Comanderas detectadas:", candidatas);

    /*
     * SI HAY UNA SOLA, LA USAMOS
     */
    if (candidatas.length === 1) {
      nombreImpresora = candidatas[0];
    }

    /*
     * SI HAY VARIAS, NO ELEGIMOS AL AZAR
     */
    if (candidatas.length > 1) {
      throw new Error(
        `Se encontraron varias comanderas: ${candidatas.join(
          ", ",
        )}. Seleccioná una desde Configuración.`,
      );
    }
  }

  /*
   * 3. SI TODAVÍA NO ENCONTRAMOS NINGUNA
   */
  if (!nombreImpresora) {
    throw new Error(
      "No se encontró una impresora térmica. Revisá la configuración de la comandera.",
    );
  }

  console.log("Imprimiendo ticket en:", nombreImpresora);

  /*
   * CONFIGURACIÓN QZ TRAY
   */
  const config = qz.configs.create(nombreImpresora, {
    encoding: "CP850",
    copies: 1,
  });

  /*
   * DATOS DE EMPRESA
   */
  const nombreFantasia =
    empresa.nombre_fantasia ||
    empresa.nombre ||
    empresa.razon_social ||
    "Avance Fiscal";

  const razonSocial =
    empresa.razon_social && empresa.razon_social !== nombreFantasia
      ? empresa.razon_social
      : "";

  const localidadEmpresa = empresa.localidad || empresa.ciudades?.nombre || "";

  const provinciaEmpresa =
    empresa.provincia || empresa.ciudades?.provincia || "";

  const ubicacionEmpresa = [localidadEmpresa, provinciaEmpresa]
    .filter(Boolean)
    .join(" - ");

  const condicionIvaEmpresa =
    empresa.condicion_iva || empresa.condicionIva || "";

  /*
   * DATOS DEL COMPROBANTE
   */
  const nombreComprobante = obtenerNombreComprobante(datos.tipoComprobante);

  const letra = datos.letraComprobante || "";

  const puntoVenta = String(datos.puntoVenta || 0).padStart(4, "0");

  const numeroFactura = String(datos.numeroFactura || 0).padStart(8, "0");

  const fecha = formatearFecha(datos.fecha);
  const hora = formatearHora(datos.hora);

  /*
   * DATOS DEL CLIENTE
   */
  const ciudadCliente = obtenerCiudadCliente(cliente);
  const condicionIvaCliente = obtenerCondicionIvaCliente(cliente);

  /*
   * ARMADO DE IMPRESIÓN
   */
  const datosImpresion = [];

  datosImpresion.push(comando(CMD_INICIAR));
  datosImpresion.push(comando(CMD_FUENTE_A));
  datosImpresion.push(comando(CMD_IZQUIERDA));
  datosImpresion.push(comando(CMD_ESPACIADO_LINEAS));
  datosImpresion.push(comando(CMD_NORMAL));

  /*
   * LOGO
   *
   * El archivo está en Supabase Storage y empresa.logo_url
   * contiene su URL pública.
   */
  if (empresa.logo_url) {
    try {
      const logoBase64 = await convertirImagenABase64(empresa.logo_url);

      datosImpresion.push(comando(CMD_CENTRAR));

      datosImpresion.push({
        type: "raw",
        format: "image",
        flavor: "base64",
        data: logoBase64,
        options: {
          language: "escpos",
          dotDensity: "single",
          imageEncoding: "gs_v_0",
          width: 220,
          height: 100,
        },
      });

      datosImpresion.push(comando(CMD_IZQUIERDA));
    } catch (error) {
      // Si falla el logo, el ticket continúa normalmente.
      console.error("No se pudo imprimir el logo:", error);
    }
  }

  /*
   * ENCABEZADO DE EMPRESA
   */
  datosImpresion.push(comando(CMD_DOBLE_ALTO));
  datosImpresion.push(texto(`${cortar(nombreFantasia)}\n`));
  datosImpresion.push(comando(CMD_NORMAL));

  if (razonSocial) {
    datosImpresion.push(texto(`${cortar(razonSocial)}\n`));
  }

  if (empresa.cuit) {
    datosImpresion.push(texto(`CUIT: ${empresa.cuit}\n`));
  }

  if (empresa.direccion) {
    datosImpresion.push(texto(`${cortar(empresa.direccion)}\n`));
  }

  if (ubicacionEmpresa) {
    datosImpresion.push(texto(`${cortar(ubicacionEmpresa)}\n`));
  }

  if (condicionIvaEmpresa) {
    datosImpresion.push(
      texto(`IVA ${cortar(condicionIvaEmpresa, ANCHO - 4)}\n`),
    );
  }

  // Sin renglones vacíos extra.
  datosImpresion.push(texto(linea()));

  /*
   * COMPROBANTE
   */
  datosImpresion.push(
    texto(
      dosColumnas(
        `${nombreComprobante} ${letra}`,
        `N ${puntoVenta}-${numeroFactura}`,
      ),
    ),
  );

  datosImpresion.push(texto(derecha(`Fecha: ${fecha}`)));
  datosImpresion.push(texto(derecha(`Hora: ${hora}`)));

  datosImpresion.push(texto(linea()));

  /*
   * CLIENTE
   */
  datosImpresion.push(
    texto(`${cortar(cliente.nombre || "Consumidor Final", ANCHO)}\n`),
  );

  if (cliente.direccion) {
    datosImpresion.push(texto(`${cortar(cliente.direccion)}\n`));
  }

  if (cliente.cuit) {
    datosImpresion.push(texto(`CUIT: ${cliente.cuit}\n`));
  }

  if (condicionIvaCliente) {
    datosImpresion.push(
      texto(`IVA ${cortar(condicionIvaCliente, ANCHO - 4)}\n`),
    );
  }

  if (ciudadCliente) {
    datosImpresion.push(texto(`${cortar(ciudadCliente)}\n`));
  }

  if (datos.formaPago) {
    datosImpresion.push(texto(`${cortar(datos.formaPago)}\n`));
  }

  datosImpresion.push(texto(linea()));

  /*
   * DETALLE
   */
  detalle.forEach((item) => {
    const cantidad = formatearNumero(item.cantidad);
    const precio = formatearNumero(item.precio);
    const subtotal = formatearNumero(item.subtotal);

    datosImpresion.push(
      texto(dosColumnas(`${cantidad} u x ${precio}`, subtotal)),
    );

    datosImpresion.push(texto(`${cortar(item.descripcion || "")}\n`));
  });

  datosImpresion.push(texto(linea()));

  /*
   * TOTALES
   */
  datosImpresion.push(
    texto(dosColumnas("Subt. Imp. NETO GRAVADO", formatearNumero(datos.neto))),
  );

  datosImpresion.push(
    texto(dosColumnas("ALICUOTA 21.00%", formatearNumero(datos.iva))),
  );

  datosImpresion.push(comando(CMD_DOBLE_ALTO));

  datosImpresion.push(
    texto(dosColumnas("TOTAL:", formatearNumero(datos.totalFactura))),
  );

  datosImpresion.push(comando(CMD_NORMAL));
  datosImpresion.push(texto(linea()));

  /*
   * DATOS FISCALES
   */
  if (datos.cae) {
    datosImpresion.push(texto(`CAE: ${datos.cae}\n`));
  }

  if (datos.vencimientoCae) {
    datosImpresion.push(
      texto(`Vto. CAE: ${formatearFecha(datos.vencimientoCae)}\n`),
    );
  }
  //imprimimos el qr fiscal
  try {
    const qrFiscalBase64 = await generarQrFiscalBase64(datos, empresa, cliente);

    if (qrFiscalBase64) {
      datosImpresion.push(texto("\n"));
      datosImpresion.push(comando(CMD_CENTRAR));

      datosImpresion.push({
        type: "raw",
        format: "image",
        flavor: "base64",
        data: qrFiscalBase64,
        options: {
          language: "escpos",
          dotDensity: "single",
          imageEncoding: "gs_v_0",
          quantization: "black",
          width: 220,
          height: 220,
        },
      });

      datosImpresion.push(texto("\n"));
      datosImpresion.push(texto("Comprobante autorizado\n"));
      datosImpresion.push(comando(CMD_IZQUIERDA));
    }
  } catch (error) {
    console.error("No se pudo generar el QR fiscal:", error);
  }

  if (datos.numeroOrigen) {
    datosImpresion.push(texto(`Comprobante asociado: ${datos.numeroOrigen}\n`));
  }

  if (datos.observaciones) {
    datosImpresion.push(
      texto(`Observaciones: ${cortar(datos.observaciones, ANCHO - 15)}\n`),
    );
  }

  datosImpresion.push(texto(linea()));

  /*
   * PIE
   */
  datosImpresion.push(comando(CMD_DOBLE_ALTO));
  datosImpresion.push(texto("Gracias por su compra\n"));
  datosImpresion.push(comando(CMD_NORMAL));

  datosImpresion.push(texto("\n\n\n"));

  // Corte automático.
  datosImpresion.push(comando(CMD_CORTAR));

  await qz.print(config, datosImpresion);
}
