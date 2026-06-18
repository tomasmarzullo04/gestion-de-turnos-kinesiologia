import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente de Supabase para el NAVEGADOR, usado solo para Realtime (lectura en
 * vivo de la tabla `slots`). Usa la anon key pública. Si las variables no están
 * configuradas, devuelve null y la app sigue funcionando sin tiempo real.
 *
 * Requiere en la base: Realtime habilitado en `slots` y una policy RLS de
 * SELECT para los roles anon/authenticated (ver README).
 */
let client: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  if (!client) {
    client = createClient(url, anonKey, {
      auth: { persistSession: false },
      realtime: { params: { eventsPerSecond: 5 } },
    });
  }
  return client;
}
