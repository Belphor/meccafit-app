-- FENYXIA · planilhas_forjador · múltiplos grupos por dia (ex.: braços + abdômen)
-- Custo zero: apenas ajuste de constraint — leitura existente, sem RPC/trigger novo.

BEGIN;

COMMENT ON TABLE public.planilhas_forjador IS
  'Indicação semanal Seg–Sáb · até 5 grupos musculares por dia (ordem 1–5) · editável pelo forjador.';

ALTER TABLE public.planilhas_forjador
  DROP CONSTRAINT IF EXISTS planilhas_forjador_atleta_dia_key;

ALTER TABLE public.planilhas_forjador
  DROP CONSTRAINT IF EXISTS planilhas_forjador_grupo_check;

ALTER TABLE public.planilhas_forjador
  ADD CONSTRAINT planilhas_forjador_grupo_check CHECK (
    grupo_muscular IN ('PEITO', 'COSTAS', 'PERNAS', 'OMBROS', 'BRACOS', 'ABDOMEN')
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'planilhas_forjador_atleta_dia_grupo_key'
      AND conrelid = 'public.planilhas_forjador'::regclass
  ) THEN
    ALTER TABLE public.planilhas_forjador
      ADD CONSTRAINT planilhas_forjador_atleta_dia_grupo_key
      UNIQUE (atleta_id, dia_semana, grupo_muscular);
  END IF;
END $$;

COMMIT;
