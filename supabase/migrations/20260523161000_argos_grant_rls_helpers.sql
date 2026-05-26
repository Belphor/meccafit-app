-- ARGOS: funções auxiliares precisam ser executáveis pelo papel authenticated
-- quando referenciadas em policies RLS (sem isso, SELECT falha com 42501).

GRANT EXECUTE ON FUNCTION public.argos_is_forjador_soberano() TO authenticated;
GRANT EXECUTE ON FUNCTION public.argos_is_forjador_linhagem() TO authenticated;
GRANT EXECUTE ON FUNCTION public.argos_is_forjador_of_cliente(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.argos_can_access_cliente(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.argos_can_read_profile(uuid) TO authenticated;
-- argos_is_self_or_forjador foi removida na migration 1430; GRANT na 23201000 após recriar alias

REVOKE ALL ON FUNCTION public.argos_is_forjador_soberano() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.argos_is_forjador_linhagem() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.argos_is_forjador_of_cliente(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.argos_can_access_cliente(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.argos_can_read_profile(uuid) FROM PUBLIC, anon;
