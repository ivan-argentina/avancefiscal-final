import forge from "node-forge";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { obtenerTokenSign } from "./wsaa.js";
import { obtenerUltimoComprobante, autorizarFactura } from "./wsfe.js";
import soap from "soap";
import { Resend } from "resend";
import crypto from "crypto";

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);
const supabaseAuth = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  },
);
const resend = new Resend(process.env.RESEND_API_KEY);
const app = express();

app.use(cors());

app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ limit: "25mb", extended: true }));

const prepararFacturaFiscal = (factura) => {
  const empresa = factura.empresas;
  const cliente = factura.clientes;

  const detalle = factura.detalle_factura || [];

  return {
    empresa: {
      cuit: empresa.cuit,
      razonSocial: empresa.razon_social,
      puntoVenta: empresa.punto_venta,
      condicionIva: empresa.condicion_iva,
    },

    cliente: {
      nombre: cliente.nombre,
      cuit: cliente.cuit,
      condicionIva: cliente.idciva,
    },
    comprobante: {
      idFactura: factura.id,
      tipo_comprobante: factura.tipo_comprobante,

      idfactura_origen: factura.idfactura_origen,
      numero_origen: factura.numero_origen,

      letra:
        empresa.condicion_iva === "Monotributista"
          ? "C"
          : factura.letra_comprobante,

      fecha: factura.fecha,
      total: Number(factura.total || 0),
      subtotal: Number(factura.subtotal || 0),
    },

    detalle: detalle.map((item) => ({
      codigo: item.codigo || "",
      descripcion: item.descripcion || "",
      cantidad: Number(item.cantidad || 0),
      precio: Number(item.precio || 0),
      subtotal: Number(item.subtotal || 0),
    })),
  };
};

app.get("/", (req, res) => {
  res.send("Backend fiscal funcionando");
});
app.post("/api/auth/login", async (req, res) => {
  try {
    const usuarioIngresado = String(req.body.usuario || "")
      .trim()
      .toLowerCase();

    const passwordIngresada = String(req.body.password || "");

    if (!usuarioIngresado || !passwordIngresada) {
      return res.status(400).json({
        ok: false,
        error: "Ingresá el usuario y la contraseña.",
      });
    }

    /*
     * Buscamos internamente el email correspondiente al nombre de usuario.
     * Esta consulta utiliza service_role y nunca se ejecuta desde React.
     */
    const { data: usuarioEncontrado, error: errorUsuario } = await supabase
      .from("usuarios")
      .select(
        `
        id,
        nombre,
        usuario,
        email,
        rol_global,
        activo,
        auth_user_id,
        debe_cambiar_password
      `,
      )
      .ilike("usuario", usuarioIngresado)
      .maybeSingle();

    if (errorUsuario) {
      throw errorUsuario;
    }

    /*
     * Utilizamos un mensaje genérico para no revelar
     * si el usuario existe o no.
     */
    if (
      !usuarioEncontrado ||
      usuarioEncontrado.activo === false ||
      !usuarioEncontrado.email ||
      !usuarioEncontrado.auth_user_id
    ) {
      

      return res.status(401).json({
        ok: false,
        error: "Usuario o contraseña incorrectos.",
      });
    }

    /*
     * Supabase Auth valida realmente la contraseña.
     */
    const { data: authData, error: authError } =
      await supabaseAuth.auth.signInWithPassword({
        email: usuarioEncontrado.email.trim().toLowerCase(),
        password: passwordIngresada,
      });
   

    if (authError || !authData?.session || !authData?.user) {
      console.log(
    "LOGIN 401 - fallo signInWithPassword:",
    authError?.message,
  );
      return res.status(401).json({
        ok: false,
        error: "Usuario o contraseña incorrectos.",
      });
    }

    /*
     * Verificamos que el usuario autenticado sea exactamente
     * el que está vinculado en nuestra tabla usuarios.
     */
    if (authData.user.id !== usuarioEncontrado.auth_user_id) {
       console.log("LOGIN 401 - auth_user_id distinto:", {
    authId: authData.user.id,
    tablaAuthId: usuarioEncontrado.auth_user_id,
  });
      return res.status(401).json({
        ok: false,
        error: "La cuenta no está correctamente vinculada.",
      });
    }

    const { data: relaciones, error: errorRelacion } = await supabase
      .from("usuario_empresa")
      .select(
        `
        id,
        rol,
        activo,
        empresas (
          id,
          razon_social,
          activo
        )
      `,
      )
      .eq("idusuario", usuarioEncontrado.id)
      .eq("activo", true);

    if (errorRelacion) {
      throw errorRelacion;
    }

    const relacionActiva = (relaciones || []).find(
      (relacion) => relacion.empresas?.activo === true,
    );

    if (!relacionActiva) {
      return res.status(403).json({
        ok: false,
        error: "El usuario no tiene una empresa activa asignada.",
      });
    }

    return res.json({
      ok: true,

      session: {
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
        expires_at: authData.session.expires_at,
        email: authData.user.email,
      },

      usuario: {
        ...usuarioEncontrado,
        idempresa: relacionActiva.empresas.id,
        empresa: relacionActiva.empresas,
        rol: relacionActiva.rol,
      },

      empresa: relacionActiva.empresas,
    });
  } catch (error) {
    console.error("Error iniciando sesión:", error);

    return res.status(500).json({
      ok: false,
      error: "No se pudo iniciar sesión.",
    });
  }
});

