import { supabase } from "../../hook/supabaseClient";

export async function importarFamilias(familiasExcel, idEmpresa, onProgress) {
  const mapaFamilias = {};
  const log = [];

  let importados = 0;
  let salteados = 0;
  let errores = 0;

  const total = familiasExcel.length;

  for (let i = 0; i < familiasExcel.length; i++) {
    const familiaExcel = familiasExcel[i];

    try {
      const idExcel = familiaExcel.Id;
      const nombre = String(familiaExcel.familia || "").trim();

      if (!nombre) {
        errores++;
        log.push({
          tipo: "error",
          mensaje: `Fila ${i + 1}: familia sin nombre`,
        });
        continue;
      }

      const { data: existente, error: errorBuscar } = await supabase
        .from("familias")
        .select("id")
        .eq("idempresa", idEmpresa)
        .eq("nombre", nombre)
        .maybeSingle();

      if (errorBuscar) throw errorBuscar;

      let idFamilia;

      if (existente) {
        idFamilia = existente.id;
        salteados++;

        log.push({
          tipo: "duplicado",
          mensaje: `Familia existente: ${nombre}`,
        });
      } else {
        const { data: nuevaFamilia, error } = await supabase
          .from("familias")
          .insert({
            nombre,
            idempresa: idEmpresa,
          })
          .select("id")
          .single();

        if (error) throw error;

        idFamilia = nuevaFamilia.id;
        importados++;

        log.push({
          tipo: "ok",
          mensaje: `Familia creada: ${nombre}`,
        });
      }

      mapaFamilias[idExcel] = idFamilia;
    } catch (error) {
      errores++;

      log.push({
        tipo: "error",
        mensaje: `Fila ${i + 1}: ${error.message}`,
      });
    }

    if (onProgress) {
      onProgress({
        actual: i + 1,
        total,
        porcentaje: Math.round(((i + 1) / total) * 100),
        familia: familiaExcel.familia,
      });

      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }

  return {
    mapaFamilias,
    leidos: total,
    importados,
    salteados,
    errores,
    log,
  };
}