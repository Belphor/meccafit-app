-- Ao remover vínculo VIP, limpa profiles.forjador_id do cliente.

CREATE OR REPLACE FUNCTION public.forger_client_bonds_clear_profile_on_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('meccafit.bond_sync_update', 'true', true);

  UPDATE public.profiles
  SET forjador_id = NULL, updated_at = now()
  WHERE id = OLD.client_id
    AND role = 'cliente'::public.user_role
    AND forjador_id IS NOT DISTINCT FROM OLD.forger_id;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_forger_client_bonds_clear_profile_on_delete ON public.forger_client_bonds;
CREATE TRIGGER trg_forger_client_bonds_clear_profile_on_delete
AFTER DELETE ON public.forger_client_bonds
FOR EACH ROW
EXECUTE FUNCTION public.forger_client_bonds_clear_profile_on_delete();

REVOKE ALL ON FUNCTION public.forger_client_bonds_clear_profile_on_delete() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.forger_client_bonds_clear_profile_on_delete() TO service_role;
