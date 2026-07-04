import { supabase } from "../../hook/supabaseClient";

export async function importarArticulos(
  articulosExcel,
  mapaFamilias,
  idEmpresa,
  onProgress
) {
  const log = [];

  let importados = 0;
  let salteados = 0;
  let errores = 0;

  const total = articulosExcel.length;

  for (let i = 0; i < articulosExcel.length; i++) {
    const articuloExcel = articulosExcel[i];

    try {
      const codigo = String(articuloExcel.Barra || "").trim();
      const descripcion = String(articuloExcel.Articulo || "").trim();

      if (!descripcion) {
        errores++;
        log.push({
          tipo: "error",
          mensaje: `Fila ${i + 1}: artículo sin descripción`,
        });
        continue;
      }

      const codigoFinal = codigo || crypto.randomUUID();

      const { data: existente, error: errorBuscar } = await supabase
        .from("articulos")
        .select("id")
        .eq("idempresa", idEmpresa)
        .eq("codigo", codigoFinal)
        .maybeSingle();

      if (errorBuscar) throw errorBuscar;

      if (existente) {
        salteados++;

        log.push({
          tipo: "duplicado",
          mensaje: `Artículo duplicado: ${descripcion}`,
        });

        continue;
      }

      const payload = {
        codigo: codigoFinal,
        descripcion,
        precio_costo: Number(articuloExcel.Pcosto || 0),
        precio: Number(articuloExcel.Pfinal || 0),
        stock: Number(articuloExcel.stock || 0),
        stock_minimo: Number(articuloExcel.Smin || 0),
        idfamilia: mapaFamilias[articuloExcel.IdFm] || null,
        idempresa: idEmpresa,
        activo: true,
      };

      const { error } = await supabase.from("articulos").insert(payload);

      if (error) {
        errores++;

        log.push({
          tipo: "error",
          mensaje: `Error importando ${descripcion}: ${error.message}`,
        });
      } else {
        importados++;

        log.push({
          tipo: "ok",
          mensaje: `Artículo importado: ${descripcion}`,
        });
      }
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
        articulo: articuloExcel.Articulo,
      });

      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }

  return {
    leidos: total,
    importados,
    salteados,
    errores,
    log,
  };
}