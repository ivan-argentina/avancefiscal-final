import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log("SUPABASE URL:", supabaseUrl);
console.log("SUPABASE KEY CARGADA:", !!supabaseKey);
console.log("PRIMEROS 10 CARACTERES:", supabaseKey?.substring(0, 10));

export const supabase = createClient(supabaseUrl, supabaseKey);
