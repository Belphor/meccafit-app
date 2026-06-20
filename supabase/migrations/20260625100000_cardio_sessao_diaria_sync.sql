-- FENYXIA · Cardio Voo de Cinzas — sessão diária sincronizada (multi-dispositivo)
-- Fonte única por atleta + dia civil (America/Sao_Paulo), alinhada ao altar e pureza.

BEGIN;

CREATE TABLE IF NOT EXISTS public.cardio_sessoes_diarias (
  atleta_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  dia_civil date NOT NULL,
  snapshot jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cardio_sessoes_diarias_pkey PRIMARY KEY (atleta_id, dia_civil)
);

COMMENT ON TABLE public.cardio_sessoes_diarias IS
  'Snapshot diário do Voo de Cinzas · sincroniza celular e desktop no mesmo dia civil SP.';

CREATE INDEX IF NOT EXISTS idx_cardio_sessoes_diarias_dia
  ON public.cardio_sessoes_diarias (dia_civil DESC);

ALTER TABLE public.cardio_sessoes_diarias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cardio_sessoes_diarias_select_own ON public.cardio_sessoes_diarias;
CREATE POLICY cardio_sessoes_diarias_select_own
  ON public.cardio_sessoes_diarias
  FOR SELECT
  TO authenticated
  USING (auth.uid() = atleta_id);

DROP POLICY IF EXISTS cardio_sessoes_diarias_insert_own ON public.cardio_sessoes_diarias;
CREATE POLICY cardio_sessoes_diarias_insert_own
  ON public.cardio_sessoes_diarias
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = atleta_id);

DROP POLICY IF EXISTS cardio_sessoes_diarias_update_own ON public.cardio_sessoes_diarias;
CREATE POLICY cardio_sessoes_diarias_update_own
  ON public.cardio_sessoes_diarias
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = atleta_id)
  WITH CHECK (auth.uid() = atleta_id);

DROP POLICY IF EXISTS cardio_sessoes_diarias_delete_own ON public.cardio_sessoes_diarias;
CREATE POLICY cardio_sessoes_diarias_delete_own
  ON public.cardio_sessoes_diarias
  FOR DELETE
  TO authenticated
  USING (auth.uid() = atleta_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cardio_sessoes_diarias TO authenticated;
GRANT ALL ON public.cardio_sessoes_diarias TO service_role;

COMMIT;
