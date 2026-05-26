-- ARGOS: rejeita peso inválido na RPC e no trigger de historico_treinos

CREATE OR REPLACE FUNCTION public.registrar_treino_com_status(
  p_exercicio_id integer,
  p_exercicio_nome text,
  p_musculo text,
  p_peso_atual numeric,
  p_repeticoes integer,
  p_series integer,
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT auth.uid()) IS NULL OR (SELECT auth.uid()) <> p_user_id THEN
    RAISE EXCEPTION 'permission denied for registrar_treino_com_status'
      USING ERRCODE = '42501';
  END IF;

  IF p_peso_atual IS NULL OR p_peso_atual <= 0 OR p_peso_atual > 9999.99 THEN
    RAISE EXCEPTION 'peso inválido para historico_treinos'
      USING ERRCODE = '22023';
  END IF;

  IF p_exercicio_id IS NULL OR p_exercicio_id <= 0 THEN
    RAISE EXCEPTION 'exercicio_id inválido'
      USING ERRCODE = '22023';
  END IF;

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
    updated_at
  )
  VALUES (
    p_user_id,
    p_user_id,
    p_exercicio_id,
    p_exercicio_nome,
    p_musculo,
    p_peso_atual,
    p_peso_atual,
    p_repeticoes,
    p_series,
    NOW()
  )
  ON CONFLICT (cliente_id, exercicio_id) WHERE cliente_id IS NOT NULL
  DO UPDATE SET
    peso_atual = EXCLUDED.peso_atual,
    peso = EXCLUDED.peso_atual,
    repeticoes = EXCLUDED.repeticoes,
    series = EXCLUDED.series,
    updated_at = NOW();
END;
$$;

CREATE OR REPLACE FUNCTION public.argos_historico_treinos_sync()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.cliente_id IS NULL THEN
    NEW.cliente_id := (SELECT auth.uid());
  END IF;

  IF NEW.user_id IS NULL THEN
    NEW.user_id := NEW.cliente_id;
  END IF;

  IF NEW.peso_atual IS NOT NULL THEN
    NEW.peso := NEW.peso_atual;
  ELSIF NEW.peso IS NOT NULL THEN
    NEW.peso_atual := NEW.peso;
  END IF;

  IF NEW.peso IS NOT NULL AND (NEW.peso <= 0 OR NEW.peso > 9999.99) THEN
    RAISE EXCEPTION 'peso inválido para historico_treinos'
      USING ERRCODE = '22023';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- Remove linhas de probe ARGOS com peso inválido
DELETE FROM public.historico_treinos
WHERE exercicio_id >= 96000 AND exercicio_id < 97000;
