-- FENYXIA · Aba 3 Evolução — Configuração canónica RPC calor muscular + RLS
-- Idempotente · Aplicar após 20260530122000_fix_obter_calor_volatile.sql
-- Região: sa-east-1 · 4 membros soberanos · pureza dinâmica · estase VIP

-- ---------------------------------------------------------------------------
-- 1. Helper · membros prescritos na ficha personal
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.evolucao_membros_prescritos_ativos(p_user_id uuid)
RETURNS SETOF public.membro_principal_soberano
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT htp.membro_principal
  FROM public.historico_treinos_personais htp
  WHERE htp.client_id = p_user_id
    AND htp.membro_principal IS NOT NULL;
$$;

COMMENT ON FUNCTION public.evolucao_membros_prescritos_ativos(uuid) IS
  'Membros soberanos presentes na ficha personal activa do atleta VIP.';

-- ---------------------------------------------------------------------------
-- 2. RPC · obter_calor_muscular_atleta (4 linhas · auth.uid scope)
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
#variable_conflict use_column
DECLARE
  v_membro public.membro_principal_soberano;
  v_tem_bond boolean;
  v_tem_ficha boolean;
  v_prescrito boolean;
  v_is_frozen boolean;
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
  v_tem_bond := public.argos_has_forger_bond(p_user_id);

  SELECT EXISTS (
    SELECT 1
    FROM public.historico_treinos_personais htp
    WHERE htp.client_id = p_user_id
  )
  INTO v_tem_ficha;

  FOREACH v_membro IN ARRAY v_membros LOOP
    v_is_frozen := false;

    IF v_tem_bond AND v_tem_ficha THEN
      SELECT EXISTS (
        SELECT 1
        FROM public.evolucao_membros_prescritos_ativos(p_user_id) m
        WHERE m = v_membro
      )
      INTO v_prescrito;

      v_is_frozen := NOT COALESCE(v_prescrito, false);
    END IF;

    IF v_is_frozen THEN
      RETURN QUERY
      SELECT
        v_membro::text,
        COALESCE(
          (
            SELECT e.nivel_calculado
            FROM public.evolucao_membro_estase e
            WHERE e.user_id = p_user_id
              AND e.membro_principal = v_membro
          ),
          'CINZAS'
        ),
        true;
      CONTINUE;
    END IF;

    v_metric := public.evolucao_calcular_metrica_membro(p_user_id, v_membro);
    v_metric_final := v_metric;

    IF v_ignicao < 50 THEN
      v_metric_final := v_metric_final * 0.6;
    END IF;

    v_nivel := public.evolucao_classificar_nivel(v_membro, v_metric_final);

    INSERT INTO public.evolucao_membro_estase AS eme (
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

    RETURN QUERY SELECT v_membro::text, v_nivel, false;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.obter_calor_muscular_atleta(uuid) IS
  'Aba Evolução — retorna PEITO/BRACOS/ABDOMEN/PERNAS · estase VIP · penalidade pureza <50%.';

-- ---------------------------------------------------------------------------
-- 3. RPC · calcular_indice_ignicao_atleta (reafirma guard auth.uid)
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
  'Índice de Ignição (0–100) · janela 30d · purity_logs · escopo auth.uid().';

-- ---------------------------------------------------------------------------
-- 4. RLS · purity_logs + evolucao_membro_estase
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

DROP POLICY IF EXISTS "ARGOS evolucao_membro_estase forjador read bonded" ON public.evolucao_membro_estase;
CREATE POLICY "ARGOS evolucao_membro_estase forjador read bonded"
ON public.evolucao_membro_estase FOR SELECT TO authenticated
USING (public.argos_is_self_or_forjador(user_id));

-- Escrita em evolucao_membro_estase exclusiva via RPC SECURITY DEFINER (sem INSERT client-side)

-- ---------------------------------------------------------------------------
-- 5. Grants · least privilege
-- ---------------------------------------------------------------------------

REVOKE ALL ON TABLE public.purity_logs FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.evolucao_membro_estase FROM PUBLIC, anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.purity_logs TO authenticated;
GRANT SELECT ON TABLE public.evolucao_membro_estase TO authenticated;
GRANT ALL ON TABLE public.purity_logs TO service_role;
GRANT ALL ON TABLE public.evolucao_membro_estase TO service_role;

REVOKE ALL ON FUNCTION public.evolucao_membros_prescritos_ativos(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.obter_calor_muscular_atleta(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.calcular_indice_ignicao_atleta(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.evolucao_membros_prescritos_ativos(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.obter_calor_muscular_atleta(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.calcular_indice_ignicao_atleta(uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 6. Verificação pós-patch
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  v_calor boolean;
  v_ignicao boolean;
  v_purity_rls boolean;
  v_estase_rls boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'obter_calor_muscular_atleta'
  ) INTO v_calor;

  SELECT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'calcular_indice_ignicao_atleta'
  ) INTO v_ignicao;

  SELECT relrowsecurity
  INTO v_purity_rls
  FROM pg_class
  WHERE relname = 'purity_logs' AND relnamespace = 'public'::regnamespace;

  SELECT relrowsecurity
  INTO v_estase_rls
  FROM pg_class
  WHERE relname = 'evolucao_membro_estase' AND relnamespace = 'public'::regnamespace;

  RAISE NOTICE 'FENYXIA EVOLUCAO CALOR OK · calor_rpc=% · ignicao_rpc=% · purity_rls=% · estase_rls=%',
    v_calor, v_ignicao, v_purity_rls, v_estase_rls;
END $$;
