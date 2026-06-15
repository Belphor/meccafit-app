-- FENYXIA · Prescrições do forjador (treino · descanso · cardio)
-- Catálogo no app = exemplos; planilha real vem do forjador vinculado.

BEGIN;

CREATE TABLE IF NOT EXISTS public.config_treino_atleta (
  atleta_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  forjador_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  descanso_padrao_seg smallint NOT NULL DEFAULT 90,
  cardio_meta_minutos smallint NOT NULL DEFAULT 30,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT config_treino_atleta_descanso_check CHECK (descanso_padrao_seg BETWEEN 15 AND 600),
  CONSTRAINT config_treino_atleta_cardio_check CHECK (cardio_meta_minutos BETWEEN 5 AND 180)
);

COMMENT ON TABLE public.config_treino_atleta IS
  'Parâmetros de treino por atleta · descanso padrão e meta de cardio definidos pelo forjador.';

CREATE TABLE IF NOT EXISTS public.prescricoes_treino_forjador (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  atleta_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  forjador_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  grupo_muscular text NOT NULL,
  exercicio_id text NOT NULL,
  ordem smallint NOT NULL DEFAULT 1,
  series_alvo smallint NOT NULL,
  repeticoes_alvo smallint NOT NULL,
  peso_prescrito numeric(8, 2),
  descanso_segundos smallint,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT prescricoes_treino_grupo_check CHECK (
    grupo_muscular IN ('PEITO', 'COSTAS', 'PERNAS', 'OMBROS', 'BRACOS')
  ),
  CONSTRAINT prescricoes_treino_ordem_check CHECK (ordem >= 1),
  CONSTRAINT prescricoes_treino_series_check CHECK (series_alvo BETWEEN 1 AND 20),
  CONSTRAINT prescricoes_treino_reps_check CHECK (repeticoes_alvo BETWEEN 1 AND 100),
  CONSTRAINT prescricoes_treino_peso_check CHECK (
    peso_prescrito IS NULL OR (peso_prescrito > 0 AND peso_prescrito <= 9999.99)
  ),
  CONSTRAINT prescricoes_treino_descanso_check CHECK (
    descanso_segundos IS NULL OR (descanso_segundos BETWEEN 15 AND 600)
  ),
  CONSTRAINT prescricoes_treino_obs_len CHECK (
    observacoes IS NULL OR char_length(observacoes) <= 2000
  ),
  CONSTRAINT prescricoes_treino_atleta_grupo_ex_key UNIQUE (atleta_id, grupo_muscular, exercicio_id)
);

CREATE INDEX IF NOT EXISTS idx_prescricoes_treino_atleta_grupo
  ON public.prescricoes_treino_forjador (atleta_id, grupo_muscular, ordem);

CREATE INDEX IF NOT EXISTS idx_prescricoes_treino_forjador
  ON public.prescricoes_treino_forjador (forjador_id, atleta_id);

COMMENT ON TABLE public.prescricoes_treino_forjador IS
  'Treino montado pelo forjador por grupo muscular · substitui catálogo exemplo no cliente.';

ALTER TABLE public.config_treino_atleta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescricoes_treino_forjador ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ARGOS config_treino_atleta select own" ON public.config_treino_atleta;
CREATE POLICY "ARGOS config_treino_atleta select own"
ON public.config_treino_atleta FOR SELECT TO authenticated
USING (atleta_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "ARGOS config_treino_atleta select forjador" ON public.config_treino_atleta;
CREATE POLICY "ARGOS config_treino_atleta select forjador"
ON public.config_treino_atleta FOR SELECT TO authenticated
USING (public.argos_is_self_or_forjador(atleta_id));

DROP POLICY IF EXISTS "ARGOS config_treino_atleta write forjador" ON public.config_treino_atleta;
DROP POLICY IF EXISTS "ARGOS config_treino_atleta insert forjador" ON public.config_treino_atleta;
CREATE POLICY "ARGOS config_treino_atleta insert forjador"
ON public.config_treino_atleta FOR INSERT TO authenticated
WITH CHECK (
  forjador_id = (SELECT auth.uid())
  AND atleta_id <> (SELECT auth.uid())
  AND public.argos_is_self_or_forjador(atleta_id)
);

DROP POLICY IF EXISTS "ARGOS config_treino_atleta update forjador" ON public.config_treino_atleta;
CREATE POLICY "ARGOS config_treino_atleta update forjador"
ON public.config_treino_atleta FOR UPDATE TO authenticated
USING (
  forjador_id = (SELECT auth.uid())
  AND public.argos_is_self_or_forjador(atleta_id)
)
WITH CHECK (
  forjador_id = (SELECT auth.uid())
  AND public.argos_is_self_or_forjador(atleta_id)
);

DROP POLICY IF EXISTS "ARGOS config_treino_atleta delete forjador" ON public.config_treino_atleta;
CREATE POLICY "ARGOS config_treino_atleta delete forjador"
ON public.config_treino_atleta FOR DELETE TO authenticated
USING (
  forjador_id = (SELECT auth.uid())
  AND public.argos_is_self_or_forjador(atleta_id)
);

DROP POLICY IF EXISTS "ARGOS prescricoes_treino select own" ON public.prescricoes_treino_forjador;
CREATE POLICY "ARGOS prescricoes_treino select own"
ON public.prescricoes_treino_forjador FOR SELECT TO authenticated
USING (atleta_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "ARGOS prescricoes_treino select forjador" ON public.prescricoes_treino_forjador;
CREATE POLICY "ARGOS prescricoes_treino select forjador"
ON public.prescricoes_treino_forjador FOR SELECT TO authenticated
USING (public.argos_is_self_or_forjador(atleta_id));

DROP POLICY IF EXISTS "ARGOS prescricoes_treino write forjador" ON public.prescricoes_treino_forjador;
DROP POLICY IF EXISTS "ARGOS prescricoes_treino insert forjador" ON public.prescricoes_treino_forjador;
CREATE POLICY "ARGOS prescricoes_treino insert forjador"
ON public.prescricoes_treino_forjador FOR INSERT TO authenticated
WITH CHECK (
  forjador_id = (SELECT auth.uid())
  AND atleta_id <> (SELECT auth.uid())
  AND public.argos_is_self_or_forjador(atleta_id)
);

DROP POLICY IF EXISTS "ARGOS prescricoes_treino update forjador" ON public.prescricoes_treino_forjador;
CREATE POLICY "ARGOS prescricoes_treino update forjador"
ON public.prescricoes_treino_forjador FOR UPDATE TO authenticated
USING (
  forjador_id = (SELECT auth.uid())
  AND public.argos_is_self_or_forjador(atleta_id)
)
WITH CHECK (
  forjador_id = (SELECT auth.uid())
  AND public.argos_is_self_or_forjador(atleta_id)
);

DROP POLICY IF EXISTS "ARGOS prescricoes_treino delete forjador" ON public.prescricoes_treino_forjador;
CREATE POLICY "ARGOS prescricoes_treino delete forjador"
ON public.prescricoes_treino_forjador FOR DELETE TO authenticated
USING (
  forjador_id = (SELECT auth.uid())
  AND public.argos_is_self_or_forjador(atleta_id)
);

GRANT SELECT ON public.config_treino_atleta TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.config_treino_atleta TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prescricoes_treino_forjador TO authenticated;
GRANT ALL ON public.config_treino_atleta TO service_role;
GRANT ALL ON public.prescricoes_treino_forjador TO service_role;

COMMIT;
