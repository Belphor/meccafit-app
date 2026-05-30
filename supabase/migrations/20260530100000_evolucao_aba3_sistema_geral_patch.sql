-- FENYXIA · PATCH · Aba 3 Evolução — Sistema Geral (comum + VIP)
-- Região: sa-east-1 · Idempotente · Seguro re-correr
--
-- PRÉ-REQUISITOS (já aplicados manualmente):
--   · 20260528590000_add_abdomen_subgrupo_muscular.sql  (query separada + COMMIT)
--   · 20260529100000_dual_track_training_architecture.sql
--
-- CENÁRIOS SUPORTADOS:
--   A) Nunca correu 20260530008000 → cria tudo do zero
--   B) Correu versão IRIS (muscle_canonical_groups) → remove e recria
--   C) Correu versão com estase VIP → remove helpers VIP e actualiza RPCs
--   D) Já está na versão geral → no-op seguro (CREATE OR REPLACE)
--
-- APLICAR: colar no SQL Editor Supabase (sa-east-1) numa única execução.

-- ---------------------------------------------------------------------------
-- 0. Limpeza legado
-- ---------------------------------------------------------------------------

DROP TABLE IF EXISTS public.muscle_ui_routes CASCADE;
DROP TABLE IF EXISTS public.muscle_canonical_groups CASCADE;

DROP FUNCTION IF EXISTS public.muscle_fetch_architecture_catalog();
DROP FUNCTION IF EXISTS public.muscle_resolve_ui_route(text);
DROP FUNCTION IF EXISTS public.muscle_normalize_subgrupo(text);
DROP FUNCTION IF EXISTS public.evolucao_membros_prescritos_ativos(uuid);
DROP FUNCTION IF EXISTS public.evolucao_cliente_tem_personal(uuid);

CREATE OR REPLACE FUNCTION public.workout_resolve_split_via(p_musculo public.subgrupo_muscular)
RETURNS public.workout_split_via
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_musculo = 'pernas'::public.subgrupo_muscular THEN 'via_b'::public.workout_split_via
    ELSE 'via_a'::public.workout_split_via
  END;
$$;

COMMENT ON FUNCTION public.workout_resolve_split_via(public.subgrupo_muscular) IS
  'Via A = Membro Superior · Via B = Pernas — sem dependência de catálogo IRIS.';

-- ---------------------------------------------------------------------------
-- 1. Enum · 4 membros soberanos
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'membro_principal_soberano') THEN
    CREATE TYPE public.membro_principal_soberano AS ENUM (
      'PEITO',
      'BRACOS',
      'ABDOMEN',
      'PERNAS'
    );
  END IF;
END $$;

COMMENT ON TYPE public.membro_principal_soberano IS
  'Aba Evolução — únicos membros canónicos (sem subgrupos musculares).';

-- ---------------------------------------------------------------------------
-- 2. profiles.target_days_per_week
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS target_days_per_week smallint;

UPDATE public.profiles
SET target_days_per_week = 3
WHERE target_days_per_week IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN target_days_per_week SET DEFAULT 3;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE target_days_per_week IS NULL
  ) THEN
    UPDATE public.profiles SET target_days_per_week = 3 WHERE target_days_per_week IS NULL;
  END IF;

  ALTER TABLE public.profiles
    ALTER COLUMN target_days_per_week SET NOT NULL;
EXCEPTION
  WHEN others THEN
    NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_target_days_per_week_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_target_days_per_week_check
      CHECK (target_days_per_week BETWEEN 1 AND 7);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Tabelas Evolução
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.purity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  is_pure boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT purity_logs_user_date_key UNIQUE (user_id, log_date)
);

CREATE INDEX IF NOT EXISTS idx_purity_logs_user_pure_date
  ON public.purity_logs (user_id, log_date DESC)
  WHERE is_pure = true;

COMMENT ON TABLE public.purity_logs IS
  'Pureza diária — 1 registo/dia (Índice de Ignição · todos os atletas).';

