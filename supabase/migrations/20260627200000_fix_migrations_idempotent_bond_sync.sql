-- Reparo idempotente: constraints prescrição + sync forjador_id via bond (pós-falha parcial)

-- ---------------------------------------------------------------------------
-- 1. Garantir constraints de dia_semana (idempotente)
-- ---------------------------------------------------------------------------

ALTER TABLE public.prescricoes_treino_forjador
  ADD COLUMN IF NOT EXISTS dia_semana smallint;

UPDATE public.prescricoes_treino_forjador
SET dia_semana = 1
WHERE dia_semana IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'prescricoes_treino_forjador'
      AND column_name = 'dia_semana'
      AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE public.prescricoes_treino_forjador
      ALTER COLUMN dia_semana SET NOT NULL;
  END IF;
END $$;

ALTER TABLE public.prescricoes_treino_forjador
  DROP CONSTRAINT IF EXISTS prescricoes_treino_atleta_grupo_ex_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'prescricoes_treino_dia_check'
      AND conrelid = 'public.prescricoes_treino_forjador'::regclass
  ) THEN
    ALTER TABLE public.prescricoes_treino_forjador
      ADD CONSTRAINT prescricoes_treino_dia_check CHECK (dia_semana BETWEEN 1 AND 6);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'prescricoes_treino_atleta_dia_grupo_ex_key'
      AND conrelid = 'public.prescricoes_treino_forjador'::regclass
  ) THEN
    ALTER TABLE public.prescricoes_treino_forjador
      ADD CONSTRAINT prescricoes_treino_atleta_dia_grupo_ex_key
      UNIQUE (atleta_id, dia_semana, grupo_muscular, exercicio_id);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Bond sync — bypass meccafit.bond_sync_update no guard de profiles
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.argos_profiles_guard_sensitive_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('meccafit.bootstrap_profile', true) = 'true'
     OR current_setting('meccafit.phase_rpc_update', true) = 'true'
     OR current_setting('meccafit.bond_sync_update', true) = 'true' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.role := 'cliente'::public.user_role;
    NEW.phase_tier := LEAST(GREATEST(COALESCE(NEW.phase_tier, 1), 1), 5);
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.role IS DISTINCT FROM OLD.role
       OR NEW.forjador_id IS DISTINCT FROM OLD.forjador_id THEN
      IF NOT public.argos_is_forjador_soberano() THEN
        RAISE EXCEPTION 'permission denied for profile privilege change'
          USING ERRCODE = '42501';
      END IF;
    END IF;

    IF NEW.phase_tier IS DISTINCT FROM OLD.phase_tier
       OR NEW.phase_setup_at IS DISTINCT FROM OLD.phase_setup_at
       OR NEW.custom_preferences IS DISTINCT FROM OLD.custom_preferences THEN
      RAISE EXCEPTION 'permission denied for profile phase or cosmetics change'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.forger_client_bonds_sync_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('meccafit.bond_sync_update', 'true', true);

  UPDATE public.profiles
  SET forjador_id = NEW.forger_id, updated_at = now()
  WHERE id = NEW.client_id
    AND role = 'cliente'::public.user_role
    AND (forjador_id IS DISTINCT FROM NEW.forger_id);

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.forger_client_bonds_backfill_profiles()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('meccafit.bond_sync_update', 'true', true);

  UPDATE public.profiles p
  SET forjador_id = b.forger_id, updated_at = now()
  FROM public.forger_client_bonds b
  WHERE b.client_id = p.id
    AND p.role = 'cliente'::public.user_role
    AND p.forjador_id IS DISTINCT FROM b.forger_id;
END;
$$;

DROP TRIGGER IF EXISTS trg_forger_client_bonds_sync_profile ON public.forger_client_bonds;
CREATE TRIGGER trg_forger_client_bonds_sync_profile
AFTER INSERT OR UPDATE OF forger_id, client_id ON public.forger_client_bonds
FOR EACH ROW
EXECUTE FUNCTION public.forger_client_bonds_sync_profile();

SELECT public.forger_client_bonds_backfill_profiles();

REVOKE ALL ON FUNCTION public.forger_client_bonds_backfill_profiles() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.forger_client_bonds_backfill_profiles() TO service_role;
