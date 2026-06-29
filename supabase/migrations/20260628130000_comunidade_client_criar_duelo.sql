-- Comunidade · desafiar clientes (zero-cost RPC, sem Realtime)

BEGIN;

CREATE OR REPLACE FUNCTION public.list_clientes_duelo()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid;
  v_rows jsonb;
BEGIN
  v_caller := auth.uid();
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('error', 'unauthorized', 'code', 401);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = v_caller AND p.role = 'cliente'::public.user_role
  ) THEN
    RETURN jsonb_build_object('error', 'forbidden', 'code', 403, 'message', 'Apenas clientes podem desafiar.');
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'nome', COALESCE(
          NULLIF(BTRIM(p.full_name), ''),
          NULLIF(BTRIM(p.nome_linhagem), ''),
          'Membro da Linhagem'
        )
      )
      ORDER BY COALESCE(NULLIF(BTRIM(p.full_name), ''), NULLIF(BTRIM(p.nome_linhagem), ''), p.id)
    ),
    '[]'::jsonb
  )
  INTO v_rows
  FROM public.profiles p
  WHERE p.role = 'cliente'::public.user_role
    AND p.id <> v_caller;

  RETURN jsonb_build_object('clientes', v_rows);
END;
$$;

CREATE OR REPLACE FUNCTION public.client_criar_duelo(
  p_desafiado_id uuid,
  p_tipo public.tipo_confronto_duelo
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid;
  v_duelo_id uuid;
BEGIN
  v_caller := auth.uid();
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('error', 'unauthorized', 'code', 401);
  END IF;

  IF p_desafiado_id IS NULL OR p_desafiado_id = v_caller THEN
    RETURN jsonb_build_object('error', 'invalid_target', 'code', 400, 'message', 'Escolha outro atleta.');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = v_caller AND p.role = 'cliente'::public.user_role
  ) THEN
    RETURN jsonb_build_object('error', 'forbidden', 'code', 403, 'message', 'Forjadores não participam de duelos.');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = p_desafiado_id AND p.role = 'cliente'::public.user_role
  ) THEN
    RETURN jsonb_build_object('error', 'invalid_target', 'code', 400, 'message', 'Só é possível desafiar clientes da academia.');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.duelos_supergrupos d
    WHERE d.status = 'EM_ANDAMENTO'::public.status_duelo_supergrupo
      AND (d.atleta_desafiante_id = v_caller OR d.atleta_desafiado_id = v_caller)
  ) THEN
    RETURN jsonb_build_object('error', 'duelo_ativo_caller', 'code', 409, 'message', 'Você já tem um duelo em andamento.');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.duelos_supergrupos d
    WHERE d.status = 'EM_ANDAMENTO'::public.status_duelo_supergrupo
      AND (d.atleta_desafiante_id = p_desafiado_id OR d.atleta_desafiado_id = p_desafiado_id)
  ) THEN
    RETURN jsonb_build_object('error', 'duelo_ativo_target', 'code', 409, 'message', 'Este atleta já está em outro duelo.');
  END IF;

  INSERT INTO public.duelos_supergrupos (
    atleta_desafiante_id,
    atleta_desafiado_id,
    tipo_confronto,
    status
  )
  VALUES (
    v_caller,
    p_desafiado_id,
    p_tipo,
    'EM_ANDAMENTO'::public.status_duelo_supergrupo
  )
  RETURNING id INTO v_duelo_id;

  RETURN jsonb_build_object('ok', true, 'duelo_id', v_duelo_id);
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('error', 'duelo_ativo', 'code', 409, 'message', 'Um dos atletas já está em duelo.');
END;
$$;

REVOKE ALL ON FUNCTION public.list_clientes_duelo() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.client_criar_duelo(uuid, public.tipo_confronto_duelo) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_clientes_duelo() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.client_criar_duelo(uuid, public.tipo_confronto_duelo) TO authenticated, service_role;

COMMENT ON FUNCTION public.list_clientes_duelo() IS
  'Lista clientes elegíveis para duelo (exclui forjadores e o caller). Leitura leve para picker.';

COMMENT ON FUNCTION public.client_criar_duelo(uuid, public.tipo_confronto_duelo) IS
  'Cria duelo 1:1 com validações. Pontuação acumula via trigger em historico_cargas — zero polling.';

COMMIT;
