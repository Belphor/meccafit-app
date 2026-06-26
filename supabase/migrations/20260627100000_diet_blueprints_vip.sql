-- FENYXIA · diet_blueprints — plano nutricional exclusivo VIP (bond activo)
-- Requer: dual_track_training_architecture (forger_client_bonds + helpers ARGOS)

CREATE TABLE IF NOT EXISTS public.diet_blueprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  forger_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  titulo text NOT NULL,
  objetivo text NOT NULL DEFAULT 'recomposicao',
  calorias_alvo integer NOT NULL,
  proteinas_g integer NOT NULL,
  carboidratos_g integer NOT NULL,
  gorduras_g integer NOT NULL,
  agua_litros numeric(4, 1) NOT NULL DEFAULT 3.0,
  refeicoes jsonb NOT NULL DEFAULT '[]'::jsonb,
  observacoes text,
  activo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT diet_blueprints_distinct_users CHECK (client_id <> forger_id),
  CONSTRAINT diet_blueprints_titulo_len CHECK (char_length(btrim(titulo)) >= 3),
  CONSTRAINT diet_blueprints_objetivo_valid CHECK (
    objetivo IN ('hipertrofia', 'definicao', 'recomposicao', 'manutencao')
  ),
  CONSTRAINT diet_blueprints_calorias_pos CHECK (calorias_alvo BETWEEN 800 AND 10000),
  CONSTRAINT diet_blueprints_proteinas_pos CHECK (proteinas_g BETWEEN 30 AND 600),
  CONSTRAINT diet_blueprints_carboidratos_pos CHECK (carboidratos_g BETWEEN 0 AND 1200),
  CONSTRAINT diet_blueprints_gorduras_pos CHECK (gorduras_g BETWEEN 10 AND 400),
  CONSTRAINT diet_blueprints_agua_pos CHECK (agua_litros > 0 AND agua_litros <= 10),
  CONSTRAINT diet_blueprints_observacoes_len CHECK (
    observacoes IS NULL OR char_length(observacoes) <= 4000
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_diet_blueprints_client_active
  ON public.diet_blueprints (client_id)
  WHERE activo = true;

CREATE INDEX IF NOT EXISTS idx_diet_blueprints_forger_client
  ON public.diet_blueprints (forger_id, client_id, criado_em DESC);

COMMENT ON TABLE public.diet_blueprints IS
  'Blueprint nutricional termogénico — exclusivo clientes VIP com bond activo.';

CREATE OR REPLACE FUNCTION public.diet_blueprints_enforce_bond()
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
    RAISE EXCEPTION 'blueprint de dieta requer vínculo activo em forger_client_bonds'
      USING ERRCODE = '23503';
  END IF;

  NEW.atualizado_em := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_diet_blueprints_enforce_bond ON public.diet_blueprints;
CREATE TRIGGER trg_diet_blueprints_enforce_bond
BEFORE INSERT OR UPDATE ON public.diet_blueprints
FOR EACH ROW
EXECUTE FUNCTION public.diet_blueprints_enforce_bond();

ALTER TABLE public.diet_blueprints ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ARGOS diet_blueprints select bonded" ON public.diet_blueprints;
CREATE POLICY "ARGOS diet_blueprints select bonded"
ON public.diet_blueprints
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

DROP POLICY IF EXISTS "ARGOS diet_blueprints insert forger bonded" ON public.diet_blueprints;
CREATE POLICY "ARGOS diet_blueprints insert forger bonded"
ON public.diet_blueprints
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

DROP POLICY IF EXISTS "ARGOS diet_blueprints update forger bonded" ON public.diet_blueprints;
CREATE POLICY "ARGOS diet_blueprints update forger bonded"
ON public.diet_blueprints
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

DROP POLICY IF EXISTS "ARGOS diet_blueprints delete forger bonded" ON public.diet_blueprints;
CREATE POLICY "ARGOS diet_blueprints delete forger bonded"
ON public.diet_blueprints
FOR DELETE
TO authenticated
USING (
  public.argos_is_forjador_soberano()
  OR (
    forger_id = (SELECT auth.uid())
    AND public.argos_is_forger_bonded_to_client(client_id)
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.diet_blueprints TO authenticated;
GRANT ALL ON public.diet_blueprints TO service_role;
