-- FENYXIA · Dual-Track Training Architecture — duas vias Aba Treino
-- Via comum (massa) · Via personal (VIP + Personal)
-- Requer: bootstrap Meccafit + helpers ARGOS (profiles, argos_is_forjador_*)
-- Região alvo: sa-east-1
--
-- ORDEM: tabelas → triggers → helpers → RLS → grants

-- ---------------------------------------------------------------------------
-- 1. forger_client_bonds — vínculo Personal (Forger) ↔ Cliente VIP
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.forger_client_bonds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  forger_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT forger_client_bonds_client_unique UNIQUE (client_id),
  CONSTRAINT forger_client_bonds_distinct_users CHECK (forger_id <> client_id)
);

CREATE INDEX IF NOT EXISTS idx_forger_client_bonds_forger_id
  ON public.forger_client_bonds (forger_id);

CREATE INDEX IF NOT EXISTS idx_forger_client_bonds_client_id
  ON public.forger_client_bonds (client_id);

COMMENT ON TABLE public.forger_client_bonds IS
  'Vínculo 1:1 Cliente VIP ↔ Personal activo (forger_id).';

CREATE OR REPLACE FUNCTION public.forger_client_bonds_validate_roles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_forger_role public.user_role;
  v_client_role public.user_role;
BEGIN
  SELECT p.role INTO v_forger_role
  FROM public.profiles p
  WHERE p.id = NEW.forger_id;

  IF v_forger_role IS NULL THEN
    RAISE EXCEPTION 'forger_id sem perfil em public.profiles'
      USING ERRCODE = '23503';
  END IF;

  IF v_forger_role NOT IN (
    'forjador'::public.user_role,
    'forjador_linhagem'::public.user_role,
    'forjador_soberano'::public.user_role
  ) THEN
    RAISE EXCEPTION 'forger_id deve ser Personal (forjador / forjador_linhagem / forjador_soberano)'
      USING ERRCODE = '42501';
  END IF;

  SELECT p.role INTO v_client_role
  FROM public.profiles p
  WHERE p.id = NEW.client_id;

  IF v_client_role IS NULL THEN
    RAISE EXCEPTION 'client_id sem perfil em public.profiles'
      USING ERRCODE = '23503';
  END IF;

  IF v_client_role <> 'cliente'::public.user_role THEN
    RAISE EXCEPTION 'client_id deve ser role cliente (VIP)'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_forger_client_bonds_validate_roles ON public.forger_client_bonds;
CREATE TRIGGER trg_forger_client_bonds_validate_roles
BEFORE INSERT OR UPDATE ON public.forger_client_bonds
FOR EACH ROW
EXECUTE FUNCTION public.forger_client_bonds_validate_roles();

-- ---------------------------------------------------------------------------
-- 2. historico_treinos_comuns — massa da academia (clientes sem Personal)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.historico_treinos_comuns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  exercicio_id text NOT NULL,
  peso_atual numeric(8, 2) NOT NULL,
  repeticoes integer NOT NULL,
  series integer NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT historico_treinos_comuns_exercicio_id_nonempty CHECK (char_length(btrim(exercicio_id)) > 0),
  CONSTRAINT historico_treinos_comuns_peso_pos CHECK (peso_atual > 0 AND peso_atual <= 9999.99),
  CONSTRAINT historico_treinos_comuns_repeticoes_pos CHECK (repeticoes > 0),
  CONSTRAINT historico_treinos_comuns_series_pos CHECK (series > 0)
);

CREATE INDEX IF NOT EXISTS idx_historico_treinos_comuns_user_criado
  ON public.historico_treinos_comuns (user_id, criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_historico_treinos_comuns_exercicio
  ON public.historico_treinos_comuns (user_id, exercicio_id);

COMMENT ON TABLE public.historico_treinos_comuns IS
  'Via comum — registos de treino self-service (clientes sem vínculo Personal).';

-- ---------------------------------------------------------------------------
-- 3. historico_treinos_personais — prescrições do Personal (VIP)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.historico_treinos_personais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  forger_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  exercicio_id text NOT NULL,
  peso_prescrito numeric(8, 2) NOT NULL,
  repeticoes_alvo integer NOT NULL,
  series_alvo integer NOT NULL,
  observacoes text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT historico_treinos_personais_exercicio_id_nonempty CHECK (char_length(btrim(exercicio_id)) > 0),
  CONSTRAINT historico_treinos_personais_peso_pos CHECK (peso_prescrito > 0 AND peso_prescrito <= 9999.99),
  CONSTRAINT historico_treinos_personais_repeticoes_pos CHECK (repeticoes_alvo > 0),
  CONSTRAINT historico_treinos_personais_series_alvo_pos CHECK (series_alvo > 0),
  CONSTRAINT historico_treinos_personais_observacoes_len CHECK (
    observacoes IS NULL OR char_length(observacoes) <= 2000
  ),
  CONSTRAINT historico_treinos_personais_distinct_users CHECK (client_id <> forger_id)
);

