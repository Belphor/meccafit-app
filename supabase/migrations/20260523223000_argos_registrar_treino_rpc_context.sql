-- ARGOS: RPC marca contexto para trigger permitir status SUPERAÇÃO

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

  v_vtc := p_peso_atual * p_repeticoes * p_series;

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
    vtc_atual = COALESCE(public.matriz_forca.vtc_atual, 0) + EXCLUDED.vtc_atual,
    updated_at = NOW();

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
    'max_peso_atual', v_max_atual
  );

  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.registrar_treino_com_status(uuid, text, numeric, text, integer, integer, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_treino_com_status(uuid, text, numeric, text, integer, integer, text)
  TO authenticated, service_role;
