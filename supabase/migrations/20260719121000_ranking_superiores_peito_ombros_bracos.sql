-- Align ranking Superiores + fecho Rei com PEITO+OMBROS+BRACOS+COSTAS (duelo semana).

CREATE OR REPLACE FUNCTION public.comunidade_ranking_slice_por_sexo(p_sexo public.profile_sexo)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_global jsonb;
  v_por_membro jsonb := '{}'::jsonb;
  v_faixa jsonb;
  v_grupo public.grupo_muscular_evolucao;
  v_rows jsonb;
  v_janela record;
BEGIN
  SELECT * INTO v_janela FROM public.comunidade_vtc_ranking_janela();

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
    INNER JOIN public.profiles p ON p.id = hc.atleta_id
    WHERE hc.data_registro >= j.inicio
      AND hc.data_registro < j.fim
      AND p.sexo = p_sexo
      AND p.perfil_identidade_confirmada = true
      AND hc.grupo_muscular IN (
        'PEITO'::public.grupo_muscular_evolucao,
        'OMBROS'::public.grupo_muscular_evolucao,
        'BRACOS'::public.grupo_muscular_evolucao,
        'COSTAS'::public.grupo_muscular_evolucao,
        'PERNAS'::public.grupo_muscular_evolucao
      )
    GROUP BY 1, 2, 3, 4
  ),
  agg AS (
    SELECT peaks.atleta_id, SUM(peaks.day_peak) AS vtc_total
    FROM peaks
    GROUP BY 1
    HAVING SUM(peaks.day_peak) > 0
  ),
  ranked AS (
    SELECT agg.*, ROW_NUMBER() OVER (ORDER BY agg.vtc_total DESC, agg.atleta_id) AS posicao
    FROM agg
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'posicao', r.posicao,
      'atleta_id', r.atleta_id,
      'atleta_nome', COALESCE(NULLIF(BTRIM(p.full_name), ''), 'Membro da Linhagem'),
      'vtc_total', r.vtc_total,
      'tem_cinturao_duelo', COALESCE(pa.tem_cinturao_duelo, false),
      'tem_cinturao_superiores', COALESCE(pa.tem_cinturao_superiores, false),
      'tem_cinturao_inferiores', COALESCE(pa.tem_cinturao_inferiores, false),
      'is_rei_das_chamas', COALESCE(pa.is_rei_das_chamas, false),
      'is_rei_chamas_superiores', COALESCE(pa.is_rei_chamas_superiores, false),
      'is_rei_chamas_inferiores', COALESCE(pa.is_rei_chamas_inferiores, false),
      'is_pilar_cooperativo', COALESCE(pa.is_pilar_cooperativo, false)
    ) ORDER BY r.posicao
  ), '[]'::jsonb)
  INTO v_global
  FROM ranked r
  LEFT JOIN public.profiles p ON p.id = r.atleta_id
  LEFT JOIN public.planos_atletas pa ON pa.atleta_id = r.atleta_id
  WHERE r.posicao <= 10;

  FOREACH v_grupo IN ARRAY ARRAY[
    'PEITO'::public.grupo_muscular_evolucao,
    'OMBROS'::public.grupo_muscular_evolucao,
    'BRACOS'::public.grupo_muscular_evolucao,
    'COSTAS'::public.grupo_muscular_evolucao,
    'PERNAS'::public.grupo_muscular_evolucao
  ] LOOP
    WITH janela AS (
      SELECT r.inicio, r.fim FROM public.comunidade_vtc_ranking_janela() r
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
      INNER JOIN public.profiles p ON p.id = hc.atleta_id
      WHERE hc.data_registro >= j.inicio
        AND hc.data_registro < j.fim
        AND p.sexo = p_sexo
        AND p.perfil_identidade_confirmada = true
        AND hc.grupo_muscular = v_grupo
      GROUP BY 1, 2, 3, 4
    ),
    agg AS (
      SELECT peaks.atleta_id, SUM(peaks.day_peak) AS vtc_grupo
      FROM peaks
      GROUP BY 1
      HAVING SUM(peaks.day_peak) > 0
    ),
    ranked AS (
      SELECT agg.*, ROW_NUMBER() OVER (ORDER BY agg.vtc_grupo DESC, agg.atleta_id) AS posicao
      FROM agg
    )
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'posicao', r.posicao,
        'atleta_id', r.atleta_id,
        'atleta_nome', COALESCE(NULLIF(BTRIM(p.full_name), ''), 'Membro da Linhagem'),
        'vtc_grupo', r.vtc_grupo,
        'vtc_total', r.vtc_grupo,
        'tem_cinturao_duelo', COALESCE(pa.tem_cinturao_duelo, false),
        'tem_cinturao_superiores', COALESCE(pa.tem_cinturao_superiores, false),
        'tem_cinturao_inferiores', COALESCE(pa.tem_cinturao_inferiores, false),
        'is_rei_das_chamas', COALESCE(pa.is_rei_das_chamas, false),
        'is_rei_chamas_superiores', COALESCE(pa.is_rei_chamas_superiores, false),
        'is_rei_chamas_inferiores', COALESCE(pa.is_rei_chamas_inferiores, false),
        'is_pilar_cooperativo', COALESCE(pa.is_pilar_cooperativo, false)
      ) ORDER BY r.posicao
    ), '[]'::jsonb)
    INTO v_rows
    FROM ranked r
    LEFT JOIN public.profiles p ON p.id = r.atleta_id
    LEFT JOIN public.planos_atletas pa ON pa.atleta_id = r.atleta_id
    WHERE r.posicao <= 10;

    v_por_membro := v_por_membro || jsonb_build_object(lower(v_grupo::text), v_rows);
  END LOOP;

  WITH janela AS (
    SELECT r.inicio, r.fim FROM public.comunidade_vtc_ranking_janela() r
  ),
  peaks AS (
    SELECT
      hc.atleta_id,
      (hc.data_registro AT TIME ZONE 'America/Sao_Paulo')::date AS dia,
      hc.exercicio_id,
      MAX(hc.carga_maxima) AS day_peak
    FROM public.historico_cargas hc
    CROSS JOIN janela j
    INNER JOIN public.profiles p ON p.id = hc.atleta_id
    WHERE hc.data_registro >= j.inicio
      AND hc.data_registro < j.fim
      AND p.sexo = p_sexo
      AND p.perfil_identidade_confirmada = true
      AND hc.grupo_muscular IN (
        'PEITO'::public.grupo_muscular_evolucao,
        'OMBROS'::public.grupo_muscular_evolucao,
        'BRACOS'::public.grupo_muscular_evolucao,
        'COSTAS'::public.grupo_muscular_evolucao
      )
    GROUP BY 1, 2, 3
  ),
  agg AS (
    SELECT peaks.atleta_id, SUM(peaks.day_peak) AS vtc_grupo
    FROM peaks
    GROUP BY 1
    HAVING SUM(peaks.day_peak) > 0
  ),
  ranked AS (
    SELECT agg.*, ROW_NUMBER() OVER (ORDER BY agg.vtc_grupo DESC, agg.atleta_id) AS posicao
    FROM agg
  )
  SELECT jsonb_build_object(
    'superiores', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'posicao', r.posicao,
          'atleta_id', r.atleta_id,
          'atleta_nome', COALESCE(NULLIF(BTRIM(p.full_name), ''), 'Membro da Linhagem'),
          'vtc_grupo', r.vtc_grupo,
          'vtc_total', r.vtc_grupo,
          'tem_cinturao_duelo', COALESCE(pa.tem_cinturao_duelo, false),
          'tem_cinturao_superiores', COALESCE(pa.tem_cinturao_superiores, false),
          'tem_cinturao_inferiores', COALESCE(pa.tem_cinturao_inferiores, false),
          'is_rei_das_chamas', COALESCE(pa.is_rei_das_chamas, false),
          'is_rei_chamas_superiores', COALESCE(pa.is_rei_chamas_superiores, false),
          'is_rei_chamas_inferiores', COALESCE(pa.is_rei_chamas_inferiores, false),
          'is_pilar_cooperativo', COALESCE(pa.is_pilar_cooperativo, false)
        ) ORDER BY r.posicao
      )
      FROM ranked r
      LEFT JOIN public.profiles p ON p.id = r.atleta_id
      LEFT JOIN public.planos_atletas pa ON pa.atleta_id = r.atleta_id
      WHERE r.posicao <= 10
    ), '[]'::jsonb),
    'inferiores', COALESCE(v_por_membro -> 'pernas', '[]'::jsonb)
  )
  INTO v_faixa;

  RETURN jsonb_build_object(
    'janela_tipo', 'mensal',
    'mes_referencia', v_janela.mes_referencia,
    'janela_inicio', v_janela.inicio,
    'janela_fim', v_janela.fim,
    'sexo', p_sexo::text,
    'vtc_global', v_global,
    'vtc_faixa', v_faixa,
    'vtc_por_membro', v_por_membro
  );
