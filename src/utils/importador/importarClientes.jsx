import { supabase } from "../../hook/supabaseClient";

const mapaIva = {
  1: 1, // Responsable Inscripto
  2: 5, // Responsable No Inscripto
  4: 4, // Sujeto Exento
  5: 3, // Consumidor Final
  6: 2, // Monotributo
};

export async function importarClientes(
  clientesExcel,
  mapaCiudades,
  idEmpresa,
  onProgress,
) {
  let importados = 0;
  let salteados = 0;
  let errores = 0;

  const log = [];
  const total = clientesExcel.length;
  const actualizarProgreso = async (i, cliente) => {
    if (onProgress) {
      onProgress({
        actual: i + 1,
        total,
        porcentaje: Math.round(((i + 1) / total) * 100),
        cliente: cliente.Cliente,
      });

      //await new Promise((resolve) => setTimeout(resolve, 20));
    }
  };

  for (let i = 0; i < clientesExcel.length; i++) {
    const cliente = clientesExcel[i];

    try {
      const nombreCliente = String(cliente.Cliente || "").trim();

      if (!nombreCliente) {
        errores++;
        log.push({
          tipo: "error",
          mensaje: `Fila ${i + 1}: cliente sin nombre`,
        });
        continue;
      }

      const idCiudad = mapaCiudades[cliente.idciu];

      const { data: existente, error: errorBuscar } = await supabase
        .from("clientes")
        .select("id")
        .eq("idempresa", idEmpresa)
        .eq("nombre", nombreCliente)
        .maybeSingle();

      if (errorBuscar) throw errorBuscar;

      if (existente) {
        salteados++;
        log.push({
          tipo: "duplicado",
          mensaje: `Cliente omitido por duplicado: ${nombreCliente}`,
        });
        await actualizarProgreso(i, cliente);
        continue;
      }

      const { error } = await supabase.from("clientes").insert({
        nombre: nombreCliente,
        direccion: cliente.direccion || "",
        telefono: cliente.telefono || "",
        email: cliente.email || "",
        cuit: cliente.cuit || "",
        idciudad: idCiudad || null,
        idciva: mapaIva[cliente.idciva] ?? 3,
        idempresa: idEmpresa,
      });

      if (error) {
        errores++;
        log.push({
          tipo: "error",
          mensaje: `Error importando ${nombreCliente}: ${error.message}`,
        });
      } else {
        importados++;
        log.push({
          tipo: "ok",
          mensaje: `Cliente importado: ${nombreCliente}`,
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
        cliente: cliente.Cliente,
      });
      await new Promise((resolve) => setTimeout(resolve, 20));
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