CREATE INDEX IF NOT EXISTS idx_historico_treinos_personais_client_criado
  ON public.historico_treinos_personais (client_id, criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_historico_treinos_personais_forger_client
  ON public.historico_treinos_personais (forger_id, client_id, criado_em DESC);

COMMENT ON TABLE public.historico_treinos_personais IS
  'Via personal — prescrições estritas do Personal para clientes VIP vinculados.';

CREATE OR REPLACE FUNCTION public.historico_treinos_personais_enforce_bond()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.forger_client_bonds b
    WHERE b.client_id = NEW.client_id
      AND b.forger_id = NEW.forger_id
  ) THEN
    RAISE EXCEPTION 'prescrição personal requer vínculo activo em forger_client_bonds'
      USING ERRCODE = '23503';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_historico_treinos_personais_enforce_bond ON public.historico_treinos_personais;
CREATE TRIGGER trg_historico_treinos_personais_enforce_bond
BEFORE INSERT OR UPDATE ON public.historico_treinos_personais
FOR EACH ROW
EXECUTE FUNCTION public.historico_treinos_personais_enforce_bond();

-- ---------------------------------------------------------------------------
-- 4. Helpers — vínculo Personal ↔ Cliente VIP (após tabelas existirem)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.argos_has_forger_bond(p_client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.forger_client_bonds b
    WHERE b.client_id = p_client_id
  );
$$;

