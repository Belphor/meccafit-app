import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabasePublicKey, getSupabaseUrl, requireSupabasePublicEnv } from "@/lib/supabase-env";
import type { Database } from "@/types/database.types";

export type AuthedSupabase = {
  client: SupabaseClient<Database>;
  userId: string;
};

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const { url: supabaseUrl, publicKey: supabaseAnonKey } = requireSupabasePublicEnv();

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // setAll indisponível em Server Components — ok em Route Handlers.
        }
      },
    },
  });
}

export async function resolveAuthedSupabase(request?: Request): Promise<AuthedSupabase | null> {
  const cookieClient = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await cookieClient.auth.getUser();

  if (user?.id && !error) {
    return { client: cookieClient, userId: user.id };
  }

  const bearerToken = request?.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!bearerToken) return null;

  const authedClient = createClient<Database>(getSupabaseUrl(), getSupabasePublicKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${bearerToken}` } },
  });

  const {
    data: { user: bearerUser },
    error: bearerError,
  } = await authedClient.auth.getUser();

  if (bearerError || !bearerUser?.id) return null;

  return { client: authedClient, userId: bearerUser.id };
}
