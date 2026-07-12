-- Reforça unicidade de nome exibido entre clientes (case-insensitive).
-- Evita colisão de perfis/rankings mesmo antes da confirmação formal da identidade.

DROP INDEX IF EXISTS public.profiles_cliente_full_name_unique_ci;

CREATE UNIQUE INDEX profiles_cliente_full_name_unique_ci
  ON public.profiles (lower(btrim(full_name)))
  WHERE role = 'cliente'::public.user_role
    AND full_name IS NOT NULL
    AND btrim(full_name) <> '';

CREATE OR REPLACE FUNCTION public.client_update_display_name(p_full_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid;
  v_trimmed text;
BEGIN
  v_caller := auth.uid();
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('error', 'unauthorized', 'code', 401);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = v_caller AND p.role = 'cliente'::public.user_role
  ) THEN
    RETURN jsonb_build_object('error', 'forbidden', 'code', 403, 'message', 'Apenas clientes podem atualizar o nome.');
  END IF;

  v_trimmed := NULLIF(BTRIM(COALESCE(p_full_name, '')), '');
  IF v_trimmed IS NULL OR char_length(v_trimmed) < 2 THEN
    RETURN jsonb_build_object('error', 'invalid_name', 'code', 400, 'message', 'Informe um nome com pelo menos 2 caracteres.');
  END IF;

  IF char_length(v_trimmed) > 48 THEN
    RETURN jsonb_build_object('error', 'invalid_name', 'code', 400, 'message', 'Nome muito longo (máx. 48 caracteres).');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id <> v_caller
      AND p.role = 'cliente'::public.user_role
      AND full_name IS NOT NULL
      AND btrim(full_name) <> ''
      AND lower(btrim(p.full_name)) = lower(v_trimmed)
  ) THEN
    RETURN jsonb_build_object(
      'error', 'name_taken',
      'code', 409,
      'message', 'Este nome já pertence a outra chama da linhagem. Escolha outro.'
    );
  END IF;

  UPDATE public.profiles
  SET full_name = v_trimmed,
      updated_at = now()
  WHERE id = v_caller;

  RETURN jsonb_build_object('ok', true, 'full_name', v_trimmed);
END;
$$;

CREATE OR REPLACE FUNCTION public.client_confirm_profile_identity(
  p_full_name text,
  p_sexo public.profile_sexo
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid;
  v_trimmed text;
BEGIN
  v_caller := auth.uid();
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('error', 'unauthorized', 'code', 401);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = v_caller AND p.role = 'cliente'::public.user_role
  ) THEN
    RETURN jsonb_build_object('error', 'forbidden', 'code', 403, 'message', 'Apenas clientes podem confirmar a identidade.');
  END IF;

  v_trimmed := NULLIF(BTRIM(COALESCE(p_full_name, '')), '');
  IF v_trimmed IS NULL OR char_length(v_trimmed) < 2 THEN
    RETURN jsonb_build_object('error', 'invalid_name', 'code', 400, 'message', 'Informe um nome com pelo menos 2 caracteres.');
  END IF;

  IF char_length(v_trimmed) > 48 THEN
    RETURN jsonb_build_object('error', 'invalid_name', 'code', 400, 'message', 'Nome muito longo (máx. 48 caracteres).');
  END IF;

  IF p_sexo IS NULL THEN
    RETURN jsonb_build_object('error', 'invalid_sexo', 'code', 400, 'message', 'Selecione masculino ou feminino.');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id <> v_caller
      AND p.role = 'cliente'::public.user_role
      AND full_name IS NOT NULL
      AND btrim(full_name) <> ''
      AND lower(btrim(p.full_name)) = lower(v_trimmed)
  ) THEN
    RETURN jsonb_build_object(
      'error', 'name_taken',
      'code', 409,
      'message', 'Este nome já pertence a outra chama da linhagem. Escolha outro.'
    );
  END IF;

  UPDATE public.profiles
  SET full_name = v_trimmed,
      sexo = p_sexo,
      perfil_identidade_confirmada = true,
      updated_at = now()
  WHERE id = v_caller;

  RETURN jsonb_build_object(
    'ok', true,
    'full_name', v_trimmed,
    'sexo', p_sexo::text,
    'perfil_identidade_confirmada', true
  );
END;
$$;
