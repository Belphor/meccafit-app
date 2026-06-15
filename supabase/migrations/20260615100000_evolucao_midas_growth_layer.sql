-- FENYXIA · Aba 3 · MIDAS Growth Layer (planos · calendário · cargas · get_muscular_evolution)
-- Idempotente · sa-east-1 · NÃO substitui 20260530130000 (já aplicada em produção)
-- Coexiste com: purity_logs · obter_calor_muscular_atleta · evolucao_membro_estase

BEGIN;

-- ---------------------------------------------------------------------------
-- 0. Tipos auxiliares
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'grupo_muscular_evolucao') THEN
    CREATE TYPE public.grupo_muscular_evolucao AS ENUM (
      'PEITO',
      'COSTAS',
      'PERNAS',
      'OMBROS',
      'BRACOS',
      'ABDOMEN'
    );
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1. planos_atletas — metas dinâmicas do atleta
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.planos_atletas (
  atleta_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  dias_treino_semana smallint NOT NULL DEFAULT 3,
  grupos_obrigatorios text[] NOT NULL DEFAULT '{}'::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT planos_atletas_dias_check CHECK (dias_treino_semana BETWEEN 1 AND 7)
);

COMMENT ON TABLE public.planos_atletas IS
  'Plano individual: dias/semana (1-7) e grupos musculares obrigatórios (growth MIDAS).';

CREATE INDEX IF NOT EXISTS idx_planos_atletas_dias
  ON public.planos_atletas (dias_treino_semana);

-- Seed a partir de profiles.target_days_per_week (legado Aba 3)
INSERT INTO public.planos_atletas (atleta_id, dias_treino_semana, grupos_obrigatorios)
SELECT
  p.id,
  COALESCE(p.target_days_per_week, 3),
  '{}'::text[]
FROM public.profiles p
ON CONFLICT (atleta_id) DO UPDATE
SET
  dias_treino_semana = EXCLUDED.dias_treino_semana,
  updated_at = now()
WHERE public.planos_atletas.dias_treino_semana IS DISTINCT FROM EXCLUDED.dias_treino_semana;

-- ---------------------------------------------------------------------------
-- 2. calendario_ignicao — rastreador de consistência (1 linha/dia/atleta)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.calendario_ignicao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  atleta_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  data_registro date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT calendario_ignicao_atleta_data_key UNIQUE (atleta_id, data_registro)
);

COMMENT ON TABLE public.calendario_ignicao IS
  'Dias de ignição registados — base do Índice de Ignição (janela 30d).';

CREATE INDEX IF NOT EXISTS idx_calendario_ignicao_atleta_data
  ON public.calendario_ignicao (atleta_id, data_registro DESC);

-- Backfill a partir de purity_logs (write path já activo no app)
INSERT INTO public.calendario_ignicao (atleta_id, data_registro)
SELECT pl.user_id, pl.log_date
FROM public.purity_logs pl
WHERE pl.is_pure = true
ON CONFLICT (atleta_id, data_registro) DO NOTHING;

-- Sincroniza novos purity_logs → calendario_ignicao
CREATE OR REPLACE FUNCTION public.evolucao_sync_calendario_from_purity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_pure IS TRUE THEN
    INSERT INTO public.calendario_ignicao (atleta_id, data_registro)
    VALUES (NEW.user_id, NEW.log_date)
    ON CONFLICT (atleta_id, data_registro) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_purity_logs_sync_calendario ON public.purity_logs;
CREATE TRIGGER trg_purity_logs_sync_calendario
AFTER INSERT OR UPDATE OF is_pure, log_date ON public.purity_logs
FOR EACH ROW
EXECUTE FUNCTION public.evolucao_sync_calendario_from_purity();

-- ---------------------------------------------------------------------------
-- 3. historico_cargas — factos biomecânicos por exercício
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.historico_cargas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  atleta_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  grupo_muscular public.grupo_muscular_evolucao NOT NULL,
  exercicio_id text NOT NULL,
  carga_maxima numeric(10, 2) NOT NULL DEFAULT 0,
  repeticoes_acumuladas integer NOT NULL DEFAULT 0,
  data_registro timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT historico_cargas_exercicio_nonempty CHECK (char_length(btrim(exercicio_id)) > 0),
  CONSTRAINT historico_cargas_carga_nonneg CHECK (carga_maxima >= 0),
  CONSTRAINT historico_cargas_reps_nonneg CHECK (repeticoes_acumuladas >= 0)
);

COMMENT ON TABLE public.historico_cargas IS
  'Histórico de cargas/reps por exercício — janela rolante 14d para VTC/VRA.';

CREATE INDEX IF NOT EXISTS idx_historico_cargas_atleta_grupo_data
  ON public.historico_cargas (atleta_id, grupo_muscular, data_registro DESC);

