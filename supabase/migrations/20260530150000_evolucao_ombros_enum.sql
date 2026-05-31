-- FENYXIA · Aba 3 · Enum OMBROS (transação isolada — PG exige commit antes do uso)
-- Aplicar antes de 20260530150001_evolucao_ombros_calor_json.sql

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'membro_principal_soberano'
      AND e.enumlabel = 'OMBROS'
  ) THEN
    ALTER TYPE public.membro_principal_soberano ADD VALUE 'OMBROS';
  END IF;
END $$;
