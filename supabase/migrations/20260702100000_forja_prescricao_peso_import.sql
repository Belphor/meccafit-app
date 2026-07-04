-- Prescrição de treino: persistir peso_prescrito na importação em lote

CREATE OR REPLACE FUNCTION public.argos_forja_upsert_prescricao_treino(
  p_atleta_id uuid,
  p_payload jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dia smallint;
  v_grupo text;
  v_exercicio_id text;
  v_series smallint;
  v_reps smallint;
  v_descanso smallint;
  v_peso numeric(8, 2);
  v_ordem smallint;
  v_id uuid;
  v_operator uuid := auth.uid();
BEGIN
  IF v_operator IS NULL THEN
    RAISE EXCEPTION 'session required' USING ERRCODE = '42501';
  END IF;

  IF NOT public.argos_can_access_cliente(p_atleta_id) THEN
    RAISE EXCEPTION 'permission denied for prescription upsert'
      USING ERRCODE = '42501';
  END IF;

  v_dia := (p_payload->>'dia_semana')::smallint;
  v_grupo := upper(btrim(p_payload->>'grupo_muscular'));
  v_exercicio_id := btrim(p_payload->>'exercicio_id');
  v_series := (p_payload->>'series_alvo')::smallint;
  v_reps := (p_payload->>'repeticoes_alvo')::smallint;
  v_descanso := NULLIF((p_payload->>'descanso_segundos')::smallint, 0);
  v_peso := NULLIF((p_payload->>'peso_prescrito')::numeric, 0);
  v_ordem := COALESCE((p_payload->>'ordem')::smallint, 1);

  IF v_dia IS NULL OR v_dia < 1 OR v_dia > 6 THEN
    RAISE EXCEPTION 'invalid dia_semana' USING ERRCODE = '22023';
  END IF;

  IF v_grupo NOT IN ('PEITO', 'COSTAS', 'PERNAS', 'OMBROS', 'BRACOS', 'ABDOMEN') THEN
    RAISE EXCEPTION 'invalid grupo_muscular' USING ERRCODE = '22023';
  END IF;

  IF v_exercicio_id IS NULL OR char_length(v_exercicio_id) = 0 THEN
    RAISE EXCEPTION 'invalid exercicio_id' USING ERRCODE = '22023';
  END IF;

  IF v_peso IS NOT NULL AND (v_peso <= 0 OR v_peso > 9999.99) THEN
    RAISE EXCEPTION 'invalid peso_prescrito' USING ERRCODE = '22023';
  END IF;

  SELECT id INTO v_id
  FROM public.prescricoes_treino_forjador
  WHERE atleta_id = p_atleta_id
    AND dia_semana = v_dia
    AND grupo_muscular = v_grupo
    AND exercicio_id = v_exercicio_id
  LIMIT 1;

  IF v_id IS NOT NULL THEN
    UPDATE public.prescricoes_treino_forjador
    SET
      forjador_id = v_operator,
      series_alvo = v_series,
      repeticoes_alvo = v_reps,
      peso_prescrito = v_peso,
      descanso_segundos = v_descanso,
      progressao_alternativas = COALESCE(p_payload->'progressao_alternativas', '[]'::jsonb),
      repeticoes_por_serie = COALESCE(p_payload->'repeticoes_por_serie', '[]'::jsonb),
      observacoes = NULLIF(btrim(p_payload->>'observacoes'), ''),
      ordem = v_ordem,
      updated_at = now()
    WHERE id = v_id;
  ELSE
    INSERT INTO public.prescricoes_treino_forjador (
      atleta_id,
      forjador_id,
      dia_semana,
      grupo_muscular,
      exercicio_id,
      ordem,
      series_alvo,
      repeticoes_alvo,
      peso_prescrito,
      descanso_segundos,
      progressao_alternativas,
      repeticoes_por_serie,
      observacoes
    )
    VALUES (
      p_atleta_id,
      v_operator,
      v_dia,
      v_grupo,
      v_exercicio_id,
      v_ordem,
      v_series,
      v_reps,
      v_peso,
      v_descanso,
      COALESCE(p_payload->'progressao_alternativas', '[]'::jsonb),
      COALESCE(p_payload->'repeticoes_por_serie', '[]'::jsonb),
      NULLIF(btrim(p_payload->>'observacoes'), '')
    )
    RETURNING id INTO v_id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'id', v_id);
END;
$$;

REVOKE ALL ON FUNCTION public.argos_forja_upsert_prescricao_treino(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.argos_forja_upsert_prescricao_treino(uuid, jsonb) TO authenticated;
