-- FENYXIA · Aba 3 · COSTAS + RPC JSON · obter_calor_muscular_atleta(target_atleta_id)
-- Idempotente · Aplicar após 20260530140000_evolucao_costas_enum.sql
-- Região: sa-east-1 · 5 grupos: peito · bracos · costas · abdomen · pernas

-- ---------------------------------------------------------------------------
-- 1. Resolver grupo calor (5 chaves JSON)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.evolucao_resolve_grupo_calor(p_musculo text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_musculo IS NULL OR BTRIM(p_musculo) = '' THEN NULL
    WHEN UPPER(BTRIM(p_musculo)) IN ('COSTAS', 'DORSAL', 'LATISSIMO', 'LAT')
      OR UPPER(p_musculo) ~ '(COSTAS|DORSAL|REMADA|PULL.?DOWN|PULLUP|BARFIX|PUXADA)'
      THEN 'costas'
    WHEN UPPER(BTRIM(p_musculo)) IN ('PEITO', 'PEITORAL')
      OR UPPER(p_musculo) ~ '(PEITO|PEITORAL|SUPINO|CRUCIFIXO|CROSSOVER)'
      THEN 'peito'
    WHEN UPPER(BTRIM(p_musculo)) IN ('BRACOS', 'BRAÇOS', 'BRACO', 'OMBROS', 'OMBRO')
      OR UPPER(p_musculo) ~ '(BRACO|BRAÇO|TRICEPS|BICEPS|OMBRO|ROSCA|TRICEPS)'
      THEN 'bracos'
    WHEN UPPER(BTRIM(p_musculo)) IN ('ABDOMEN', 'ABDÔMEN', 'ABDOME', 'CORE')
      OR UPPER(p_musculo) ~ '(ABDOMEN|ABDÔMEN|ABDOME|CORE|ABS|PRANCHA)'
      THEN 'abdomen'
    WHEN UPPER(BTRIM(p_musculo)) IN ('PERNAS', 'PERNA')
      OR UPPER(p_musculo) ~ '(PERNA|PERNAS|AGACH|LEG|QUADR|MEMBRO.INFERIOR)'
      THEN 'pernas'
    WHEN LOWER(BTRIM(p_musculo)) = 'costas' THEN 'costas'
    WHEN LOWER(BTRIM(p_musculo)) = 'peito' THEN 'peito'
    WHEN LOWER(BTRIM(p_musculo)) IN ('bracos', 'ombros') THEN 'bracos'
    WHEN LOWER(BTRIM(p_musculo)) IN ('abdomen', 'abdome') THEN 'abdomen'
    WHEN LOWER(BTRIM(p_musculo)) = 'pernas' THEN 'pernas'
    ELSE NULL
  END;
$$;

COMMENT ON FUNCTION public.evolucao_resolve_grupo_calor(text) IS
  'Mapeia músculo/subgrupo para chave JSON: peito · bracos · costas · abdomen · pernas.';

-- Actualizar inferência soberana (costas separado de braços)
CREATE OR REPLACE FUNCTION public.evolucao_inferir_membro(p_texto text)
RETURNS public.membro_principal_soberano
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_texto IS NULL OR BTRIM(p_texto) = '' THEN NULL::public.membro_principal_soberano
    WHEN public.evolucao_resolve_grupo_calor(p_texto) = 'costas'
      THEN 'COSTAS'::public.membro_principal_soberano
    WHEN public.evolucao_resolve_grupo_calor(p_texto) = 'peito'
      THEN 'PEITO'::public.membro_principal_soberano
    WHEN public.evolucao_resolve_grupo_calor(p_texto) = 'bracos'
      THEN 'BRACOS'::public.membro_principal_soberano
    WHEN public.evolucao_resolve_grupo_calor(p_texto) = 'abdomen'
      THEN 'ABDOMEN'::public.membro_principal_soberano
    WHEN public.evolucao_resolve_grupo_calor(p_texto) = 'pernas'
      THEN 'PERNAS'::public.membro_principal_soberano
    ELSE NULL::public.membro_principal_soberano
  END;
$$;

CREATE OR REPLACE FUNCTION public.evolucao_resolve_membro(p_musculo text)
RETURNS public.membro_principal_soberano
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE public.evolucao_resolve_grupo_calor(p_musculo)
    WHEN 'costas' THEN 'COSTAS'::public.membro_principal_soberano
    WHEN 'peito' THEN 'PEITO'::public.membro_principal_soberano
    WHEN 'bracos' THEN 'BRACOS'::public.membro_principal_soberano
    WHEN 'abdomen' THEN 'ABDOMEN'::public.membro_principal_soberano
    WHEN 'pernas' THEN 'PERNAS'::public.membro_principal_soberano
    ELSE NULL::public.membro_principal_soberano
  END;
$$;

-- ---------------------------------------------------------------------------
-- 3. Classificação · COSTAS (escala dedicada)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.evolucao_classificar_nivel_costas(p_metrica numeric)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_metrica IS NULL OR p_metrica <= 0 THEN 'CINZAS'
    WHEN p_metrica <= 160 THEN 'FAISCA'
    WHEN p_metrica <= 500 THEN 'BRASA'
    WHEN p_metrica <= 1000 THEN 'LABAREDA'
    ELSE 'FOGO CÓSMICO'
  END;
$$;

CREATE OR REPLACE FUNCTION public.evolucao_classificar_nivel_grupo(
  p_grupo text,
  p_metrica numeric
)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_grupo = 'costas' THEN public.evolucao_classificar_nivel_costas(p_metrica)
    WHEN p_grupo = 'peito' THEN public.evolucao_classificar_nivel('PEITO'::public.membro_principal_soberano, p_metrica)
    WHEN p_grupo = 'bracos' THEN public.evolucao_classificar_nivel('BRACOS'::public.membro_principal_soberano, p_metrica)
    WHEN p_grupo = 'abdomen' THEN public.evolucao_classificar_nivel('ABDOMEN'::public.membro_principal_soberano, p_metrica)
    WHEN p_grupo = 'pernas' THEN public.evolucao_classificar_nivel('PERNAS'::public.membro_principal_soberano, p_metrica)
    ELSE 'CINZAS'
  END;
$$;

-- ---------------------------------------------------------------------------
-- 4. Métrica quinzenal (14 dias) por grupo JSON
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.evolucao_calcular_metrica_grupo(
  p_user_id uuid,
  p_grupo text
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
  IF p_user_id IS NULL OR p_grupo IS NULL THEN
    RETURN 0;
  END IF;

  v_window_start := public.evolucao_sp_today() - 13;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'historico_treinos_comuns'
  ) INTO v_has_htc;

  IF p_grupo = 'abdomen' THEN
    SELECT COALESCE(SUM(ht.series * ht.repeticoes), 0)
    INTO v_metric
    FROM public.historico_treinos ht
    WHERE ht.cliente_id = p_user_id
      AND public.evolucao_resolve_grupo_calor(ht.musculo::text) = 'abdomen'
      AND (timezone('America/Sao_Paulo', ht.registrado_em))::date >= v_window_start
      AND (timezone('America/Sao_Paulo', ht.registrado_em))::date <= public.evolucao_sp_today();

    IF v_has_htc THEN
      SELECT COALESCE(SUM(htc.series * htc.repeticoes), 0)
      INTO v_partial
      FROM public.historico_treinos_comuns htc
      WHERE htc.user_id = p_user_id
        AND (
          public.evolucao_resolve_grupo_calor(COALESCE(htc.membro_principal::text, '')) = 'abdomen'
          OR public.evolucao_resolve_grupo_calor(htc.exercicio_id) = 'abdomen'
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
        AND public.evolucao_resolve_grupo_calor(ht.musculo::text) = p_grupo
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
            public.evolucao_resolve_grupo_calor(COALESCE(htc.membro_principal::text, '')) = p_grupo
            OR public.evolucao_resolve_grupo_calor(htc.exercicio_id) = p_grupo
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
-- 5. Estase · membros prescritos (inclui COSTAS)
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

CREATE OR REPLACE FUNCTION public.evolucao_grupo_esta_prescrito(
  p_user_id uuid,
  p_grupo text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.historico_treinos_personais htp
    WHERE htp.client_id = p_user_id
      AND (
        htp.membro_principal::text = UPPER(p_grupo)
        OR public.evolucao_resolve_grupo_calor(
          COALESCE(htp.exercicio_id, '') || ' ' || COALESCE(htp.membro_principal::text, '')
        ) = p_grupo
      )
  );
$$;

-- ---------------------------------------------------------------------------
-- 6. RPC principal · JSON com 5 chaves + indice_ignicao
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.obter_calor_muscular_atleta(uuid);

CREATE OR REPLACE FUNCTION public.obter_calor_muscular_atleta(target_atleta_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_grupo text;
  v_grupos constant text[] := ARRAY['peito', 'bracos', 'costas', 'abdomen', 'pernas'];
  v_membro public.membro_principal_soberano;
  v_ignicao integer;
  v_tem_bond boolean;
  v_tem_ficha boolean;
  v_is_frozen boolean;
  v_prescrito boolean;
  v_metric numeric;
  v_metric_final numeric;
  v_nivel text;
  v_payload jsonb := '{}'::jsonb;
BEGIN
  IF target_atleta_id IS NULL THEN
    RETURN jsonb_build_object(
      'indice_ignicao', 0,
      'peito', jsonb_build_object('nivel_calculado', 'CINZAS', 'is_frozen', false, 'metrica_bruta', 0),
      'bracos', jsonb_build_object('nivel_calculado', 'CINZAS', 'is_frozen', false, 'metrica_bruta', 0),
      'costas', jsonb_build_object('nivel_calculado', 'CINZAS', 'is_frozen', false, 'metrica_bruta', 0),
      'abdomen', jsonb_build_object('nivel_calculado', 'CINZAS', 'is_frozen', false, 'metrica_bruta', 0),
      'pernas', jsonb_build_object('nivel_calculado', 'CINZAS', 'is_frozen', false, 'metrica_bruta', 0)
    );
  END IF;

  IF (SELECT auth.uid()) IS NOT NULL
    AND target_atleta_id IS DISTINCT FROM (SELECT auth.uid())
  THEN
    RAISE EXCEPTION 'Acesso Negado: ID do atleta inválido'
      USING ERRCODE = '42501';
  END IF;

  v_ignicao := public.calcular_indice_ignicao_atleta(target_atleta_id);
  v_tem_bond := public.argos_has_forger_bond(target_atleta_id);

  SELECT EXISTS (
    SELECT 1
    FROM public.historico_treinos_personais htp
    WHERE htp.client_id = target_atleta_id
  )
  INTO v_tem_ficha;

  v_payload := jsonb_set(v_payload, '{indice_ignicao}', to_jsonb(v_ignicao), true);

  FOREACH v_grupo IN ARRAY v_grupos LOOP
    v_is_frozen := false;
    v_prescrito := false;

    IF v_tem_bond AND v_tem_ficha THEN
      v_prescrito := public.evolucao_grupo_esta_prescrito(target_atleta_id, v_grupo);
      v_is_frozen := NOT COALESCE(v_prescrito, false);
    END IF;

    v_membro := CASE v_grupo
      WHEN 'peito' THEN 'PEITO'::public.membro_principal_soberano
      WHEN 'bracos' THEN 'BRACOS'::public.membro_principal_soberano
      WHEN 'costas' THEN 'COSTAS'::public.membro_principal_soberano
      WHEN 'abdomen' THEN 'ABDOMEN'::public.membro_principal_soberano
      WHEN 'pernas' THEN 'PERNAS'::public.membro_principal_soberano
      ELSE NULL
    END;

    IF v_is_frozen AND v_membro IS NOT NULL THEN
      v_nivel := COALESCE(
        (
          SELECT e.nivel_calculado
          FROM public.evolucao_membro_estase e
          WHERE e.user_id = target_atleta_id
            AND e.membro_principal = v_membro
        ),
        'CINZAS'
      );

      v_payload := jsonb_set(
        v_payload,
        ARRAY[v_grupo],
        jsonb_build_object(
          'nivel_calculado', v_nivel,
          'is_frozen', true,
          'metrica_bruta', 0
        ),
        true
      );
      CONTINUE;
    END IF;

    v_metric := public.evolucao_calcular_metrica_grupo(target_atleta_id, v_grupo);
    v_metric_final := v_metric;

    IF v_ignicao < 50 THEN
      v_metric_final := v_metric_final * 0.6;
    END IF;

    v_nivel := public.evolucao_classificar_nivel_grupo(v_grupo, v_metric_final);

    IF v_membro IS NOT NULL THEN
      INSERT INTO public.evolucao_membro_estase (
        user_id,
        membro_principal,
        nivel_calculado,
        metrica_bruta,
        updated_at
      )
      VALUES (
        target_atleta_id,
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
    END IF;

    v_payload := jsonb_set(
      v_payload,
      ARRAY[v_grupo],
      jsonb_build_object(
        'nivel_calculado', v_nivel,
        'is_frozen', false,
        'metrica_bruta', COALESCE(v_metric_final, 0)
      ),
      true
    );
  END LOOP;

  RETURN v_payload;
END;
$$;

COMMENT ON FUNCTION public.obter_calor_muscular_atleta(uuid) IS
  'Aba Evolução · JSON peito/bracos/costas/abdomen/pernas · estase VIP · pureza <50% penaliza 40%.';

-- ---------------------------------------------------------------------------
-- 7. Grants · Argos least privilege
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.obter_calor_muscular_atleta(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.evolucao_calcular_metrica_grupo(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.evolucao_classificar_nivel_costas(numeric) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.evolucao_classificar_nivel_grupo(text, numeric) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.evolucao_resolve_grupo_calor(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.evolucao_grupo_esta_prescrito(uuid, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.obter_calor_muscular_atleta(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.evolucao_calcular_metrica_grupo(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.evolucao_classificar_nivel_costas(numeric) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.evolucao_classificar_nivel_grupo(text, numeric) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.evolucao_resolve_grupo_calor(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.evolucao_grupo_esta_prescrito(uuid, text) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 8. Verificação
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  v_rpc boolean;
  v_costas_fn boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'obter_calor_muscular_atleta'
      AND pg_get_function_result(p.oid) = 'jsonb'
  ) INTO v_rpc;

  SELECT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'evolucao_classificar_nivel_costas'
  ) INTO v_costas_fn;

  RAISE NOTICE 'FENYXIA COSTAS OK · json_rpc=% · costas_scale=%',
    v_rpc, v_costas_fn;
END $$;

NOTIFY pgrst, 'reload schema';