END;
$$;

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
    RAISE EXCEPTION 'p_mes deve ser o primeiro dia do mÃªs';
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
      is_rei_chamas_sup_masc = false,
      is_rei_chamas_sup_fem = false,
      is_rei_chamas_inf_masc = false,
      is_rei_chamas_inf_fem = false,
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
      'BRACOS'::public.grupo_muscular_evolucao,
      'COSTAS'::public.grupo_muscular_evolucao,
      'PERNAS'::public.grupo_muscular_evolucao
    )
  ON CONFLICT (atleta_id) DO NOTHING;

  UPDATE public.planos_atletas pa
  SET is_rei_chamas_sup_masc = true
  WHERE pa.atleta_id = (
    SELECT sub.atleta_id FROM (
      SELECT vtc_por_atleta_grupo.atleta_id, SUM(vtc_por_atleta_grupo.vtc_grupo) AS vtc_mensal_kg
      FROM (
        SELECT peaks.atleta_id, peaks.grupo_muscular, SUM(peaks.day_peak) AS vtc_grupo
        FROM (
          SELECT hc.atleta_id, hc.grupo_muscular,
            (hc.data_registro AT TIME ZONE 'America/Sao_Paulo')::date AS dia,
            hc.exercicio_id, MAX(hc.carga_maxima) AS day_peak
          FROM public.historico_cargas hc
          INNER JOIN public.profiles p ON p.id = hc.atleta_id
          WHERE hc.data_registro >= v_inicio AND hc.data_registro < v_fim
            AND p.sexo = 'masculino'::public.profile_sexo
            AND p.perfil_identidade_confirmada = true
            AND hc.grupo_muscular IN ('PEITO'::public.grupo_muscular_evolucao, 'OMBROS'::public.grupo_muscular_evolucao, 'BRACOS'::public.grupo_muscular_evolucao, 'COSTAS'::public.grupo_muscular_evolucao)
          GROUP BY 1, 2, 3, 4
        ) peaks GROUP BY 1, 2
      ) vtc_por_atleta_grupo GROUP BY 1
      HAVING SUM(vtc_por_atleta_grupo.vtc_grupo) > 0
      ORDER BY SUM(vtc_por_atleta_grupo.vtc_grupo) DESC, vtc_por_atleta_grupo.atleta_id LIMIT 1
    ) sub
  );

  UPDATE public.planos_atletas pa
  SET is_rei_chamas_sup_fem = true
  WHERE pa.atleta_id = (
    SELECT sub.atleta_id FROM (
      SELECT vtc_por_atleta_grupo.atleta_id, SUM(vtc_por_atleta_grupo.vtc_grupo) AS vtc_mensal_kg
      FROM (
        SELECT peaks.atleta_id, peaks.grupo_muscular, SUM(peaks.day_peak) AS vtc_grupo
        FROM (
          SELECT hc.atleta_id, hc.grupo_muscular,
            (hc.data_registro AT TIME ZONE 'America/Sao_Paulo')::date AS dia,
            hc.exercicio_id, MAX(hc.carga_maxima) AS day_peak
          FROM public.historico_cargas hc
          INNER JOIN public.profiles p ON p.id = hc.atleta_id
          WHERE hc.data_registro >= v_inicio AND hc.data_registro < v_fim
            AND p.sexo = 'feminino'::public.profile_sexo
            AND p.perfil_identidade_confirmada = true
            AND hc.grupo_muscular IN ('PEITO'::public.grupo_muscular_evolucao, 'OMBROS'::public.grupo_muscular_evolucao, 'BRACOS'::public.grupo_muscular_evolucao, 'COSTAS'::public.grupo_muscular_evolucao)
          GROUP BY 1, 2, 3, 4
        ) peaks GROUP BY 1, 2
      ) vtc_por_atleta_grupo GROUP BY 1
      HAVING SUM(vtc_por_atleta_grupo.vtc_grupo) > 0
      ORDER BY SUM(vtc_por_atleta_grupo.vtc_grupo) DESC, vtc_por_atleta_grupo.atleta_id LIMIT 1
    ) sub
  );

  UPDATE public.planos_atletas pa
  SET is_rei_chamas_inf_masc = true
  WHERE pa.atleta_id = (
    SELECT sub.atleta_id FROM (
      SELECT vtc_por_atleta_grupo.atleta_id, vtc_por_atleta_grupo.vtc_grupo AS vtc_mensal_kg
      FROM (
        SELECT peaks.atleta_id, peaks.grupo_muscular, SUM(peaks.day_peak) AS vtc_grupo
        FROM (
          SELECT hc.atleta_id, hc.grupo_muscular,
            (hc.data_registro AT TIME ZONE 'America/Sao_Paulo')::date AS dia,
            hc.exercicio_id, MAX(hc.carga_maxima) AS day_peak
          FROM public.historico_cargas hc
          INNER JOIN public.profiles p ON p.id = hc.atleta_id
          WHERE hc.data_registro >= v_inicio AND hc.data_registro < v_fim
            AND p.sexo = 'masculino'::public.profile_sexo
            AND p.perfil_identidade_confirmada = true
            AND hc.grupo_muscular = 'PERNAS'::public.grupo_muscular_evolucao
          GROUP BY 1, 2, 3, 4
        ) peaks GROUP BY 1, 2
      ) vtc_por_atleta_grupo
      WHERE vtc_por_atleta_grupo.vtc_grupo > 0
      ORDER BY vtc_por_atleta_grupo.vtc_grupo DESC, vtc_por_atleta_grupo.atleta_id LIMIT 1
    ) sub
  );

  UPDATE public.planos_atletas pa
  SET is_rei_chamas_inf_fem = true
  WHERE pa.atleta_id = (
    SELECT sub.atleta_id FROM (
      SELECT vtc_por_atleta_grupo.atleta_id, vtc_por_atleta_grupo.vtc_grupo AS vtc_mensal_kg
      FROM (
        SELECT peaks.atleta_id, peaks.grupo_muscular, SUM(peaks.day_peak) AS vtc_grupo
        FROM (
          SELECT hc.atleta_id, hc.grupo_muscular,
            (hc.data_registro AT TIME ZONE 'America/Sao_Paulo')::date AS dia,
            hc.exercicio_id, MAX(hc.carga_maxima) AS day_peak
          FROM public.historico_cargas hc
          INNER JOIN public.profiles p ON p.id = hc.atleta_id
          WHERE hc.data_registro >= v_inicio AND hc.data_registro < v_fim
            AND p.sexo = 'feminino'::public.profile_sexo
            AND p.perfil_identidade_confirmada = true
            AND hc.grupo_muscular = 'PERNAS'::public.grupo_muscular_evolucao
          GROUP BY 1, 2, 3, 4
        ) peaks GROUP BY 1, 2
      ) vtc_por_atleta_grupo
      WHERE vtc_por_atleta_grupo.vtc_grupo > 0
      ORDER BY vtc_por_atleta_grupo.vtc_grupo DESC, vtc_por_atleta_grupo.atleta_id LIMIT 1
    ) sub
  );

  UPDATE public.planos_atletas pa
  SET is_pilar_cooperativo = true
  WHERE pa.atleta_id IN (
    SELECT sub.atleta_id FROM (
      SELECT hc.atleta_id,
        SUM(public.comunidade_pico_forca_linha(hc.carga_maxima)) AS pico_mensal_kg
      FROM public.historico_cargas hc
      WHERE hc.data_registro >= v_inicio AND hc.data_registro < v_fim
      GROUP BY hc.atleta_id
      HAVING SUM(public.comunidade_pico_forca_linha(hc.carga_maxima)) > 0
      ORDER BY SUM(public.comunidade_pico_forca_linha(hc.carga_maxima)) DESC, hc.atleta_id
      LIMIT 3
    ) sub
  );

  PERFORM set_config('comunidade.system_mutation', 'off', true);
END;
$$;
