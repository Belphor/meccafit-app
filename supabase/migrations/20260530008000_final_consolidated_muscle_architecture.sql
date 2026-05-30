-- FENYXIA · Aba 3 (Evolução) — Arquitectura Anatómica Consolidada (4 Membros Soberanos)
-- Região: sa-east-1 · Idempotente · Zero dependência de subgrupos musculares
--
-- Sistema GERAL — aplica-se a cliente comum e cliente VIP com as mesmas regras.
-- Aba Dieta (VIP + Personal) é exclusividade de produto no BFF/UI, não nesta migration.
--
-- Membros canónicos: PEITO · BRACOS · ABDOMEN · PERNAS
-- Requer: bootstrap Meccafit + dual-track (historico_treinos · _comuns · _personais)
--
-- Substitui catálogo IRIS por subgrupos (muscle_canonical_groups / muscle_ui_routes).

-- ---------------------------------------------------------------------------
-- 0. Limpeza — remove catálogo IRIS de subgrupos (se existir)
-- ---------------------------------------------------------------------------

DROP TABLE IF EXISTS public.muscle_ui_routes CASCADE;
DROP TABLE IF EXISTS public.muscle_canonical_groups CASCADE;

DROP FUNCTION IF EXISTS public.muscle_fetch_architecture_catalog();
DROP FUNCTION IF EXISTS public.muscle_resolve_ui_route(text);
DROP FUNCTION IF EXISTS public.muscle_normalize_subgrupo(text);

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

-- ---------------------------------------------------------------------------
-- 1. Enum soberano — 4 Grandes Membros Principais
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
-- 2. profiles.target_days_per_week — meta semanal de pureza (padrão 3)
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS target_days_per_week smallint;

UPDATE public.profiles
SET target_days_per_week = 3
WHERE target_days_per_week IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN target_days_per_week SET DEFAULT 3;

ALTER TABLE public.profiles
  ALTER COLUMN target_days_per_week SET NOT NULL;

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
-- 3. purity_logs — uma linha por dia por atleta (cota zero de disco)
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
  'Pureza diária do atleta — 1 registo/dia (Índice de Ignição · Aba Evolução).';

-- ---------------------------------------------------------------------------
-- 4. evolucao_membro_estase — cache do último cálculo (todos os atletas)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.evolucao_membro_estase (
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  membro_principal public.membro_principal_soberano NOT NULL,
  nivel_calculado text NOT NULL DEFAULT 'CINZAS',
  metrica_bruta numeric(14, 2) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, membro_principal),
  CONSTRAINT evolucao_membro_estase_nivel_check CHECK (
    nivel_calculado IN ('CINZAS', 'FAISCA', 'BRASA', 'LABAREDA', 'FOGO CÓSMICO')
  )
);

COMMENT ON TABLE public.evolucao_membro_estase IS
  'Snapshot do último calor muscular calculado — cliente comum e VIP (sem regra VIP).';

-- ---------------------------------------------------------------------------
-- 5. membro_principal — rotulação dos 4 membros (Forja + treinos comuns)
--    Não gateia Evolução; só classifica/agrupa execuções e prescrições.
-- ---------------------------------------------------------------------------

ALTER TABLE public.historico_treinos_personais
  ADD COLUMN IF NOT EXISTS membro_principal public.membro_principal_soberano;

ALTER TABLE public.historico_treinos_comuns
  ADD COLUMN IF NOT EXISTS membro_principal public.membro_principal_soberano;

CREATE INDEX IF NOT EXISTS idx_htp_client_membro
  ON public.historico_treinos_personais (client_id, membro_principal);

CREATE INDEX IF NOT EXISTS idx_htc_user_membro_criado
  ON public.historico_treinos_comuns (user_id, membro_principal, criado_em DESC);

-- ---------------------------------------------------------------------------
-- 6. Helpers — resolução · classificação · janelas temporais
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

DROP FUNCTION IF EXISTS public.evolucao_membros_prescritos_ativos(uuid);
DROP FUNCTION IF EXISTS public.evolucao_cliente_tem_personal(uuid);

-- Backfill prescrições — inferência por exercicio_id / observações (legado)
UPDATE public.historico_treinos_personais htp
SET membro_principal = public.evolucao_inferir_membro(
  COALESCE(htp.observacoes, '') || ' ' || htp.exercicio_id
)
WHERE htp.membro_principal IS NULL;

UPDATE public.historico_treinos_comuns htc
SET membro_principal = public.evolucao_inferir_membro(htc.exercicio_id)
WHERE htc.membro_principal IS NULL;

-- ---------------------------------------------------------------------------
-- 7. RPC — calcular_indice_ignicao_atleta(p_user_id uuid) → INTEGER
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
  'Índice de Ignição (0–100): treinos puros / alvo dinâmico 30d × target_days_per_week.';

