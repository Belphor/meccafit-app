-- FENYXIA · Grade semanal livre do atleta (Seg–Sáb · escolha própria)
-- RLS do atleta + reforço idempotente da chave unificada (atleta_id + dia_semana)

BEGIN;

COMMENT ON TABLE public.planilhas_forjador IS
  'Grade semanal Seg–Sáb · grupo muscular por dia · editável pelo atleta ou forjador.';

-- Trava de unificação: um grupo muscular por atleta/dia (upsert seguro no cliente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'planilhas_forjador_atleta_dia_key'
      AND conrelid = 'public.planilhas_forjador'::regclass
  ) THEN
    ALTER TABLE public.planilhas_forjador
      ADD CONSTRAINT planilhas_forjador_atleta_dia_key UNIQUE (atleta_id, dia_semana);
  END IF;
END $$;

DROP POLICY IF EXISTS "ARGOS planilhas_forjador insert own atleta" ON public.planilhas_forjador;
CREATE POLICY "ARGOS planilhas_forjador insert own atleta"
ON public.planilhas_forjador FOR INSERT TO authenticated
WITH CHECK (atleta_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "ARGOS planilhas_forjador update own atleta" ON public.planilhas_forjador;
CREATE POLICY "ARGOS planilhas_forjador update own atleta"
ON public.planilhas_forjador FOR UPDATE TO authenticated
USING (atleta_id = (SELECT auth.uid()))
WITH CHECK (atleta_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "ARGOS planilhas_forjador delete own atleta" ON public.planilhas_forjador;
CREATE POLICY "ARGOS planilhas_forjador delete own atleta"
ON public.planilhas_forjador FOR DELETE TO authenticated
USING (atleta_id = (SELECT auth.uid()));

COMMIT;
