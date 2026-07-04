-- Fix · comunidade_fechar_titulos_mes referenciava CTEs (rei_sup) fora do escopo do WITH
-- Fix · comunidade_grupo_supremo devolvia fase térmica (CINZAS) em vez do músculo do ranking mensal

BEGIN;

CREATE OR REPLACE FUNCTION public.comunidade_grupo_supremo(p_atleta_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ranked.grupo::text
  FROM (
    SELECT
      g.grupo,
      public.comunidade_vtc_grupo_atleta(p_atleta_id, g.grupo) AS vtc
    FROM (
      VALUES
        ('PEITO'::public.grupo_muscular_evolucao),
        ('OMBROS'::public.grupo_muscular_evolucao),
        ('COSTAS'::public.grupo_muscular_evolucao),
        ('PERNAS'::public.grupo_muscular_evolucao)
    ) AS g(grupo)
  ) ranked
  WHERE ranked.vtc > 0
  ORDER BY ranked.vtc DESC, ranked.grupo
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.comunidade_grupo_supremo(uuid) IS
  'Músculo com maior VTC mensal do atleta (janela do ranking THOTH).';

CREATE OR REPLACE FUNCTION public.comunidade_fechar_titulos_mes(p_mes date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inicio timestamptz;
  v_fim timestamptz;
  v_rei_sup uuid;
  v_rei_inf uuid;
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

  INSERT INTO public.planos_atletas (atleta_id)
  SELECT DISTINCT hc.atleta_id
  FROM public.historico_cargas hc
  WHERE hc.data_registro >= v_inicio
    AND hc.data_registro < v_fim
    AND hc.grupo_muscular IN (
      'PEITO'::public.grupo_muscular_evolucao,
      'OMBROS'::public.grupo_muscular_evolucao,
      'COSTAS'::public.grupo_muscular_evolucao,
      'PERNAS'::public.grupo_muscular_evolucao
    )
  ON CONFLICT (atleta_id) DO NOTHING;

  SELECT sub.atleta_id
  INTO v_rei_sup
  FROM (
    SELECT
      vtc_por_atleta_grupo.atleta_id,
      SUM(vtc_por_atleta_grupo.vtc_grupo) AS vtc_mensal_kg
    FROM (
      SELECT
        peaks.atleta_id,
        peaks.grupo_muscular,
        SUM(peaks.day_peak) AS vtc_grupo
      FROM (
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
            'COSTAS'::public.grupo_muscular_evolucao
          )
        GROUP BY 1, 2, 3, 4
      ) peaks
      GROUP BY 1, 2
    ) vtc_por_atleta_grupo
    GROUP BY 1
    HAVING SUM(vtc_por_atleta_grupo.vtc_grupo) > 0
    ORDER BY SUM(vtc_por_atleta_grupo.vtc_grupo) DESC, vtc_por_atleta_grupo.atleta_id
    LIMIT 1
  ) sub;

  SELECT sub.atleta_id
  INTO v_rei_inf
  FROM (
    SELECT
      vtc_por_atleta_grupo.atleta_id,
      vtc_por_atleta_grupo.vtc_grupo AS vtc_mensal_kg
    FROM (
      SELECT
        peaks.atleta_id,
        peaks.grupo_muscular,
        SUM(peaks.day_peak) AS vtc_grupo
      FROM (
        SELECT
          hc.atleta_id,
          hc.grupo_muscular,
          (hc.data_registro AT TIME ZONE 'America/Sao_Paulo')::date AS dia,
          hc.exercicio_id,
          MAX(hc.carga_maxima) AS day_peak
        FROM public.historico_cargas hc
        WHERE hc.data_registro >= v_inicio
          AND hc.data_registro < v_fim
          AND hc.grupo_muscular = 'PERNAS'::public.grupo_muscular_evolucao
        GROUP BY 1, 2, 3, 4
      ) peaks
      GROUP BY 1, 2
    ) vtc_por_atleta_grupo
    WHERE vtc_por_atleta_grupo.vtc_grupo > 0
    ORDER BY vtc_por_atleta_grupo.vtc_grupo DESC, vtc_por_atleta_grupo.atleta_id
    LIMIT 1
  ) sub;

  IF v_rei_sup IS NOT NULL THEN
    UPDATE public.planos_atletas
    SET is_rei_chamas_superiores = true,
        is_rei_das_chamas = true
    WHERE atleta_id = v_rei_sup;
  END IF;

  IF v_rei_inf IS NOT NULL THEN
    UPDATE public.planos_atletas
    SET is_rei_chamas_inferiores = true,
        is_rei_das_chamas = true
    WHERE atleta_id = v_rei_inf;
  END IF;

  UPDATE public.planos_atletas pa
  SET is_pilar_cooperativo = true
  WHERE pa.atleta_id IN (
    SELECT sub.atleta_id
    FROM (
      SELECT
        hc.atleta_id,
        SUM(public.comunidade_pico_forca_linha(hc.carga_maxima)) AS pico_mensal_kg
      FROM public.historico_cargas hc
      WHERE hc.data_registro >= v_inicio
        AND hc.data_registro < v_fim
      GROUP BY hc.atleta_id
      HAVING SUM(public.comunidade_pico_forca_linha(hc.carga_maxima)) > 0
      ORDER BY SUM(public.comunidade_pico_forca_linha(hc.carga_maxima)) DESC, hc.atleta_id
      LIMIT 3
    ) sub
  );

  PERFORM set_config('comunidade.system_mutation', 'off', true);
END;
$$;

COMMENT ON FUNCTION public.comunidade_fechar_titulos_mes(date) IS
  'Fecho mensal · Rei das Chamas por VTC MIDAS (faixa) · Pilares por pico no termómetro.';

COMMIT;
