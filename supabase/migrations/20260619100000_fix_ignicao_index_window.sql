-- FENYXIA · Índice de Ignição — janela 30d inclusiva + união calendario/purity_logs
-- Corrige contagem quando trigger calendario_ignicao não sincronizou purity_logs

BEGIN;

CREATE OR REPLACE FUNCTION public.get_muscular_evolution()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_atleta_id uuid;
  v_meta_mensal integer;
  v_dias_unicos bigint;
  v_ignicao numeric;
  v_degradacao boolean;
  v_window_start timestamptz;
  v_window_ignicao_start date;
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
  v_vra numeric;
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
  v_window_ignicao_start := v_today - 29;

  SELECT COALESCE(pa.total_treinos_mensais_planejados, 16)
  INTO v_meta_mensal
  FROM public.planos_atletas pa
  WHERE pa.atleta_id = v_atleta_id;

  IF v_meta_mensal IS NULL THEN
    v_meta_mensal := LEAST(
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
    );

    INSERT INTO public.planos_atletas (atleta_id, total_treinos_mensais_planejados)
    VALUES (v_atleta_id, v_meta_mensal)
    ON CONFLICT (atleta_id) DO NOTHING;
  END IF;

  SELECT COUNT(*)::bigint
  INTO v_dias_unicos
  FROM (
    SELECT ci.data_registro AS dia_puro
    FROM public.calendario_ignicao ci
    WHERE ci.atleta_id = v_atleta_id
      AND ci.data_registro >= v_window_ignicao_start
      AND ci.data_registro <= v_today
    UNION
    SELECT pl.log_date AS dia_puro
    FROM public.purity_logs pl
    WHERE pl.user_id = v_atleta_id
      AND pl.is_pure IS TRUE
      AND pl.log_date >= v_window_ignicao_start
      AND pl.log_date <= v_today
  ) dias_puros;

  IF v_meta_mensal <= 0 THEN
    v_ignicao := 0;
  ELSE
    v_ignicao := LEAST(
      100.0,
      GREATEST(0, ROUND((v_dias_unicos::numeric / v_meta_mensal::numeric) * 100.0, 2))
    );
  END IF;

  v_degradacao := v_ignicao < 50.0;

  FOREACH v_grupo IN ARRAY v_grupos LOOP
    v_level := 'CINZAS';
    v_vtc := 0;
    v_vra := 0;
    v_metric_raw := 0;
    v_metric_final := 0;

    IF v_grupo = 'ABDOMEN'::public.grupo_muscular_evolucao THEN
      v_vra := public.midas_calc_vra_abdomen(v_atleta_id, v_window_start);
      v_metric_raw := COALESCE(v_vra, 0);
    ELSE
      v_vtc := public.midas_calc_vtc_grupo(v_atleta_id, v_grupo, v_window_start);
      v_metric_raw := COALESCE(v_vtc, 0);
    END IF;

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
        'vra', COALESCE(v_vra, 0),
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
    'total_treinos_mensais_planejados', v_meta_mensal,
    'unique_training_days_30d', v_dias_unicos,
    'timestamp', now(),
    'muscles', v_muscles
  );
END;
$$;

COMMENT ON FUNCTION public.get_muscular_evolution() IS
  'MIDAS · Evolução muscular JSONB · ignição 30d inclusiva · união calendario_ignicao + purity_logs.';

COMMIT;
