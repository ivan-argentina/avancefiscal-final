import { supabase } from "../../hook/supabaseClient";

export async function importarCiudades(ciudadesExcel, idEmpresa) {
  const mapaCiudades = {};

  for (const ciudadExcel of ciudadesExcel) {
    const nombre = String(ciudadExcel.Ciudad).trim();

    // Buscar si ya existe
    const { data: existente } = await supabase
      .from("ciudades")
      .select("id,nombre")
      .eq("idempresa", idEmpresa)
      .eq("nombre", nombre)
      .maybeSingle();

    let idCiudad;

    if (existente) {
      idCiudad = existente.id;
    } else {
      const { data: nuevaCiudad, error } = await supabase
        .from("ciudades")
        .insert({
          nombre,
          idempresa: idEmpresa,
        })
        .select()
        .single();

      if (error) throw error;

      idCiudad = nuevaCiudad.id;
    }

    // Guardamos el mapa
    mapaCiudades[ciudadExcel.Id] = idCiudad;
  }

  return mapaCiudades;
}