CREATE TABLE IF NOT EXISTS public.evolucao_membro_estase (
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  membro_principal public.membro_principal_soberano NOT NULL,
  nivel_calculado text NOT NULL DEFAULT 'CINZAS',
  metrica_bruta numeric(14, 2) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, membro_principal)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'evolucao_membro_estase_nivel_check'
      AND conrelid = 'public.evolucao_membro_estase'::regclass
  ) THEN
    ALTER TABLE public.evolucao_membro_estase
      ADD CONSTRAINT evolucao_membro_estase_nivel_check CHECK (
        nivel_calculado IN ('CINZAS', 'FAISCA', 'BRASA', 'LABAREDA', 'FOGO CÓSMICO')
      );
  END IF;
END $$;

COMMENT ON TABLE public.evolucao_membro_estase IS
  'Cache do último calor muscular — cliente comum e VIP (sem gate VIP).';

-- ---------------------------------------------------------------------------
-- 4. Colunas membro_principal (dual-track)
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'historico_treinos_personais'
  ) THEN
    ALTER TABLE public.historico_treinos_personais
      ADD COLUMN IF NOT EXISTS membro_principal public.membro_principal_soberano;

    CREATE INDEX IF NOT EXISTS idx_htp_client_membro
      ON public.historico_treinos_personais (client_id, membro_principal);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'historico_treinos_comuns'
  ) THEN
    ALTER TABLE public.historico_treinos_comuns
      ADD COLUMN IF NOT EXISTS membro_principal public.membro_principal_soberano;

    CREATE INDEX IF NOT EXISTS idx_htc_user_membro_criado
      ON public.historico_treinos_comuns (user_id, membro_principal, criado_em DESC);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 5. Helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.evolucao_sp_today()
RETURNS date
LANGUAGE sql
STABLE
AS $$
  SELECT (timezone('America/Sao_Paulo', now()))::date;
$$;

CREATE OR REPLACE FUNCTION public.evolucao_inferir_membro(p_texto text)
RETURNS public.membro_principal_soberano
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_texto IS NULL OR BTRIM(p_texto) = '' THEN NULL::public.membro_principal_soberano
    WHEN UPPER(p_texto) ~ '(PEITO|PEITORAL|SUPINO|CRUCIFIXO|CROSSOVER)' THEN 'PEITO'::public.membro_principal_soberano
    WHEN UPPER(p_texto) ~ '(BRACO|BRAÇO|BRACOS|TRICEPS|BICEPS|OMBRO|COSTAS|PULL|REMADA)' THEN 'BRACOS'::public.membro_principal_soberano
    WHEN UPPER(p_texto) ~ '(ABDOMEN|ABDÔMEN|ABDOME|CORE|ABS|PRANCHA)' THEN 'ABDOMEN'::public.membro_principal_soberano
    WHEN UPPER(p_texto) ~ '(PERNA|PERNAS|AGACH|LEG|MEMBRO.INFERIOR|QUADR)' THEN 'PERNAS'::public.membro_principal_soberano
    ELSE NULL::public.membro_principal_soberano
  END;
$$;

CREATE OR REPLACE FUNCTION public.evolucao_resolve_membro(p_musculo text)
RETURNS public.membro_principal_soberano
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_musculo IS NULL OR BTRIM(p_musculo) = '' THEN NULL::public.membro_principal_soberano
    WHEN UPPER(BTRIM(p_musculo)) IN ('PEITO', 'PEITORAL') THEN 'PEITO'::public.membro_principal_soberano
    WHEN UPPER(BTRIM(p_musculo)) IN ('BRACOS', 'BRAÇOS', 'BRACO', 'OMBROS', 'COSTAS')
      THEN 'BRACOS'::public.membro_principal_soberano
    WHEN UPPER(BTRIM(p_musculo)) IN ('ABDOMEN', 'ABDÔMEN', 'ABDOME', 'CORE')
      THEN 'ABDOMEN'::public.membro_principal_soberano
    WHEN UPPER(BTRIM(p_musculo)) IN ('PERNAS', 'PERNA', 'MEMBRO INFERIOR')
      THEN 'PERNAS'::public.membro_principal_soberano
    WHEN LOWER(BTRIM(p_musculo)) = 'peito' THEN 'PEITO'::public.membro_principal_soberano
    WHEN LOWER(BTRIM(p_musculo)) IN ('bracos', 'ombros', 'costas') THEN 'BRACOS'::public.membro_principal_soberano
    WHEN LOWER(BTRIM(p_musculo)) IN ('abdomen', 'abdome') THEN 'ABDOMEN'::public.membro_principal_soberano
    WHEN LOWER(BTRIM(p_musculo)) = 'pernas' THEN 'PERNAS'::public.membro_principal_soberano
    ELSE public.evolucao_inferir_membro(p_musculo)
  END;
