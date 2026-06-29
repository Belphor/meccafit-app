-- Fix: get_muscular_evolution referenciava midas_resolve_thermal_level (inexistente)
-- Usa midas_classificar_nivel(grupo, metric) como nas migrations MIDAS originais.

BEGIN;

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
  v_vtc_month numeric;
  v_ignicao numeric;
  v_degradacao boolean;
  v_phase_tier smallint;
  v_natural_phase_tier smallint;
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
  v_vtc_month := public.argos_compute_vtc_month_sp(v_atleta_id);
  v_natural_phase_tier := public.argos_phase_tier_from_vtc_30d(v_vtc_30d);

  SELECT COALESCE(p.phase_tier, 1)::smallint
  INTO v_phase_tier
  FROM public.profiles p
  WHERE p.id = v_atleta_id;

  IF v_phase_tier IS NULL THEN
    v_phase_tier := 1;
  END IF;

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
    'vtc_month_kg', v_vtc_month,
    'phase_tier', v_phase_tier,
    'natural_phase_tier', v_natural_phase_tier,
    'timestamp', now(),
    'muscles', v_muscles
  );
END;
$$;

COMMENT ON FUNCTION public.get_muscular_evolution() IS
  'MIDAS · VTC unificado (kg). Ritmo = VTC 30d / meta. Gravidade Térmica = VTC mês civil (SP). Brasas = VTC 14d.';

COMMIT;
