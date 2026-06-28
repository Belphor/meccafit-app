-- Correções: audit log VTC · personal no feed · prescrição por dia da semana

-- ---------------------------------------------------------------------------
-- 1. Audit log — aceitar acções do painel forjador
-- ---------------------------------------------------------------------------

ALTER TABLE public.argos_forja_audit_log
  DROP CONSTRAINT IF EXISTS argos_forja_audit_log_action_check;

ALTER TABLE public.argos_forja_audit_log
  ADD CONSTRAINT argos_forja_audit_log_action_check CHECK (
    action IN (
      'purify_to_ashes',
      'deactivate_account',
      'reactivate_account',
      'modify_statistics',
      'batch_planilha',
      'forja_adjust_vtc'
    )
  );

-- ---------------------------------------------------------------------------
-- 2. Prescrições de treino — dia da semana (Seg=1 … Sáb=6)
-- ---------------------------------------------------------------------------

ALTER TABLE public.prescricoes_treino_forjador
  ADD COLUMN IF NOT EXISTS dia_semana smallint;

UPDATE public.prescricoes_treino_forjador AS p
SET dia_semana = sub.dia_semana
FROM (
  SELECT DISTINCT ON (pf.atleta_id, pf.grupo_muscular)
    pf.atleta_id,
    pf.grupo_muscular,
    pf.dia_semana
  FROM public.planilhas_forjador pf
  ORDER BY pf.atleta_id, pf.grupo_muscular, pf.ordem
) AS sub
WHERE p.atleta_id = sub.atleta_id
  AND p.grupo_muscular = sub.grupo_muscular
  AND p.dia_semana IS NULL;

UPDATE public.prescricoes_treino_forjador
SET dia_semana = 1
WHERE dia_semana IS NULL;

ALTER TABLE public.prescricoes_treino_forjador
  ALTER COLUMN dia_semana SET NOT NULL;

ALTER TABLE public.prescricoes_treino_forjador
  DROP CONSTRAINT IF EXISTS prescricoes_treino_atleta_grupo_ex_key;

ALTER TABLE public.prescricoes_treino_forjador
  DROP CONSTRAINT IF EXISTS prescricoes_treino_dia_check;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'prescricoes_treino_dia_check'
      AND conrelid = 'public.prescricoes_treino_forjador'::regclass
  ) THEN
    ALTER TABLE public.prescricoes_treino_forjador
      ADD CONSTRAINT prescricoes_treino_dia_check CHECK (dia_semana BETWEEN 1 AND 6);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'prescricoes_treino_atleta_dia_grupo_ex_key'
      AND conrelid = 'public.prescricoes_treino_forjador'::regclass
  ) THEN
    ALTER TABLE public.prescricoes_treino_forjador
      ADD CONSTRAINT prescricoes_treino_atleta_dia_grupo_ex_key
      UNIQUE (atleta_id, dia_semana, grupo_muscular, exercicio_id);
  END IF;
END $$;

COMMENT ON COLUMN public.prescricoes_treino_forjador.dia_semana IS
  'Dia da planilha (Seg=1 … Sáb=6) em que o exercício é prescrito.';

-- ---------------------------------------------------------------------------
-- 3. Feed VTC — nome do personal via vínculo VIP
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.argos_forja_vtc_feed(p_limit integer DEFAULT 64)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date := (timezone('America/Sao_Paulo', now()))::date;
  v_lim integer := LEAST(GREATEST(COALESCE(p_limit, 64), 1), 128);
  v_operator uuid := auth.uid();
