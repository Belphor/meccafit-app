-- FENYXIA · Aba 3 · Enum COSTAS (transação isolada — PG exige commit antes do uso)
-- Aplicar antes de 20260530140001_evolucao_costas_calor_json.sql

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'membro_principal_soberano'
      AND e.enumlabel = 'COSTAS'
  ) THEN
    ALTER TYPE public.membro_principal_soberano ADD VALUE 'COSTAS';
  END IF;
END $$;
