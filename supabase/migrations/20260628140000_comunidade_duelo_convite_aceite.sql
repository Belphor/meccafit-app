-- Duelos · convite com aceite obrigatório (zero Realtime)

BEGIN;

ALTER TYPE public.status_duelo_supergrupo ADD VALUE IF NOT EXISTS 'AGUARDANDO_ACEITE';

DROP FUNCTION IF EXISTS public.list_clientes_duelo();
DROP FUNCTION IF EXISTS public.list_clientes_duelo(text, integer, integer);

CREATE OR REPLACE FUNCTION public.list_clientes_duelo(
  p_search text DEFAULT NULL,
  p_offset integer DEFAULT 0,
  p_limit integer DEFAULT 20
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid;
  v_rows jsonb;
  v_total integer;
  v_search text;
  v_offset integer;
  v_limit integer;
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

  v_search := NULLIF(BTRIM(COALESCE(p_search, '')), '');
  v_offset := GREATEST(COALESCE(p_offset, 0), 0);
  v_limit := LEAST(GREATEST(COALESCE(p_limit, 20), 1), 50);

  SELECT COUNT(*)::integer
  INTO v_total
  FROM public.profiles p
  WHERE p.role = 'cliente'::public.user_role
    AND p.id <> v_caller
    AND (
      v_search IS NULL
      OR COALESCE(NULLIF(BTRIM(p.full_name), ''), NULLIF(BTRIM(p.nome_linhagem), ''), 'Membro da Linhagem')
        ILIKE '%' || v_search || '%'
    );

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', s.id,
        'nome', s.nome,
        'is_vip', s.is_vip
      )
    ),
    '[]'::jsonb
  )
  INTO v_rows
  FROM (
    SELECT
      p.id,
      COALESCE(
        NULLIF(BTRIM(p.full_name), ''),
        NULLIF(BTRIM(p.nome_linhagem), ''),
        'Membro da Linhagem'
      ) AS nome,
      EXISTS (
        SELECT 1
        FROM public.forger_client_bonds b
        WHERE b.client_id = p.id
      ) AS is_vip
    FROM public.profiles p
    WHERE p.role = 'cliente'::public.user_role
      AND p.id <> v_caller
      AND (
        v_search IS NULL
        OR COALESCE(NULLIF(BTRIM(p.full_name), ''), NULLIF(BTRIM(p.nome_linhagem), ''), 'Membro da Linhagem')
          ILIKE '%' || v_search || '%'
      )
    ORDER BY nome, p.id
    OFFSET v_offset
    LIMIT v_limit
  ) s;

  RETURN jsonb_build_object(
    'clientes', v_rows,
    'total', v_total,
    'offset', v_offset,
    'limit', v_limit
  );
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
    RETURN jsonb_build_object('error', 'invalid_target', 'code', 400, 'message', 'Só é possível desafiar clientes registrados.');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.duelos_supergrupos d
    WHERE d.status IN (
      'EM_ANDAMENTO'::public.status_duelo_supergrupo,
      'AGUARDANDO_ACEITE'::public.status_duelo_supergrupo
    )
      AND (d.atleta_desafiante_id = v_caller OR d.atleta_desafiado_id = v_caller)
  ) THEN
    RETURN jsonb_build_object('error', 'duelo_ativo_caller', 'code', 409, 'message', 'Você já tem um duelo pendente ou em andamento.');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.duelos_supergrupos d
    WHERE d.status IN (
      'EM_ANDAMENTO'::public.status_duelo_supergrupo,
      'AGUARDANDO_ACEITE'::public.status_duelo_supergrupo
    )
      AND (d.atleta_desafiante_id = p_desafiado_id OR d.atleta_desafiado_id = p_desafiado_id)
  ) THEN
    RETURN jsonb_build_object('error', 'duelo_ativo_target', 'code', 409, 'message', 'Este atleta já tem duelo pendente ou em andamento.');
  END IF;

  INSERT INTO public.duelos_supergrupos (
    atleta_desafiante_id,
    atleta_desafiado_id,
    tipo_confronto,
    status,
    inicio_em
  )
  VALUES (
    v_caller,
    p_desafiado_id,
    p_tipo,
    'AGUARDANDO_ACEITE'::public.status_duelo_supergrupo,
    now()
  )
  RETURNING id INTO v_duelo_id;

  RETURN jsonb_build_object('ok', true, 'duelo_id', v_duelo_id, 'status', 'AGUARDANDO_ACEITE');
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('error', 'duelo_ativo', 'code', 409, 'message', 'Um dos atletas já está em duelo.');
END;
$$;

