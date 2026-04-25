import { NextRequest, NextResponse } from "next/server";
import { verifyStaffToken, STAFF_COOKIE } from "@/lib/auth/staff-session";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

type CookieToSet = { name: string; value: string; options: CookieOptions };

const PUBLIC_PATHS = new Set<string>([
  "/",
  "/login",
  "/admin/login",
  "/admin/setup",
  "/manifest.webmanifest",
  "/favicon.ico",
  "/icon.png",
  "/apple-icon.png",
  "/sw.js",
]);

function isPublic(pathname: string) {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (pathname.startsWith("/_next")) return true;
  if (pathname.startsWith("/icons/")) return true;
  if (pathname.startsWith("/api/auth/")) return true;
  if (pathname.startsWith("/share/")) return true;
  if (pathname.startsWith("/api/share-download/")) return true;
  return false;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();

  if (pathname.startsWith("/admin")) {
    const res = NextResponse.next();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => req.cookies.getAll(),
          setAll: (toSet: CookieToSet[]) =>
            toSet.forEach(({ name, value, options }) =>
              res.cookies.set(name, value, options),
            ),
        },
      },
    );
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    return res;
  }

  if (pathname.startsWith("/staff")) {
    const token = req.cookies.get(STAFF_COOKIE)?.value;
    const session = token ? await verifyStaffToken(token) : null;
    if (!session) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|_next/data|favicon|icons|.*\\.(?:png|jpg|jpeg|svg|webmanifest)$).*)"],
};
