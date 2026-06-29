-- Gravidade Térmica · mês civil (SP) · subir de fase no mês ou degradar

BEGIN;

CREATE OR REPLACE FUNCTION public.argos_compute_vtc_month_sp(p_user_id uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date;
  v_month_start date;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN 0;
  END IF;

  IF p_user_id IS DISTINCT FROM auth.uid()
     AND NOT public.argos_is_self_or_forjador(p_user_id) THEN
    RAISE EXCEPTION 'permission denied for argos_compute_vtc_month_sp'
      USING ERRCODE = '42501';
  END IF;

  v_today := (timezone('America/Sao_Paulo', now()))::date;
  v_month_start := date_trunc('month', v_today)::date;

  RETURN COALESCE((
    SELECT SUM(b.vtc_total)
    FROM public.balanco_termico_diario b
    WHERE b.user_id = p_user_id
      AND b.data_treino >= v_month_start
      AND b.data_treino <= v_today
  ), 0)::numeric;
END;
$$;

COMMENT ON FUNCTION public.argos_compute_vtc_month_sp(uuid) IS
  'Gravidade Térmica · VTC (kg) acumulado no mês civil atual (America/Sao_Paulo).';

REVOKE ALL ON FUNCTION public.argos_compute_vtc_month_sp(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.argos_compute_vtc_month_sp(uuid) TO authenticated, service_role;

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
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN NULL;
  END IF;

  BEGIN
    v_phase := public.argos_advance_phase_if_eligible(v_uid);
  EXCEPTION
    WHEN others THEN
      v_phase := jsonb_build_object('phase_tier', 1, 'advanced', false, 'advance_error', SQLERRM);
  END;

  SELECT to_jsonb(row_p)
  INTO v_profile
  FROM (
    SELECT
      full_name,
      nome_linhagem,
      status_altar,
      data_nascimento,
      role,
      phase_tier,
      phase_setup_at,
      public.argos_sanitize_custom_preferences(custom_preferences) AS custom_preferences,
      CASE
        WHEN phase_tier = 1 THEN public.argos_compute_phase_one_progress(v_uid)
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