$$;

CREATE OR REPLACE FUNCTION public.evolucao_classificar_nivel(
  p_membro public.membro_principal_soberano,
  p_metrica numeric
)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_metrica IS NULL OR p_metrica <= 0 THEN 'CINZAS'
    WHEN p_membro = 'PEITO'::public.membro_principal_soberano THEN
      CASE
        WHEN p_metrica <= 100 THEN 'FAISCA'
        WHEN p_metrica <= 240 THEN 'BRASA'
        WHEN p_metrica <= 480 THEN 'LABAREDA'
        ELSE 'FOGO CÓSMICO'
      END
    WHEN p_membro = 'BRACOS'::public.membro_principal_soberano THEN
      CASE
        WHEN p_metrica <= 60 THEN 'FAISCA'
        WHEN p_metrica <= 160 THEN 'BRASA'
        WHEN p_metrica <= 320 THEN 'LABAREDA'
        ELSE 'FOGO CÓSMICO'
      END
    WHEN p_membro = 'PERNAS'::public.membro_principal_soberano THEN
      CASE
        WHEN p_metrica <= 160 THEN 'FAISCA'
        WHEN p_metrica <= 500 THEN 'BRASA'
        WHEN p_metrica <= 1000 THEN 'LABAREDA'
        ELSE 'FOGO CÓSMICO'
      END
    WHEN p_membro = 'ABDOMEN'::public.membro_principal_soberano THEN
      CASE
        WHEN p_metrica <= 50 THEN 'FAISCA'
        WHEN p_metrica <= 150 THEN 'BRASA'
        WHEN p_metrica <= 300 THEN 'LABAREDA'
        ELSE 'FOGO CÓSMICO'
      END
    ELSE 'CINZAS'
  END;
$$;

