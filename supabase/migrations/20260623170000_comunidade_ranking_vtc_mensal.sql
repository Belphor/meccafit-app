-- Rankings Top 10 · VTC mensal (mesma janela e fórmula do Rei das Chamas)
-- #1 Superiores (PEITO+OMBROS+COSTAS) e #1 Pernas no fecho → Rei no mês seguinte

BEGIN;

CREATE OR REPLACE FUNCTION public.comunidade_vtc_window_start()
RETURNS timestamptz
LANGUAGE sql
STABLE
AS $$
  SELECT j.inicio
  FROM public.comunidade_janela_mes_sp(public.comunidade_mes_atual_sp()) j;
$$;

COMMENT ON FUNCTION public.comunidade_vtc_window_start() IS
  'Início do mês calendário SP · janela dos rankings VTC mensais.';

CREATE OR REPLACE FUNCTION public.comunidade_vtc_ranking_janela()
RETURNS TABLE (
  mes_referencia date,
  inicio timestamptz,
  fim timestamptz
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    public.comunidade_mes_atual_sp(),
    j.inicio,
    j.fim
  FROM public.comunidade_janela_mes_sp(public.comunidade_mes_atual_sp()) j;
$$;

CREATE OR REPLACE FUNCTION public.comunidade_vtc_grupo_atleta(
  p_atleta_id uuid,
  p_grupo public.grupo_muscular_evolucao
)
RETURNS numeric
LANGUAGE sql
STABLE
AS $$
  SELECT public.comunidade_vtc_grupo_janela(
    p_atleta_id,
    p_grupo,
    j.inicio,
    j.fim
  )
  FROM public.comunidade_vtc_ranking_janela() j;
$$;

CREATE OR REPLACE FUNCTION public.comunidade_vtc_total_atleta(p_atleta_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
AS $$
  SELECT
    public.comunidade_vtc_grupo_atleta(p_atleta_id, 'PEITO'::public.grupo_muscular_evolucao)
    + public.comunidade_vtc_grupo_atleta(p_atleta_id, 'OMBROS'::public.grupo_muscular_evolucao)
    + public.comunidade_vtc_grupo_atleta(p_atleta_id, 'COSTAS'::public.grupo_muscular_evolucao)
    + public.comunidade_vtc_grupo_atleta(p_atleta_id, 'PERNAS'::public.grupo_muscular_evolucao);
$$;

DROP VIEW IF EXISTS public.view_rankings_por_membro;
DROP VIEW IF EXISTS public.view_rankings_vtc_global;
DROP VIEW IF EXISTS public.view_rankings_vtc_por_membro;
DROP VIEW IF EXISTS public.view_rankings_vtc_faixa_superiores;

CREATE VIEW public.view_rankings_vtc_global
WITH (security_invoker = false)
AS
WITH janela AS (
  SELECT r.mes_referencia, r.inicio, r.fim
  FROM public.comunidade_vtc_ranking_janela() r
),
peaks AS (
  SELECT
    hc.atleta_id,
    hc.grupo_muscular,
    (hc.data_registro AT TIME ZONE 'America/Sao_Paulo')::date AS dia,
    hc.exercicio_id,
    MAX(hc.carga_maxima) AS day_peak
  FROM public.historico_cargas hc
  CROSS JOIN janela j
  WHERE hc.data_registro >= j.inicio
    AND hc.data_registro < j.fim
    AND hc.grupo_muscular IN (
      'PEITO'::public.grupo_muscular_evolucao,
      'OMBROS'::public.grupo_muscular_evolucao,
      'COSTAS'::public.grupo_muscular_evolucao,
      'PERNAS'::public.grupo_muscular_evolucao
    )
  GROUP BY 1, 2, 3, 4
),
agg AS (
  SELECT
    peaks.atleta_id,
    SUM(peaks.day_peak) AS vtc_total
  FROM peaks
  GROUP BY 1
  HAVING SUM(peaks.day_peak) > 0
),
ranked AS (
  SELECT
    agg.*,
    ROW_NUMBER() OVER (ORDER BY agg.vtc_total DESC, agg.atleta_id) AS posicao
  FROM agg
)
SELECT
  r.posicao,
  r.atleta_id,
  COALESCE(NULLIF(BTRIM(p.full_name), ''), 'Membro da Linhagem') AS atleta_nome,
  r.vtc_total,
  j.inicio AS janela_inicio,
  j.fim AS janela_fim,
  j.mes_referencia
FROM ranked r
CROSS JOIN janela j
LEFT JOIN public.profiles p ON p.id = r.atleta_id
WHERE r.posicao <= 10;

CREATE VIEW public.view_rankings_vtc_faixa_superiores
WITH (security_invoker = false)
AS
WITH janela AS (
  SELECT r.mes_referencia, r.inicio, r.fim
  FROM public.comunidade_vtc_ranking_janela() r
),
peaks AS (
  SELECT
    hc.atleta_id,
    (hc.data_registro AT TIME ZONE 'America/Sao_Paulo')::date AS dia,
    hc.exercicio_id,
    MAX(hc.carga_maxima) AS day_peak
  FROM public.historico_cargas hc
  CROSS JOIN janela j
  WHERE hc.data_registro >= j.inicio
    AND hc.data_registro < j.fim
    AND hc.grupo_muscular IN (
      'PEITO'::public.grupo_muscular_evolucao,
      'OMBROS'::public.grupo_muscular_evolucao,
      'COSTAS'::public.grupo_muscular_evolucao
    )
  GROUP BY 1, 2, 3
),
agg AS (
  SELECT
    peaks.atleta_id,
    SUM(peaks.day_peak) AS vtc_grupo
  FROM peaks
  GROUP BY 1
  HAVING SUM(peaks.day_peak) > 0
),
ranked AS (
  SELECT
    agg.*,
    ROW_NUMBER() OVER (ORDER BY agg.vtc_grupo DESC, agg.atleta_id) AS posicao
  FROM agg
)
SELECT
  r.posicao,
  r.atleta_id,
  COALESCE(NULLIF(BTRIM(p.full_name), ''), 'Membro da Linhagem') AS atleta_nome,
  r.vtc_grupo,
  j.inicio AS janela_inicio,
  j.fim AS janela_fim,
  j.mes_referencia
FROM ranked r
CROSS JOIN janela j
LEFT JOIN public.profiles p ON p.id = r.atleta_id
WHERE r.posicao <= 10;

CREATE VIEW public.view_rankings_vtc_por_membro
WITH (security_invoker = false)
AS
WITH janela AS (
  SELECT r.mes_referencia, r.inicio, r.fim
  FROM public.comunidade_vtc_ranking_janela() r
),
peaks AS (
  SELECT
    hc.atleta_id,
    hc.grupo_muscular,
    (hc.data_registro AT TIME ZONE 'America/Sao_Paulo')::date AS dia,
    hc.exercicio_id,
    MAX(hc.carga_maxima) AS day_peak
  FROM public.historico_cargas hc
  CROSS JOIN janela j
  WHERE hc.data_registro >= j.inicio
    AND hc.data_registro < j.fim
    AND hc.grupo_muscular IN (
      'PEITO'::public.grupo_muscular_evolucao,
      'OMBROS'::public.grupo_muscular_evolucao,
      'COSTAS'::public.grupo_muscular_evolucao,
      'PERNAS'::public.grupo_muscular_evolucao
    )
  GROUP BY 1, 2, 3, 4
),
agg AS (
  SELECT
    peaks.atleta_id,
    peaks.grupo_muscular,
    SUM(peaks.day_peak) AS vtc_grupo
  FROM peaks
  GROUP BY 1, 2
  HAVING SUM(peaks.day_peak) > 0
),
ranked AS (
  SELECT
    agg.*,
    ROW_NUMBER() OVER (
      PARTITION BY agg.grupo_muscular
      ORDER BY agg.vtc_grupo DESC, agg.atleta_id
    ) AS posicao
  FROM agg
)
SELECT
  r.grupo_muscular,
  r.posicao,
  r.atleta_id,
  COALESCE(NULLIF(BTRIM(p.full_name), ''), 'Membro da Linhagem') AS atleta_nome,
  r.vtc_grupo,
  j.inicio AS janela_inicio,
  j.fim AS janela_fim,
  j.mes_referencia
FROM ranked r
CROSS JOIN janela j
LEFT JOIN public.profiles p ON p.id = r.atleta_id
WHERE r.posicao <= 10;

COMMENT ON VIEW public.view_rankings_vtc_global IS
  'Top 10 VTC total mensal · PEITO+OMBROS+COSTAS+PERNAS · MIDAS.';

COMMENT ON VIEW public.view_rankings_vtc_faixa_superiores IS
  'Top 10 VTC mensal · faixa Superiores · #1 vira Rei das Chamas no fecho.';

COMMENT ON VIEW public.view_rankings_vtc_por_membro IS
  'Top 10 VTC mensal por membro · #1 Pernas vira Rei Inferiores no fecho.';

GRANT SELECT ON public.view_rankings_vtc_global TO authenticated, service_role;
GRANT SELECT ON public.view_rankings_vtc_faixa_superiores TO authenticated, service_role;
GRANT SELECT ON public.view_rankings_vtc_por_membro TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.comunidade_vtc_ranking_janela() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_rankings_thoth()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid;
  v_global jsonb;
  v_por_membro jsonb := '{}'::jsonb;
  v_faixa jsonb;
  v_grupo public.grupo_muscular_evolucao;
  v_rows jsonb;
  v_janela record;
BEGIN
  v_caller := auth.uid();
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('error', 'unauthorized', 'code', 401);
  END IF;

  SELECT * INTO v_janela FROM public.comunidade_vtc_ranking_janela();

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'posicao', v.posicao,
      'atleta_id', v.atleta_id,
      'atleta_nome', v.atleta_nome,
      'vtc_total', v.vtc_total,
      'tem_cinturao_duelo', COALESCE(pa.tem_cinturao_duelo, false),
      'tem_cinturao_superiores', COALESCE(pa.tem_cinturao_superiores, false),
      'tem_cinturao_inferiores', COALESCE(pa.tem_cinturao_inferiores, false),
      'is_rei_das_chamas', COALESCE(pa.is_rei_das_chamas, false),
      'is_rei_chamas_superiores', COALESCE(pa.is_rei_chamas_superiores, false),
      'is_rei_chamas_inferiores', COALESCE(pa.is_rei_chamas_inferiores, false),
      'is_pilar_cooperativo', COALESCE(pa.is_pilar_cooperativo, false)
    )
    ORDER BY v.posicao
  ), '[]'::jsonb)
  INTO v_global
  FROM public.view_rankings_vtc_global v
  LEFT JOIN public.planos_atletas pa ON pa.atleta_id = v.atleta_id;

  FOREACH v_grupo IN ARRAY ARRAY[
    'PEITO'::public.grupo_muscular_evolucao,
    'OMBROS'::public.grupo_muscular_evolucao,
    'COSTAS'::public.grupo_muscular_evolucao,
    'PERNAS'::public.grupo_muscular_evolucao
  ] LOOP
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'posicao', v.posicao,
        'atleta_id', v.atleta_id,
        'atleta_nome', v.atleta_nome,
        'vtc_grupo', v.vtc_grupo,
        'tem_cinturao_duelo', COALESCE(pa.tem_cinturao_duelo, false),
        'tem_cinturao_superiores', COALESCE(pa.tem_cinturao_superiores, false),
        'tem_cinturao_inferiores', COALESCE(pa.tem_cinturao_inferiores, false),
        'is_rei_das_chamas', COALESCE(pa.is_rei_das_chamas, false),
        'is_rei_chamas_superiores', COALESCE(pa.is_rei_chamas_superiores, false),
        'is_rei_chamas_inferiores', COALESCE(pa.is_rei_chamas_inferiores, false),
        'is_pilar_cooperativo', COALESCE(pa.is_pilar_cooperativo, false)
      )
      ORDER BY v.posicao
    ), '[]'::jsonb)
    INTO v_rows
    FROM public.view_rankings_vtc_por_membro v
    LEFT JOIN public.planos_atletas pa ON pa.atleta_id = v.atleta_id
    WHERE v.grupo_muscular = v_grupo;

    v_por_membro := v_por_membro || jsonb_build_object(lower(v_grupo::text), v_rows);
  END LOOP;

  SELECT jsonb_build_object(
    'superiores', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'posicao', v.posicao,
          'atleta_id', v.atleta_id,
          'atleta_nome', v.atleta_nome,
          'vtc_grupo', v.vtc_grupo,
          'tem_cinturao_duelo', COALESCE(pa.tem_cinturao_duelo, false),
          'tem_cinturao_superiores', COALESCE(pa.tem_cinturao_superiores, false),
          'tem_cinturao_inferiores', COALESCE(pa.tem_cinturao_inferiores, false),
          'is_rei_das_chamas', COALESCE(pa.is_rei_das_chamas, false),
          'is_rei_chamas_superiores', COALESCE(pa.is_rei_chamas_superiores, false),
          'is_rei_chamas_inferiores', COALESCE(pa.is_rei_chamas_inferiores, false),
          'is_pilar_cooperativo', COALESCE(pa.is_pilar_cooperativo, false)
        )
        ORDER BY v.posicao
      )
      FROM public.view_rankings_vtc_faixa_superiores v
      LEFT JOIN public.planos_atletas pa ON pa.atleta_id = v.atleta_id
    ), '[]'::jsonb),
    'inferiores', COALESCE(v_por_membro -> 'pernas', '[]'::jsonb)
  )
  INTO v_faixa;

  RETURN jsonb_build_object(
    'janela_tipo', 'mensal',
    'mes_referencia', v_janela.mes_referencia,
    'janela_inicio', v_janela.inicio,
    'janela_fim', v_janela.fim,
    'vtc_global', v_global,
    'vtc_faixa', v_faixa,
    'vtc_por_membro', v_por_membro
  );
END;
$$;

COMMENT ON FUNCTION public.get_rankings_thoth() IS
  'Top 10 VTC mensal · faixas Superiores/Pernas definem Rei no fecho do mês.';

COMMIT;