CREATE INDEX IF NOT EXISTS idx_historico_cargas_atleta_exercicio_data
  ON public.historico_cargas (atleta_id, exercicio_id, data_registro DESC);

-- Backfill inicial a partir de historico_treinos (legado)
INSERT INTO public.historico_cargas (
  atleta_id,
  grupo_muscular,
  exercicio_id,
  carga_maxima,
  repeticoes_acumuladas,
  data_registro
)
SELECT
  ht.cliente_id,
  CASE public.evolucao_resolve_grupo_calor(ht.musculo::text)
    WHEN 'peito' THEN 'PEITO'::public.grupo_muscular_evolucao
    WHEN 'costas' THEN 'COSTAS'::public.grupo_muscular_evolucao
    WHEN 'pernas' THEN 'PERNAS'::public.grupo_muscular_evolucao
    WHEN 'ombros' THEN 'OMBROS'::public.grupo_muscular_evolucao
    WHEN 'bracos' THEN 'BRACOS'::public.grupo_muscular_evolucao
    WHEN 'abdomen' THEN 'ABDOMEN'::public.grupo_muscular_evolucao
    ELSE NULL
  END,
  COALESCE(ht.exercicio_id::text, ht.exercicio_nome),
  GREATEST(COALESCE(ht.peso_atual, ht.peso, 0), 0),
  GREATEST(COALESCE(ht.repeticoes, 1), 1) * GREATEST(COALESCE(ht.series, 1), 1),
  COALESCE(ht.registrado_em, ht.updated_at, now())
FROM public.historico_treinos ht
WHERE ht.cliente_id IS NOT NULL
  AND public.evolucao_resolve_grupo_calor(ht.musculo::text) IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 4. Helpers · classificação térmica MIDAS + cálculos VTC/VRA
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.midas_classificar_nivel(
  p_grupo public.grupo_muscular_evolucao,
  p_metrica numeric
)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_metrica IS NULL OR p_metrica <= 0 THEN 'CINZAS'
    WHEN p_grupo IN ('PEITO'::public.grupo_muscular_evolucao, 'COSTAS'::public.grupo_muscular_evolucao, 'PERNAS'::public.grupo_muscular_evolucao) THEN
      CASE
        WHEN p_metrica <= 160 THEN 'FAISCA'
        WHEN p_metrica <= 500 THEN 'BRASA'
        WHEN p_metrica <= 1000 THEN 'LABAREDA'
        ELSE 'FOGO CÓSMICO'
      END
    WHEN p_grupo = 'OMBROS'::public.grupo_muscular_evolucao THEN
      CASE
        WHEN p_metrica <= 100 THEN 'FAISCA'
        WHEN p_metrica <= 240 THEN 'BRASA'
        WHEN p_metrica <= 480 THEN 'LABAREDA'
        ELSE 'FOGO CÓSMICO'
      END
    WHEN p_grupo = 'BRACOS'::public.grupo_muscular_evolucao THEN
      CASE
        WHEN p_metrica <= 60 THEN 'FAISCA'
        WHEN p_metrica <= 160 THEN 'BRASA'
        WHEN p_metrica <= 320 THEN 'LABAREDA'
        ELSE 'FOGO CÓSMICO'
      END
    WHEN p_grupo = 'ABDOMEN'::public.grupo_muscular_evolucao THEN
      CASE
        WHEN p_metrica <= 50 THEN 'FAISCA'
        WHEN p_metrica <= 150 THEN 'BRASA'
        WHEN p_metrica <= 300 THEN 'LABAREDA'
        ELSE 'FOGO CÓSMICO'
      END
    ELSE 'CINZAS'
  END;
$$;

CREATE OR REPLACE FUNCTION public.midas_calc_vtc_grupo(
  p_atleta_id uuid,
  p_grupo public.grupo_muscular_evolucao,
  p_window_start timestamptz
)
RETURNS numeric
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(SUM(day_peak), 0)
  FROM (
    SELECT
      (hc.data_registro AT TIME ZONE 'America/Sao_Paulo')::date AS dia,
      hc.exercicio_id,
      MAX(hc.carga_maxima) AS day_peak
    FROM public.historico_cargas hc
    WHERE hc.atleta_id = p_atleta_id
      AND hc.grupo_muscular = p_grupo
      AND hc.data_registro >= p_window_start
    GROUP BY 1, 2
  ) peaks;
$$;

CREATE OR REPLACE FUNCTION public.midas_calc_vra_abdomen(
  p_atleta_id uuid,
  p_window_start timestamptz
)
RETURNS numeric
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(SUM(hc.repeticoes_acumuladas), 0)::numeric
  FROM public.historico_cargas hc
  WHERE hc.atleta_id = p_atleta_id
    AND hc.grupo_muscular = 'ABDOMEN'::public.grupo_muscular_evolucao
    AND hc.data_registro >= p_window_start;
