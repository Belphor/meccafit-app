-- FENYXIA · Evolução abdômen — PR diário + unidades térmicas (TLU)
-- Corrige SUM(series×reps) inflado; prancha isométrica em segundos normalizada (4s ≈ 1 rep).

CREATE OR REPLACE FUNCTION public.evolucao_is_isometric_core(
  p_exercicio_id bigint,
  p_exercicio_nome text DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    p_exercicio_id = 11
    OR LOWER(COALESCE(p_exercicio_nome, '')) LIKE '%prancha%'
    OR LOWER(COALESCE(p_exercicio_nome, '')) LIKE '%isom%';
$$;

COMMENT ON FUNCTION public.evolucao_is_isometric_core(bigint, text) IS
  'Exercício isométrico de core (prancha) — PR em segundos, não repetições.';

CREATE OR REPLACE FUNCTION public.evolucao_abdomen_pr_para_tlu(
  p_peso_atual numeric,
  p_exercicio_id bigint,
  p_exercicio_nome text DEFAULT NULL
)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN public.evolucao_is_isometric_core(p_exercicio_id, p_exercicio_nome)
      THEN GREATEST(0, COALESCE(p_peso_atual, 0)) / 4.0
    ELSE GREATEST(0, COALESCE(p_peso_atual, 0))
  END;
$$;

COMMENT ON FUNCTION public.evolucao_abdomen_pr_para_tlu(numeric, bigint, text) IS
  'TLU abdômen: rep dinâmica = 1:1; isométrico = segundos / 4 (EMG/TUT · rectus abdominis).';

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
    SELECT COALESCE(SUM(sp.peak_tlu), 0)
    INTO v_metric
    FROM (
      SELECT
        w.session_date,
        w.exercicio_key,
        MAX(
          public.evolucao_abdomen_pr_para_tlu(
            w.peso_atual,
            w.exercicio_id,
            w.exercicio_nome
          )
        ) AS peak_tlu
      FROM (
        SELECT
          (timezone('America/Sao_Paulo', ht.registrado_em))::date AS session_date,
          ht.exercicio_id::text AS exercicio_key,
          ht.exercicio_id,
          ht.exercicio_nome,
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
          NULL::bigint AS exercicio_id,
          htc.exercicio_id AS exercicio_nome,
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
    SELECT COALESCE(SUM(sp.peak_tlu), 0)
    INTO v_metric
    FROM (
      SELECT
        (timezone('America/Sao_Paulo', ht.registrado_em))::date AS session_date,
        ht.exercicio_id::text AS exercicio_key,
        MAX(
          public.evolucao_abdomen_pr_para_tlu(
            ht.peso_atual,
            ht.exercicio_id,
            ht.exercicio_nome
          )
        ) AS peak_tlu
      FROM public.historico_treinos ht
      WHERE ht.cliente_id = p_user_id
        AND ht.peso_atual > 0
        AND public.evolucao_resolve_grupo_calor(ht.musculo::text) = 'abdomen'
        AND (timezone('America/Sao_Paulo', ht.registrado_em))::date >= v_window_start
        AND (timezone('America/Sao_Paulo', ht.registrado_em))::date <= public.evolucao_sp_today()
      GROUP BY 1, 2
    ) sp;

    IF v_has_htc THEN
      SELECT COALESCE(SUM(sp.peak_tlu), 0)
      INTO v_partial
      FROM (
        SELECT
          (timezone('America/Sao_Paulo', htc.criado_em))::date AS session_date,
          htc.exercicio_id AS exercicio_key,
          MAX(
            public.evolucao_abdomen_pr_para_tlu(
              htc.peso_atual,
              NULL::bigint,
              htc.exercicio_id
            )
          ) AS peak_tlu
        FROM public.historico_treinos_comuns htc
        WHERE htc.user_id = p_user_id
          AND htc.peso_atual > 0
          AND (
            public.evolucao_resolve_grupo_calor(COALESCE(htc.membro_principal::text, '')) = 'abdomen'
            OR public.evolucao_resolve_grupo_calor(htc.exercicio_id) = 'abdomen'
          )
          AND (timezone('America/Sao_Paulo', htc.criado_em))::date >= v_window_start
          AND (timezone('America/Sao_Paulo', htc.criado_em))::date <= public.evolucao_sp_today()
        GROUP BY 1, 2
      ) sp;

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

COMMENT ON FUNCTION public.evolucao_calcular_metrica_membro(uuid, public.membro_principal_soberano) IS
  'Métrica 14d · abdômen: pico TLU/dia/exercício; demais: pico kg/dia/exercício.';

COMMENT ON FUNCTION public.evolucao_calcular_metrica_grupo(uuid, text) IS
  'Métrica 14d por grupo · abdômen alinhado ao PR diário com normalização isométrica.';
