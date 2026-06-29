import { NextResponse, type NextRequest } from "next/server";
import { isAccountSuspended } from "@/lib/account-access-status";
import { createMiddlewareClient } from "@/lib/supabase-middleware";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/evolucao",
  "/treino",
  "/comunidade",
  "/perfil",
  "/forjador",
] as const;

const FORJADOR_PANEL_ROLES = new Set([
  "forjador",
  "forjador_linhagem",
  "forjador_soberano",
]);

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function isForjaRoute(pathname: string): boolean {
  return (
    pathname === "/dashboard/forja" ||
    pathname.startsWith("/dashboard/forja/") ||
    pathname === "/forjador" ||
    pathname.startsWith("/forjador/")
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isProtectedRoute(pathname)) {
    return NextResponse.next();
  }

  const { supabase, response } = createMiddlewareClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/";
    loginUrl.search = "";
    return NextResponse.redirect(loginUrl);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, status_altar")
    .eq("id", user.id)
    .maybeSingle();

  if (isForjaRoute(pathname)) {
    if (!FORJADOR_PANEL_ROLES.has(String(profile?.role ?? ""))) {
      const dashboardUrl = request.nextUrl.clone();
      dashboardUrl.pathname = "/dashboard";
      return NextResponse.redirect(dashboardUrl);
    }
    return response;
  }

  if (profile?.role === "cliente" && isAccountSuspended(profile.status_altar)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/";
    loginUrl.search = "?suspended=1";
    return NextResponse.redirect(loginUrl);
  }

  if (FORJADOR_PANEL_ROLES.has(String(profile?.role ?? "")) && pathname === "/dashboard") {
    const forjaUrl = request.nextUrl.clone();
    forjaUrl.pathname = "/dashboard/forja";
    return NextResponse.redirect(forjaUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/dashboard",
    "/dashboard/:path*",
    "/evolucao",
    "/evolucao/:path*",
    "/treino",
    "/treino/:path*",
    "/comunidade",
    "/comunidade/:path*",
    "/perfil",
    "/perfil/:path*",
    "/forjador",
    "/forjador/:path*",
  ],
};
