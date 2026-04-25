import "server-only";

const PLACEHOLDERS = new Set(["", "PASTE_SERVICE_ROLE_KEY_HERE"]);

function required(name: string): string {
  const v = process.env[name];
  if (!v || PLACEHOLDERS.has(v)) {
    throw new Error(
      `Missing or unset env var: ${name}. Set it in .env.local (locally) or with \`vercel env add\` (deployed).`,
    );
  }
  return v;
}

/**
 * Lazy getters — la validación corre solo cuando alguien accede a la
 * propiedad, no al importar el módulo. Esto es clave para que `proxy.ts`
 * (que importa staff-session → env) no bloquee toda la app si falta el
 * SERVICE_ROLE en local: las rutas públicas siguen funcionando.
 */
export const serverEnv = {
  get SUPABASE_URL() {
    return required("NEXT_PUBLIC_SUPABASE_URL");
  },
  get SUPABASE_SERVICE_ROLE_KEY() {
    return required("SUPABASE_SERVICE_ROLE_KEY");
  },
  get STAFF_JWT_SECRET() {
    return required("STAFF_JWT_SECRET");
  },
};

export const publicEnv = {
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
};
