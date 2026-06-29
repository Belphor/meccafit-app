-- Gravidade Térmica · virada do mês civil (SP) · inatividade com reacendimento na 1ª série

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS thermal_gravity_settled_month text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS linhagem_inactivity_pending boolean NOT NULL DEFAULT false;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS linhagem_inactivity_restore_tier smallint;

COMMENT ON COLUMN public.profiles.thermal_gravity_settled_month IS
  'Último mês civil (YYYY-MM, SP) já avaliado pela Gravidade Térmica na virada.';

COMMENT ON COLUMN public.profiles.linhagem_inactivity_pending IS
  'Inatividade ≥30d: regressão temporária até concluir uma série de qualquer exercício.';

-- VTC acumulado em um mês civil específico (America/Sao_Paulo)
CREATE OR REPLACE FUNCTION public.argos_compute_vtc_for_month_sp(
  p_user_id uuid,
  p_month_key text
)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month_start date;
  v_month_end date;
BEGIN
  IF p_user_id IS NULL OR p_month_key IS NULL OR p_month_key !~ '^\d{4}-\d{2}$' THEN
    RETURN 0;
  END IF;

  IF p_user_id IS DISTINCT FROM auth.uid()
     AND NOT public.argos_is_self_or_forjador(p_user_id) THEN
    RAISE EXCEPTION 'permission denied for argos_compute_vtc_for_month_sp'
      USING ERRCODE = '42501';
  END IF;

  v_month_start := (p_month_key || '-01')::date;
  v_month_end := (date_trunc('month', v_month_start) + interval '1 month' - interval '1 day')::date;

  RETURN COALESCE((
    SELECT SUM(b.vtc_total)
    FROM public.balanco_termico_diario b
    WHERE b.user_id = p_user_id
      AND b.data_treino >= v_month_start
      AND b.data_treino <= v_month_end
  ), 0)::numeric;
END;
$$;

REVOKE ALL ON FUNCTION public.argos_compute_vtc_for_month_sp(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.argos_compute_vtc_for_month_sp(uuid, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.argos_resolve_monthly_levelup_goal_kg(p_tier smallint)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_cfg record;
BEGIN
  SELECT
    COALESCE((SELECT phase_vtc_faisca FROM public.argos_academia_config WHERE id = 1 LIMIT 1), 5000) AS faisca,
    COALESCE((SELECT phase_vtc_brasa FROM public.argos_academia_config WHERE id = 1 LIMIT 1), 20000) AS brasa,
    COALESCE((SELECT phase_vtc_labareda FROM public.argos_academia_config WHERE id = 1 LIMIT 1), 50000) AS labareda,
    COALESCE((SELECT phase_vtc_fogo_cosmico FROM public.argos_academia_config WHERE id = 1 LIMIT 1), 100000) AS fogo
  INTO v_cfg;

  IF p_tier <= 1 THEN
    RETURN v_cfg.faisca;
  ELSIF p_tier = 2 THEN
    RETURN v_cfg.brasa;
  ELSIF p_tier = 3 THEN
    RETURN v_cfg.labareda;
  ELSIF p_tier = 4 THEN
    RETURN v_cfg.fogo;
  ELSE
    RETURN v_cfg.fogo;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.argos_resolve_monthly_levelup_goal_kg(smallint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.argos_resolve_monthly_levelup_goal_kg(smallint) TO authenticated, service_role;

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
  v_current_month text;
  v_prev_month text;
  v_settled text;
  v_tier smallint;
  v_goal numeric;
  v_vtc_month numeric;
  v_degraded boolean := false;
  v_previous_tier smallint;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('degraded', false);
  END IF;

  v_today := (timezone('America/Sao_Paulo', now()))::date;
  v_current_month := to_char(v_today, 'YYYY-MM');
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

  -- Primeiro acesso: marca mês anterior sem penalizar
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

  -- Virada do mês: avaliar mês anterior se ainda não foi liquidado
  IF v_settled < v_prev_month THEN
    v_previous_tier := v_tier;
    v_goal := public.argos_resolve_monthly_levelup_goal_kg(v_tier);
    v_vtc_month := public.argos_compute_vtc_for_month_sp(v_uid, v_prev_month);

    IF v_tier >= 2 AND v_vtc_month < v_goal THEN
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
    'goal_kg', v_goal
  );
END;
$$;

REVOKE ALL ON FUNCTION public.argos_settle_thermal_gravity_monthly() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.argos_settle_thermal_gravity_monthly() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.argos_sync_linhagem_presence()
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
  v_previous_tier smallint;
  v_pending boolean;
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

  IF NOT v_pending
     AND v_last_seen IS NOT NULL
     AND v_last_seen < (v_now - interval '30 days')
     AND v_tier > 1 THEN
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
    'restore_tier', CASE WHEN v_pending THEN v_previous_tier ELSE NULL END
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.argos_rekindle_linhagem_inactivity()
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_pending boolean;
  v_restore smallint;
  v_tier smallint;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('rekindled', false);
  END IF;

  SELECT
    COALESCE(p.linhagem_inactivity_pending, false),
    p.linhagem_inactivity_restore_tier,
    COALESCE(p.phase_tier, 1)::smallint
  INTO v_pending, v_restore, v_tier
  FROM public.profiles p
  WHERE p.id = v_uid;

  IF NOT FOUND OR NOT v_pending OR v_restore IS NULL THEN
    RETURN jsonb_build_object('rekindled', false, 'phase_tier', v_tier);
  END IF;

  UPDATE public.profiles
  SET
    phase_tier = v_restore,
    linhagem_inactivity_pending = false,
    linhagem_inactivity_restore_tier = NULL,
    updated_at = now()
  WHERE id = v_uid;

  RETURN jsonb_build_object(
    'rekindled', true,
    'phase_tier', v_restore,
    'previous_tier', v_tier
  );
END;
$$;

REVOKE ALL ON FUNCTION public.argos_rekindle_linhagem_inactivity() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.argos_rekindle_linhagem_inactivity() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.fetch_dashboard_bundle(
  p_musculo public.subgrupo_muscular DEFAULT 'peito',
  p_mural_limit integer DEFAULT 24
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
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN NULL;
  END IF;

  v_thermal_settle := public.argos_settle_thermal_gravity_monthly();
  v_inactivity := public.argos_sync_linhagem_presence();

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

  RETURN jsonb_build_object(
    'profile', v_profile,
    'phase', v_phase,
    'thermal_gravity_settlement', v_thermal_settle,
    'linhagem_inactivity', v_inactivity,
    'thermal_gravity', jsonb_build_object(
      'vtc_month', v_vtc_month,
      'vtc_30d', v_vtc_30d,
      'session_vtc_today', v_session_vtc
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
        LEAST(GREATEST(COALESCE(p_mural_limit, 24), 1), 100)
      ) AS m
    ), '[]'::jsonb)
  );
END;
$$;

COMMIT;
