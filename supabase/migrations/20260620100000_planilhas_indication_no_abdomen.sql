-- FENYXIA · planilhas_forjador = indicação semanal (forjador) · sem abdômen como dia

BEGIN;

COMMENT ON TABLE public.planilhas_forjador IS
  'Indicação semanal Seg–Sáb · grupo muscular sugerido por dia · editável só pelo forjador.';

UPDATE public.planilhas_forjador
SET grupo_muscular = 'BRACOS', updated_at = now()
WHERE grupo_muscular = 'ABDOMEN';

ALTER TABLE public.planilhas_forjador
  DROP CONSTRAINT IF EXISTS planilhas_forjador_grupo_check;

ALTER TABLE public.planilhas_forjador
  ADD CONSTRAINT planilhas_forjador_grupo_check CHECK (
    grupo_muscular IN ('PEITO', 'COSTAS', 'PERNAS', 'OMBROS', 'BRACOS')
  );

-- Indicação não é persistida pelo atleta (somente leitura + forjador)
DROP POLICY IF EXISTS "ARGOS planilhas_forjador insert own atleta" ON public.planilhas_forjador;
DROP POLICY IF EXISTS "ARGOS planilhas_forjador update own atleta" ON public.planilhas_forjador;
DROP POLICY IF EXISTS "ARGOS planilhas_forjador delete own atleta" ON public.planilhas_forjador;

COMMIT;
