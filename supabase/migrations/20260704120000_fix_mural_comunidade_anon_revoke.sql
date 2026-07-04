-- Restaura REVOKE de anon/PUBLIC em RPCs de comunidade.
-- A migration 20260701120000 recriou as funcoes (DROP + CREATE) e regrantou
-- apenas authenticated/service_role, mas nao revogou anon — PostgREST expoe o RPC.

BEGIN;

REVOKE ALL ON FUNCTION public.argos_fetch_mural_comunidade(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.argos_fetch_mural_comunidade(integer) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.argos_fetch_forum_brasa_viva(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.argos_fetch_forum_brasa_viva(integer) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.list_clientes_duelo(text, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_clientes_duelo(text, integer, integer) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_rankings_thoth() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_rankings_thoth() TO authenticated, service_role;

COMMIT;
