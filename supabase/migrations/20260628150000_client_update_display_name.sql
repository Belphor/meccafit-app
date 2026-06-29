-- Perfil · sincroniza nome exibido do cliente (lista de duelos, rankings)

BEGIN;

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

  UPDATE public.profiles
  SET full_name = v_trimmed,
      updated_at = now()
  WHERE id = v_caller;

  RETURN jsonb_build_object('ok', true, 'full_name', v_trimmed);
END;
$$;

REVOKE ALL ON FUNCTION public.client_update_display_name(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.client_update_display_name(text) TO authenticated;

COMMIT;