app.post("/api/auth/usuarios", async (req, res) => {
  try {
    const { nombre, usuario, email, password, idEmpresa, rol } = req.body;

    const nombreLimpio = String(nombre || "").trim();
    const usuarioLimpio = String(usuario || "")
      .trim()
      .toLowerCase();
    const emailLimpio = String(email || "")
      .trim()
      .toLowerCase();
    const passwordLimpia = String(password || "");

    if (
      !nombreLimpio ||
      !usuarioLimpio ||
      !emailLimpio ||
      !passwordLimpia ||
      !idEmpresa
    ) {
      return res.status(400).json({
        ok: false,
        error: "Complete nombre, usuario, email, contraseña y empresa.",
      });
    }

    const { data: usuarioExistente } = await supabase
      .from("usuarios")
      .select("id")
      .or(`usuario.ilike.${usuarioLimpio},email.ilike.${emailLimpio}`)
      .maybeSingle();

    if (usuarioExistente) {
      return res.status(409).json({
        ok: false,
        error: "El usuario o el email ya están registrados.",
      });
    }

    const { data: authCreado, error: authError } =
      await supabase.auth.admin.createUser({
        email: emailLimpio,
        password: passwordLimpia,
        email_confirm: true,
        user_metadata: {
          nombre: nombreLimpio,
          usuario: usuarioLimpio,
        },
      });

    if (authError || !authCreado?.user) {
      return res.status(400).json({
        ok: false,
        error:
          authError?.message || "No se pudo crear el usuario en Supabase Auth.",
      });
    }

    const authUserId = authCreado.user.id;

    const { data: usuarioCreado, error: errorUsuario } = await supabase
      .from("usuarios")
      .insert([
        {
          nombre: nombreLimpio,
          usuario: usuarioLimpio,
          email: emailLimpio,
          rol_global: "usuario",
          activo: true,
          auth_user_id: authUserId,
          debe_cambiar_password: true,
        },
      ])
      .select("id")
      .single();

    if (errorUsuario) {
      await supabase.auth.admin.deleteUser(authUserId);
      throw errorUsuario;
    }

    const { error: errorRelacion } = await supabase
      .from("usuario_empresa")
      .insert([
        {
          idusuario: usuarioCreado.id,
          idempresa: idEmpresa,
          rol,
          activo: true,
        },
      ]);

    if (errorRelacion) {
      await supabase.from("usuarios").delete().eq("id", usuarioCreado.id);

      await supabase.auth.admin.deleteUser(authUserId);

      throw errorRelacion;
    }

    return res.status(201).json({
      ok: true,
      mensaje: "Usuario creado correctamente.",
    });
  } catch (error) {
    console.error("Error creando usuario:", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "No se pudo crear el usuario.",
    });
  }
});

