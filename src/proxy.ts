import { NextResponse, NextRequest } from "next/server";
import { isAccountSuspended } from "@/lib/account-access-status";
import {
  applySecurityHeaders,
  createRequestNonce,
} from "@/lib/security-headers";
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

function secureResponse(response: NextResponse, nonce: string): NextResponse {
  applySecurityHeaders(response, nonce);
  response.headers.set("x-nonce", nonce);
  return response;
}

export async function proxy(request: NextRequest) {
  const nonce = createRequestNonce();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  const securedRequest = new NextRequest(request.url, {
    headers: requestHeaders,
    method: request.method,
  });

  const { pathname } = securedRequest.nextUrl;

  if (!isProtectedRoute(pathname)) {
    return secureResponse(
      NextResponse.next({ request: { headers: requestHeaders } }),
      nonce,
    );
  }

  const { supabase, response } = createMiddlewareClient(securedRequest);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = securedRequest.nextUrl.clone();
    loginUrl.pathname = "/";
    loginUrl.search = "";
    return secureResponse(NextResponse.redirect(loginUrl), nonce);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, status_altar")
    .eq("id", user.id)
    .maybeSingle();

  if (isForjaRoute(pathname)) {
    if (!FORJADOR_PANEL_ROLES.has(String(profile?.role ?? ""))) {
      const dashboardUrl = securedRequest.nextUrl.clone();
      dashboardUrl.pathname = "/dashboard";
      return secureResponse(NextResponse.redirect(dashboardUrl), nonce);
    }
    return secureResponse(response, nonce);
  }

  if (profile?.role === "cliente" && isAccountSuspended(profile.status_altar)) {
    const loginUrl = securedRequest.nextUrl.clone();
    loginUrl.pathname = "/";
    loginUrl.search = "?suspended=1";
    return secureResponse(NextResponse.redirect(loginUrl), nonce);
  }

  if (FORJADOR_PANEL_ROLES.has(String(profile?.role ?? "")) && pathname === "/dashboard") {
    const forjaUrl = securedRequest.nextUrl.clone();
    forjaUrl.pathname = "/dashboard/forja";
    return secureResponse(NextResponse.redirect(forjaUrl), nonce);
  }

  return secureResponse(response, nonce);
}

export const config = {
  matcher: [
    {
      source:
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?|ico)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
