-- Gravidade Térmica · janela 20 dias · manutenção = 50% do VTC exigido pela fase conquistada

BEGIN;

CREATE OR REPLACE FUNCTION public.argos_compute_vtc_20d(p_user_id uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RETURN 0;
  END IF;

  IF p_user_id IS DISTINCT FROM auth.uid()
     AND NOT public.argos_is_self_or_forjador(p_user_id) THEN
    RAISE EXCEPTION 'permission denied for argos_compute_vtc_20d'
      USING ERRCODE = '42501';
  END IF;

  RETURN COALESCE((
    SELECT SUM(b.vtc_total)
    FROM public.balanco_termico_diario b
    WHERE b.user_id = p_user_id
      AND b.data_treino >= (CURRENT_DATE - INTERVAL '20 days')
  ), 0)::numeric;
END;
$$;

COMMENT ON FUNCTION public.argos_compute_vtc_20d(uuid) IS
  'Gravidade Térmica · soma VTC (kg) dos últimos 20 dias rolantes.';

REVOKE ALL ON FUNCTION public.argos_compute_vtc_20d(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.argos_compute_vtc_20d(uuid) TO authenticated, service_role;

-- Bundle dashboard · inline thermal com VTC 20d
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
  v_vtc_20d numeric;
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

  v_vtc_20d := public.argos_compute_vtc_20d(v_uid);
  v_session_vtc := public.argos_compute_session_vtc_today(v_uid);

  RETURN jsonb_build_object(
    'profile', v_profile,
    'phase', v_phase,
    'thermal_gravity', jsonb_build_object(
      'vtc_20d', v_vtc_20d,
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

-- Evolução · expõe VTC 20d para card de Gravidade Térmica
CREATE OR REPLACE FUNCTION public.get_muscular_evolution()
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_atleta_id uuid;
  v_meta_vtc numeric;
  v_vtc_30d numeric;
  v_vtc_20d numeric;
  v_ignicao numeric;
  v_degradacao boolean;
  v_phase_tier smallint;
  v_window_start timestamptz;
  v_grupo public.grupo_muscular_evolucao;
  v_grupos public.grupo_muscular_evolucao[] := ARRAY[
    'PEITO'::public.grupo_muscular_evolucao,
    'COSTAS'::public.grupo_muscular_evolucao,
    'PERNAS'::public.grupo_muscular_evolucao,
    'OMBROS'::public.grupo_muscular_evolucao,
    'BRACOS'::public.grupo_muscular_evolucao,
    'ABDOMEN'::public.grupo_muscular_evolucao
  ];
  v_metric_raw numeric;
  v_metric_final numeric;
  v_vtc numeric;
  v_level text;
  v_muscles jsonb := '{}'::jsonb;
  v_today date;
BEGIN
  v_atleta_id := auth.uid();

  IF v_atleta_id IS NULL THEN
    RETURN jsonb_build_object(
      'error', 'unauthorized',
      'code', 401,
      'message', 'Sessão inválida — auth.uid() ausente.'
    );
  END IF;

  v_today := public.evolucao_sp_today();
  v_window_start := (v_today - 13)::timestamp AT TIME ZONE 'America/Sao_Paulo';

  IF NOT EXISTS (SELECT 1 FROM public.planos_atletas WHERE atleta_id = v_atleta_id) THEN
    INSERT INTO public.planos_atletas (atleta_id, total_treinos_mensais_planejados)
    VALUES (
      v_atleta_id,
      LEAST(
        31,
        GREATEST(
          1,
          ROUND(
            COALESCE(
              (SELECT p.target_days_per_week FROM public.profiles p WHERE p.id = v_atleta_id),
              3
            )::numeric * 30.0 / 7.0
          )::integer
        )
      )
    )
    ON CONFLICT (atleta_id) DO NOTHING;
  END IF;

  v_meta_vtc := public.evolucao_resolve_meta_vtc_mensal(v_atleta_id);
  v_vtc_30d := public.argos_compute_vtc_30d(v_atleta_id);
  v_vtc_20d := public.argos_compute_vtc_20d(v_atleta_id);
  v_phase_tier := public.argos_phase_tier_from_vtc_30d(v_vtc_30d);

  IF v_meta_vtc <= 0 THEN
    v_ignicao := 0;
  ELSE
    v_ignicao := LEAST(
      100.0,
      GREATEST(0, ROUND((v_vtc_30d / v_meta_vtc) * 100.0, 2))
    );
  END IF;

  v_degradacao := v_ignicao < 50.0;

  FOREACH v_grupo IN ARRAY v_grupos LOOP
    v_vtc := public.midas_calc_vtc_grupo(v_atleta_id, v_grupo, v_window_start);
    v_metric_raw := COALESCE(v_vtc, 0);
    v_metric_final := v_metric_raw;

    IF v_degradacao AND v_metric_final > 0 THEN
      v_metric_final := v_metric_final * 0.60;
    END IF;

    IF v_metric_final <= 0 THEN
      v_level := 'CINZAS';
    ELSE
      v_level := public.midas_classificar_nivel(v_grupo, v_metric_final);
    END IF;

    v_muscles := v_muscles || jsonb_build_object(
      lower(v_grupo::text),
      jsonb_build_object(
        'grupo', v_grupo::text,
        'vtc', COALESCE(v_vtc, 0),
        'vra', 0,
        'metric_raw', COALESCE(v_metric_raw, 0),
        'metric_final', COALESCE(v_metric_final, 0),
        'thermal_level', v_level
      )
    );
  END LOOP;

  RETURN jsonb_build_object(
    'athlete_id', v_atleta_id,
    'ignition_index', v_ignicao,
    'passive_degradation_active', v_degradacao,
    'meta_vtc_mensal_kg', v_meta_vtc,
    'vtc_30d_kg', v_vtc_30d,
    'vtc_20d_kg', v_vtc_20d,
    'phase_tier', v_phase_tier,
    'timestamp', now(),
    'muscles', v_muscles
  );
END;
$$;

COMMENT ON FUNCTION public.get_muscular_evolution() IS
  'MIDAS · VTC unificado (kg). Ritmo = VTC 30d / meta. Gravidade Térmica = VTC 20d. Brasas = VTC 14d.';

COMMIT;
