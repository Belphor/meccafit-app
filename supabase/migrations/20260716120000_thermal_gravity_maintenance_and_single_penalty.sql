-- Gravidade Térmica
-- (1)(2) Meta de MANUTENÇÃO separada da meta de SUBIDA.
--        Manter a fase deixa de exigir o patamar da PRÓXIMA fase (o mesmo esforço de subir).
--        Agora manter = 70% do patamar VTC da fase ATUAL (tolerância). Fogo Cósmico deixa de
--        exigir 100.000 kg/mês só para se sustentar (torna o topo mantível).
-- (4)   Penalidade única por ciclo: se a virada do mês já rebaixou a fase, a inatividade de 30d
--        NÃO rebaixa de novo no mesmo carregamento (o usuário perde no máximo 1 nível de cada vez).

BEGIN;

-- (1)(2) Meta de manutenção do ciclo civil = 70% do patamar da fase atual.
CREATE OR REPLACE FUNCTION public.argos_resolve_monthly_maintenance_goal_kg(p_tier smallint)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_cfg record;
  v_ratio numeric := 0.70;
  v_threshold numeric;
BEGIN
  SELECT
    COALESCE((SELECT phase_vtc_faisca FROM public.argos_academia_config WHERE id = 1 LIMIT 1), 5000) AS faisca,
    COALESCE((SELECT phase_vtc_brasa FROM public.argos_academia_config WHERE id = 1 LIMIT 1), 20000) AS brasa,
    COALESCE((SELECT phase_vtc_labareda FROM public.argos_academia_config WHERE id = 1 LIMIT 1), 50000) AS labareda,
    COALESCE((SELECT phase_vtc_fogo_cosmico FROM public.argos_academia_config WHERE id = 1 LIMIT 1), 100000) AS fogo
  INTO v_cfg;

  IF p_tier <= 1 THEN
    RETURN 0;                        -- Cinzas: piso, nunca cai
  ELSIF p_tier = 2 THEN
    v_threshold := v_cfg.faisca;     -- Faísca
  ELSIF p_tier = 3 THEN
    v_threshold := v_cfg.brasa;      -- Brasa
  ELSIF p_tier = 4 THEN
    v_threshold := v_cfg.labareda;   -- Labareda
  ELSE
    v_threshold := v_cfg.fogo;       -- Fogo Cósmico
  END IF;

  RETURN ROUND(v_threshold * v_ratio, 2);
END;
$$;

COMMENT ON FUNCTION public.argos_resolve_monthly_maintenance_goal_kg(smallint) IS
  'Gravidade Térmica · meta de manutenção (kg) = 70% do patamar VTC da fase atual. Abaixo dela, a fase regride na virada.';

