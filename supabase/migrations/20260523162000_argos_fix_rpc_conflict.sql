-- Corrige ON CONFLICT da RPC para o índice parcial existente.

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