$$;

CREATE OR REPLACE FUNCTION public.midas_grupo_obrigatorio(
  p_atleta_id uuid,
  p_grupo public.grupo_muscular_evolucao
)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.planos_atletas pa
    CROSS JOIN LATERAL unnest(pa.grupos_obrigatorios) AS g(item)
    WHERE pa.atleta_id = p_atleta_id
      AND UPPER(BTRIM(g.item)) = p_grupo::text
  );
$$;

-- ---------------------------------------------------------------------------
-- 5. RPC · get_muscular_evolution() — JSONB MIDAS (auth.uid only)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_muscular_evolution()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_atleta_id uuid;
  v_dias_plano smallint;
  v_alvo_30d numeric;
  v_dias_reais bigint;
  v_ignicao numeric;
  v_degradacao boolean;
  v_window_start timestamptz;
  v_grupo public.grupo_muscular_evolucao;
  v_grupos public.grupo_muscular_evolucao[] := ARRAY[
    'PEITO'::public.grupo_muscular_evolucao,
    'COSTAS'::public.grupo_muscular_evolucao,
    'PERNAS'::public.grupo_muscular_evolucao,
    'OMBROS'::public.grupo_muscular_evolucao,
    'BRACOS'::public.grupo_muscular_evolucao,
    'ABDOMEN'::public.grupo_muscular_evolucao
  ];
  v_metric_raw numeric;
  v_metric_final numeric;
  v_vtc numeric;
  v_vra numeric;
  v_frozen boolean;
  v_level text;
  v_muscles jsonb := '{}'::jsonb;
  v_today date;
BEGIN
  v_atleta_id := auth.uid();

  IF v_atleta_id IS NULL THEN
    RETURN jsonb_build_object(
      'error', 'unauthorized',
      'code', 401,
      'message', 'Sessão inválida — auth.uid() ausente.'
    );
  END IF;

  v_today := public.evolucao_sp_today();
  v_window_start := (v_today - 13)::timestamp AT TIME ZONE 'America/Sao_Paulo';

  SELECT COALESCE(pa.dias_treino_semana, 3)
  INTO v_dias_plano
  FROM public.planos_atletas pa
  WHERE pa.atleta_id = v_atleta_id;

  IF v_dias_plano IS NULL THEN
    v_dias_plano := 3;
    INSERT INTO public.planos_atletas (atleta_id, dias_treino_semana)
    VALUES (v_atleta_id, v_dias_plano)
    ON CONFLICT (atleta_id) DO NOTHING;
  END IF;

  v_alvo_30d := ROUND((v_dias_plano::numeric * 30.0) / 7.0, 2);

  SELECT COUNT(*)::bigint
  INTO v_dias_reais
  FROM public.calendario_ignicao ci
  WHERE ci.atleta_id = v_atleta_id
    AND ci.data_registro >= (v_today - 29)
    AND ci.data_registro <= v_today;

  IF v_alvo_30d <= 0 THEN
    v_ignicao := 0;
  ELSE
    v_ignicao := LEAST(100, GREATEST(0, ROUND((v_dias_reais / v_alvo_30d) * 100.0, 2)));
  END IF;

  v_degradacao := v_ignicao < 50.0;

  FOREACH v_grupo IN ARRAY v_grupos LOOP
    v_frozen := false;
    v_level := 'CINZAS';
    v_vtc := 0;
    v_vra := 0;
    v_metric_raw := 0;
    v_metric_final := 0;

    IF v_grupo = 'ABDOMEN'::public.grupo_muscular_evolucao THEN
      v_vra := public.midas_calc_vra_abdomen(v_atleta_id, v_window_start);
      v_metric_raw := v_vra;
    ELSE
      v_vtc := public.midas_calc_vtc_grupo(v_atleta_id, v_grupo, v_window_start);
      v_metric_raw := v_vtc;
    END IF;

    IF public.midas_grupo_obrigatorio(v_atleta_id, v_grupo) AND v_metric_raw <= 0 THEN
      v_frozen := true;
      v_level := 'CONGELADO';
      v_metric_final := 0;
    ELSE
      v_metric_final := v_metric_raw;
      IF v_degradacao THEN
        v_metric_final := v_metric_final * 0.60;
      END IF;
      v_level := public.midas_classificar_nivel(v_grupo, v_metric_final);
    END IF;

    v_muscles := v_muscles || jsonb_build_object(
      lower(v_grupo::text),
      jsonb_build_object(
        'grupo', v_grupo::text,
        'vtc', COALESCE(v_vtc, 0),
        'vra', COALESCE(v_vra, 0),
        'metric_raw', COALESCE(v_metric_raw, 0),
        'metric_final', COALESCE(v_metric_final, 0),
        'is_frozen', v_frozen,
        'thermal_level', v_level
      )
    );
  END LOOP;

  RETURN jsonb_build_object(
    'athlete_id', v_atleta_id,
    'ignition_index', v_ignicao,
    'passive_degradation_active', v_degradacao,
    'planned_days_30d', v_alvo_30d,
    'actual_training_days_30d', v_dias_reais,
    'timestamp', now(),
    'muscles', v_muscles
  );