REVOKE ALL ON FUNCTION public.argos_resolve_monthly_maintenance_goal_kg(smallint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.argos_resolve_monthly_maintenance_goal_kg(smallint) TO authenticated, service_role;

-- (1)(2) Virada do mês: regressão passa a usar a meta de MANUTENÇÃO (não a de subida).
CREATE OR REPLACE FUNCTION public.argos_settle_thermal_gravity_monthly()
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_today date;
  v_prev_month text;
  v_settled text;
  v_tier smallint;
  v_maintenance_goal numeric;
  v_levelup_goal numeric;
  v_vtc_month numeric;
  v_degraded boolean := false;
  v_previous_tier smallint;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('degraded', false);
  END IF;

  v_today := (timezone('America/Sao_Paulo', now()))::date;
  v_prev_month := to_char((date_trunc('month', v_today) - interval '1 day')::date, 'YYYY-MM');

  SELECT
    COALESCE(p.phase_tier, 1)::smallint,
    p.thermal_gravity_settled_month
  INTO v_tier, v_settled
  FROM public.profiles p
  WHERE p.id = v_uid;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('degraded', false);
  END IF;

  -- Primeiro acesso: marca o mês anterior sem penalizar
  IF v_settled IS NULL THEN
    UPDATE public.profiles
    SET thermal_gravity_settled_month = v_prev_month, updated_at = now()
    WHERE id = v_uid;

    RETURN jsonb_build_object(
      'degraded', false,
      'phase_tier', v_tier,
      'settled_month', v_prev_month,
      'first_settlement', true
    );
  END IF;

  -- Virada: avaliar o mês anterior se ainda não foi liquidado
  IF v_settled < v_prev_month THEN
    v_previous_tier := v_tier;
    v_maintenance_goal := public.argos_resolve_monthly_maintenance_goal_kg(v_tier);
    v_levelup_goal := public.argos_resolve_monthly_levelup_goal_kg(v_tier);
    v_vtc_month := public.argos_compute_vtc_for_month_sp(v_uid, v_prev_month);

    IF v_tier >= 2 AND v_vtc_month < v_maintenance_goal THEN
      v_degraded := true;
      v_tier := GREATEST(1, v_tier - 1);
    END IF;

    UPDATE public.profiles
    SET
      phase_tier = v_tier,
      thermal_gravity_settled_month = v_prev_month,
      updated_at = now()
    WHERE id = v_uid;
  END IF;

  RETURN jsonb_build_object(
    'degraded', v_degraded,
    'phase_tier', v_tier,
    'previous_tier', CASE WHEN v_degraded THEN v_previous_tier ELSE NULL END,
    'settled_month', v_prev_month,
    'vtc_month_kg', v_vtc_month,
    'goal_kg', v_maintenance_goal,             -- compat: meta que decide a queda (manutenção)
    'maintenance_goal_kg', v_maintenance_goal,
    'levelup_goal_kg', v_levelup_goal
  );
END;
$$;

REVOKE ALL ON FUNCTION public.argos_settle_thermal_gravity_monthly() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.argos_settle_thermal_gravity_monthly() TO authenticated, service_role;

-- (4) Inatividade de 30d: aceita pular a degradação quando a virada do mês já rebaixou nesta carga.
DROP FUNCTION IF EXISTS public.argos_sync_linhagem_presence();

CREATE OR REPLACE FUNCTION public.argos_sync_linhagem_presence(
  p_skip_degradation boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_tier smallint;
  v_last_seen timestamptz;
  v_now timestamptz;
  v_days_absent integer;
  v_degraded boolean := false;
  v_skipped boolean := false;
  v_previous_tier smallint;
  v_pending boolean;
  v_inactive boolean;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('degraded', false, 'phase_tier', 1, 'pending_rekindle', false);
  END IF;

  v_now := now();

  SELECT
    COALESCE(p.phase_tier, 1)::smallint,
    p.linhagem_last_seen_at,
    COALESCE(p.linhagem_inactivity_pending, false),
    p.linhagem_inactivity_restore_tier
  INTO v_tier, v_last_seen, v_pending, v_previous_tier
  FROM public.profiles p
  WHERE p.id = v_uid;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('degraded', false, 'phase_tier', 1, 'pending_rekindle', false);
  END IF;

  v_days_absent := NULL;
  IF v_last_seen IS NOT NULL THEN
    v_days_absent := GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (v_now - v_last_seen)) / 86400.0)::integer);
  END IF;

  v_inactive :=
    NOT v_pending
    AND v_last_seen IS NOT NULL
    AND v_last_seen < (v_now - interval '30 days')
    AND v_tier > 1;

  IF v_inactive AND p_skip_degradation THEN
    -- (4) Penalidade única: a virada já rebaixou. Só registra presença, sem 2ª queda.
    v_skipped := true;
    UPDATE public.profiles
    SET linhagem_last_seen_at = v_now, updated_at = v_now
    WHERE id = v_uid;
  ELSIF v_inactive THEN
    v_degraded := true;
    v_previous_tier := v_tier;

    UPDATE public.profiles
    SET
      phase_tier = GREATEST(1, v_tier - 1),
      linhagem_inactivity_pending = true,
      linhagem_inactivity_restore_tier = v_previous_tier,
      linhagem_last_seen_at = v_now,
      updated_at = v_now
    WHERE id = v_uid;

    v_tier := GREATEST(1, v_tier - 1);
    v_pending := true;
  ELSE
    UPDATE public.profiles
    SET linhagem_last_seen_at = v_now, updated_at = v_now
    WHERE id = v_uid;
  END IF;

  RETURN jsonb_build_object(
    'degraded', v_degraded,
    'phase_tier', v_tier,
    'previous_tier', CASE WHEN v_degraded THEN v_previous_tier ELSE NULL END,
    'phases_lost', CASE WHEN v_degraded THEN 1 ELSE 0 END,
    'days_absent', v_days_absent,
    'pending_rekindle', v_pending,
    'restore_tier', CASE WHEN v_pending THEN v_previous_tier ELSE NULL END,
    'degradation_skipped', v_skipped
  );
