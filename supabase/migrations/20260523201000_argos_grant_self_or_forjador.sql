-- Restaura helper usada na policy de historico_treinos (removida na 1430, necessária na 24210000).

CREATE OR REPLACE FUNCTION public.argos_is_self_or_forjador(p_cliente_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.argos_can_access_cliente(p_cliente_id);
$$;

GRANT EXECUTE ON FUNCTION public.argos_is_self_or_forjador(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.argos_is_self_or_forjador(uuid) FROM PUBLIC, anon;
