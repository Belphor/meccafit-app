-- FENYXIA · Monitoramento global VTC · todos os forjadores · custo zero (RPC SECURITY DEFINER)

-- ---------------------------------------------------------------------------
-- 1. Helper · qualquer papel do painel forjador
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.argos_is_forjador_panel()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = (SELECT auth.uid())
      AND role IN (
        'forjador'::public.user_role,
        'forjador_linhagem'::public.user_role,
        'forjador_soberano'::public.user_role
      )
  );
$$;

REVOKE ALL ON FUNCTION public.argos_is_forjador_panel() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.argos_is_forjador_panel() TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. Lista global de clientes para monitoramento (leitura agregada · sem PII extra)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.argos_forja_monitor_athletes()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date := (timezone('America/Sao_Paulo', now()))::date;
  v_operator uuid := auth.uid();
BEGIN
  IF NOT public.argos_is_forjador_panel() THEN
    RAISE EXCEPTION 'permission denied'
      USING ERRCODE = '42501';
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(row ORDER BY row->>'displayName')
    FROM (
      SELECT jsonb_build_object(
        'clientId', p.id,
        'bondId', COALESCE(fcb.id::text, 'global-' || p.id::text),
        'forgerId', COALESCE(fcb.forger_id, p.forjador_id, v_operator),
        'displayName', COALESCE(NULLIF(btrim(p.full_name), ''), NULLIF(btrim(p.nome_linhagem), ''), 'Atleta ' || left(p.id::text, 8)),
        'lineageName', NULLIF(btrim(p.nome_linhagem), ''),
        'phaseTier', LEAST(GREATEST(COALESCE(p.phase_tier, 1), 1), 5),
        'bondedAt', COALESCE(fcb.created_at, p.updated_at, now()),
        'forgerName', COALESCE(
          NULLIF(btrim(fj.full_name), ''),
          NULLIF(btrim(fj.nome_linhagem), ''),
          NULL
        ),
        'statusAltar', p.status_altar,
        'isGlobalListing', (p.forjador_id IS DISTINCT FROM v_operator),
        'hasVipBond', (fcb.id IS NOT NULL),
        'vtcToday', COALESCE((
          SELECT b.vtc_total
          FROM public.balanco_termico_diario b
          WHERE b.user_id = p.id AND b.data_treino = v_today
        ), 0),
        'vtcAvg7d', COALESCE((
          SELECT AVG(sub.vtc_total)
          FROM (
            SELECT b.vtc_total
            FROM public.balanco_termico_diario b
            WHERE b.user_id = p.id
              AND b.data_treino >= (v_today - 7)
              AND b.data_treino < v_today
          ) sub
        ), 0),
        'vtc30d', COALESCE((
          SELECT SUM(b.vtc_total)
          FROM public.balanco_termico_diario b
          WHERE b.user_id = p.id AND b.data_treino >= (v_today - 30)
        ), 0)
      ) AS row
      FROM public.profiles p
      LEFT JOIN LATERAL (
        SELECT fcb2.id, fcb2.forger_id, fcb2.created_at
        FROM public.forger_client_bonds fcb2
        WHERE fcb2.client_id = p.id
        ORDER BY fcb2.created_at DESC
        LIMIT 1
      ) fcb ON true
      LEFT JOIN public.profiles fj ON fj.id = COALESCE(fcb.forger_id, p.forjador_id)
      WHERE p.role = 'cliente'::public.user_role
      ORDER BY p.full_name NULLS LAST, p.nome_linhagem NULLS LAST
      LIMIT 256
    ) sub
  ), '[]'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.argos_forja_monitor_athletes() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.argos_forja_monitor_athletes() TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. Feed de actualizações VTC (todos os clientes · ordenado por VTC hoje)
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
        'isOwnClient', (p.forjador_id = auth.uid()),
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
      LEFT JOIN public.profiles fj ON fj.id = p.forjador_id
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
-- 4. Anti-fraud signals · visão global para todos os forjadores do painel
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.argos_forja_fraud_signals(p_cliente_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_signals jsonb := '[]'::jsonb;
  v_row record;
  v_today date := (timezone('America/Sao_Paulo', now()))::date;
BEGIN
  IF NOT public.argos_is_forjador_panel() THEN
    RAISE EXCEPTION 'permission denied'
      USING ERRCODE = '42501';
  END IF;

  FOR v_row IN
    SELECT
      p.id AS atleta_id,
      COALESCE(NULLIF(btrim(p.full_name), ''), NULLIF(btrim(p.nome_linhagem), ''), p.id::text) AS display_name,
      p.status_altar,
      p.phase_tier,
      COALESCE((
        SELECT SUM(b.vtc_total)
        FROM public.balanco_termico_diario b
        WHERE b.user_id = p.id AND b.data_treino >= (v_today - 30)
      ), 0) AS vtc_30d,
      COALESCE((
        SELECT b.vtc_total
        FROM public.balanco_termico_diario b
        WHERE b.user_id = p.id AND b.data_treino = v_today
      ), 0) AS vtc_today,
      COALESCE((
        SELECT AVG(sub.vtc_total)
        FROM (
          SELECT b.vtc_total
          FROM public.balanco_termico_diario b
          WHERE b.user_id = p.id
            AND b.data_treino >= (v_today - 7)
            AND b.data_treino < v_today
        ) sub
      ), 0) AS vtc_avg_7d,
      COALESCE((
        SELECT COUNT(*)
        FROM public.historico_cargas hc
        WHERE hc.atleta_id = p.id
          AND hc.data_registro >= (now() - interval '24 hours')
      ), 0) AS cargas_24h,
      COALESCE((
        SELECT COUNT(*)
        FROM public.historico_treinos ht
        WHERE ht.cliente_id = p.id
          AND ht.registrado_em >= (now() - interval '7 days')
      ), 0) AS treinos_7d
    FROM public.profiles p
    WHERE p.role = 'cliente'::public.user_role
      AND (
        p_cliente_id IS NULL
        OR p.id = p_cliente_id
      )
    ORDER BY p.full_name NULLS LAST, p.nome_linhagem NULLS LAST
    LIMIT CASE WHEN p_cliente_id IS NULL THEN 128 ELSE 1 END
  LOOP
    IF lower(COALESCE(v_row.status_altar, 'ativo')) NOT IN ('ativo', 'purificado')
       AND v_row.treinos_7d > 0 THEN
      v_signals := v_signals || jsonb_build_array(jsonb_build_object(
        'severity', 'critical',
        'code', 'SUSPENDED_ACTIVE_TRAINING',
        'atleta_id', v_row.atleta_id,
        'display_name', v_row.display_name,
        'message', 'Conta suspensa com treinos registados nos últimos 7 dias.'
      ));
    END IF;

    IF v_row.vtc_today > 0
       AND v_row.vtc_avg_7d > 0
       AND v_row.vtc_today > (v_row.vtc_avg_7d * 4) THEN
      v_signals := v_signals || jsonb_build_array(jsonb_build_object(
        'severity', 'warn',
        'code', 'VTC_SPIKE',
        'atleta_id', v_row.atleta_id,
        'display_name', v_row.display_name,
        'message', format('VTC hoje (%.0f kg) excede 4× média 7d (%.0f kg).', v_row.vtc_today, v_row.vtc_avg_7d)
      ));
    END IF;

    IF v_row.cargas_24h > 30 THEN
      v_signals := v_signals || jsonb_build_array(jsonb_build_object(
        'severity', 'critical',
        'code', 'CARGA_FLOOD',
        'atleta_id', v_row.atleta_id,
        'display_name', v_row.display_name,
        'message', format('%s registos em historico_cargas nas últimas 24h.', v_row.cargas_24h)
      ));
    END IF;

    IF v_row.phase_tier >= 3 AND v_row.vtc_30d < 1000 THEN
      v_signals := v_signals || jsonb_build_array(jsonb_build_object(
        'severity', 'warn',
        'code', 'TIER_VTC_MISMATCH',
        'atleta_id', v_row.atleta_id,
        'display_name', v_row.display_name,
        'message', format('Fase %s com VTC 30d baixo (%.0f kg).', v_row.phase_tier, v_row.vtc_30d)
      ));
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'signals', v_signals,
    'count', jsonb_array_length(v_signals)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.argos_forja_fraud_signals(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.argos_forja_fraud_signals(uuid) TO authenticated;
