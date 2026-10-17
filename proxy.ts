import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { defaultLocale, isLocale, localeCookieName } from "@/lib/i18n/config";
import { isAdminUser } from "@/lib/auth/roles";
import type { Database } from "@/types/database";

// Next.js 16 renamed `middleware.ts` to `proxy.ts` (the `middleware`
// export is deprecated in favor of `proxy`). See node_modules/next/dist/docs.

const PROTECTED_PREFIX = "/admin";
const LOGIN_PATH = "/login";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  // --- Supabase session refresh -----------------------------------
  // @supabase/ssr needs this to run on every request that reaches a
  // Server Component: it refreshes the auth token and rewrites the
  // session cookies onto the response before any RSC renders, since a
  // Server Component itself can't write cookies.
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // --- /admin guard --------------------------------------------------
  const { pathname } = request.nextUrl;

  // "Signed in" is not "admin": anyone can self-register against a
  // Supabase project that has sign-up enabled, so the guard checks the
  // admin claim, not just the presence of a session. (Checking only
  // `user` here would also bounce a non-admin between /admin and
  // /login forever.)
  const isAdmin = isAdminUser(user);

  if (pathname.startsWith(PROTECTED_PREFIX) && !isAdmin) {
    const url = request.nextUrl.clone();
    url.pathname = LOGIN_PATH;
    return NextResponse.redirect(url);
  }

  if (pathname === LOGIN_PATH && isAdmin) {
    const url = request.nextUrl.clone();
    url.pathname = PROTECTED_PREFIX;
    return NextResponse.redirect(url);
  }

  // --- locale cookie (Stage 1) ----------------------------------------
  const existingLocale = request.cookies.get(localeCookieName)?.value;
  if (!isLocale(existingLocale)) {
    const acceptLanguage = request.headers.get("accept-language") ?? "";
    const preferred = acceptLanguage.toLowerCase().includes("en")
      ? "en"
      : defaultLocale;
    response.cookies.set(localeCookieName, preferred, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
