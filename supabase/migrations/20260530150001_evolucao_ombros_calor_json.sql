-- FENYXIA · Aba 3 · OMBROS + RPC JSON · obter_calor_muscular_atleta(target_atleta_id)
-- Idempotente · Aplicar após 20260530150000_evolucao_ombros_enum.sql
-- Região: sa-east-1 · 6 grupos: peito · ombros · bracos · costas · abdomen · pernas

-- ---------------------------------------------------------------------------
-- 1. Resolver grupo calor (6 chaves JSON · ombros separado de braços)
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
    WHEN UPPER(BTRIM(p_musculo)) IN ('OMBROS', 'OMBRO')
      OR UPPER(p_musculo) ~ '(OMBRO|DELTOID|ELEVACAO.LATERAL|DEVELOPE|ARNOLD)'
      THEN 'ombros'
    WHEN UPPER(BTRIM(p_musculo)) IN ('BRACOS', 'BRAÇOS', 'BRACO')
      OR UPPER(p_musculo) ~ '(BRACO|BRAÇO|TRICEPS|BICEPS|ROSCA|PUSHDOWN|PUSH.DOWN)'
      THEN 'bracos'
    WHEN UPPER(BTRIM(p_musculo)) IN ('ABDOMEN', 'ABDÔMEN', 'ABDOME', 'CORE')
      OR UPPER(p_musculo) ~ '(ABDOMEN|ABDÔMEN|ABDOME|CORE|ABS|PRANCHA)'
      THEN 'abdomen'
    WHEN UPPER(BTRIM(p_musculo)) IN ('PERNAS', 'PERNA')
      OR UPPER(p_musculo) ~ '(PERNA|PERNAS|AGACH|LEG|QUADR|MEMBRO.INFERIOR)'
      THEN 'pernas'
    WHEN LOWER(BTRIM(p_musculo)) = 'costas' THEN 'costas'
    WHEN LOWER(BTRIM(p_musculo)) = 'peito' THEN 'peito'
    WHEN LOWER(BTRIM(p_musculo)) = 'ombros' THEN 'ombros'
    WHEN LOWER(BTRIM(p_musculo)) = 'bracos' THEN 'bracos'
    WHEN LOWER(BTRIM(p_musculo)) IN ('abdomen', 'abdome') THEN 'abdomen'
    WHEN LOWER(BTRIM(p_musculo)) = 'pernas' THEN 'pernas'
    ELSE NULL
  END;
$$;

COMMENT ON FUNCTION public.evolucao_resolve_grupo_calor(text) IS
  'Mapeia músculo/subgrupo para chave JSON: peito · ombros · bracos · costas · abdomen · pernas.';

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
    WHEN public.evolucao_resolve_grupo_calor(p_texto) = 'ombros'
      THEN 'OMBROS'::public.membro_principal_soberano
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
    WHEN 'ombros' THEN 'OMBROS'::public.membro_principal_soberano
    WHEN 'bracos' THEN 'BRACOS'::public.membro_principal_soberano
    WHEN 'abdomen' THEN 'ABDOMEN'::public.membro_principal_soberano
    WHEN 'pernas' THEN 'PERNAS'::public.membro_principal_soberano
    ELSE NULL::public.membro_principal_soberano
  END;
$$;

-- ---------------------------------------------------------------------------
-- 2. Classificação · OMBROS (escala dedicada · tetos 50 / 140 / 280)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.evolucao_classificar_nivel_ombros(p_metrica numeric)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_metrica IS NULL OR p_metrica <= 0 THEN 'CINZAS'
    WHEN p_metrica <= 50 THEN 'FAISCA'
    WHEN p_metrica <= 140 THEN 'BRASA'
    WHEN p_metrica <= 280 THEN 'LABAREDA'
    ELSE 'FOGO CÓSMICO'
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
    WHEN p_membro = 'OMBROS'::public.membro_principal_soberano THEN
      public.evolucao_classificar_nivel_ombros(p_metrica)
    WHEN p_membro = 'BRACOS'::public.membro_principal_soberano THEN
      CASE
        WHEN p_metrica <= 60 THEN 'FAISCA'
        WHEN p_metrica <= 160 THEN 'BRASA'
        WHEN p_metrica <= 320 THEN 'LABAREDA'
        ELSE 'FOGO CÓSMICO'
      END
    WHEN p_membro = 'COSTAS'::public.membro_principal_soberano THEN
      public.evolucao_classificar_nivel_costas(p_metrica)
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
    WHEN p_grupo = 'ombros' THEN public.evolucao_classificar_nivel_ombros(p_metrica)
    WHEN p_grupo = 'bracos' THEN public.evolucao_classificar_nivel('BRACOS'::public.membro_principal_soberano, p_metrica)
    WHEN p_grupo = 'abdomen' THEN public.evolucao_classificar_nivel('ABDOMEN'::public.membro_principal_soberano, p_metrica)
    WHEN p_grupo = 'pernas' THEN public.evolucao_classificar_nivel('PERNAS'::public.membro_principal_soberano, p_metrica)
    ELSE 'CINZAS'
  END;
$$;

-- ---------------------------------------------------------------------------
-- 3. RPC principal · JSON com 6 chaves + indice_ignicao
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
  v_grupos constant text[] := ARRAY[
    'peito', 'ombros', 'bracos', 'costas', 'abdomen', 'pernas'
  ];
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
  v_empty_group jsonb := jsonb_build_object(
    'nivel_calculado', 'CINZAS',
    'is_frozen', false,
    'metrica_bruta', 0
  );
BEGIN
  IF target_atleta_id IS NULL THEN
    RETURN jsonb_build_object(
      'indice_ignicao', 0,
      'peito', v_empty_group,
      'ombros', v_empty_group,
      'bracos', v_empty_group,
      'costas', v_empty_group,
      'abdomen', v_empty_group,
      'pernas', v_empty_group
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
      WHEN 'ombros' THEN 'OMBROS'::public.membro_principal_soberano
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
  'Aba Evolução · JSON peito/ombros/bracos/costas/abdomen/pernas · estase VIP · pureza <50% penaliza 40%.';

-- ---------------------------------------------------------------------------
-- 4. Grants · Argos least privilege
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.obter_calor_muscular_atleta(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.evolucao_classificar_nivel_ombros(numeric) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.obter_calor_muscular_atleta(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.evolucao_classificar_nivel_ombros(numeric) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5. Verificação
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  v_rpc boolean;
  v_ombros_fn boolean;
  v_ombros_enum boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'obter_calor_muscular_atleta'
      AND pg_get_function_result(p.oid) = 'jsonb'
  ) INTO v_rpc;

  SELECT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'evolucao_classificar_nivel_ombros'
  ) INTO v_ombros_fn;

  SELECT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'membro_principal_soberano'
      AND e.enumlabel = 'OMBROS'
  ) INTO v_ombros_enum;

  RAISE NOTICE 'FENYXIA OMBROS OK · json_rpc=% · ombros_scale=% · enum=%',
    v_rpc, v_ombros_fn, v_ombros_enum;
END $$;

NOTIFY pgrst, 'reload schema';