-- Backfill opcional (só se tabelas existirem)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'historico_treinos_personais'
  ) THEN
    UPDATE public.historico_treinos_personais htp
    SET membro_principal = public.evolucao_inferir_membro(
      COALESCE(htp.observacoes, '') || ' ' || htp.exercicio_id
    )
    WHERE htp.membro_principal IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'historico_treinos_comuns'
  ) THEN
    UPDATE public.historico_treinos_comuns htc
    SET membro_principal = public.evolucao_inferir_membro(htc.exercicio_id)
    WHERE htc.membro_principal IS NULL;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 6. RPC — calcular_indice_ignicao_atleta
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.calcular_indice_ignicao_atleta(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_days smallint;
  v_alvo_treinos numeric;
  v_treinos_puros bigint;
  v_window_start date;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN 0;
  END IF;

  IF (SELECT auth.uid()) IS NOT NULL
    AND (SELECT auth.uid()) <> p_user_id
    AND NOT public.argos_is_self_or_forjador(p_user_id)
  THEN
    RAISE EXCEPTION 'permission denied for calcular_indice_ignicao_atleta'
      USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(p.target_days_per_week, 3)
  INTO v_target_days
  FROM public.profiles p
  WHERE p.id = p_user_id;

  IF v_target_days IS NULL THEN
    v_target_days := 3;
  END IF;

  v_alvo_treinos := ROUND((v_target_days::numeric * 30.0) / 7.0);
  v_window_start := public.evolucao_sp_today() - 29;

  SELECT COUNT(*)::bigint
  INTO v_treinos_puros
  FROM public.purity_logs pl
  WHERE pl.user_id = p_user_id
    AND pl.is_pure = true
    AND pl.log_date >= v_window_start
    AND pl.log_date <= public.evolucao_sp_today();

  IF v_alvo_treinos <= 0 THEN
    RETURN 0;
  END IF;

  RETURN LEAST(
    100,
    GREATEST(0, ROUND((v_treinos_puros / v_alvo_treinos) * 100.0)::integer)
  );
END;
$$;

COMMENT ON FUNCTION public.calcular_indice_ignicao_atleta(uuid) IS
  'Índice de Ignição (0–100) — geral para comum e VIP.';

-- ---------------------------------------------------------------------------
-- 7. RPC interna — métrica 14 dias
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.evolucao_calcular_metrica_membro(
  p_user_id uuid,
  p_membro public.membro_principal_soberano
)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_start date;
  v_metric numeric := 0;
  v_partial numeric := 0;
  v_has_htc boolean;
BEGIN
  v_window_start := public.evolucao_sp_today() - 13;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'historico_treinos_comuns'
  ) INTO v_has_htc;

  IF p_membro = 'ABDOMEN'::public.membro_principal_soberano THEN
    SELECT COALESCE(SUM(ht.series * ht.repeticoes), 0)
    INTO v_metric
    FROM public.historico_treinos ht
    WHERE ht.cliente_id = p_user_id
      AND public.evolucao_resolve_membro(ht.musculo) = p_membro
      AND (timezone('America/Sao_Paulo', ht.registrado_em))::date >= v_window_start
      AND (timezone('America/Sao_Paulo', ht.registrado_em))::date <= public.evolucao_sp_today();

    IF v_has_htc THEN
      SELECT COALESCE(SUM(htc.series * htc.repeticoes), 0)
      INTO v_partial
      FROM public.historico_treinos_comuns htc
      WHERE htc.user_id = p_user_id
        AND (
          htc.membro_principal = p_membro
          OR public.evolucao_resolve_membro(htc.exercicio_id) = p_membro
        )
        AND (timezone('America/Sao_Paulo', htc.criado_em))::date >= v_window_start
        AND (timezone('America/Sao_Paulo', htc.criado_em))::date <= public.evolucao_sp_today();

      v_metric := COALESCE(v_metric, 0) + COALESCE(v_partial, 0);
    END IF;
  ELSE
    SELECT COALESCE(SUM(sp.peak_kg), 0)
    INTO v_metric
    FROM (
      SELECT
        (timezone('America/Sao_Paulo', ht.registrado_em))::date AS session_date,
        ht.exercicio_id::text AS exercicio_key,
        MAX(ht.peso_atual) AS peak_kg
      FROM public.historico_treinos ht
      WHERE ht.cliente_id = p_user_id
        AND ht.peso_atual > 0
        AND public.evolucao_resolve_membro(ht.musculo) = p_membro
        AND (timezone('America/Sao_Paulo', ht.registrado_em))::date >= v_window_start
        AND (timezone('America/Sao_Paulo', ht.registrado_em))::date <= public.evolucao_sp_today()
      GROUP BY 1, 2
    ) sp;

    IF v_has_htc THEN
      SELECT COALESCE(SUM(sp.peak_kg), 0)
      INTO v_partial
      FROM (
        SELECT
          (timezone('America/Sao_Paulo', htc.criado_em))::date AS session_date,
          htc.exercicio_id AS exercicio_key,
          MAX(htc.peso_atual) AS peak_kg
        FROM public.historico_treinos_comuns htc
        WHERE htc.user_id = p_user_id
          AND htc.peso_atual > 0
          AND (
            htc.membro_principal = p_membro
            OR public.evolucao_resolve_membro(htc.exercicio_id) = p_membro
          )
          AND (timezone('America/Sao_Paulo', htc.criado_em))::date >= v_window_start
          AND (timezone('America/Sao_Paulo', htc.criado_em))::date <= public.evolucao_sp_today()
        GROUP BY 1, 2
      ) sp;

      v_metric := COALESCE(v_metric, 0) + COALESCE(v_partial, 0);
    END IF;
  END IF;

  RETURN COALESCE(v_metric, 0);
END;
$$;

