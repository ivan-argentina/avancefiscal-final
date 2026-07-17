import { supabase } from "../hook/supabaseClient";

export const obtenerEmpresa = async (idusuario) => {
  if (!idusuario) {
    return null;
  }

  const usuarioGuardado = JSON.parse(localStorage.getItem("usuario"));

  /*
   * SUPERUSUARIO
   * Usa la empresa elegida desde el selector.
   */
  if (usuarioGuardado?.superusuario) {
    const empresaActiva = JSON.parse(localStorage.getItem("empresaActiva"));

    if (empresaActiva?.id) {
      return empresaActiva.id;
    }

    console.log("El superusuario todavía no seleccionó una empresa activa");

    return null;
  }

  /*
   * USUARIO NORMAL
   * Mantiene la lógica actual.
   */
  const { data, error } = await supabase
    .from("usuario_empresa")
    .select("idempresa")
    .eq("idusuario", idusuario)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.log("Error al cargar empresa:", error);
    return null;
  }

  return data?.idempresa || null;
};