app.put("/api/auth/usuarios/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, usuario, email, idEmpresa, rol } = req.body;

    const nombreLimpio = String(nombre || "").trim();
    const usuarioLimpio = String(usuario || "")
      .trim()
      .toLowerCase();
    const emailLimpio = String(email || "")
      .trim()
      .toLowerCase();

    if (!nombreLimpio || !usuarioLimpio || !emailLimpio || !idEmpresa) {
      return res.status(400).json({
        ok: false,
        error: "Complete nombre, usuario, email y empresa.",
      });
    }

    /*
     * Buscamos el usuario actual para obtener
     * su auth_user_id y comparar el email.
     */
    const { data: usuarioActual, error: errorConsulta } = await supabase
      .from("usuarios")
      .select("id, email, auth_user_id")
      .eq("id", id)
      .single();

    if (errorConsulta || !usuarioActual) {
      return res.status(404).json({
        ok: false,
        error: "No se encontró el usuario.",
      });
    }

    if (!usuarioActual.auth_user_id) {
      return res.status(400).json({
        ok: false,
        error: "El usuario no está vinculado con Supabase Auth.",
      });
    }

    /*
     * Evitamos duplicar usuario o email en la tabla usuarios.
     */
    const { data: usuarioDuplicado, error: errorDuplicado } = await supabase
      .from("usuarios")
      .select("id")
      .or(`usuario.ilike.${usuarioLimpio},email.ilike.${emailLimpio}`)
      .neq("id", id)
      .maybeSingle();

    if (errorDuplicado) {
      throw errorDuplicado;
    }

    if (usuarioDuplicado) {
      return res.status(409).json({
        ok: false,
        error: "El usuario o el email ya están registrados.",
      });
    }

    /*
     * Si cambió el email, primero lo actualizamos en Auth.
     */
    const emailCambio =
      String(usuarioActual.email || "").toLowerCase() !== emailLimpio;

    if (emailCambio) {
      const { error: errorAuth } = await supabase.auth.admin.updateUserById(
        usuarioActual.auth_user_id,
        {
          email: emailLimpio,
          email_confirm: true,
        },
      );

      if (errorAuth) {
        return res.status(400).json({
          ok: false,
          error:
            errorAuth.message ||
            "No se pudo actualizar el email en Supabase Auth.",
        });
      }
    }

    /*
     * Actualizamos la tabla usuarios.
     */
    const { error: errorUsuario } = await supabase
      .from("usuarios")
      .update({
        nombre: nombreLimpio,
        usuario: usuarioLimpio,
        email: emailLimpio,
      })
      .eq("id", id);

    if (errorUsuario) {
      /*
       * Si Auth se actualizó pero la tabla falló,
       * intentamos volver al email anterior.
       */
      if (emailCambio) {
        await supabase.auth.admin.updateUserById(usuarioActual.auth_user_id, {
          email: usuarioActual.email,
          email_confirm: true,
        });
      }

      throw errorUsuario;
    }

    /*
     * Actualizamos empresa y rol.
     */
    const { error: errorRelacion } = await supabase
      .from("usuario_empresa")
      .update({
        idempresa: idEmpresa,
        rol,
      })
      .eq("idusuario", id);

    if (errorRelacion) {
      throw errorRelacion;
    }

    return res.json({
      ok: true,
      mensaje: "Usuario actualizado correctamente.",
    });
  } catch (error) {
    console.error("Error actualizando usuario:", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "No se pudo actualizar el usuario.",
    });
  }
});

app.post("/api/auth/cambiar-password", async (req, res) => {
  try {
    const authorization = String(req.headers.authorization || "");

    const accessToken = authorization.startsWith("Bearer ")
      ? authorization.slice(7).trim()
      : "";

    const passwordNueva = String(req.body.password || "").trim();

    if (!accessToken) {
      return res.status(401).json({
        ok: false,
        error: "Sesión no válida.",
      });
    }

    if (!passwordNueva) {
      return res.status(400).json({
        ok: false,
        error: "Ingresá la nueva contraseña.",
      });
    }

    const passwordValida =
      passwordNueva.length >= 8 &&
      /[A-Z]/.test(passwordNueva) &&
      /[a-z]/.test(passwordNueva) &&
      /\d/.test(passwordNueva);

    if (!passwordValida) {
      return res.status(400).json({
        ok: false,
        error:
          "La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número.",
      });
    }

    /*
     * Validamos el JWT contra Supabase Auth.
     * No confiamos en un auth_user_id enviado por React.
     */
    const {
      data: { user: authUser },
      error: userError,
    } = await supabaseAuth.auth.getUser(accessToken);

    if (userError || !authUser) {
      return res.status(401).json({
        ok: false,
        error: "La sesión venció o no es válida.",
      });
    }

    /*
     * Cambiamos la contraseña del usuario autenticado.
     */
    const { error: authError } = await supabase.auth.admin.updateUserById(
      authUser.id,
      {
        password: passwordNueva,
      },
    );

    if (authError) {
      throw authError;
    }

    /*
     * Quitamos la obligación de cambiarla nuevamente.
     */
    const { data: usuarioActualizado, error: usuarioError } = await supabase
      .from("usuarios")
      .update({
        debe_cambiar_password: false,
      })
      .eq("auth_user_id", authUser.id)
      .select("id, debe_cambiar_password")
      .maybeSingle();

    if (usuarioError) {
      throw usuarioError;
    }

    if (!usuarioActualizado) {
      return res.status(404).json({
        ok: false,
        error: "No se encontró el usuario vinculado a la sesión.",
      });
    }

    return res.json({
      ok: true,
      mensaje: "Contraseña actualizada correctamente.",
    });
  } catch (error) {
    console.error("Error cambiando contraseña:", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "No se pudo cambiar la contraseña.",
    });
  }
});

