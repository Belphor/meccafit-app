-- FENYXIA · VTC unificado — um único dígito: carga máxima (kg)
-- Chama do Altar, Chama Acumulada, Brasas Musculares, Ritmo da Fênix e termómetro usam a mesma unidade.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Meta VTC pessoal (100% do Ritmo da Fênix)
-- ---------------------------------------------------------------------------

ALTER TABLE public.planos_atletas
  ADD COLUMN IF NOT EXISTS meta_vtc_mensal_kg numeric(16, 2);

COMMENT ON COLUMN public.planos_atletas.meta_vtc_mensal_kg IS
  'Meta pessoal de VTC acumulado em 30 dias (kg). Padrão: limiar Faísca da academia.';

-- ---------------------------------------------------------------------------
-- 2. VTC do dia = soma dos picos de carga máxima por exercício (historico_cargas)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.argos_compute_vtc_dia_from_cargas(
  p_user_id uuid,
  p_data date
)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(peaks.day_peak), 0)::numeric
  FROM (
    SELECT MAX(hc.carga_maxima) AS day_peak
    FROM public.historico_cargas hc
    WHERE hc.atleta_id = p_user_id
      AND (hc.data_registro AT TIME ZONE 'America/Sao_Paulo')::date = p_data
    GROUP BY hc.exercicio_id
  ) peaks;
$$;

