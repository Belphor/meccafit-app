-- FENYXIA · VIP Forjador — dieta semanal activa + medidas corporais activas
-- Requer: dual_track_training_architecture (forger_client_bonds + helpers ARGOS)

CREATE TABLE IF NOT EXISTS public.vip_dieta_semanal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  forger_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  semana_ref text NOT NULL,
  dias jsonb NOT NULL DEFAULT '{}'::jsonb,
  activo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vip_dieta_semanal_distinct_users CHECK (client_id <> forger_id),
  CONSTRAINT vip_dieta_semanal_semana_ref_len CHECK (char_length(btrim(semana_ref)) BETWEEN 4 AND 32),
  CONSTRAINT vip_dieta_semanal_dias_object CHECK (jsonb_typeof(dias) = 'object')
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_vip_dieta_semanal_client_active
  ON public.vip_dieta_semanal (client_id)
  WHERE activo = true;

CREATE INDEX IF NOT EXISTS idx_vip_dieta_semanal_forger_client
  ON public.vip_dieta_semanal (forger_id, client_id, atualizado_em DESC);

COMMENT ON TABLE public.vip_dieta_semanal IS
  'Estado activo da dieta semanal VIP (Seg–Dom) — sincronizado manualmente pelo forjador.';

CREATE TABLE IF NOT EXISTS public.vip_medidas_corporais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  forger_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  peso_kg numeric(6, 2) NOT NULL,
  altura_cm numeric(5, 1) NOT NULL,
  perimetros jsonb NOT NULL DEFAULT '{}'::jsonb,
  activo boolean NOT NULL DEFAULT true,
  medido_em timestamptz NOT NULL DEFAULT now(),
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vip_medidas_corporais_distinct_users CHECK (client_id <> forger_id),
  CONSTRAINT vip_medidas_corporais_peso_pos CHECK (peso_kg > 0 AND peso_kg <= 400),
  CONSTRAINT vip_medidas_corporais_altura_pos CHECK (altura_cm >= 100 AND altura_cm <= 260),
  CONSTRAINT vip_medidas_corporais_perimetros_object CHECK (jsonb_typeof(perimetros) = 'object')
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_vip_medidas_corporais_client_active
  ON public.vip_medidas_corporais (client_id)
  WHERE activo = true;

CREATE INDEX IF NOT EXISTS idx_vip_medidas_corporais_forger_client
  ON public.vip_medidas_corporais (forger_id, client_id, medido_em DESC);

COMMENT ON TABLE public.vip_medidas_corporais IS
  'Medidas antropométricas activas VIP — peso, altura e perímetros (JSON).';

CREATE OR REPLACE FUNCTION public.vip_forjador_enforce_bond()
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
    RAISE EXCEPTION 'registo VIP requer vínculo activo em forger_client_bonds'
      USING ERRCODE = '23503';
  END IF;

  NEW.atualizado_em := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vip_dieta_semanal_enforce_bond ON public.vip_dieta_semanal;
CREATE TRIGGER trg_vip_dieta_semanal_enforce_bond
BEFORE INSERT OR UPDATE ON public.vip_dieta_semanal
FOR EACH ROW
EXECUTE FUNCTION public.vip_forjador_enforce_bond();

DROP TRIGGER IF EXISTS trg_vip_medidas_corporais_enforce_bond ON public.vip_medidas_corporais;
CREATE TRIGGER trg_vip_medidas_corporais_enforce_bond
BEFORE INSERT OR UPDATE ON public.vip_medidas_corporais
FOR EACH ROW
EXECUTE FUNCTION public.vip_forjador_enforce_bond();

ALTER TABLE public.vip_dieta_semanal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vip_medidas_corporais ENABLE ROW LEVEL SECURITY;

-- vip_dieta_semanal · SELECT
DROP POLICY IF EXISTS "ARGOS vip_dieta_semanal select bonded" ON public.vip_dieta_semanal;
CREATE POLICY "ARGOS vip_dieta_semanal select bonded"
ON public.vip_dieta_semanal
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

-- vip_dieta_semanal · INSERT
DROP POLICY IF EXISTS "ARGOS vip_dieta_semanal insert forger bonded" ON public.vip_dieta_semanal;
CREATE POLICY "ARGOS vip_dieta_semanal insert forger bonded"
ON public.vip_dieta_semanal
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

-- vip_dieta_semanal · UPDATE
DROP POLICY IF EXISTS "ARGOS vip_dieta_semanal update forger bonded" ON public.vip_dieta_semanal;
CREATE POLICY "ARGOS vip_dieta_semanal update forger bonded"
ON public.vip_dieta_semanal
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

-- vip_dieta_semanal · DELETE
DROP POLICY IF EXISTS "ARGOS vip_dieta_semanal delete forger bonded" ON public.vip_dieta_semanal;
CREATE POLICY "ARGOS vip_dieta_semanal delete forger bonded"
ON public.vip_dieta_semanal
FOR DELETE
TO authenticated
USING (
  public.argos_is_forjador_soberano()
  OR (
    forger_id = (SELECT auth.uid())
    AND public.argos_is_forger_bonded_to_client(client_id)
  )
);

-- vip_medidas_corporais · SELECT
DROP POLICY IF EXISTS "ARGOS vip_medidas_corporais select bonded" ON public.vip_medidas_corporais;
CREATE POLICY "ARGOS vip_medidas_corporais select bonded"
ON public.vip_medidas_corporais
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

-- vip_medidas_corporais · INSERT
DROP POLICY IF EXISTS "ARGOS vip_medidas_corporais insert forger bonded" ON public.vip_medidas_corporais;
CREATE POLICY "ARGOS vip_medidas_corporais insert forger bonded"
ON public.vip_medidas_corporais
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

-- vip_medidas_corporais · UPDATE
DROP POLICY IF EXISTS "ARGOS vip_medidas_corporais update forger bonded" ON public.vip_medidas_corporais;
CREATE POLICY "ARGOS vip_medidas_corporais update forger bonded"
ON public.vip_medidas_corporais
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

-- vip_medidas_corporais · DELETE
DROP POLICY IF EXISTS "ARGOS vip_medidas_corporais delete forger bonded" ON public.vip_medidas_corporais;
CREATE POLICY "ARGOS vip_medidas_corporais delete forger bonded"
ON public.vip_medidas_corporais
FOR DELETE
TO authenticated
USING (
  public.argos_is_forjador_soberano()
  OR (
    forger_id = (SELECT auth.uid())
    AND public.argos_is_forger_bonded_to_client(client_id)
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vip_dieta_semanal TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vip_medidas_corporais TO authenticated;
GRANT ALL ON public.vip_dieta_semanal TO service_role;
GRANT ALL ON public.vip_medidas_corporais TO service_role;
