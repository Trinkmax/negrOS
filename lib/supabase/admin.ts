import "server-only";
import { createClient } from "@supabase/supabase-js";
import { serverEnv } from "@/lib/env";

/**
 * Supabase admin client — service_role.
 * Bypassea RLS. Solo usar dentro de Server Actions / route handlers
 * después de validar la sesión del usuario por nuestro lado.
 */
export function supabaseAdmin() {
  return createClient(serverEnv.SUPABASE_URL, serverEnv.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
