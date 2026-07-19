-- Garante COSTAS na faixa SUPERIORES (peito + ombros + braços + costas).
-- Idempotente se 20260719120000 / 20260719121000 já incluírem COSTAS.

CREATE OR REPLACE FUNCTION public.comunidade_grupo_elegivel_duelo(
  p_tipo public.tipo_confronto_duelo,
  p_grupo public.grupo_muscular_evolucao
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT CASE
    WHEN p_tipo = 'SUPERIORES'::public.tipo_confronto_duelo THEN
      p_grupo IN (
        'PEITO'::public.grupo_muscular_evolucao,
        'OMBROS'::public.grupo_muscular_evolucao,
        'BRACOS'::public.grupo_muscular_evolucao,
        'COSTAS'::public.grupo_muscular_evolucao
      )
    WHEN p_tipo = 'INFERIORES'::public.tipo_confronto_duelo THEN
      p_grupo = 'PERNAS'::public.grupo_muscular_evolucao
    ELSE false
  END;
$$;

COMMENT ON FUNCTION public.comunidade_grupo_elegivel_duelo(public.tipo_confronto_duelo, public.grupo_muscular_evolucao) IS
  'SUPERIORES → PEITO+OMBROS+BRACOS+COSTAS · INFERIORES → PERNAS · MIDAS.';

DROP VIEW IF EXISTS public.view_rankings_vtc_faixa_superiores;

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
      'BRACOS'::public.grupo_muscular_evolucao,
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

COMMENT ON VIEW public.view_rankings_vtc_faixa_superiores IS
  'Top 10 VTC mensal · faixa Superiores (PEITO+OMBROS+BRACOS+COSTAS) · #1 vira Rei das Chamas no fecho.';

GRANT SELECT ON public.view_rankings_vtc_faixa_superiores TO authenticated, service_role;
