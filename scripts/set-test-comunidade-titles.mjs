/**
 * Aplica títulos de teste (Cinturão + Rei + Pilar) no planos_atletas do usuário alvo.
 * Zero custo recorrente — uma escrita por execução.
 *
 * Uso: node scripts/set-test-comunidade-titles.mjs [email]
 * Padrão: cliente@meccafit.com
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal, requireEnv } from "./lib/env.mjs";

const env = loadEnvLocal();
requireEnv(env, ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]);

const url = env.NEXT_PUBLIC_SUPABASE_URL.trim();
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY.trim();
const targetEmail = (process.argv[2] ?? "cliente@meccafit.com").trim().toLowerCase();

async function resolveUserId(client, email) {
  const { data, error } = await client.auth.admin.listUsers({ perPage: 200 });
  if (error) throw new Error(`auth list: ${error.message}`);
  const hit = data.users.find((user) => user.email?.toLowerCase() === email);
  if (!hit) throw new Error(`Usuário não encontrado: ${email}`);
  return hit.id;
}

async function main() {
  const client = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const userId = await resolveUserId(client, targetEmail);

  const { data: existing, error: readError } = await client
    .from("planos_atletas")
    .select("atleta_id, total_treinos_mensais_planejados")
    .eq("atleta_id", userId)
    .maybeSingle();

  if (readError) throw new Error(`planos_atletas read: ${readError.message}`);

  const sessions = existing?.total_treinos_mensais_planejados ?? 16;

  const { error: deleteError } = await client.from("planos_atletas").delete().eq("atleta_id", userId);
  if (deleteError) throw new Error(`planos_atletas delete: ${deleteError.message}`);

  const { error: insertError } = await client.from("planos_atletas").insert({
    atleta_id: userId,
    total_treinos_mensais_planejados: sessions,
    grupos_obrigatorios: [],
    tem_cinturao_duelo: true,
    tem_cinturao_superiores: true,
    tem_cinturao_inferiores: true,
    is_rei_das_chamas: true,
    is_rei_chamas_superiores: true,
    is_rei_chamas_inferiores: true,
    is_pilar_cooperativo: true,
  });

  if (insertError) throw new Error(`planos_atletas insert: ${insertError.message}`);

  console.log("OK · títulos de teste aplicados");
  console.log(`  email: ${targetEmail}`);
  console.log(`  atleta_id: ${userId}`);
  console.log("  flags: cinturão + rei (sup/inf) + pilar");
  console.log("");
  console.log("Abra Comunidade → Perfil e atualize a página (Ctrl+F5).");
}

main().catch((error) => {
  console.error("set-test-comunidade-titles:", error.message ?? error);
  process.exit(1);
});
