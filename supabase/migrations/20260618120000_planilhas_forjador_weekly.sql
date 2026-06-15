-- FENYXIA · Aba 2 Treino · planilhas_forjador (Segunda–Sábado · grupo muscular)

BEGIN;

CREATE TABLE IF NOT EXISTS public.planilhas_forjador (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  atleta_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  dia_semana smallint NOT NULL,
  grupo_muscular text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT planilhas_forjador_dia_check CHECK (dia_semana BETWEEN 1 AND 6),
  CONSTRAINT planilhas_forjador_grupo_check CHECK (
    grupo_muscular IN ('PEITO', 'COSTAS', 'PERNAS', 'OMBROS', 'BRACOS', 'ABDOMEN')
  ),
  CONSTRAINT planilhas_forjador_atleta_dia_key UNIQUE (atleta_id, dia_semana)
);

CREATE INDEX IF NOT EXISTS idx_planilhas_forjador_atleta
  ON public.planilhas_forjador (atleta_id);

COMMENT ON TABLE public.planilhas_forjador IS
  'Grade semanal Seg–Sáb por atleta · grupo muscular prescrito (override só no cliente).';

ALTER TABLE public.planilhas_forjador ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ARGOS planilhas_forjador select own" ON public.planilhas_forjador;
CREATE POLICY "ARGOS planilhas_forjador select own"
ON public.planilhas_forjador FOR SELECT TO authenticated
USING (atleta_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "ARGOS planilhas_forjador select forjador bonded" ON public.planilhas_forjador;
CREATE POLICY "ARGOS planilhas_forjador select forjador bonded"
ON public.planilhas_forjador FOR SELECT TO authenticated
USING (public.argos_is_self_or_forjador(atleta_id));

DROP POLICY IF EXISTS "ARGOS planilhas_forjador insert forjador" ON public.planilhas_forjador;
CREATE POLICY "ARGOS planilhas_forjador insert forjador"
ON public.planilhas_forjador FOR INSERT TO authenticated
WITH CHECK (public.argos_is_self_or_forjador(atleta_id));

DROP POLICY IF EXISTS "ARGOS planilhas_forjador update forjador" ON public.planilhas_forjador;
CREATE POLICY "ARGOS planilhas_forjador update forjador"
ON public.planilhas_forjador FOR UPDATE TO authenticated
USING (public.argos_is_self_or_forjador(atleta_id))
WITH CHECK (public.argos_is_self_or_forjador(atleta_id));

DROP POLICY IF EXISTS "ARGOS planilhas_forjador delete forjador" ON public.planilhas_forjador;
CREATE POLICY "ARGOS planilhas_forjador delete forjador"
ON public.planilhas_forjador FOR DELETE TO authenticated
USING (public.argos_is_self_or_forjador(atleta_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.planilhas_forjador TO authenticated;
GRANT ALL ON public.planilhas_forjador TO service_role;

-- Seed padrão PPL para atletas sem planilha
INSERT INTO public.planilhas_forjador (atleta_id, dia_semana, grupo_muscular)
SELECT p.id, v.dia, v.grupo
FROM public.profiles p
CROSS JOIN (
  VALUES
    (1, 'PEITO'),
    (2, 'COSTAS'),
    (3, 'PERNAS'),
    (4, 'OMBROS'),
    (5, 'BRACOS'),
    (6, 'ABDOMEN')
) AS v(dia, grupo)
WHERE p.role = 'cliente'::public.user_role
ON CONFLICT (atleta_id, dia_semana) DO NOTHING;

COMMIT;