CREATE OR REPLACE FUNCTION public.get_duelo_convite_pendente()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid;
  v_row record;
BEGIN
  v_caller := auth.uid();
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('error', 'unauthorized', 'code', 401);
  END IF;

  SELECT
    d.id,
    d.tipo_confronto,
    d.atleta_desafiante_id,
    COALESCE(
      NULLIF(BTRIM(p.full_name), ''),
      NULLIF(BTRIM(p.nome_linhagem), ''),
      'Membro da Linhagem'
    ) AS desafiante_nome,
    d.created_at
  INTO v_row
  FROM public.duelos_supergrupos d
  INNER JOIN public.profiles p ON p.id = d.atleta_desafiante_id
  WHERE d.atleta_desafiado_id = v_caller
    AND d.status = 'AGUARDANDO_ACEITE'::public.status_duelo_supergrupo
  ORDER BY d.created_at ASC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('convite', null);
  END IF;

  RETURN jsonb_build_object(
    'convite',
    jsonb_build_object(
      'id', v_row.id,
      'tipo_confronto', v_row.tipo_confronto,
      'atleta_desafiante_id', v_row.atleta_desafiante_id,
      'desafiante_nome', v_row.desafiante_nome,
      'created_at', v_row.created_at
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.client_responder_duelo(
  p_duelo_id uuid,
  p_aceitar boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid;
  v_duelo public.duelos_supergrupos;
BEGIN
  v_caller := auth.uid();
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('error', 'unauthorized', 'code', 401);
  END IF;

  SELECT * INTO v_duelo
  FROM public.duelos_supergrupos
  WHERE id = p_duelo_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'not_found', 'code', 404, 'message', 'Duelo não encontrado.');
  END IF;

  IF v_duelo.atleta_desafiado_id <> v_caller THEN
    RETURN jsonb_build_object('error', 'forbidden', 'code', 403, 'message', 'Apenas o desafiado pode responder.');
  END IF;

  IF v_duelo.status <> 'AGUARDANDO_ACEITE'::public.status_duelo_supergrupo THEN
    RETURN jsonb_build_object('error', 'invalid_state', 'code', 409, 'message', 'Este convite já foi respondido.');
  END IF;

  IF COALESCE(p_aceitar, false) THEN
    UPDATE public.duelos_supergrupos
    SET
      status = 'EM_ANDAMENTO'::public.status_duelo_supergrupo,
      inicio_em = now(),
      updated_at = now()
    WHERE id = p_duelo_id;

    RETURN jsonb_build_object('ok', true, 'status', 'EM_ANDAMENTO');
  END IF;

  UPDATE public.duelos_supergrupos
  SET
    status = 'CANCELADO'::public.status_duelo_supergrupo,
    updated_at = now()
  WHERE id = p_duelo_id;

  RETURN jsonb_build_object('ok', true, 'status', 'CANCELADO');
END;
$$;

DROP POLICY IF EXISTS "ARGOS duelos select participantes" ON public.duelos_supergrupos;
CREATE POLICY "ARGOS duelos select participantes"
ON public.duelos_supergrupos FOR SELECT TO authenticated
USING (
  atleta_desafiante_id = (SELECT auth.uid())
  OR atleta_desafiado_id = (SELECT auth.uid())
  OR status = 'EM_ANDAMENTO'::public.status_duelo_supergrupo
);

REVOKE ALL ON FUNCTION public.list_clientes_duelo(text, integer, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_duelo_convite_pendente() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.client_responder_duelo(uuid, boolean) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.list_clientes_duelo(text, integer, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_duelo_convite_pendente() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.client_responder_duelo(uuid, boolean) TO authenticated, service_role;

COMMIT;
