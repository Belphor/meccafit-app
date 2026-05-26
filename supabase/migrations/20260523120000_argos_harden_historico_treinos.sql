-- ARGOS: blindagem historico_treinos + índices de escala
-- Aplicar no SQL Editor: https://supabase.com/dashboard/project/srhftwluwxbnoirrtyuz/sql

CREATE OR REPLACE FUNCTION public.argos_is_forjador()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = (SELECT auth.uid())
      AND role = 'forjador'::user_role
  );
$$;

CREATE OR REPLACE FUNCTION public.argos_is_self_or_forjador(p_cliente_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_cliente_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.profiles forjador
      JOIN public.profiles cliente ON cliente.id = p_cliente_id
      WHERE forjador.id = (SELECT auth.uid())
        AND forjador.role = 'forjador'::user_role
        AND cliente.forjador_id = forjador.id
    );
$$;

UPDATE public.historico_treinos
SET user_id = cliente_id
WHERE user_id IS NULL
  AND cliente_id IS NOT NULL;

UPDATE public.historico_treinos
SET peso = peso_atual
WHERE peso IS NULL
  AND peso_atual IS NOT NULL;

ALTER TABLE public.historico_treinos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Gerenciamento Autenticado Fenyxia" ON public.historico_treinos;

DROP POLICY IF EXISTS "ARGOS historico_treinos select self or forjador" ON public.historico_treinos;
CREATE POLICY "ARGOS historico_treinos select self or forjador"
ON public.historico_treinos
FOR SELECT
TO authenticated
USING (public.argos_is_self_or_forjador(cliente_id));

DROP POLICY IF EXISTS "ARGOS historico_treinos insert own" ON public.historico_treinos;
CREATE POLICY "ARGOS historico_treinos insert own"
ON public.historico_treinos
FOR INSERT
TO authenticated
WITH CHECK (cliente_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "ARGOS historico_treinos update own" ON public.historico_treinos;
CREATE POLICY "ARGOS historico_treinos update own"
ON public.historico_treinos
FOR UPDATE
TO authenticated
USING (cliente_id = (SELECT auth.uid()))
WITH CHECK (cliente_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "ARGOS historico_treinos delete own" ON public.historico_treinos;
CREATE POLICY "ARGOS historico_treinos delete own"
ON public.historico_treinos
FOR DELETE
TO authenticated
USING (cliente_id = (SELECT auth.uid()));

CREATE INDEX IF NOT EXISTS idx_historico_treinos_cliente_id
  ON public.historico_treinos (cliente_id);

CREATE INDEX IF NOT EXISTS idx_historico_treinos_cliente_exercicio_registrado
  ON public.historico_treinos (cliente_id, exercicio_id, registrado_em DESC);

CREATE INDEX IF NOT EXISTS idx_historico_treino_cliente_id
  ON public.historico_treino (cliente_id);

ALTER TABLE public.historico_treinos
  DROP CONSTRAINT IF EXISTS unique_user_exercise;

DROP INDEX IF EXISTS idx_historico_treinos_cliente_exercicio_unique;
CREATE UNIQUE INDEX idx_historico_treinos_cliente_exercicio_unique
  ON public.historico_treinos (cliente_id, exercicio_id)
  WHERE cliente_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.argos_historico_treinos_sync()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.cliente_id IS NULL THEN
    NEW.cliente_id := (SELECT auth.uid());
  END IF;

  IF NEW.user_id IS NULL THEN
    NEW.user_id := NEW.cliente_id;
  END IF;

  IF NEW.peso_atual IS NOT NULL THEN
    NEW.peso := NEW.peso_atual;
  ELSIF NEW.peso IS NOT NULL THEN
    NEW.peso_atual := NEW.peso;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_argos_historico_treinos_sync ON public.historico_treinos;
CREATE TRIGGER trg_argos_historico_treinos_sync
BEFORE INSERT OR UPDATE ON public.historico_treinos
FOR EACH ROW
EXECUTE FUNCTION public.argos_historico_treinos_sync();

REVOKE ALL ON FUNCTION public.registrar_treino_com_status(uuid, text, numeric, date, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.registrar_treino_com_status(integer, text, text, numeric, integer, integer, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.atualizar_estagio_muscular() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.registrar_treino_com_status(uuid, text, numeric, date, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.registrar_treino_com_status(integer, text, text, numeric, integer, integer, uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.argos_is_forjador() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.argos_is_self_or_forjador(uuid) FROM PUBLIC, anon, authenticated;
