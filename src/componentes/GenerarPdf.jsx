import { forwardRef, useEffect, useState } from "react";

import QRCode from "qrcode";
import { formatearCuit } from "../utils/formatearCuit";
import {
  Box,
  Paper,
  Typography,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
} from "@mui/material";

const GenerarPdf = forwardRef(
  (
    {
      empresa,
      fecha,
      tipoComprobante,
      letraComprobante,
      puntoVenta = "0001",
      numeroFactura,
      formaPago,
      clienteSeleccionado,
      detalle = [],
      observaciones,
      totalFactura,
      neto,
      iva,
      cae = "00000000000000",
      vencimientoCae = "__/__/____",
      numeroOrigen,
    },
    ref,
  ) => {
    const formatoMoneda = (valor) =>
      new Intl.NumberFormat("es-AR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(Number(valor || 0));

    const formatearNumeroFactura = (ptoVta, numero) => {
      return `${String(ptoVta || 1).padStart(4, "0")}-${String(
        numero || 0,
      ).padStart(8, "0")}`;
    };

    const formatearTipo = (tipo) => {
      if (!tipo) return "-";

      return tipo.replaceAll("_", " ").toUpperCase();
    };

    const formatearFecha = (fecha) => {
      if (!fecha) return "-";

      const [anio, mes, dia] = String(fecha).split("-");

      return `${dia}/${mes}/${anio}`;
    };

    const formatearFechaAfip = (fecha) => {
      if (!fecha) return "-";

      const texto = String(fecha);

      // formato AFIP: YYYYMMDD
      if (texto.length === 8 && !texto.includes("-")) {
        const anio = texto.substring(0, 4);
        const mes = texto.substring(4, 6);
        const dia = texto.substring(6, 8);

        return `${dia}/${mes}/${anio}`;
      }

      // formato normal: YYYY-MM-DD
      const [anio, mes, dia] = texto.split("-");

      return `${dia}/${mes}/${anio}`;
    };

    const [qrAfip, setQrAfip] = useState("");

    useEffect(() => {
      const generarQr = async () => {
        if (!cae || !empresa?.cuit || !puntoVenta || !numeroFactura) return;

        const datosQr = {
          ver: 1,
          fecha,
          cuit: Number(String(empresa.cuit).replace(/\D/g, "")),
          ptoVta: Number(puntoVenta),
          tipoCmp:
            letraComprobante === "C" ? 11 : letraComprobante === "B" ? 6 : 1,
          nroCmp: Number(numeroFactura),
          importe: Number(totalFactura || 0),
          moneda: "PES",
          ctz: 1,
          tipoDocRec: clienteSeleccionado?.cuit ? 80 : 99,
          nroDocRec: clienteSeleccionado?.cuit
            ? Number(String(clienteSeleccionado.cuit).replace(/\D/g, ""))
            : 0,
          tipoCodAut: "E",
          codAut: Number(cae),
        };

        const json = JSON.stringify(datosQr);
        const base64 = btoa(json);
        const url = `https://www.afip.gob.ar/fe/qr/?p=${base64}`;

        const qr = await QRCode.toDataURL(url);
        setQrAfip(qr);
      };

      generarQr();
    }, [
      cae,
      empresa,
      puntoVenta,
      numeroFactura,
      fecha,
      letraComprobante,
      totalFactura,
      clienteSeleccionado,
    ]);

    return (
      <Box
        sx={{
          position: "absolute",
          left: "-9999px",
          top: 0,
        }}
      >
        <Paper
          ref={ref}
          sx={{
            width: 820,
            minHeight: 1120,
            p: 3,
            backgroundColor: "#fff",
            color: "#000",
            borderRadius: 0,
            fontFamily: "Arial, sans-serif",
            boxShadow: "none",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr 90px 1fr",
              alignItems: "stretch",
              border: "1.5px solid #000",
              mb: 2,
            }}
          >
            <Box sx={{ p: 2 }}>
              <Typography
                sx={{
                  fontSize: 28,
                  fontWeight: 800,
                  lineHeight: 1,
                  mb: 1,
                }}
              >
                {empresa?.razon_social || "MI EMPRESA"}
              </Typography>

              <Typography sx={{ fontSize: 13, mb: 0.3 }}>
                <strong>Razón Social:</strong>{" "}
                {empresa?.razon_social || "Mi Empresa"}
              </Typography>

              <Typography sx={{ fontSize: 13, mb: 0.3 }}>
                <strong>Domicilio Comercial:</strong>{" "}
                {empresa?.domicilio || empresa?.direccion || "-"}
              </Typography>

              <Typography sx={{ fontSize: 13, mb: 0.3 }}>
                <strong>Localidad:</strong>{" "}
                {empresa?.localidad || empresa?.ciudad || "-"}
              </Typography>

              <Typography sx={{ fontSize: 13, mb: 0.3 }}>
                <strong>Condición frente al IVA:</strong>{" "}
                {empresa?.condicion_iva || empresa?.condicionIva || "-"}
              </Typography>

              <Box sx={{ mt: 2 }}>
                <Typography sx={{ fontSize: 12 }}>
                  <strong>Ingresos Brutos:</strong>{" "}
                  {empresa?.ingresos_brutos || "-"}
                </Typography>

                <Typography sx={{ fontSize: 12 }}>
                  <strong>Fecha de Inicio de Actividades:</strong>{" "}
                  {empresa?.inicio_actividades || "-"}
                </Typography>
              </Box>
            </Box>

            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                p: 1,
              }}
            >
              <Box
                sx={{
                  width: 70,
                  height: 70,
                  border: "1.5px solid #000",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  mb: 1,
                }}
              >
                <Typography
                  sx={{
                    fontSize: 34,
                    fontWeight: 800,
                    lineHeight: 1,
                    width: "100%",
                    textAlign: "center",
                  }}
                >
                  {letraComprobante || "X"}
                </Typography>
              </Box>

              <Typography
                sx={{
                  fontSize: 11,
                  fontWeight: 700,
                  textAlign: "center",
                }}
              >
                COD.{" "}
                {letraComprobante === "C"
                  ? "011"
                  : letraComprobante === "B"
                    ? "006"
                    : "001"}
              </Typography>
            </Box>

            <Box
              sx={{
                p: 2,
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-start",
              }}
            >
              <Typography
                sx={{
                  fontSize: 24,
                  fontWeight: 800,
                  textAlign: "center",
                  mb: 2,
                }}
              >
                {formatearTipo(tipoComprobante)}
              </Typography>

              <Typography sx={{ fontSize: 13, mb: 0.6 }}>
                <strong>Punto de Venta:</strong>{" "}
                {String(puntoVenta || 1).padStart(4, "0")}
              </Typography>

              <Typography sx={{ fontSize: 13, mb: 0.6 }}>
                <strong>Comp. Nro:</strong>{" "}
                {formatearNumeroFactura(puntoVenta, numeroFactura)}
              </Typography>

              <Typography sx={{ fontSize: 13, mb: 0.6 }}>
                <strong>Fecha de Emisión:</strong> {formatearFecha(fecha)}
              </Typography>

              <Typography sx={{ fontSize: 13, mb: 0.6 }}>
                <strong>CUIT:</strong>{" "}
                {empresa?.cuit ? formatearCuit(empresa.cuit) : "-"}
              </Typography>

              <Typography sx={{ fontSize: 13, mb: 0.6 }}>
                <strong>Forma de Pago:</strong> {formaPago || "-"}
              </Typography>
            </Box>
          </Box>

          <Box
            sx={{
              border: "1.5px solid #000",
              p: 2,
              mb: 2,
            }}
          >
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "1.2fr 1fr",
                gap: 1.2,
              }}
            >
              <Typography sx={{ fontSize: 13 }}>
                <strong>Apellido y Nombre / Razón Social:</strong>{" "}
                {clienteSeleccionado?.nombre || "-"}
              </Typography>

              <Typography sx={{ fontSize: 13 }}>
                <strong>CUIT / DNI:</strong>{" "}
                {clienteSeleccionado?.cuit
                  ? formatearCuit(clienteSeleccionado.cuit)
                  : "-"}
              </Typography>

              <Typography sx={{ fontSize: 13 }}>
                <strong>Domicilio:</strong>{" "}
                {clienteSeleccionado?.direccion || "-"}
              </Typography>

              <Typography sx={{ fontSize: 13 }}>
                <strong>Ciudad:</strong>{" "}
                {clienteSeleccionado?.ciudades?.nombre ||
                  clienteSeleccionado?.ciudad ||
                  "-"}
              </Typography>

              <Typography sx={{ fontSize: 13 }}>
                <strong>Condición frente al IVA:</strong>{" "}
                {clienteSeleccionado?.condicionIva?.descripcion ||
                  clienteSeleccionado?.condicion_iva?.descripcion ||
                  "Consumidor Final"}
              </Typography>

              <Typography sx={{ fontSize: 13 }}>
                <strong>Condición de venta:</strong> {formaPago || "-"}
              </Typography>
            </Box>
          </Box>

          <Table
            size="small"
            sx={{
              mb: 2,
              border: "1.5px solid #000",
              "& .MuiTableCell-root": {
                border: "none",
                fontSize: 12.5,
                py: 0.8,
                px: 1,
              },
              "& .MuiTableHead-root .MuiTableCell-root": {
                borderBottom: "1.5px solid #000",
                fontWeight: 700,
              },
              "& tbody tr:last-child td": {
                borderBottom: "1px solid #000",
              },
            }}
          >
            <TableHead>
              <TableRow>
                <TableCell>Producto / Servicio</TableCell>
                <TableCell align="right">Cantidad</TableCell>
                <TableCell align="right">Precio Unit.</TableCell>
                <TableCell align="right">Subtotal</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {detalle.map((item, index) => (
                <TableRow key={item.id || index}>
                  <TableCell>
                    {item.articulos?.descripcion ||
                      item.nombre ||
                      item.descripcion ||
                      item.articulo ||
                      "-"}
                  </TableCell>

                  <TableCell align="right">
                    {Number(item.cantidad || 0)}
                  </TableCell>

                  <TableCell align="right">
                    $ {formatoMoneda(item.precio)}
                  </TableCell>

                  <TableCell align="right">
                    $ {formatoMoneda(item.subtotal)}
                  </TableCell>
                </TableRow>
              ))}

              {detalle.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    Sin artículos cargados
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <TableContainer />
          <Box sx={{ flexGrow: 1 }} />

          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "stretch",
              border: "1.5px solid #000",
              minHeight: 95,
              mt: 2,
              mb: 2,
            }}
          >
            <Box
              sx={{
                width: 460,
                p: 1.2,
                borderRight: "1.5px solid #000",
              }}
            >
              <Typography sx={{ fontSize: 12.5, fontWeight: 700, mb: 1 }}>
                Observaciones
              </Typography>

              {tipoComprobante === "factura" && (
                <Typography sx={{ fontSize: 12, whiteSpace: "pre-line" }}>
                  {observaciones}
                </Typography>
              )}

              {tipoComprobante === "nota_de_credito" && numeroOrigen && (
                <Typography sx={{ fontSize: 12, mt: 1, fontWeight: 600 }}>
                  Comprobante asociado: Factura {letraComprobante}{" "}
                  {String(puntoVenta || 1).padStart(4, "0")}-
                  {String(numeroOrigen).padStart(8, "0")}
                </Typography>
              )}
            </Box>

            <Box sx={{ width: 340, p: 1.2 }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  p: 0.8,
                  borderBottom: "1px solid #000",
                }}
              >
                <Typography sx={{ fontSize: 12.5, flex: 1 }}>
                  Importe Neto Gravado:
                </Typography>

                <Typography
                  sx={{
                    fontSize: 12.5,
                    minWidth: 110,
                    textAlign: "right",
                  }}
                >
                  $ {formatoMoneda(neto)}
                </Typography>
              </Box>

              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  p: 0.8,
                  borderBottom: "1px solid #000",
                }}
              >
                <Typography sx={{ fontSize: 12.5, flex: 1 }}>
                  IVA 21%:
                </Typography>

                <Typography
                  sx={{
                    fontSize: 12.5,
                    minWidth: 110,
                    textAlign: "right",
                  }}
                >
                  $ {formatoMoneda(iva)}
                </Typography>
              </Box>

              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  p: 0.8,
                  borderBottom: "1px solid #000",
                }}
              >
                <Typography sx={{ fontSize: 12.5, flex: 1 }}>
                  Importe Otros Tributos:
                </Typography>

                <Typography
                  sx={{
                    fontSize: 12.5,
                    minWidth: 110,
                    textAlign: "right",
                  }}
                >
                  $ 0,00
                </Typography>
              </Box>

              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  p: 1,
                  backgroundColor: "#f5f5f5",
                }}
              >
                <Typography sx={{ fontSize: 14, fontWeight: 800, flex: 1 }}>
                  IMPORTE TOTAL
                </Typography>

                <Typography
                  sx={{
                    fontSize: 14,
                    fontWeight: 800,
                    minWidth: 110,
                    textAlign: "right",
                  }}
                >
                  $ {formatoMoneda(totalFactura)}
                </Typography>
              </Box>
            </Box>
          </Box>

          <Box
            sx={{
              border: "1.5px solid #000",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              p: 1.5,
              mb: 4,
            }}
          >
            <Box>
              <Typography sx={{ fontSize: 15, fontWeight: 800, mb: 1 }}>
                <strong>CAE N°:</strong> {cae}
              </Typography>

              <Typography sx={{ fontSize: 12.5 }}>
                <strong>Fecha de Vto. de CAE:</strong>{" "}
                {formatearFechaAfip(vencimientoCae)}
              </Typography>
            </Box>

            <Box
              sx={{
                width: 120,
                height: 120,
                border: "1px solid #000",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                p: 1,
              }}
            >
              {qrAfip ? (
                <img
                  src={qrAfip}
                  alt="QR AFIP"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                  }}
                />
              ) : (
                "QR"
              )}
            </Box>
          </Box>
        </Paper>
      </Box>
    );
  },
);

export default GenerarPdf;
