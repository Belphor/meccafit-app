-- FENYXIA · Prescrição forjador — progressão sem carga + repetições por série

BEGIN;

ALTER TABLE public.prescricoes_treino_forjador
  ADD COLUMN IF NOT EXISTS progressao_alternativas jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS repeticoes_por_serie jsonb NOT NULL DEFAULT '[]'::jsonb;

DO $$
BEGIN
  ALTER TABLE public.prescricoes_treino_forjador
    ADD CONSTRAINT prescricoes_treino_progressao_array
    CHECK (jsonb_typeof(progressao_alternativas) = 'array');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.prescricoes_treino_forjador
    ADD CONSTRAINT prescricoes_treino_reps_por_serie_array
    CHECK (jsonb_typeof(repeticoes_por_serie) = 'array');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON COLUMN public.prescricoes_treino_forjador.progressao_alternativas IS
  'Alternativas de progressão sem carga (multi-select JSON array).';

COMMENT ON COLUMN public.prescricoes_treino_forjador.repeticoes_por_serie IS
  'Repetições por série — números ou literal FALHA (JSON array).';

COMMIT;