CREATE OR REPLACE FUNCTION public.argos_is_forger_personal(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = p_user_id
      AND p.role IN (
        'forjador'::public.user_role,
        'forjador_linhagem'::public.user_role
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.argos_is_forger_bonded_to_client(p_client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.argos_is_forjador_soberano()
    OR EXISTS (
      SELECT 1
      FROM public.forger_client_bonds b
      WHERE b.client_id = p_client_id
        AND b.forger_id = (SELECT auth.uid())
    );
$$;

CREATE OR REPLACE FUNCTION public.argos_is_common_training_client(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = p_user_id
      AND p.role = 'cliente'::public.user_role
  )
  AND NOT public.argos_has_forger_bond(p_user_id);
$$;

REVOKE ALL ON FUNCTION public.argos_has_forger_bond(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.argos_is_forger_personal(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.argos_is_forger_bonded_to_client(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.argos_is_common_training_client(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.argos_has_forger_bond(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.argos_is_forger_personal(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.argos_is_forger_bonded_to_client(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.argos_is_common_training_client(uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5. RLS — forger_client_bonds
-- ---------------------------------------------------------------------------

ALTER TABLE public.forger_client_bonds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ARGOS forger_client_bonds select scoped" ON public.forger_client_bonds;
CREATE POLICY "ARGOS forger_client_bonds select scoped"
ON public.forger_client_bonds
FOR SELECT
TO authenticated
USING (
  public.argos_is_forjador_soberano()
  OR forger_id = (SELECT auth.uid())
  OR client_id = (SELECT auth.uid())
);

DROP POLICY IF EXISTS "ARGOS forger_client_bonds insert sovereign or personal" ON public.forger_client_bonds;
CREATE POLICY "ARGOS forger_client_bonds insert sovereign or personal"
ON public.forger_client_bonds
FOR INSERT
TO authenticated
WITH CHECK (
  public.argos_is_forjador_soberano()
  OR (
    forger_id = (SELECT auth.uid())
    AND public.argos_is_forger_personal((SELECT auth.uid()))
  )
);

DROP POLICY IF EXISTS "ARGOS forger_client_bonds delete sovereign or personal" ON public.forger_client_bonds;
CREATE POLICY "ARGOS forger_client_bonds delete sovereign or personal"
ON public.forger_client_bonds
FOR DELETE
TO authenticated
USING (
  public.argos_is_forjador_soberano()
  OR forger_id = (SELECT auth.uid())
);

DROP POLICY IF EXISTS "ARGOS forger_client_bonds update sovereign" ON public.forger_client_bonds;
CREATE POLICY "ARGOS forger_client_bonds update sovereign"
ON public.forger_client_bonds
FOR UPDATE
TO authenticated
USING (public.argos_is_forjador_soberano())
WITH CHECK (public.argos_is_forjador_soberano());

-- ---------------------------------------------------------------------------
-- 6. RLS — historico_treinos_comuns (somente clientes comuns)
-- ---------------------------------------------------------------------------

ALTER TABLE public.historico_treinos_comuns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ARGOS historico_treinos_comuns select own" ON public.historico_treinos_comuns;
CREATE POLICY "ARGOS historico_treinos_comuns select own"
ON public.historico_treinos_comuns
FOR SELECT
TO authenticated
USING (
  public.argos_is_forjador_soberano()
  OR (
    user_id = (SELECT auth.uid())
    AND public.argos_is_common_training_client((SELECT auth.uid()))
  )
);

DROP POLICY IF EXISTS "ARGOS historico_treinos_comuns insert own" ON public.historico_treinos_comuns;
CREATE POLICY "ARGOS historico_treinos_comuns insert own"
ON public.historico_treinos_comuns
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = (SELECT auth.uid())
  AND public.argos_is_common_training_client((SELECT auth.uid()))
);

DROP POLICY IF EXISTS "ARGOS historico_treinos_comuns update own" ON public.historico_treinos_comuns;
CREATE POLICY "ARGOS historico_treinos_comuns update own"
ON public.historico_treinos_comuns
FOR UPDATE
TO authenticated
USING (
  user_id = (SELECT auth.uid())
  AND public.argos_is_common_training_client((SELECT auth.uid()))
)
WITH CHECK (
  user_id = (SELECT auth.uid())
  AND public.argos_is_common_training_client((SELECT auth.uid()))
);

DROP POLICY IF EXISTS "ARGOS historico_treinos_comuns delete own" ON public.historico_treinos_comuns;
CREATE POLICY "ARGOS historico_treinos_comuns delete own"
ON public.historico_treinos_comuns
FOR DELETE
TO authenticated
USING (
  user_id = (SELECT auth.uid())
  AND public.argos_is_common_training_client((SELECT auth.uid()))
);

-- ---------------------------------------------------------------------------
-- 7. RLS — historico_treinos_personais (Personal + Cliente VIP)
-- ---------------------------------------------------------------------------

ALTER TABLE public.historico_treinos_personais ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ARGOS historico_treinos_personais select bonded" ON public.historico_treinos_personais;
CREATE POLICY "ARGOS historico_treinos_personais select bonded"
ON public.historico_treinos_personais
FOR SELECT
TO authenticated
USING (
  public.argos_is_forjador_soberano()
  OR (
    client_id = (SELECT auth.uid())
    AND public.argos_has_forger_bond((SELECT auth.uid()))
  )
  OR (
    forger_id = (SELECT auth.uid())
    AND public.argos_is_forger_bonded_to_client(client_id)
  )
);

DROP POLICY IF EXISTS "ARGOS historico_treinos_personais insert forger bonded" ON public.historico_treinos_personais;
CREATE POLICY "ARGOS historico_treinos_personais insert forger bonded"
ON public.historico_treinos_personais
FOR INSERT
TO authenticated
WITH CHECK (
  public.argos_is_forjador_soberano()
  OR (
    forger_id = (SELECT auth.uid())
    AND public.argos_is_forger_personal((SELECT auth.uid()))
    AND public.argos_is_forger_bonded_to_client(client_id)
  )
);

DROP POLICY IF EXISTS "ARGOS historico_treinos_personais update forger bonded" ON public.historico_treinos_personais;
CREATE POLICY "ARGOS historico_treinos_personais update forger bonded"
ON public.historico_treinos_personais
FOR UPDATE
TO authenticated
USING (
  public.argos_is_forjador_soberano()
  OR (
    forger_id = (SELECT auth.uid())
    AND public.argos_is_forger_bonded_to_client(client_id)
  )
)
WITH CHECK (
  public.argos_is_forjador_soberano()
  OR (
    forger_id = (SELECT auth.uid())
    AND public.argos_is_forger_bonded_to_client(client_id)
  )
);

DROP POLICY IF EXISTS "ARGOS historico_treinos_personais delete forger bonded" ON public.historico_treinos_personais;
CREATE POLICY "ARGOS historico_treinos_personais delete forger bonded"
ON public.historico_treinos_personais
FOR DELETE
TO authenticated
USING (
  public.argos_is_forjador_soberano()
  OR (
    forger_id = (SELECT auth.uid())
    AND public.argos_is_forger_bonded_to_client(client_id)
  )
);

-- ---------------------------------------------------------------------------
-- 8. Grants — authenticated (RLS aplica); service_role bypass
-- ---------------------------------------------------------------------------

REVOKE ALL ON TABLE public.forger_client_bonds FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.historico_treinos_comuns FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.historico_treinos_personais FROM PUBLIC, anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.forger_client_bonds TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.historico_treinos_comuns TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.historico_treinos_personais TO authenticated;

GRANT ALL ON TABLE public.forger_client_bonds TO service_role;
GRANT ALL ON TABLE public.historico_treinos_comuns TO service_role;
GRANT ALL ON TABLE public.historico_treinos_personais TO service_role;
