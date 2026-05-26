-- ARGOS: somente forjador_soberano enxerga todos os usuários.
-- forjador / forjador_linhagem: apenas clientes vinculados (profiles.forjador_id).

CREATE OR REPLACE FUNCTION public.argos_is_forjador_soberano()
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
      AND role = 'forjador_soberano'::user_role
  );
$$;

CREATE OR REPLACE FUNCTION public.argos_is_forjador_linhagem()
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
      AND role IN ('forjador'::user_role, 'forjador_linhagem'::user_role)
  );
$$;

CREATE OR REPLACE FUNCTION public.argos_is_forjador_of_cliente(p_cliente_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.argos_is_forjador_linhagem()
    AND EXISTS (
      SELECT 1
      FROM public.profiles cliente
      WHERE cliente.id = p_cliente_id
        AND cliente.forjador_id = (SELECT auth.uid())
    );
$$;

CREATE OR REPLACE FUNCTION public.argos_can_access_cliente(p_cliente_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_cliente_id = (SELECT auth.uid())
    OR public.argos_is_forjador_soberano()
    OR public.argos_is_forjador_of_cliente(p_cliente_id);
$$;

CREATE OR REPLACE FUNCTION public.argos_can_read_profile(p_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_profile_id = (SELECT auth.uid())
    OR public.argos_is_forjador_soberano()
    OR (
      public.argos_is_forjador_linhagem()
      AND EXISTS (
        SELECT 1
        FROM public.profiles cliente
        WHERE cliente.id = p_profile_id
          AND cliente.forjador_id = (SELECT auth.uid())
      )
    );
$$;

-- historico_treinos
DROP POLICY IF EXISTS "ARGOS historico_treinos select self or forjador" ON public.historico_treinos;
CREATE POLICY "ARGOS historico_treinos select self or forjador"
ON public.historico_treinos
FOR SELECT
TO authenticated
USING (public.argos_can_access_cliente(cliente_id));

-- profiles
DROP POLICY IF EXISTS "Profiles: Leitura Própria ou Forjador" ON public.profiles;
DROP POLICY IF EXISTS "ARGOS profiles select self or assigned" ON public.profiles;
CREATE POLICY "ARGOS profiles select sovereign or assigned"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.argos_can_read_profile(id));

-- historico_treino
DROP POLICY IF EXISTS "Treino: Forjador monitora" ON public.historico_treino;
DROP POLICY IF EXISTS "Treino: Cliente insere e vê o seu" ON public.historico_treino;
DROP POLICY IF EXISTS "ARGOS treino select self or forjador" ON public.historico_treino;

CREATE POLICY "ARGOS historico_treino select scoped"
ON public.historico_treino
FOR SELECT
TO authenticated
USING (public.argos_can_access_cliente(cliente_id));

CREATE POLICY "ARGOS historico_treino insert own"
ON public.historico_treino
FOR INSERT
TO authenticated
WITH CHECK (cliente_id = (SELECT auth.uid()));

CREATE POLICY "ARGOS historico_treino update own"
ON public.historico_treino
FOR UPDATE
TO authenticated
USING (cliente_id = (SELECT auth.uid()))
WITH CHECK (cliente_id = (SELECT auth.uid()));

CREATE POLICY "ARGOS historico_treino delete own"
ON public.historico_treino
FOR DELETE
TO authenticated
USING (cliente_id = (SELECT auth.uid()));

-- matriz_forca
DROP POLICY IF EXISTS "Matriz Força: Cliente vê a sua" ON public.matriz_forca;
DROP POLICY IF EXISTS "Matriz Força: Forjador gerencia" ON public.matriz_forca;
DROP POLICY IF EXISTS "ARGOS matriz select self or forjador" ON public.matriz_forca;
DROP POLICY IF EXISTS "ARGOS matriz insert authenticated cliente" ON public.matriz_forca;

CREATE POLICY "ARGOS matriz_forca select scoped"
ON public.matriz_forca
FOR SELECT
TO authenticated
USING (public.argos_can_access_cliente(cliente_id));

CREATE POLICY "ARGOS matriz_forca insert own"
ON public.matriz_forca
FOR INSERT
TO authenticated
WITH CHECK (cliente_id = (SELECT auth.uid()));

CREATE POLICY "ARGOS matriz_forca update own"
ON public.matriz_forca
FOR UPDATE
TO authenticated
USING (cliente_id = (SELECT auth.uid()))
WITH CHECK (cliente_id = (SELECT auth.uid()));

-- fenix_pureza_diaria
DROP POLICY IF EXISTS "Dieta: Cliente gerencia a sua" ON public.fenix_pureza_diaria;
DROP POLICY IF EXISTS "ARGOS pureza select self or forjador" ON public.fenix_pureza_diaria;

CREATE POLICY "ARGOS pureza select scoped"
ON public.fenix_pureza_diaria
FOR SELECT
TO authenticated
USING (public.argos_can_access_cliente(cliente_id));

CREATE POLICY "ARGOS pureza insert own"
ON public.fenix_pureza_diaria
FOR INSERT
TO authenticated
WITH CHECK (cliente_id = (SELECT auth.uid()));

CREATE POLICY "ARGOS pureza update own"
ON public.fenix_pureza_diaria
FOR UPDATE
TO authenticated
USING (cliente_id = (SELECT auth.uid()))
WITH CHECK (cliente_id = (SELECT auth.uid()));

CREATE POLICY "ARGOS pureza delete own"
ON public.fenix_pureza_diaria
FOR DELETE
TO authenticated
USING (cliente_id = (SELECT auth.uid()));

-- planos_semanais
DROP POLICY IF EXISTS "Planos: Cliente e Forjador veem" ON public.planos_semanais;
DROP POLICY IF EXISTS "Planos: Forjador prescreve" ON public.planos_semanais;

CREATE POLICY "ARGOS planos select scoped"
ON public.planos_semanais
FOR SELECT
TO authenticated
USING (
  public.argos_can_access_cliente(cliente_id)
  OR forjador_id = (SELECT auth.uid())
);

CREATE POLICY "ARGOS planos insert forjador linhagem"
ON public.planos_semanais
FOR INSERT
TO authenticated
WITH CHECK (
  public.argos_is_forjador_soberano()
  OR (
    public.argos_is_forjador_linhagem()
    AND forjador_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.profiles cliente
      WHERE cliente.id = cliente_id
        AND cliente.forjador_id = (SELECT auth.uid())
    )
  )
);

CREATE POLICY "ARGOS planos update forjador linhagem"
ON public.planos_semanais
FOR UPDATE
TO authenticated
USING (
  public.argos_is_forjador_soberano()
  OR (
    public.argos_is_forjador_linhagem()
    AND forjador_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  public.argos_is_forjador_soberano()
  OR (
    public.argos_is_forjador_linhagem()
    AND forjador_id = (SELECT auth.uid())
  )
);

REVOKE ALL ON FUNCTION public.argos_is_forjador_soberano() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.argos_is_forjador_linhagem() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.argos_is_forjador_of_cliente(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.argos_can_access_cliente(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.argos_can_read_profile(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.argos_is_forjador_soberano() TO authenticated;
GRANT EXECUTE ON FUNCTION public.argos_is_forjador_linhagem() TO authenticated;
GRANT EXECUTE ON FUNCTION public.argos_is_forjador_of_cliente(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.argos_can_access_cliente(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.argos_can_read_profile(uuid) TO authenticated;

DROP FUNCTION IF EXISTS public.argos_is_forjador();
DROP FUNCTION IF EXISTS public.argos_is_self_or_forjador(uuid);