END;
$$;

COMMENT ON FUNCTION public.argos_sync_linhagem_presence(boolean) IS
  'Inatividade 30d · rebaixa 1 fase (pendente). p_skip_degradation=true evita 2ª queda quando a virada do mês já rebaixou nesta carga.';

REVOKE ALL ON FUNCTION public.argos_sync_linhagem_presence(boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.argos_sync_linhagem_presence(boolean) TO authenticated, service_role;

-- Bundle: liquida a virada primeiro e repassa o resultado à inatividade (penalidade única).
CREATE OR REPLACE FUNCTION public.fetch_dashboard_bundle(
  p_musculo public.subgrupo_muscular DEFAULT 'peito',
  p_mural_limit integer DEFAULT 10
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_phase jsonb;
  v_profile jsonb;
  v_vtc_month numeric;
  v_vtc_30d numeric;
  v_session_vtc numeric;
  v_inactivity jsonb;
  v_thermal_settle jsonb;
  v_phase_tier smallint;
  v_maintenance_goal numeric;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN NULL;
  END IF;

  v_thermal_settle := public.argos_settle_thermal_gravity_monthly();
  v_inactivity := public.argos_sync_linhagem_presence(
    COALESCE((v_thermal_settle ->> 'degraded')::boolean, false)
  );

  BEGIN
    v_phase := public.argos_advance_phase_if_eligible(v_uid);
  EXCEPTION
    WHEN others THEN
      v_phase := jsonb_build_object('phase_tier', 1, 'advanced', false, 'advance_error', SQLERRM);
  END;

  SELECT COALESCE(p.phase_tier, 1)::smallint
  INTO v_phase_tier
  FROM public.profiles p
  WHERE p.id = v_uid;

  SELECT to_jsonb(row_p)
  INTO v_profile
  FROM (
    SELECT
      full_name,
      nome_linhagem,
      status_altar,
      data_nascimento,
      role,
      sexo,
      perfil_identidade_confirmada,
      anima_portal_visto,
      ecossistema_tour_concluido,
      v_phase_tier AS phase_tier,
      phase_setup_at,
      public.argos_sanitize_custom_preferences(custom_preferences) AS custom_preferences,
      CASE
        WHEN v_phase_tier = 1 THEN public.argos_compute_phase_one_progress(v_uid)
        ELSE NULL
      END AS phase_progress
    FROM public.profiles
    WHERE id = v_uid
  ) AS row_p;

  v_vtc_month := public.argos_compute_vtc_month_sp(v_uid);
  v_vtc_30d := public.argos_compute_vtc_30d(v_uid);
  v_session_vtc := public.argos_compute_session_vtc_today(v_uid);
  v_maintenance_goal := public.argos_resolve_monthly_maintenance_goal_kg(v_phase_tier);

  RETURN jsonb_build_object(
    'profile', v_profile,
    'phase', v_phase,
    'thermal_gravity_settlement', v_thermal_settle,
    'linhagem_inactivity', v_inactivity,
    'thermal_gravity', jsonb_build_object(
      'vtc_month', v_vtc_month,
      'vtc_30d', v_vtc_30d,
      'session_vtc_today', v_session_vtc,
      'maintenance_goal_kg', v_maintenance_goal
    ),
    'historico', COALESCE((
      SELECT jsonb_agg(to_jsonb(row_h) ORDER BY row_h.registrado_em DESC)
      FROM (
        SELECT
          id,
          exercicio_id,
          exercicio_nome,
          musculo,
          peso,
          peso_atual,
          series,
          repeticoes,
          status,
          registrado_em
        FROM public.historico_treinos
        WHERE cliente_id = v_uid
          AND musculo = p_musculo::text
      ) AS row_h
    ), '[]'::jsonb),
    'mural', COALESCE((
      SELECT jsonb_agg(to_jsonb(m))
      FROM public.argos_fetch_mural_comunidade(
        LEAST(GREATEST(COALESCE(p_mural_limit, 10), 1), 10)
      ) AS m
    ), '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fetch_dashboard_bundle(public.subgrupo_muscular, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fetch_dashboard_bundle(public.subgrupo_muscular, integer) TO authenticated;

COMMIT;
