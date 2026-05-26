-- ARGOS: historico_treinos — writes apenas via RPC SECURITY DEFINER (bloqueia mural forjado)

DROP POLICY IF EXISTS "ARGOS historico_treinos insert own" ON public.historico_treinos;
DROP POLICY IF EXISTS "ARGOS historico_treinos update own" ON public.historico_treinos;

-- SELECT e DELETE próprios permanecem (ARGOS harden migration).

CREATE OR REPLACE FUNCTION public.argos_historico_treinos_block_client_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_setting('app.rpc_registrar_treino', true) = '1' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.status := NULL;
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.status := OLD.status;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_argos_historico_block_client_status ON public.historico_treinos;
CREATE TRIGGER trg_argos_historico_block_client_status
BEFORE INSERT OR UPDATE ON public.historico_treinos
FOR EACH ROW
EXECUTE FUNCTION public.argos_historico_treinos_block_client_status();
