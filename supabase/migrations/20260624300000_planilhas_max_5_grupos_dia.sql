-- FENYXIA · planilhas_forjador · até 5 grupos musculares por dia (ordem 1–5)
-- Custo zero em leitura: constraint estática · sem RPC/trigger em SELECT.

BEGIN;

COMMENT ON TABLE public.planilhas_forjador IS
  'Indicação semanal Seg–Sáb · até 5 grupos musculares por dia (ordem 1–5) · editável pelo forjador.';

ALTER TABLE public.planilhas_forjador
  ADD COLUMN IF NOT EXISTS ordem smallint NOT NULL DEFAULT 1;

UPDATE public.planilhas_forjador AS p
SET ordem = ranked.rn
FROM (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY atleta_id, dia_semana
      ORDER BY created_at ASC, grupo_muscular ASC
    )::smallint AS rn
  FROM public.planilhas_forjador
) AS ranked
WHERE p.id = ranked.id;

DELETE FROM public.planilhas_forjador
WHERE ordem > 5;

ALTER TABLE public.planilhas_forjador
  DROP CONSTRAINT IF EXISTS planilhas_forjador_ordem_check;

ALTER TABLE public.planilhas_forjador
  ADD CONSTRAINT planilhas_forjador_ordem_check CHECK (ordem BETWEEN 1 AND 5);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'planilhas_forjador_atleta_dia_ordem_key'
      AND conrelid = 'public.planilhas_forjador'::regclass
  ) THEN
    ALTER TABLE public.planilhas_forjador
      ADD CONSTRAINT planilhas_forjador_atleta_dia_ordem_key
      UNIQUE (atleta_id, dia_semana, ordem);
  END IF;
END $$;

COMMENT ON COLUMN public.planilhas_forjador.ordem IS
  'Posição do grupo no dia (1–5) · no máximo cinco linhas por atleta/dia.';

COMMIT;
