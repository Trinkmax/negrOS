import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { serverEnv } from "@/lib/env";

export const STAFF_COOKIE = "nos_staff";
const ALG = "HS256";
const TTL_DAYS = 30;

export type StaffSession = {
  staffId: string;
  branchId: string;
  name: string;
};

function secret() {
  return new TextEncoder().encode(serverEnv.STAFF_JWT_SECRET);
}

export async function signStaffSession(payload: StaffSession): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(`${TTL_DAYS}d`)
    .sign(secret());
}

export async function verifyStaffToken(token: string): Promise<StaffSession | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: [ALG] });
    if (
      typeof payload.staffId === "string" &&
      typeof payload.branchId === "string" &&
      typeof payload.name === "string"
    ) {
      return {
        staffId: payload.staffId,
        branchId: payload.branchId,
        name: payload.name,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function setStaffCookie(token: string) {
  const store = await cookies();
  store.set(STAFF_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TTL_DAYS * 24 * 60 * 60,
  });
}

export async function clearStaffCookie() {
  const store = await cookies();
  store.delete(STAFF_COOKIE);
}

export async function getStaffSession(): Promise<StaffSession | null> {
  const store = await cookies();
  const token = store.get(STAFF_COOKIE)?.value;
  if (!token) return null;
  return await verifyStaffToken(token);
}

export async function requireStaff(): Promise<StaffSession> {
  const session = await getStaffSession();
  if (!session) throw new Error("UNAUTHENTICATED");
  return session;
}