-- ---------------------------------------------------------------------------
-- 8. RPC interna — métrica bruta por membro (janela 14 dias dinâmicos)
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
BEGIN
  v_window_start := public.evolucao_sp_today() - 13;

  IF p_membro = 'ABDOMEN'::public.membro_principal_soberano THEN
    SELECT COALESCE(SUM(w.series * w.repeticoes), 0)
    INTO v_metric
    FROM (
      SELECT ht.series, ht.repeticoes
      FROM public.historico_treinos ht
      WHERE ht.cliente_id = p_user_id
        AND public.evolucao_resolve_membro(ht.musculo) = p_membro
        AND (timezone('America/Sao_Paulo', ht.registrado_em))::date >= v_window_start
        AND (timezone('America/Sao_Paulo', ht.registrado_em))::date <= public.evolucao_sp_today()

      UNION ALL

      SELECT htc.series, htc.repeticoes
      FROM public.historico_treinos_comuns htc
      WHERE htc.user_id = p_user_id
        AND (
          htc.membro_principal = p_membro
          OR public.evolucao_resolve_membro(htc.exercicio_id) = p_membro
        )
        AND (timezone('America/Sao_Paulo', htc.criado_em))::date >= v_window_start
        AND (timezone('America/Sao_Paulo', htc.criado_em))::date <= public.evolucao_sp_today()
    ) w;
  ELSE
    SELECT COALESCE(SUM(sp.peak_kg), 0)
    INTO v_metric
    FROM (
      SELECT
        w.session_date,
        w.exercicio_key,
        MAX(w.peso_atual) AS peak_kg
      FROM (
        SELECT
          (timezone('America/Sao_Paulo', ht.registrado_em))::date AS session_date,
          ht.exercicio_id::text AS exercicio_key,
          ht.peso_atual
        FROM public.historico_treinos ht
        WHERE ht.cliente_id = p_user_id
          AND ht.peso_atual > 0
          AND public.evolucao_resolve_membro(ht.musculo) = p_membro
          AND (timezone('America/Sao_Paulo', ht.registrado_em))::date >= v_window_start
          AND (timezone('America/Sao_Paulo', ht.registrado_em))::date <= public.evolucao_sp_today()

        UNION ALL

        SELECT
          (timezone('America/Sao_Paulo', htc.criado_em))::date AS session_date,
          htc.exercicio_id AS exercicio_key,
          htc.peso_atual
        FROM public.historico_treinos_comuns htc
        WHERE htc.user_id = p_user_id
          AND htc.peso_atual > 0
          AND (
            htc.membro_principal = p_membro
            OR public.evolucao_resolve_membro(htc.exercicio_id) = p_membro
          )
          AND (timezone('America/Sao_Paulo', htc.criado_em))::date >= v_window_start
          AND (timezone('America/Sao_Paulo', htc.criado_em))::date <= public.evolucao_sp_today()
      ) w
      GROUP BY w.session_date, w.exercicio_key
    ) sp;
  END IF;

  RETURN COALESCE(v_metric, 0);
END;
$$;

-- ---------------------------------------------------------------------------
-- 9. RPC — obter_calor_muscular_atleta(p_user_id uuid)
--    → TABLE (membro_principal text, nivel_calculado text, is_frozen boolean)
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
  'Aba Evolução — calor muscular dos 4 membros (geral: comum + VIP). Penalidade ARGOS se ignição < 50%. is_frozen reservado (sempre false).';

-- ---------------------------------------------------------------------------
-- 10. RLS — purity_logs · evolucao_membro_estase
-- ---------------------------------------------------------------------------

ALTER TABLE public.purity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evolucao_membro_estase ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ARGOS purity_logs select own" ON public.purity_logs;
CREATE POLICY "ARGOS purity_logs select own"
ON public.purity_logs
FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "ARGOS purity_logs insert own" ON public.purity_logs;
CREATE POLICY "ARGOS purity_logs insert own"
ON public.purity_logs
FOR INSERT
TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "ARGOS purity_logs update own" ON public.purity_logs;
CREATE POLICY "ARGOS purity_logs update own"
ON public.purity_logs
FOR UPDATE
TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "ARGOS purity_logs delete own" ON public.purity_logs;
CREATE POLICY "ARGOS purity_logs delete own"
ON public.purity_logs
FOR DELETE
TO authenticated
USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "ARGOS evolucao_membro_estase select own" ON public.evolucao_membro_estase;
CREATE POLICY "ARGOS evolucao_membro_estase select own"
ON public.evolucao_membro_estase
FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid()));

-- Escrita em estase apenas via RPC SECURITY DEFINER (sem policy INSERT/UPDATE client)

-- ---------------------------------------------------------------------------
-- 11. Grants
-- ---------------------------------------------------------------------------

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
