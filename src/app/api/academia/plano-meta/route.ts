import { NextResponse } from "next/server";
import { resolveAuthedSupabase } from "@/lib/supabase-server";

function parseTotalTreinos(payload: unknown): number | null {
  if (!payload || typeof payload !== "object") return null;

  const value = (payload as { totalTreinos?: unknown }).totalTreinos;
  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(parsed)) return null;
  return Math.trunc(parsed);
}

export async function POST(request: Request) {
  const auth = await resolveAuthedSupabase(request);
  if (!auth) {
    return NextResponse.json({ error: "SESSION_REQUIRED" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const totalTreinos = parseTotalTreinos(payload);
  if (totalTreinos === null || totalTreinos < 4 || totalTreinos > 28) {
    return NextResponse.json(
      { error: "INVALID_TOTAL_TREINOS", message: "Informe totalTreinos entre 4 e 28." },
      { status: 400 },
    );
  }

  const { data, error } = await auth.client.rpc("client_sync_plano_meta", {
    p_total_treinos: totalTreinos,
  });

  if (error) {
    return NextResponse.json(
      { error: "SUPABASE_ERROR", message: error.message ?? "Falha ao sincronizar plano." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, data });
}
