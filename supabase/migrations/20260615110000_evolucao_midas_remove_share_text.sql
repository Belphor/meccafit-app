-- FENYXIA · MIDAS — remove share_text do payload get_muscular_evolution()

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
  v_dias_plano smallint;
  v_alvo_30d numeric;
  v_dias_reais bigint;
  v_ignicao numeric;
  v_degradacao boolean;
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
  v_vra numeric;
  v_frozen boolean;
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

  SELECT COALESCE(pa.dias_treino_semana, 3)
  INTO v_dias_plano
  FROM public.planos_atletas pa
  WHERE pa.atleta_id = v_atleta_id;

  IF v_dias_plano IS NULL THEN
    v_dias_plano := 3;
    INSERT INTO public.planos_atletas (atleta_id, dias_treino_semana)
    VALUES (v_atleta_id, v_dias_plano)
    ON CONFLICT (atleta_id) DO NOTHING;
  END IF;

  v_alvo_30d := ROUND((v_dias_plano::numeric * 30.0) / 7.0, 2);

  SELECT COUNT(*)::bigint
  INTO v_dias_reais
  FROM public.calendario_ignicao ci
  WHERE ci.atleta_id = v_atleta_id
    AND ci.data_registro >= (v_today - 29)
    AND ci.data_registro <= v_today;

  IF v_alvo_30d <= 0 THEN
    v_ignicao := 0;
  ELSE
    v_ignicao := LEAST(100, GREATEST(0, ROUND((v_dias_reais / v_alvo_30d) * 100.0, 2)));
  END IF;

  v_degradacao := v_ignicao < 50.0;

  FOREACH v_grupo IN ARRAY v_grupos LOOP
    v_frozen := false;
    v_level := 'CINZAS';
    v_vtc := 0;
    v_vra := 0;
    v_metric_raw := 0;
    v_metric_final := 0;

    IF v_grupo = 'ABDOMEN'::public.grupo_muscular_evolucao THEN
      v_vra := public.midas_calc_vra_abdomen(v_atleta_id, v_window_start);
      v_metric_raw := v_vra;
    ELSE
      v_vtc := public.midas_calc_vtc_grupo(v_atleta_id, v_grupo, v_window_start);
      v_metric_raw := v_vtc;
    END IF;

    IF public.midas_grupo_obrigatorio(v_atleta_id, v_grupo) AND v_metric_raw <= 0 THEN
      v_frozen := true;
      v_level := 'CONGELADO';
      v_metric_final := 0;
    ELSE
      v_metric_final := v_metric_raw;
      IF v_degradacao THEN
        v_metric_final := v_metric_final * 0.60;
      END IF;
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
        'is_frozen', v_frozen,
        'thermal_level', v_level
      )
    );
  END LOOP;

  RETURN jsonb_build_object(
    'athlete_id', v_atleta_id,
    'ignition_index', v_ignicao,
    'passive_degradation_active', v_degradacao,
    'planned_days_30d', v_alvo_30d,
    'actual_training_days_30d', v_dias_reais,
    'timestamp', now(),
    'muscles', v_muscles
  );
END;
$$;

DROP FUNCTION IF EXISTS public.midas_share_text(public.grupo_muscular_evolucao, text);

COMMIT;
