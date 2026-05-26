import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { requireSupabasePublicEnv } from "@/lib/supabase-env";
import type { Database } from "@/types/database.types";

type CreateMiddlewareClientResult = {
  supabase: ReturnType<typeof createServerClient<Database>>;
  response: NextResponse;
};

/**
 * Cliente Supabase para middleware (HERMES).
 * Equivalente moderno ao createMiddlewareClient — valida JWT via cookies de sessão.
 */
export function createMiddlewareClient(request: NextRequest): CreateMiddlewareClientResult {
  let response = NextResponse.next({ request });

  const { url: supabaseUrl, publicKey: supabaseAnonKey } = requireSupabasePublicEnv();

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  return { supabase, response };
}
