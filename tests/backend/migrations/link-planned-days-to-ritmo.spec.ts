import {
  applySqlFile,
  installRitmoBaseSchema,
  resetTestDatabase,
  TEST_USER_ID,
  withTestClient,
} from "../utils/test-db";

const UP_MIGRATION = "supabase/migrations/20260704100000_link_planned_days_to_ritmo.sql";
const DOWN_MIGRATION =
  "tests/backend/migrations/20260704100000_link_planned_days_to_ritmo.down.sql";

describe("migration 20260704100000_link_planned_days_to_ritmo", () => {
  beforeEach(async () => {
    await resetTestDatabase();
    await installRitmoBaseSchema();
  });

  it("aplica o up em banco isolado e calcula meta mensal pelo total planejado", async () => {
    await applySqlFile(UP_MIGRATION);

    await withTestClient(async (client) => {
      await client.query(
        "INSERT INTO public.profiles (id, full_name) VALUES ($1, 'Atleta Migration')",
        [TEST_USER_ID],
      );
      await client.query(
        `
          INSERT INTO public.planos_atletas (atleta_id, total_treinos_mensais_planejados)
          VALUES ($1, 20)
        `,
        [TEST_USER_ID],
      );

      const calculated = await client.query(
        "SELECT public.evolucao_calcular_meta_vtc_por_treinos(20)::numeric(16, 2) AS meta",
      );
      expect(calculated.rows[0].meta).toBe("10000.00");

      const resolved = await client.query(
        "SELECT public.evolucao_resolve_meta_vtc_mensal($1)::numeric(16, 2) AS meta",
        [TEST_USER_ID],
      );
      expect(resolved.rows[0].meta).toBe("10000.00");
    });
  });

  it("executa up e down sem tocar em desenvolvimento/producao", async () => {
    await applySqlFile(UP_MIGRATION);

    await withTestClient(async (client) => {
      const upResult = await client.query(`
        SELECT to_regprocedure('public.client_sync_plano_meta(integer)') AS fn
      `);
      expect(upResult.rows[0].fn).toBe("client_sync_plano_meta(integer)");
    });

    await applySqlFile(DOWN_MIGRATION);

    await withTestClient(async (client) => {
      const downResult = await client.query(`
        SELECT to_regprocedure('public.client_sync_plano_meta(integer)') AS fn
      `);
      expect(downResult.rows[0].fn).toBeNull();
    });
  });
});