app.get("/api/fiscal/token", async (req, res) => {
  try {
    const auth = await obtenerTokenSign();

    res.json({
      ok: true,
      auth,
    });
  } catch (error) {
    console.log("Error WSAA:", error);

    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});
app.get("/api/fiscal/ultimo", async (req, res) => {
  try {
    const resultado = await obtenerUltimoComprobante({
      cuit: process.env.AFIP_CUIT,
      puntoVenta: process.env.AFIP_PTO_VTA,
      tipoComprobante: process.env.AFIP_CBTE_TIPO,
    });

    res.json({
      ok: true,
      resultado,
    });
  } catch (error) {
    console.log("Error WSFE:", error);

    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

const formatearFechaAfip = (fechaAfip) => {
  if (!fechaAfip) return null;

  const texto = String(fechaAfip);

  if (texto.length !== 8) return null;

  return `${texto.substring(0, 4)}-${texto.substring(4, 6)}-${texto.substring(6, 8)}`;
};

app.post("/api/fiscal/autorizar", async (req, res) => {
  try {
    const { idFactura } = req.body;

    const { data, error } = await supabase
      .from("facturas")
      .select(
        `
        *,
        empresas!facturas_idempresa_fkey(
         id,
         razon_social,
         cuit,
         punto_venta,
         condicion_iva,
         direccion,
         ingresos_brutos,
         inicio_actividades,
         ciudades!empresas_idciudad_fkey(nombre)
      ),
        clientes!fk_facturas_cliente(*),
        detalle_factura(*)
      `,
      )
      .eq("id", idFactura)
      .single();

    if (error) {
      return res.status(400).json({
        ok: false,
        error: error.message,
      });
    }

    if (data.estado_fiscal === "autorizada" && data.cae) {
      return res.json({
        ok: true,
        mensaje: "Factura ya autorizada",
        afip: {
          cae: data.cae,
          caeVto: data.cae_vencimiento,
          numeroFiscal: data.numero_fiscal,
          puntoVenta: data.punto_venta,
        },
        factura: data,
      });
    }

    const fiscal = prepararFacturaFiscal(data);

    const cuitEmpresa = String(fiscal.empresa.cuit).replace(/\D/g, "");
    const puntoVenta = fiscal.empresa.puntoVenta;
    const total = fiscal.comprobante.total;

    const cuitCliente = fiscal.cliente.cuit
      ? String(fiscal.cliente.cuit).replace(/\D/g, "")
      : "";

    let docTipo = 99;
    let docNro = 0;

    if (fiscal.comprobante.letra === "A" || fiscal.comprobante.letra === "B") {
      if (cuitCliente && cuitCliente.length === 11) {
        docTipo = 80; // CUIT
        docNro = Number(cuitCliente);
      }
    }

    const resultadoAfip = await autorizarFactura({
      cuit: cuitEmpresa,
      puntoVenta,
      total,
      docTipo,
      docNro,
      tipoComprobante: fiscal.comprobante.tipo_comprobante,
      letraComprobante: fiscal.comprobante.letra,
      comprobanteAsociadoTipo:
        fiscal.comprobante.letra === "A"
          ? 1
          : fiscal.comprobante.letra === "B"
            ? 6
            : 11,
      comprobanteAsociadoPtoVta: puntoVenta,
      comprobanteAsociadoNumero: fiscal.comprobante.numero_origen,
    });

    const detalleAfip = resultadoAfip?.FeDetResp?.FECAEDetResponse?.[0];

    const tipoComprobante = fiscal.comprobante.tipo_comprobante;
    const letraComprobante = fiscal.comprobante.letra;

    if (!detalleAfip || detalleAfip.Resultado !== "A") {
      const obs = detalleAfip?.Observaciones?.Obs || [];

      const primerError = Array.isArray(obs) ? obs[0] : obs;

      const afipErrorCode = primerError?.Code ? String(primerError.Code) : "";
      const afipErrorMsg = primerError?.Msg || "AFIP rechazó el comprobante";

      await supabase
        .from("facturas")
        .update({
          estado_fiscal: "rechazada",
          afip_error_code: afipErrorCode,
          afip_error_msg: afipErrorMsg,
        })
        .eq("id", idFactura);

      return res.status(400).json({
        ok: false,
        mensaje: "AFIP rechazó la factura",
        errorAfip: {
          code: afipErrorCode,
          msg: afipErrorMsg,
        },
        resultadoAfip,
      });
    }
    const calcularVencimientoCae = () => {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() + 10);
      return fecha.toISOString().slice(0, 10);
    };
    const cae = detalleAfip.CAE;
    const caeVtoAfip = detalleAfip.CAEFchVto;
    const caeVto = calcularVencimientoCae();
    const numeroFiscal = detalleAfip.CbteDesde;
    const { error: updateError } = await supabase
      .from("facturas")
      .update({
        cae,
        cae_vencimiento: caeVto,
        numero_fiscal: numeroFiscal,
        punto_venta: puntoVenta,
        estado_fiscal: "autorizada",
        letra_comprobante: fiscal.comprobante.letra,
      })
      .eq("id", idFactura);

    if (updateError) {
      return res.status(400).json({
        ok: false,
        error: updateError.message,
        resultadoAfip,
      });
    }

    res.json({
      ok: true,
      mensaje: "Factura fiscal autorizada",
      factura: data,
      fiscal,
      afip: {
        cae,
        caeVto,
        numeroFiscal,
        puntoVenta,
        resultadoAfip,
      },
    });
  } catch (err) {
    console.log("Error backend:", err);

    res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
});

app.get("/api/fiscal/condiciones-iva", async (req, res) => {
  try {
    const auth = await obtenerTokenSign();
    const client = await soap.createClientAsync(
      "https://wswhomo.afip.gov.ar/wsfev1/service.asmx?WSDL",
    );

    const [result] = await client.FEParamGetCondicionIvaReceptorAsync({
      Auth: {
        Token: auth.token,
        Sign: auth.sign,
        Cuit: Number(process.env.AFIP_CUIT),
      },
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});
app.get("/api/fiscal/certificado/estado/:cuitEmpresa", async (req, res) => {
  try {
    const cuitBuscado = String(req.params.cuitEmpresa || "").replace(/\D/g, "");

    const { data: empresas, error } = await supabase
      .from("empresas")
      .select("id, razon_social, cuit, certificado_crt");

    if (error) {
      throw error;
    }

    const empresa = (empresas || []).find(
      (item) => String(item.cuit || "").replace(/\D/g, "") === cuitBuscado,
    );

    if (!empresa) {
      return res.status(404).json({
        ok: false,
        error: "No se encontró la empresa para ese CUIT",
      });
    }

    if (!empresa.certificado_crt) {
      return res.status(200).json({
        ok: true,
        estado: "sin_certificado",
        vence: null,
        diasRestantes: null,
      });
    }

    const { data: certFile, error: certError } = await supabase.storage
      .from("afip-certificados")
      .download(empresa.certificado_crt);

    if (certError) {
      throw certError;
    }

    const certPem = Buffer.from(await certFile.arrayBuffer()).toString("utf8");

    const cert = forge.pki.certificateFromPem(certPem);

    const vence = cert.validity.notAfter;
    const hoy = new Date();

    const diasRestantes = Math.ceil(
      (vence.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24),
    );

    let estado = "vigente";

    if (diasRestantes <= 0) {
      estado = "vencido";
    } else if (diasRestantes <= 30) {
      estado = "por_vencer";
    }

    return res.json({
      ok: true,
      estado,
      vence,
      diasRestantes,
    });
  } catch (error) {
    console.error("Error consultando estado del certificado:", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "No se pudo consultar el certificado",
    });
  }
});

app.post("/api/email/factura", async (req, res) => {
  console.log("===== ENTRÓ A /api/email/factura =====");
  console.log(req.body);
  try {
    const { to, subject, html, pdfBase64, filename } = req.body;

    if (!to) {
      return res.status(400).json({
        ok: false,
        error: "Falta email del cliente",
      });
    }

    const emailData = {
      from: "Avance Fiscal <facturas@envios.avancefiscal.com.ar>",
      to,
      subject: subject || "Factura",
      html: html || "<p>Adjuntamos comprobante fiscal.</p>",
    };

    if (pdfBase64) {
      emailData.attachments = [
        {
          filename: filename || "factura.pdf",
          content: pdfBase64,
        },
      ];
    }

    const resultado = await resend.emails.send(emailData);

    res.json({
      ok: true,
      mensaje: "Email enviado correctamente",
      resultado,
    });
  } catch (error) {
    console.log("Error enviando email:", error);

    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

app.post("/api/email/bienvenida-usuario", async (req, res) => {
  try {
    const { to, nombre, usuario, passwordTemporal } = req.body;

    const emailDestino = String(to || "")
      .trim()
      .toLowerCase();

    const nombreUsuario = String(nombre || "").trim();
    const usuarioAcceso = String(usuario || "").trim();
    const passwordAcceso = String(passwordTemporal || "").trim();

    /*
     * Validaciones
     */
    if (!emailDestino || !nombreUsuario || !usuarioAcceso || !passwordAcceso) {
      return res.status(400).json({
        ok: false,
        error: "Faltan datos para enviar el correo de bienvenida.",
      });
    }

    const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailDestino);

    if (!emailValido) {
      return res.status(400).json({
        ok: false,
        error: "El email ingresado no es válido.",
      });
    }

    /*
     * Cambiá esta URL por la definitiva si fuera necesario.
     */
    const urlAcceso = process.env.FRONTEND_URL || "https://avancefiscal.com.ar";

    /*
     * Escapamos textos para evitar que se inserte HTML
     * dentro del correo.
     */
    const escaparHtml = (texto) =>
      String(texto)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

    const nombreSeguro = escaparHtml(nombreUsuario);
    const usuarioSeguro = escaparHtml(usuarioAcceso);
    const passwordSeguro = escaparHtml(passwordAcceso);

    const resultado = await resend.emails.send({
      /*
       * Usá el mismo remitente que ya utilizás
       * para enviar facturas.
       */
      from: process.env.RESEND_FROM || "Avance Fiscal <onboarding@resend.dev>",

      to: [emailDestino],

      subject: "Tu cuenta de Avance Fiscal fue creada",

      html: `
        <!DOCTYPE html>
        <html lang="es">
          <head>
            <meta charset="UTF-8" />
            <meta
              name="viewport"
              content="width=device-width, initial-scale=1.0"
            />
          </head>

          <body
            style="
              margin: 0;
              padding: 0;
              background-color: #f4f6f8;
              font-family: Arial, Helvetica, sans-serif;
              color: #263238;
            "
          >
            <table
              width="100%"
              cellpadding="0"
              cellspacing="0"
              border="0"
              style="background-color: #f4f6f8; padding: 30px 15px;"
            >
              <tr>
                <td align="center">
                  <table
                    width="100%"
                    cellpadding="0"
                    cellspacing="0"
                    border="0"
                    style="
                      max-width: 600px;
                      background-color: #ffffff;
                      border-radius: 12px;
                      overflow: hidden;
                      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
                    "
                  >
                    <tr>
                      <td
                        style="
                          padding: 26px 30px;
                          background-color: #1976d2;
                          color: #ffffff;
                        "
                      >
                        <h1
                          style="
                            margin: 0;
                            font-size: 26px;
                          "
                        >
                          Avance Fiscal
                        </h1>

                        <p
                          style="
                            margin: 7px 0 0;
                            font-size: 14px;
                            opacity: 0.9;
                          "
                        >
                          Gestión inteligente para tu empresa
                        </p>
                      </td>
                    </tr>

                    <tr>
                      <td style="padding: 30px;">
                        <p
                          style="
                            margin-top: 0;
                            font-size: 16px;
                          "
                        >
                          Hola <strong>${nombreSeguro}</strong>:
                        </p>

                        <p
                          style="
                            font-size: 15px;
                            line-height: 1.6;
                          "
                        >
                          Tu cuenta de Avance Fiscal fue creada
                          correctamente.
                        </p>

                        <p
                          style="
                            font-size: 15px;
                            line-height: 1.6;
                          "
                        >
                          Podés ingresar utilizando los siguientes
                          datos:
                        </p>

                        <table
                          width="100%"
                          cellpadding="0"
                          cellspacing="0"
                          border="0"
                          style="
                            margin: 22px 0;
                            background-color: #f5f7fa;
                            border: 1px solid #e0e5ea;
                            border-radius: 8px;
                          "
                        >
                          <tr>
                            <td
                              style="
                                padding: 18px 20px 8px;
                                font-size: 14px;
                                color: #607d8b;
                              "
                            >
                              Usuario
                            </td>
                          </tr>

                          <tr>
                            <td
                              style="
                                padding: 0 20px 16px;
                                font-size: 17px;
                                font-weight: bold;
                                color: #263238;
                              "
                            >
                              ${usuarioSeguro}
                            </td>
                          </tr>

                          <tr>
                            <td
                              style="
                                padding: 8px 20px;
                                font-size: 14px;
                                color: #607d8b;
                                border-top: 1px solid #e0e5ea;
                              "
                            >
                              Contraseña temporal
                            </td>
                          </tr>

                          <tr>
                            <td
                              style="
                                padding: 0 20px 18px;
                                font-size: 18px;
                                font-weight: bold;
                                color: #263238;
                                letter-spacing: 1px;
                              "
                            >
                              ${passwordSeguro}
                            </td>
                          </tr>
                        </table>

                        <p
                          style="
                            font-size: 15px;
                            line-height: 1.6;
                          "
                        >
                          Por seguridad, al ingresar deberás cambiar
                          esta contraseña temporal por una nueva.
                        </p>

                        <table
                          width="100%"
                          cellpadding="0"
                          cellspacing="0"
                          border="0"
                          style="margin: 28px 0;"
                        >
                          <tr>
                            <td align="center">
                              <a
                                href="${urlAcceso}"
                                target="_blank"
                                rel="noopener noreferrer"
                                style="
                                  display: inline-block;
                                  padding: 13px 26px;
                                  background-color: #1976d2;
                                  color: #ffffff;
                                  text-decoration: none;
                                  border-radius: 7px;
                                  font-size: 15px;
                                  font-weight: bold;
                                "
                              >
                                Ingresar a Avance Fiscal
                              </a>
                            </td>
                          </tr>
                        </table>

                        <p
                          style="
                            margin-bottom: 0;
                            font-size: 13px;
                            line-height: 1.5;
                            color: #78909c;
                          "
                        >
                          Si no esperabas recibir este mensaje,
                          comunicate con el administrador de tu empresa.
                        </p>
                      </td>
                    </tr>

                    <tr>
                      <td
                        style="
                          padding: 20px 30px;
                          background-color: #f5f7fa;
                          text-align: center;
                          font-size: 12px;
                          color: #78909c;
                        "
                      >
                        Avance Fiscal<br />
                        Facturación, stock y gestión en un solo lugar.
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    });

    /*
     * Resend puede devolver un error dentro del resultado
     * sin lanzar una excepción.
     */
    if (resultado?.error) {
      console.error("Error de Resend al enviar bienvenida:", resultado.error);

      return res.status(500).json({
        ok: false,
        error:
          resultado.error.message ||
          "No se pudo enviar el correo de bienvenida.",
      });
    }

    console.log(`Correo de bienvenida enviado a ${emailDestino}`);

    return res.json({
      ok: true,
      mensaje: "Correo de bienvenida enviado correctamente.",
      idEmail: resultado?.data?.id || null,
    });
  } catch (error) {
    console.error("Error enviando correo de bienvenida:", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "No se pudo enviar el correo de bienvenida.",
    });
  }
});
app.post("/api/email/bienvenida-usuario", async (req, res) => {
  try {
    const { to, nombre, usuario, passwordTemporal } = req.body;

    const emailDestino = String(to || "")
      .trim()
      .toLowerCase();

    const nombreUsuario = String(nombre || "").trim();
    const usuarioAcceso = String(usuario || "").trim();
    const passwordAcceso = String(passwordTemporal || "").trim();

    /*
     * Validaciones
     */
    if (!emailDestino || !nombreUsuario || !usuarioAcceso || !passwordAcceso) {
      return res.status(400).json({
        ok: false,
        error: "Faltan datos para enviar el correo de bienvenida.",
      });
    }

    const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailDestino);

    if (!emailValido) {
      return res.status(400).json({
        ok: false,
        error: "El email ingresado no es válido.",
      });
    }

    /*
     * Cambiá esta URL por la definitiva si fuera necesario.
     */
    const urlAcceso = process.env.FRONTEND_URL || "https://avancefiscal.com.ar";

    /*
     * Escapamos textos para evitar que se inserte HTML
     * dentro del correo.
     */
    const escaparHtml = (texto) =>
      String(texto)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

    const nombreSeguro = escaparHtml(nombreUsuario);
    const usuarioSeguro = escaparHtml(usuarioAcceso);
    const passwordSeguro = escaparHtml(passwordAcceso);

    const resultado = await resend.emails.send({
      /*
       * Usá el mismo remitente que ya utilizás
       * para enviar facturas.
       */
      from: process.env.RESEND_FROM || "Avance Fiscal <onboarding@resend.dev>",

      to: [emailDestino],

      subject: "Tu cuenta de Avance Fiscal fue creada",

      html: `
        <!DOCTYPE html>
        <html lang="es">
          <head>
            <meta charset="UTF-8" />
            <meta
              name="viewport"
              content="width=device-width, initial-scale=1.0"
            />
          </head>

          <body
            style="
              margin: 0;
              padding: 0;
              background-color: #f4f6f8;
              font-family: Arial, Helvetica, sans-serif;
              color: #263238;
            "
          >
            <table
              width="100%"
              cellpadding="0"
              cellspacing="0"
              border="0"
              style="background-color: #f4f6f8; padding: 30px 15px;"
            >
              <tr>
                <td align="center">
                  <table
                    width="100%"
                    cellpadding="0"
                    cellspacing="0"
                    border="0"
                    style="
                      max-width: 600px;
                      background-color: #ffffff;
                      border-radius: 12px;
                      overflow: hidden;
                      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
                    "
                  >
                    <tr>
                      <td
                        style="
                          padding: 26px 30px;
                          background-color: #1976d2;
                          color: #ffffff;
                        "
                      >
                        <h1
                          style="
                            margin: 0;
                            font-size: 26px;
                          "
                        >
                          Avance Fiscal
                        </h1>

                        <p
                          style="
                            margin: 7px 0 0;
                            font-size: 14px;
                            opacity: 0.9;
                          "
                        >
                          Gestión inteligente para tu empresa
                        </p>
                      </td>
                    </tr>

                    <tr>
                      <td style="padding: 30px;">
                        <p
                          style="
                            margin-top: 0;
                            font-size: 16px;
                          "
                        >
                          Hola <strong>${nombreSeguro}</strong>:
                        </p>

                        <p
                          style="
                            font-size: 15px;
                            line-height: 1.6;
                          "
                        >
                          Tu cuenta de Avance Fiscal fue creada
                          correctamente.
                        </p>

                        <p
                          style="
                            font-size: 15px;
                            line-height: 1.6;
                          "
                        >
                          Podés ingresar utilizando los siguientes
                          datos:
                        </p>

                        <table
                          width="100%"
                          cellpadding="0"
                          cellspacing="0"
                          border="0"
                          style="
                            margin: 22px 0;
                            background-color: #f5f7fa;
                            border: 1px solid #e0e5ea;
                            border-radius: 8px;
                          "
                        >
                          <tr>
                            <td
                              style="
                                padding: 18px 20px 8px;
                                font-size: 14px;
                                color: #607d8b;
                              "
                            >
                              Usuario
                            </td>
                          </tr>

                          <tr>
                            <td
                              style="
                                padding: 0 20px 16px;
                                font-size: 17px;
                                font-weight: bold;
                                color: #263238;
                              "
                            >
                              ${usuarioSeguro}
                            </td>
                          </tr>

                          <tr>
                            <td
                              style="
                                padding: 8px 20px;
                                font-size: 14px;
                                color: #607d8b;
                                border-top: 1px solid #e0e5ea;
                              "
                            >
                              Contraseña temporal
                            </td>
                          </tr>

                          <tr>
                            <td
                              style="
                                padding: 0 20px 18px;
                                font-size: 18px;
                                font-weight: bold;
                                color: #263238;
                                letter-spacing: 1px;
                              "
                            >
                              ${passwordSeguro}
                            </td>
                          </tr>
                        </table>

                        <p
                          style="
                            font-size: 15px;
                            line-height: 1.6;
                          "
                        >
                          Por seguridad, al ingresar deberás cambiar
                          esta contraseña temporal por una nueva.
                        </p>

                        <table
                          width="100%"
                          cellpadding="0"
                          cellspacing="0"
                          border="0"
                          style="margin: 28px 0;"
                        >
                          <tr>
                            <td align="center">
                              <a
                                href="${urlAcceso}"
                                target="_blank"
                                rel="noopener noreferrer"
                                style="
                                  display: inline-block;
                                  padding: 13px 26px;
                                  background-color: #1976d2;
                                  color: #ffffff;
                                  text-decoration: none;
                                  border-radius: 7px;
                                  font-size: 15px;
                                  font-weight: bold;
                                "
                              >
                                Ingresar a Avance Fiscal
                              </a>
                            </td>
                          </tr>
                        </table>

                        <p
                          style="
                            margin-bottom: 0;
                            font-size: 13px;
                            line-height: 1.5;
                            color: #78909c;
                          "
                        >
                          Si no esperabas recibir este mensaje,
                          comunicate con el administrador de tu empresa.
                        </p>
                      </td>
                    </tr>

                    <tr>
                      <td
                        style="
                          padding: 20px 30px;
                          background-color: #f5f7fa;
                          text-align: center;
                          font-size: 12px;
                          color: #78909c;
                        "
                      >
                        Avance Fiscal<br />
                        Facturación, stock y gestión en un solo lugar.
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    });

    /*
     * Resend puede devolver un error dentro del resultado
     * sin lanzar una excepción.
     */
    if (resultado?.error) {
      console.error("Error de Resend al enviar bienvenida:", resultado.error);

      return res.status(500).json({
        ok: false,
        error:
          resultado.error.message ||
          "No se pudo enviar el correo de bienvenida.",
      });
    }

    console.log(`Correo de bienvenida enviado a ${emailDestino}`);

    return res.json({
      ok: true,
      mensaje: "Correo de bienvenida enviado correctamente.",
      idEmail: resultado?.data?.id || null,
    });
  } catch (error) {
    console.error("Error enviando correo de bienvenida:", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "No se pudo enviar el correo de bienvenida.",
    });
  }
});
/*
 * =========================================================
 * QZ TRAY - CERTIFICADO Y FIRMA
 * =========================================================
 */

/*
 * DEVUELVE EL CERTIFICADO PÚBLICO A QZ TRAY
 */
app.get("/api/qz/certificate", (req, res) => {
  try {
    const certificate = process.env.QZ_CERTIFICATE;

    if (!certificate) {
      return res.status(500).send("Certificado QZ no configurado");
    }

    /*
     * Railway guarda los saltos de línea como \n.
     * Los convertimos nuevamente a saltos reales.
     */
    const certificadoFormateado = certificate.replace(/\\n/g, "\n");

    res.type("text/plain").send(certificadoFormateado);
  } catch (error) {
    console.error("Error obteniendo certificado QZ:", error);

    res.status(500).send("Error obteniendo certificado QZ");
  }
});

/*
 * FIRMA LAS SOLICITUDES DE QZ TRAY
 */
app.post("/api/qz/sign", (req, res) => {
  try {
    const { request } = req.body;

    if (!request) {
      return res.status(400).send("Falta el contenido para firmar");
    }

    const privateKey = process.env.QZ_PRIVATE_KEY;

    if (!privateKey) {
      return res.status(500).send("Clave privada QZ no configurada");
    }

    const claveFormateada = privateKey.replace(/\\n/g, "\n");

    const signer = crypto.createSign("SHA512");

    signer.update(request);
    signer.end();

    const signature = signer.sign(
      claveFormateada,
      "base64",
    );

    res.type("text/plain").send(signature);
  } catch (error) {
    console.error("Error firmando solicitud QZ:", error);

    res.status(500).send("Error firmando solicitud QZ");
  }
});
const PORT = Number(process.env.PORT) || 3001;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor backend en puerto ${PORT}`);
});
