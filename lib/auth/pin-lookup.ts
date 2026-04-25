import "server-only";
import { createHmac } from "node:crypto";
import { serverEnv } from "@/lib/env";

/**
 * Hash determinístico (HMAC) del PIN con el secret del server.
 * Permite buscar staff por PIN directamente y enforce unicidad.
 * No reversible sin el STAFF_JWT_SECRET.
 */
export function pinLookup(pin: string): string {
  return createHmac("sha256", serverEnv.STAFF_JWT_SECRET).update(pin).digest("hex");
}
