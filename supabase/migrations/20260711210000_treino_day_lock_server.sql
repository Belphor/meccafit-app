-- 1 registro por exercício/dia civil (SP): 2ª tentativa rejeitada.
-- Sem nova contribuição Mecca; input do cliente deve ficar bloqueado.
-- Fail-closed: músculo inválido rejeita.

CREATE OR REPLACE FUNCTION public.registrar_treino_com_status(
  p_user_id uuid,
  p_exercicio_id text DEFAULT NULL,
  p_peso_atual numeric DEFAULT NULL,
  p_musculo text DEFAULT NULL,
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
  v_grupo public.grupo_muscular_evolucao;
  v_role public.user_role;
  v_mecca_kg bigint;
  v_mecca_metrics public.mecca_global_metrics;
  v_workout_via public.workout_split_via;
  v_lane public.workout_split_lane;
  v_is_isometric boolean;
  v_day date;
  v_already_logged_today boolean := false;
  v_day_peak numeric := 0;
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

  IF p_musculo IS NULL OR BTRIM(p_musculo) = '' THEN
    RAISE EXCEPTION 'musculo inválido para historico_treinos'
      USING ERRCODE = '22023';
  END IF;

  BEGIN
    v_musculo := LOWER(BTRIM(p_musculo))::public.subgrupo_muscular;
  EXCEPTION
    WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'musculo inválido para historico_treinos'
        USING ERRCODE = '22023';
  END;

  v_day := public.evolucao_sp_today();
  v_is_isometric := public.evolucao_is_isometric_core(v_exercicio_id, p_exercicio_nome);
  v_workout_via := public.workout_resolve_split_via(v_musculo);

  -- Trava diária: se já houve pico do exercício hoje, bloqueia nova digitação/registro.
  SELECT COALESCE(MAX(hc.carga_maxima), 0), COUNT(*) > 0
  INTO v_day_peak, v_already_logged_today
  FROM public.historico_cargas hc
  WHERE hc.atleta_id = p_user_id
    AND hc.exercicio_id = v_exercicio_id::text
    AND (hc.data_registro AT TIME ZONE 'America/Sao_Paulo')::date = v_day;

  IF NOT v_already_logged_today THEN
    SELECT COUNT(*) > 0
    INTO v_already_logged_today
    FROM public.historico_treinos ht
    WHERE ht.cliente_id = p_user_id
      AND ht.exercicio_id = v_exercicio_id
      AND (COALESCE(ht.updated_at, ht.registrado_em) AT TIME ZONE 'America/Sao_Paulo')::date = v_day;
  END IF;

  IF v_already_logged_today THEN
    RAISE EXCEPTION 'exercício já registrado hoje — trava diária ativa'
      USING ERRCODE = 'P0001';
  END IF;

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
    user_id, cliente_id, exercicio_id, exercicio_nome, musculo, workout_via,
    peso_atual, peso, repeticoes, series, status, registrado_em, updated_at
  )
  VALUES (
    p_user_id, p_user_id, v_exercicio_id,
    COALESCE(NULLIF(BTRIM(p_exercicio_nome), ''), 'Treino geral'),
    v_musculo::text, v_workout_via, p_peso_atual, p_peso_atual,
    p_repeticoes, p_series, v_status, NOW(), NOW()
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

  SELECT ht.peso_atual INTO v_max_atual
  FROM public.historico_treinos ht
  WHERE ht.cliente_id = p_user_id AND ht.exercicio_id = v_exercicio_id;

  IF v_max_atual IS NULL THEN
    v_max_atual := p_peso_atual;
  END IF;

  IF v_vtc > 0 THEN
    INSERT INTO public.matriz_forca (cliente_id, musculo, vtc_atual, estagio)
    VALUES (p_user_id, v_musculo, v_vtc, 'cinzas'::public.estagio_forca)
    ON CONFLICT (cliente_id, musculo)
    DO UPDATE SET
      vtc_atual = GREATEST(COALESCE(public.matriz_forca.vtc_atual, 0), EXCLUDED.vtc_atual),
      updated_at = NOW();
  END IF;

  IF NOT v_is_isometric AND p_peso_atual > 0 THEN
    v_grupo := CASE public.evolucao_resolve_grupo_calor(v_musculo::text)
      WHEN 'peito' THEN 'PEITO'::public.grupo_muscular_evolucao
      WHEN 'costas' THEN 'COSTAS'::public.grupo_muscular_evolucao
      WHEN 'pernas' THEN 'PERNAS'::public.grupo_muscular_evolucao
      WHEN 'ombros' THEN 'OMBROS'::public.grupo_muscular_evolucao
      WHEN 'bracos' THEN 'BRACOS'::public.grupo_muscular_evolucao
      WHEN 'abdomen' THEN 'ABDOMEN'::public.grupo_muscular_evolucao
      ELSE NULL
    END;

    IF v_grupo IS NOT NULL THEN
      INSERT INTO public.historico_cargas (
        atleta_id, grupo_muscular, exercicio_id, carga_maxima, repeticoes_acumuladas, data_registro
      ) VALUES (
        p_user_id, v_grupo, v_exercicio_id::text, p_peso_atual, p_repeticoes * p_series, NOW()
      );
    END IF;
  END IF;

  v_lane := public.workout_apply_lane_session_internal(p_user_id, v_workout_via, v_vtc);

  SELECT p.role INTO v_role FROM public.profiles p WHERE p.id = p_user_id;

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
    'day_contribution_locked', false,
    'mecca_contribution_kg', v_mecca_kg,
    'mecca_furnace_temperature', CASE
      WHEN v_mecca_metrics IS NULL THEN NULL
      ELSE v_mecca_metrics.furnace_temperature
    END
  );
  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION public.registrar_treino_com_status(uuid, text, numeric, text, integer, integer, text) IS
  '1 registro por exercício/dia SP. 2ª tentativa rejeitada. Mecca só no 1º registro do dia.';

REVOKE ALL ON FUNCTION public.registrar_treino_com_status(uuid, text, numeric, text, integer, integer, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_treino_com_status(uuid, text, numeric, text, integer, integer, text)
  TO authenticated, service_role;