END;
$$;

COMMENT ON FUNCTION public.get_muscular_evolution() IS
  'MIDAS · Evolução muscular JSONB · auth.uid · janela 14d VTC/VRA · ignição 30d · growth CONGELADO.';

-- ---------------------------------------------------------------------------
-- 6. ARGOS RLS — somente atleta_id = auth.uid()
-- ---------------------------------------------------------------------------

ALTER TABLE public.planos_atletas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendario_ignicao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_cargas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ARGOS planos_atletas select own" ON public.planos_atletas;
CREATE POLICY "ARGOS planos_atletas select own"
ON public.planos_atletas FOR SELECT TO authenticated
USING (atleta_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "ARGOS planos_atletas insert own" ON public.planos_atletas;
CREATE POLICY "ARGOS planos_atletas insert own"
ON public.planos_atletas FOR INSERT TO authenticated
WITH CHECK (atleta_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "ARGOS planos_atletas update own" ON public.planos_atletas;
CREATE POLICY "ARGOS planos_atletas update own"
ON public.planos_atletas FOR UPDATE TO authenticated
USING (atleta_id = (SELECT auth.uid()))
WITH CHECK (atleta_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "ARGOS planos_atletas delete own" ON public.planos_atletas;
CREATE POLICY "ARGOS planos_atletas delete own"
ON public.planos_atletas FOR DELETE TO authenticated
USING (atleta_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "ARGOS calendario_ignicao select own" ON public.calendario_ignicao;
CREATE POLICY "ARGOS calendario_ignicao select own"
ON public.calendario_ignicao FOR SELECT TO authenticated
USING (atleta_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "ARGOS calendario_ignicao insert own" ON public.calendario_ignicao;
CREATE POLICY "ARGOS calendario_ignicao insert own"
ON public.calendario_ignicao FOR INSERT TO authenticated
WITH CHECK (atleta_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "ARGOS calendario_ignicao update own" ON public.calendario_ignicao;
CREATE POLICY "ARGOS calendario_ignicao update own"
ON public.calendario_ignicao FOR UPDATE TO authenticated
USING (atleta_id = (SELECT auth.uid()))
WITH CHECK (atleta_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "ARGOS calendario_ignicao delete own" ON public.calendario_ignicao;
CREATE POLICY "ARGOS calendario_ignicao delete own"
ON public.calendario_ignicao FOR DELETE TO authenticated
USING (atleta_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "ARGOS historico_cargas select own" ON public.historico_cargas;
CREATE POLICY "ARGOS historico_cargas select own"
ON public.historico_cargas FOR SELECT TO authenticated
USING (atleta_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "ARGOS historico_cargas insert own" ON public.historico_cargas;
CREATE POLICY "ARGOS historico_cargas insert own"
ON public.historico_cargas FOR INSERT TO authenticated
WITH CHECK (atleta_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "ARGOS historico_cargas update own" ON public.historico_cargas;
CREATE POLICY "ARGOS historico_cargas update own"
ON public.historico_cargas FOR UPDATE TO authenticated
USING (atleta_id = (SELECT auth.uid()))
WITH CHECK (atleta_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "ARGOS historico_cargas delete own" ON public.historico_cargas;
CREATE POLICY "ARGOS historico_cargas delete own"
ON public.historico_cargas FOR DELETE TO authenticated
USING (atleta_id = (SELECT auth.uid()));

-- ---------------------------------------------------------------------------
-- 7. Grants
-- ---------------------------------------------------------------------------

REVOKE ALL ON TABLE public.planos_atletas FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.calendario_ignicao FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.historico_cargas FROM PUBLIC, anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.planos_atletas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.calendario_ignicao TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.historico_cargas TO authenticated;

GRANT ALL ON TABLE public.planos_atletas TO service_role;
GRANT ALL ON TABLE public.calendario_ignicao TO service_role;
GRANT ALL ON TABLE public.historico_cargas TO service_role;

REVOKE ALL ON FUNCTION public.get_muscular_evolution() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_muscular_evolution() TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 8. Verificação
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  v_ok boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'planos_atletas'
  ) INTO v_ok;

  IF NOT v_ok THEN
    RAISE EXCEPTION 'MIDAS migration failed: planos_atletas missing';
  END IF;

  RAISE NOTICE 'FENYXIA MIDAS OK · planos_atletas · calendario_ignicao · historico_cargas · get_muscular_evolution';
END $$;

COMMIT;
