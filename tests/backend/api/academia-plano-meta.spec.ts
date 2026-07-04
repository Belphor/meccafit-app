import request from "supertest";
import { POST } from "@/app/api/academia/plano-meta/route";
import { createNextRouteServer } from "../utils/next-route-server";
import {
  applySqlFile,
  callClientSyncPlanoMeta,
  installRitmoBaseSchema,
  resetTestDatabase,
  seedTestProfile,
  TEST_USER_ID,
  withTestClient,
} from "../utils/test-db";

const mockResolveAuthedSupabase = jest.fn();

jest.mock("@/lib/supabase-server", () => ({
  resolveAuthedSupabase: (...args: unknown[]) => mockResolveAuthedSupabase(...args),
}));

function createRpcBackedByTestDatabase() {
  return jest.fn(async (name: string, args: { p_total_treinos?: number }) => {
    if (name !== "client_sync_plano_meta") {
      return { data: null, error: { message: `RPC inesperada: ${name}` } };
    }

    try {
      const data = await callClientSyncPlanoMeta(TEST_USER_ID, Number(args.p_total_treinos));
      return { data, error: null };
    } catch (error) {
      return {
        data: null,
        error: { message: error instanceof Error ? error.message : String(error) },
      };
    }
  });
}

describe("POST /api/academia/plano-meta", () => {
  beforeEach(async () => {
    mockResolveAuthedSupabase.mockReset();
    await resetTestDatabase();
    await installRitmoBaseSchema();
    await applySqlFile("supabase/migrations/20260704100000_link_planned_days_to_ritmo.sql");
    await seedTestProfile(TEST_USER_ID);
  });

  it("recusa requisicao sem sessao", async () => {
    mockResolveAuthedSupabase.mockResolvedValue(null);
    const server = createNextRouteServer(POST);

    try {
      const response = await request(server)
        .post("/api/academia/plano-meta")
        .send({ totalTreinos: 20 });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: "SESSION_REQUIRED" });
    } finally {
      server.close();
    }
  });

  it("salva a meta apenas no banco temporario de teste", async () => {
    const rpc = createRpcBackedByTestDatabase();
    mockResolveAuthedSupabase.mockResolvedValue({
      userId: TEST_USER_ID,
      client: { rpc },
    });

    const server = createNextRouteServer(POST);

    try {
      const response = await request(server)
        .post("/api/academia/plano-meta")
        .send({ totalTreinos: 20 });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        ok: true,
        data: expect.objectContaining({
          ok: true,
          total_treinos_mensais_planejados: 20,
          meta_vtc_mensal_kg: 10000,
          target_days_per_week: 5,
        }),
      });
      expect(rpc).toHaveBeenCalledWith("client_sync_plano_meta", { p_total_treinos: 20 });

      await withTestClient(async (client) => {
        const saved = await client.query(
          `
            SELECT
              pa.total_treinos_mensais_planejados,
              pa.meta_vtc_mensal_kg::numeric(16, 2)::text AS meta_vtc_mensal_kg,
              p.target_days_per_week
            FROM public.planos_atletas pa
            JOIN public.profiles p ON p.id = pa.atleta_id
            WHERE pa.atleta_id = $1
          `,
          [TEST_USER_ID],
        );

        expect(saved.rowCount).toBe(1);
        expect(saved.rows[0]).toEqual({
          total_treinos_mensais_planejados: 20,
          meta_vtc_mensal_kg: "10000.00",
          target_days_per_week: 5,
        });
      });
    } finally {
      server.close();
    }
  });
});
