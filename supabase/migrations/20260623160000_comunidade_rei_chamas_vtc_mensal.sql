-- Rei das Chamas · fecho mensal por VTC MIDAS (não pico bruto · não janela 14d)
-- Superiores: Top 1 VTC mensal PEITO+OMBROS+COSTAS
-- Inferiores: Top 1 VTC mensal PERNAS
-- Título válido o mês inteiro após fecho no início do mês seguinte

BEGIN;

COMMENT ON COLUMN public.planos_atletas.is_rei_chamas_superiores IS
  'IRIS middle · violeta — Top 1 VTC mensal PEITO+OMBROS+COSTAS (mês corrente após fecho).';

COMMENT ON COLUMN public.planos_atletas.is_rei_chamas_inferiores IS
  'IRIS middle · violeta — Top 1 VTC mensal PERNAS (mês corrente após fecho).';

CREATE OR REPLACE FUNCTION public.comunidade_vtc_grupo_janela(
  p_atleta_id uuid,
  p_grupo public.grupo_muscular_evolucao,
  p_inicio timestamptz,
  p_fim timestamptz
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
      AND hc.data_registro >= p_inicio
      AND hc.data_registro < p_fim
    GROUP BY 1, 2
  ) peaks;
$$;

COMMENT ON FUNCTION public.comunidade_vtc_grupo_janela(uuid, public.grupo_muscular_evolucao, timestamptz, timestamptz) IS
  'VTC MIDAS por grupo numa janela [inicio, fim) · pico/dia/exercício depois soma.';

CREATE OR REPLACE FUNCTION public.comunidade_fechar_titulos_mes(p_mes date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inicio timestamptz;
  v_fim timestamptz;
BEGIN
  IF p_mes IS NULL OR p_mes <> date_trunc('month', p_mes)::date THEN
    RAISE EXCEPTION 'p_mes deve ser o primeiro dia do mês';
  END IF;

  SELECT j.inicio, j.fim INTO v_inicio, v_fim
  FROM public.comunidade_janela_mes_sp(p_mes) j;

  UPDATE public.metas_coletivas_academia
  SET fechado_em = now(), updated_at = now()
  WHERE mes_referencia = p_mes AND fechado_em IS NULL;

  PERFORM set_config('comunidade.system_mutation', 'on', true);

  UPDATE public.planos_atletas
  SET is_rei_das_chamas = false,
      is_rei_chamas_superiores = false,
      is_rei_chamas_inferiores = false,
      is_pilar_cooperativo = false
  WHERE true;

  WITH peaks AS (
    SELECT
      hc.atleta_id,
      hc.grupo_muscular,
      (hc.data_registro AT TIME ZONE 'America/Sao_Paulo')::date AS dia,
      hc.exercicio_id,
      MAX(hc.carga_maxima) AS day_peak
    FROM public.historico_cargas hc
    WHERE hc.data_registro >= v_inicio
      AND hc.data_registro < v_fim
      AND hc.grupo_muscular IN (
        'PEITO'::public.grupo_muscular_evolucao,
        'OMBROS'::public.grupo_muscular_evolucao,
        'COSTAS'::public.grupo_muscular_evolucao,
        'PERNAS'::public.grupo_muscular_evolucao
      )
    GROUP BY 1, 2, 3, 4
  ),
  vtc_por_atleta_grupo AS (
    SELECT
      peaks.atleta_id,
      peaks.grupo_muscular,
      SUM(peaks.day_peak) AS vtc_grupo
    FROM peaks
    GROUP BY 1, 2
  ),
  vtc_global AS (
    SELECT
      vtc_por_atleta_grupo.atleta_id,
      SUM(vtc_por_atleta_grupo.vtc_grupo) AS vtc_mensal_kg
    FROM vtc_por_atleta_grupo
    GROUP BY 1
  ),
  vtc_superiores AS (
    SELECT
      vtc_por_atleta_grupo.atleta_id,
      SUM(vtc_por_atleta_grupo.vtc_grupo) AS vtc_mensal_kg
    FROM vtc_por_atleta_grupo
    WHERE vtc_por_atleta_grupo.grupo_muscular IN (
      'PEITO'::public.grupo_muscular_evolucao,
      'OMBROS'::public.grupo_muscular_evolucao,
      'COSTAS'::public.grupo_muscular_evolucao
    )
    GROUP BY 1
  ),
  vtc_inferiores AS (
    SELECT
      vtc_por_atleta_grupo.atleta_id,
      vtc_por_atleta_grupo.vtc_grupo AS vtc_mensal_kg
    FROM vtc_por_atleta_grupo
    WHERE vtc_por_atleta_grupo.grupo_muscular = 'PERNAS'::public.grupo_muscular_evolucao
  ),
  pico_global AS (
    SELECT
      hc.atleta_id,
      SUM(public.comunidade_pico_forca_linha(hc.carga_maxima)) AS pico_mensal_kg
    FROM public.historico_cargas hc
    WHERE hc.data_registro >= v_inicio
      AND hc.data_registro < v_fim
    GROUP BY hc.atleta_id
  ),
  rei_sup AS (
    SELECT atleta_id
    FROM vtc_superiores
    WHERE vtc_mensal_kg > 0
    ORDER BY vtc_mensal_kg DESC, atleta_id
    LIMIT 1
  ),
  rei_inf AS (
    SELECT atleta_id
    FROM vtc_inferiores
    WHERE vtc_mensal_kg > 0
    ORDER BY vtc_mensal_kg DESC, atleta_id
    LIMIT 1
  ),
  pilares AS (
    SELECT atleta_id
    FROM pico_global
    WHERE pico_mensal_kg > 0
    ORDER BY pico_mensal_kg DESC, atleta_id
    LIMIT 3
  )
  INSERT INTO public.planos_atletas (atleta_id)
  SELECT atleta_id FROM vtc_global
  ON CONFLICT (atleta_id) DO NOTHING;

  UPDATE public.planos_atletas pa
  SET is_rei_chamas_superiores = true,
      is_rei_das_chamas = true
  FROM rei_sup r
  WHERE pa.atleta_id = r.atleta_id;

  UPDATE public.planos_atletas pa
  SET is_rei_chamas_inferiores = true,
      is_rei_das_chamas = true
  FROM rei_inf r
  WHERE pa.atleta_id = r.atleta_id;

  UPDATE public.planos_atletas pa
  SET is_pilar_cooperativo = true
  FROM pilares p
  WHERE pa.atleta_id = p.atleta_id;

  PERFORM set_config('comunidade.system_mutation', 'off', true);
END;
$$;

COMMENT ON FUNCTION public.comunidade_fechar_titulos_mes(date) IS
  'Fecho mensal · Rei das Chamas por VTC MIDAS (faixa) · Pilares por pico no termómetro.';

GRANT EXECUTE ON FUNCTION public.comunidade_vtc_grupo_janela(uuid, public.grupo_muscular_evolucao, timestamptz, timestamptz)
  TO authenticated, service_role;

COMMIT;
