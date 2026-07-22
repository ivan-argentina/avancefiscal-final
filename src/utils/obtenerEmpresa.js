import { supabase } from "../hook/supabaseClient";

export const obtenerEmpresa = async (idusuario) => {
  if (!idusuario) {
    return null;
  }

  const usuarioGuardado = JSON.parse(localStorage.getItem("usuario"));

  const esSuperAdmin =
    String(usuarioGuardado?.rol_global || "")
      .trim()
      .toLowerCase() === "superadmin";

  /*
   * SUPERADMIN
   * Usa la empresa elegida desde el selector.
   */
  if (esSuperAdmin) {
    const empresaActiva = JSON.parse(localStorage.getItem("empresaActiva"));

    if (empresaActiva?.id) {
      return empresaActiva.id;
    }

    console.warn("El superadmin todavía no seleccionó una empresa activa");

    return null;
  }

  /*
   * USUARIO NORMAL
   * Usa la empresa vinculada en usuario_empresa.
   */
  const { data, error } = await supabase
    .from("usuario_empresa")
    .select("idempresa")
    .eq("idusuario", idusuario)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Error al cargar empresa:", error);
    return null;
  }

  return data?.idempresa || null;
};
