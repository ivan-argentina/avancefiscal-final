import { supabase } from "../hook/supabaseClient";

export const obtenerEmpresa = async (idusuario) => {
   if (!idusuario) {
  
    return null;
  }
  const { data, error } = await supabase
    .from("usuario_empresa")
    .select("idempresa")
    .eq("idusuario", idusuario)
    .maybeSingle();


  if (error) {
    console.log("Error al cargar empresa", error);
    return null;
  }

  return data.idempresa;
};