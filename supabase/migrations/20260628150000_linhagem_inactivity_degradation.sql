-- Inatividade da Linhagem · 30 dias sem entrar → regrede 1 fase na Chama Acumulada

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS linhagem_last_seen_at timestamptz;

COMMENT ON COLUMN public.profiles.linhagem_last_seen_at IS
  'Último acesso ao app (sync no dashboard). Inatividade ≥ 30 dias regrede 1 fase na linhagem.';

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
  v_new_tier smallint;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('degraded', false, 'phase_tier', 1);
  END IF;

  v_now := now();

  SELECT COALESCE(p.phase_tier, 1)::smallint, p.linhagem_last_seen_at
  INTO v_tier, v_last_seen
  FROM public.profiles p
  WHERE p.id = v_uid;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('degraded', false, 'phase_tier', 1);
  END IF;

  v_days_absent := NULL;
  IF v_last_seen IS NOT NULL THEN
    v_days_absent := GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (v_now - v_last_seen)) / 86400.0)::integer);
  END IF;

  v_new_tier := v_tier;

  IF v_last_seen IS NOT NULL
     AND v_last_seen < (v_now - interval '30 days')
     AND v_tier > 1 THEN
    v_degraded := true;
    v_previous_tier := v_tier;
    v_new_tier := GREATEST(1, v_tier - 1);

    UPDATE public.profiles
    SET
      phase_tier = v_new_tier,
      linhagem_last_seen_at = v_now,
      updated_at = v_now
    WHERE id = v_uid;
  ELSE
    UPDATE public.profiles
    SET
      linhagem_last_seen_at = v_now,
      updated_at = v_now
    WHERE id = v_uid;
  END IF;

  RETURN jsonb_build_object(
    'degraded', v_degraded,
    'phase_tier', v_new_tier,
    'previous_tier', CASE WHEN v_degraded THEN v_previous_tier ELSE NULL END,
    'phases_lost', CASE WHEN v_degraded THEN 1 ELSE 0 END,
    'days_absent', v_days_absent
  );
END;
$$;

COMMENT ON FUNCTION public.argos_sync_linhagem_presence() IS
  'Sincroniza presença do atleta. Se ausente ≥ 30 dias, reduz phase_tier em 1 (mín. Cinzas).';

REVOKE ALL ON FUNCTION public.argos_sync_linhagem_presence() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.argos_sync_linhagem_presence() TO authenticated, service_role;

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
  v_session_vtc numeric;
  v_inactivity jsonb;
  v_phase_tier smallint;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN NULL;
  END IF;

  v_inactivity := public.argos_sync_linhagem_presence();

  BEGIN
    v_phase := public.argos_advance_phase_if_eligible(v_uid);
  EXCEPTION
    WHEN others THEN
      v_phase := jsonb_build_object('phase_tier', 1, 'advanced', false, 'advance_error', SQLERRM);
  END;

  v_phase_tier := COALESCE((v_inactivity->>'phase_tier')::smallint, 1);

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
  v_session_vtc := public.argos_compute_session_vtc_today(v_uid);

  RETURN jsonb_build_object(
    'profile', v_profile,
    'phase', v_phase,
    'linhagem_inactivity', v_inactivity,
    'thermal_gravity', jsonb_build_object(
      'vtc_month', v_vtc_month,
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