-- ---------------------------------------------------------------------------
-- 8. RPC — obter_calor_muscular_atleta (geral · is_frozen sempre false)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.obter_calor_muscular_atleta(p_user_id uuid)
RETURNS TABLE (
  membro_principal text,
  nivel_calculado text,
  is_frozen boolean
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_membro public.membro_principal_soberano;
  v_metric numeric;
  v_metric_final numeric;
  v_nivel text;
  v_ignicao integer;
  v_membros constant public.membro_principal_soberano[] := ARRAY[
    'PEITO'::public.membro_principal_soberano,
    'BRACOS'::public.membro_principal_soberano,
    'ABDOMEN'::public.membro_principal_soberano,
    'PERNAS'::public.membro_principal_soberano
  ];
BEGIN
  IF p_user_id IS NULL THEN
    RETURN;
  END IF;

  IF (SELECT auth.uid()) IS NOT NULL
    AND (SELECT auth.uid()) <> p_user_id
    AND NOT public.argos_is_self_or_forjador(p_user_id)
  THEN
    RAISE EXCEPTION 'permission denied for obter_calor_muscular_atleta'
      USING ERRCODE = '42501';
  END IF;

  v_ignicao := public.calcular_indice_ignicao_atleta(p_user_id);

  FOREACH v_membro IN ARRAY v_membros LOOP
    v_metric := public.evolucao_calcular_metrica_membro(p_user_id, v_membro);
    v_metric_final := v_metric;

    IF v_ignicao < 50 THEN
      v_metric_final := v_metric_final * 0.6;
    END IF;

    v_nivel := public.evolucao_classificar_nivel(v_membro, v_metric_final);

    INSERT INTO public.evolucao_membro_estase (
      user_id,
      membro_principal,
      nivel_calculado,
      metrica_bruta,
      updated_at
    )
    VALUES (
      p_user_id,
      v_membro,
      v_nivel,
      COALESCE(v_metric_final, 0),
      now()
    )
    ON CONFLICT (user_id, membro_principal)
    DO UPDATE SET
      nivel_calculado = EXCLUDED.nivel_calculado,
      metrica_bruta = EXCLUDED.metrica_bruta,
      updated_at = now();

    membro_principal := v_membro::text;
    nivel_calculado := v_nivel;
    is_frozen := false;
    RETURN NEXT;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.obter_calor_muscular_atleta(uuid) IS
  'Aba Evolução — 4 membros · comum + VIP · penalidade ARGOS se ignição < 50%.';

-- ---------------------------------------------------------------------------
-- 9. RLS + Grants
-- ---------------------------------------------------------------------------

ALTER TABLE public.purity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evolucao_membro_estase ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ARGOS purity_logs select own" ON public.purity_logs;
CREATE POLICY "ARGOS purity_logs select own"
ON public.purity_logs FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "ARGOS purity_logs insert own" ON public.purity_logs;
CREATE POLICY "ARGOS purity_logs insert own"
ON public.purity_logs FOR INSERT TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "ARGOS purity_logs update own" ON public.purity_logs;
CREATE POLICY "ARGOS purity_logs update own"
ON public.purity_logs FOR UPDATE TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "ARGOS purity_logs delete own" ON public.purity_logs;
CREATE POLICY "ARGOS purity_logs delete own"
ON public.purity_logs FOR DELETE TO authenticated
USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "ARGOS evolucao_membro_estase select own" ON public.evolucao_membro_estase;
CREATE POLICY "ARGOS evolucao_membro_estase select own"
ON public.evolucao_membro_estase FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));

REVOKE ALL ON TABLE public.purity_logs FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.evolucao_membro_estase FROM PUBLIC, anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.purity_logs TO authenticated;
GRANT SELECT ON TABLE public.evolucao_membro_estase TO authenticated;
GRANT ALL ON TABLE public.purity_logs TO service_role;
GRANT ALL ON TABLE public.evolucao_membro_estase TO service_role;

REVOKE ALL ON FUNCTION public.calcular_indice_ignicao_atleta(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.obter_calor_muscular_atleta(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.evolucao_calcular_metrica_membro(uuid, public.membro_principal_soberano) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.evolucao_inferir_membro(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.evolucao_resolve_membro(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.evolucao_classificar_nivel(public.membro_principal_soberano, numeric) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.calcular_indice_ignicao_atleta(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.obter_calor_muscular_atleta(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.evolucao_inferir_membro(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.evolucao_resolve_membro(text) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 10. Verificação pós-patch (NOTICE no SQL Editor)
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  v_enum boolean;
  v_purity boolean;
  v_estase boolean;
  v_ignicao boolean;
  v_calor boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'membro_principal_soberano') INTO v_enum;
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'purity_logs') INTO v_purity;
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'evolucao_membro_estase') INTO v_estase;
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'calcular_indice_ignicao_atleta'
  ) INTO v_ignicao;
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'obter_calor_muscular_atleta'
  ) INTO v_calor;

  RAISE NOTICE 'FENYXIA PATCH OK · enum=% · purity_logs=% · estase=% · ignicao_rpc=% · calor_rpc=%',
    v_enum, v_purity, v_estase, v_ignicao, v_calor;
END $$;