BEGIN
  IF NOT public.argos_is_forjador_panel() THEN
    RAISE EXCEPTION 'permission denied'
      USING ERRCODE = '42501';
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(row ORDER BY (row->>'vtcToday')::numeric DESC, row->>'displayName')
    FROM (
      SELECT jsonb_build_object(
        'clientId', p.id,
        'displayName', COALESCE(NULLIF(btrim(p.full_name), ''), NULLIF(btrim(p.nome_linhagem), ''), 'Atleta ' || left(p.id::text, 8)),
        'forgerName', COALESCE(
          NULLIF(btrim(fj.full_name), ''),
          NULLIF(btrim(fj.nome_linhagem), ''),
          '—'
        ),
        'phaseTier', LEAST(GREATEST(COALESCE(p.phase_tier, 1), 1), 5),
        'statusAltar', COALESCE(p.status_altar, 'ativo'),
        'vtcToday', COALESCE(b.vtc_total, 0),
        'vtcAvg7d', COALESCE((
          SELECT AVG(sub.vtc_total)
          FROM (
            SELECT bd.vtc_total
            FROM public.balanco_termico_diario bd
            WHERE bd.user_id = p.id
              AND bd.data_treino >= (v_today - 7)
              AND bd.data_treino < v_today
          ) sub
        ), 0),
        'vtc30d', COALESCE((
          SELECT SUM(bd.vtc_total)
          FROM public.balanco_termico_diario bd
          WHERE bd.user_id = p.id AND bd.data_treino >= (v_today - 30)
        ), 0),
        'updatedAt', COALESCE(b.updated_at, p.updated_at),
        'isOwnClient', (
          EXISTS (
            SELECT 1 FROM public.forger_client_bonds bnd
            WHERE bnd.client_id = p.id AND bnd.forger_id = v_operator
          )
          OR p.forjador_id = v_operator
        ),
        'hasVipBond', EXISTS (
          SELECT 1 FROM public.forger_client_bonds fcb
          WHERE fcb.client_id = p.id
        ),
        'alertSpike',
          COALESCE(b.vtc_total, 0) > 0
          AND COALESCE((
            SELECT AVG(sub.vtc_total)
            FROM (
              SELECT bd.vtc_total
              FROM public.balanco_termico_diario bd
              WHERE bd.user_id = p.id
                AND bd.data_treino >= (v_today - 7)
                AND bd.data_treino < v_today
            ) sub
          ), 0) > 0
          AND COALESCE(b.vtc_total, 0) > (
            COALESCE((
              SELECT AVG(sub.vtc_total)
              FROM (
                SELECT bd.vtc_total
                FROM public.balanco_termico_diario bd
                WHERE bd.user_id = p.id
                  AND bd.data_treino >= (v_today - 7)
                  AND bd.data_treino < v_today
              ) sub
            ), 0) * 4
          )
      ) AS row
      FROM public.profiles p
      LEFT JOIN public.balanco_termico_diario b
        ON b.user_id = p.id AND b.data_treino = v_today
      LEFT JOIN LATERAL (
        SELECT fcb2.forger_id
        FROM public.forger_client_bonds fcb2
        WHERE fcb2.client_id = p.id
        ORDER BY fcb2.created_at DESC
        LIMIT 1
      ) fcb ON true
      LEFT JOIN public.profiles fj ON fj.id = COALESCE(fcb.forger_id, p.forjador_id)
      WHERE p.role = 'cliente'::public.user_role
      ORDER BY COALESCE(b.vtc_total, 0) DESC, p.full_name NULLS LAST
      LIMIT v_lim
    ) sub
  ), '[]'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.argos_forja_vtc_feed(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.argos_forja_vtc_feed(integer) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. Planilha batch — acção de audit alinhada ao constraint
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.argos_batch_upsert_planilhas_forjador(
  p_atleta_id uuid,
  p_rows jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row jsonb;
  v_dia smallint;
  v_grupo text;
  v_ordem smallint;
  v_inserted integer := 0;
BEGIN
  IF NOT public.argos_can_access_cliente(p_atleta_id) THEN
    RAISE EXCEPTION 'permission denied for planilha upsert'
      USING ERRCODE = '42501';
  END IF;

  IF NOT public.argos_is_forjador_linhagem()
     AND NOT public.argos_is_forjador_soberano() THEN
    RAISE EXCEPTION 'permission denied: forjador only'
      USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.planilhas_forjador WHERE atleta_id = p_atleta_id;

  FOR v_row IN SELECT value FROM jsonb_array_elements(p_rows)
  LOOP
    v_dia := (v_row->>'dia_semana')::smallint;
    v_grupo := upper(btrim(v_row->>'grupo_muscular'));
    v_ordem := COALESCE((v_row->>'ordem')::smallint, 1);

    IF v_dia IS NULL OR v_dia < 1 OR v_dia > 6 THEN
      CONTINUE;
    END IF;
    IF v_grupo NOT IN ('PEITO', 'COSTAS', 'PERNAS', 'OMBROS', 'BRACOS', 'ABDOMEN') THEN
      CONTINUE;
    END IF;
    IF v_ordem < 1 OR v_ordem > 5 THEN
      v_ordem := 1;
    END IF;

    INSERT INTO public.planilhas_forjador (atleta_id, dia_semana, grupo_muscular, ordem)
    VALUES (p_atleta_id, v_dia, v_grupo, v_ordem)
    ON CONFLICT (atleta_id, dia_semana, ordem)
    DO UPDATE SET grupo_muscular = EXCLUDED.grupo_muscular, updated_at = now();

    v_inserted := v_inserted + 1;
  END LOOP;

  IF public.argos_is_forjador_soberano() THEN
    INSERT INTO public.argos_forja_audit_log (sovereign_id, target_id, action, payload)
    VALUES (
      auth.uid(),
      p_atleta_id,
      'batch_planilha',
      jsonb_build_object('rows_upserted', v_inserted)
    );
  END IF;

  RETURN jsonb_build_object('rows_upserted', v_inserted);
END;
$$;