CREATE OR REPLACE FUNCTION public.argos_sync_balanco_termico_dia(
  p_user_id uuid,
  p_data date DEFAULT (timezone('America/Sao_Paulo', now()))::date
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total numeric;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN 0;
  END IF;

  v_total := public.argos_compute_vtc_dia_from_cargas(p_user_id, p_data);

  INSERT INTO public.balanco_termico_diario (user_id, data_treino, vtc_total)
  VALUES (p_user_id, p_data, v_total)
  ON CONFLICT (user_id, data_treino)
  DO UPDATE SET
    vtc_total = EXCLUDED.vtc_total,
    updated_at = now();

  RETURN v_total;
END;
$$;

CREATE OR REPLACE FUNCTION public.evolucao_sync_balanco_from_carga()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.argos_sync_balanco_termico_dia(
    NEW.atleta_id,
    (NEW.data_registro AT TIME ZONE 'America/Sao_Paulo')::date
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_historico_cargas_sync_balanco ON public.historico_cargas;
CREATE TRIGGER trg_historico_cargas_sync_balanco
  AFTER INSERT OR UPDATE OF carga_maxima, data_registro ON public.historico_cargas
  FOR EACH ROW
  EXECUTE FUNCTION public.evolucao_sync_balanco_from_carga();

-- Backfill balanço diário a partir de historico_cargas
DO $$
DECLARE
  v_row record;
BEGIN
  FOR v_row IN
    SELECT DISTINCT
      hc.atleta_id AS user_id,
      (hc.data_registro AT TIME ZONE 'America/Sao_Paulo')::date AS dia
    FROM public.historico_cargas hc
  LOOP
    PERFORM public.argos_sync_balanco_termico_dia(v_row.user_id, v_row.dia);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 3. registrar_treino · VTC gerado = carga máxima (kg), sem reps × séries
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.registrar_treino_com_status(
  p_user_id uuid,
  p_exercicio_id text DEFAULT NULL,
  p_peso_atual numeric DEFAULT NULL,
  p_musculo text DEFAULT 'costas',
  p_repeticoes integer DEFAULT 1,
  p_series integer DEFAULT 1,
  p_exercicio_nome text DEFAULT 'Treino geral'
)
RETURNS TABLE (
  status text,
  max_peso_atual numeric,
  peso_atual numeric,
  vtc_gerado numeric,
  payload jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exercicio_id integer;
  v_max_anterior numeric;
  v_max_atual numeric;
  v_vtc numeric;
  v_status text;
  v_musculo public.subgrupo_muscular;
  v_role public.user_role;
  v_mecca_kg bigint;
  v_mecca_metrics public.mecca_global_metrics;
  v_workout_via public.workout_split_via;
  v_lane public.workout_split_lane;
  v_is_isometric boolean;
BEGIN
  PERFORM set_config('app.rpc_registrar_treino', '1', true);

  IF (SELECT auth.uid()) IS NULL OR (SELECT auth.uid()) <> p_user_id THEN
    RAISE EXCEPTION 'permission denied for registrar_treino_com_status'
      USING ERRCODE = '42501';
  END IF;

  IF p_peso_atual IS NULL OR p_peso_atual <= 0 OR p_peso_atual > 9999.99 THEN
    RAISE EXCEPTION 'peso inválido para historico_treinos'
      USING ERRCODE = '22023';
  END IF;

  IF p_repeticoes IS NULL OR p_repeticoes <= 0 OR p_series IS NULL OR p_series <= 0 THEN
    RAISE EXCEPTION 'repetições e séries devem ser maiores que zero'
      USING ERRCODE = '22023';
  END IF;

  BEGIN
    v_exercicio_id := NULLIF(BTRIM(COALESCE(p_exercicio_id, '')), '')::integer;
  EXCEPTION
    WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'exercicio_id inválido'
        USING ERRCODE = '22023';
  END;

  IF v_exercicio_id IS NULL OR v_exercicio_id <= 0 THEN
    RAISE EXCEPTION 'exercicio_id inválido'
      USING ERRCODE = '22023';
  END IF;

  BEGIN
    v_musculo := LOWER(BTRIM(COALESCE(p_musculo, 'costas')))::public.subgrupo_muscular;
  EXCEPTION
    WHEN invalid_text_representation THEN
      v_musculo := 'costas'::public.subgrupo_muscular;
  END;

  v_is_isometric := public.evolucao_is_isometric_core(v_exercicio_id, p_exercicio_nome);
  v_workout_via := public.workout_resolve_split_via(v_musculo);

  -- VTC unificado: um único dígito = carga máxima registrada (kg)
  v_vtc := CASE
    WHEN v_is_isometric THEN 0
    ELSE p_peso_atual
  END;

  SELECT ht.peso_atual
  INTO v_max_anterior
  FROM public.historico_treinos ht
  WHERE ht.cliente_id = p_user_id
    AND ht.exercicio_id = v_exercicio_id;

  v_status := CASE
    WHEN v_max_anterior IS NULL OR p_peso_atual > v_max_anterior THEN 'SUPERAÇÃO'
    ELSE 'CONCLUÍDO'
  END;

  INSERT INTO public.historico_treinos (
    user_id,
    cliente_id,
    exercicio_id,
    exercicio_nome,
    musculo,
    workout_via,
    peso_atual,
    peso,
    repeticoes,
    series,
    status,
    registrado_em,
    updated_at
  )
  VALUES (
    p_user_id,
    p_user_id,
    v_exercicio_id,
    COALESCE(NULLIF(BTRIM(p_exercicio_nome), ''), 'Treino geral'),
    v_musculo::text,
    v_workout_via,
    p_peso_atual,
    p_peso_atual,
    p_repeticoes,
    p_series,
    v_status,
    NOW(),
    NOW()
  )
  ON CONFLICT (cliente_id, exercicio_id) WHERE cliente_id IS NOT NULL
  DO UPDATE SET
    peso_atual = GREATEST(public.historico_treinos.peso_atual, EXCLUDED.peso_atual),
    peso = GREATEST(COALESCE(public.historico_treinos.peso, 0), EXCLUDED.peso_atual),
    repeticoes = EXCLUDED.repeticoes,
    series = EXCLUDED.series,
    status = CASE
      WHEN EXCLUDED.peso_atual > COALESCE(public.historico_treinos.peso_atual, 0) THEN 'SUPERAÇÃO'
      ELSE COALESCE(public.historico_treinos.status, 'CONCLUÍDO')
    END,
    exercicio_nome = EXCLUDED.exercicio_nome,
    musculo = EXCLUDED.musculo,
    workout_via = EXCLUDED.workout_via,
    updated_at = NOW(),
    registrado_em = CASE
      WHEN EXCLUDED.peso_atual > COALESCE(public.historico_treinos.peso_atual, 0) THEN NOW()
      ELSE public.historico_treinos.registrado_em
    END;

  IF p_peso_atual > COALESCE(v_max_anterior, 0) THEN
    v_status := 'SUPERAÇÃO';
  ELSE
    v_status := 'CONCLUÍDO';
  END IF;

  SELECT ht.peso_atual
  INTO v_max_atual
  FROM public.historico_treinos ht
  WHERE ht.cliente_id = p_user_id
    AND ht.exercicio_id = v_exercicio_id;

  IF v_max_atual IS NULL THEN
    v_max_atual := p_peso_atual;
  END IF;

  IF v_vtc > 0 THEN
    INSERT INTO public.matriz_forca (
      cliente_id,
      musculo,
      vtc_atual,
      estagio
    )
    VALUES (
      p_user_id,
      v_musculo,
      v_vtc,
      'cinzas'::public.estagio_forca
    )
    ON CONFLICT (cliente_id, musculo)
    DO UPDATE SET
      vtc_atual = GREATEST(COALESCE(public.matriz_forca.vtc_atual, 0), EXCLUDED.vtc_atual),
      updated_at = NOW();
  END IF;

  -- Balanço diário: trigger trg_historico_cargas_sync_balanco após insert em historico_cargas

  v_lane := public.workout_apply_lane_session_internal(p_user_id, v_workout_via, v_vtc);

  SELECT p.role INTO v_role
  FROM public.profiles p
  WHERE p.id = p_user_id;

  v_mecca_kg := NULL;
  v_mecca_metrics := NULL;

  IF v_role = 'cliente'::public.user_role AND v_vtc > 0 THEN
    v_mecca_kg := LEAST(GREATEST(FLOOR(v_vtc)::bigint, 1), 99999);
    v_mecca_metrics := public.mecca_apply_contribution_internal(v_mecca_kg);
  END IF;

  status := v_status;
  max_peso_atual := v_max_atual;
  peso_atual := p_peso_atual;
  vtc_gerado := v_vtc;
  payload := jsonb_build_object(
    'evento', v_status,
    'mensagem', CASE
      WHEN v_status = 'SUPERAÇÃO' THEN 'SUPERAÇÃO registrada na MATRIX DA ALMA.'
      ELSE 'Treino concluído e registrado na MATRIX DA ALMA.'
    END,
    'cliente_id', p_user_id,
    'musculo', v_musculo,
    'exercicio_id', v_exercicio_id,
    'peso', p_peso_atual,
    'repeticoes', p_repeticoes,
    'series', p_series,
    'vtc_gerado', v_vtc,
    'is_isometric', v_is_isometric,
    'max_peso_atual', v_max_atual,
    'session_vtc_today', public.argos_compute_session_vtc_today(p_user_id),
    'vtc_30d', public.argos_compute_vtc_30d(p_user_id),
    'workout_via', v_workout_via,
    'workout_via_label', public.workout_split_via_label(v_workout_via),
    'session_vtc_via_today', COALESCE(v_lane.session_vtc_today, 0),
    'exercises_logged_via_today', COALESCE(v_lane.exercises_logged_today, 0),
    'mecca_contribution_kg', v_mecca_kg,
    'mecca_furnace_temperature', CASE
      WHEN v_mecca_metrics IS NULL THEN NULL
      ELSE v_mecca_metrics.furnace_temperature
    END,
    'mecca_total_weight_lifted', CASE
      WHEN v_mecca_metrics IS NULL THEN NULL
      ELSE v_mecca_metrics.total_weight_lifted
    END
  );

  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION public.registrar_treino_com_status(uuid, text, numeric, text, integer, integer, text) IS
  'Registra PR/superação. VTC = carga máxima (kg). Isométricos: vtc_gerado = 0.';

-- ---------------------------------------------------------------------------
-- 4. get_muscular_evolution · VTC unificado + Ritmo baseado em VTC 30d
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.evolucao_resolve_meta_vtc_mensal(p_atleta_id uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_personal numeric;
  v_cfg public.argos_academia_config;
BEGIN
  SELECT pa.meta_vtc_mensal_kg
  INTO v_personal
  FROM public.planos_atletas pa
  WHERE pa.atleta_id = p_atleta_id;

  IF v_personal IS NOT NULL AND v_personal > 0 THEN
    RETURN v_personal;
  END IF;

  SELECT * INTO v_cfg FROM public.argos_academia_config WHERE id = 1;

  RETURN COALESCE(v_cfg.phase_vtc_faisca, 5000);
END;
$$;

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
    'phase_tier', v_phase_tier,
    'timestamp', now(),
    'muscles', v_muscles
  );
END;
$$;

COMMENT ON FUNCTION public.get_muscular_evolution() IS
  'MIDAS · VTC unificado (kg). Ritmo da Fênix = VTC 30d / meta. Brasas = VTC por grupo (14d).';

GRANT EXECUTE ON FUNCTION public.argos_compute_vtc_dia_from_cargas(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.argos_sync_balanco_termico_dia(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.evolucao_resolve_meta_vtc_mensal(uuid) TO authenticated;

COMMIT;
