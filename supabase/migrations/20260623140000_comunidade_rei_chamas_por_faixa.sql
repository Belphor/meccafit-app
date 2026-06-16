-- FENYXIA · Rei das Chamas segregado por faixa (SUPERIORES + INFERIORES)
-- Espelha modelo dos cinturões de duelo · is_rei_das_chamas = OR legado para IRIS

BEGIN;

ALTER TABLE public.planos_atletas
  ADD COLUMN IF NOT EXISTS is_rei_chamas_superiores boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_rei_chamas_inferiores boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.planos_atletas.is_rei_chamas_superiores IS
  'IRIS middle · violeta — Top 1 pico mensal PEITO+OMBROS+COSTAS (mês seguinte).';

COMMENT ON COLUMN public.planos_atletas.is_rei_chamas_inferiores IS
  'IRIS middle · violeta — Top 1 pico mensal PERNAS (mês seguinte).';

UPDATE public.planos_atletas
SET is_rei_chamas_superiores = true
WHERE is_rei_das_chamas = true
  AND is_rei_chamas_superiores = false
  AND is_rei_chamas_inferiores = false;

UPDATE public.planos_atletas
SET is_rei_das_chamas = (is_rei_chamas_superiores OR is_rei_chamas_inferiores);

CREATE INDEX IF NOT EXISTS idx_planos_atletas_rei_chamas_sup
  ON public.planos_atletas (atleta_id)
  WHERE is_rei_chamas_superiores = true;

CREATE INDEX IF NOT EXISTS idx_planos_atletas_rei_chamas_inf
  ON public.planos_atletas (atleta_id)
  WHERE is_rei_chamas_inferiores = true;

CREATE OR REPLACE FUNCTION public.comunidade_sync_rei_chamas_flag()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.is_rei_das_chamas := (NEW.is_rei_chamas_superiores OR NEW.is_rei_chamas_inferiores);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_planos_atletas_sync_rei_chamas ON public.planos_atletas;
CREATE TRIGGER trg_planos_atletas_sync_rei_chamas
  BEFORE INSERT OR UPDATE OF is_rei_chamas_superiores, is_rei_chamas_inferiores
  ON public.planos_atletas
  FOR EACH ROW
  EXECUTE FUNCTION public.comunidade_sync_rei_chamas_flag();

CREATE OR REPLACE FUNCTION public.comunidade_protect_titulos_flags()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_setting('comunidade.system_mutation', true) IS DISTINCT FROM 'on' THEN
    NEW.tem_cinturao_duelo := OLD.tem_cinturao_duelo;
    NEW.tem_cinturao_superiores := OLD.tem_cinturao_superiores;
    NEW.tem_cinturao_inferiores := OLD.tem_cinturao_inferiores;
    NEW.is_rei_das_chamas := OLD.is_rei_das_chamas;
    NEW.is_rei_chamas_superiores := OLD.is_rei_chamas_superiores;
    NEW.is_rei_chamas_inferiores := OLD.is_rei_chamas_inferiores;
    NEW.is_pilar_cooperativo := OLD.is_pilar_cooperativo;
  END IF;
  RETURN NEW;
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

  WITH pico_global AS (
    SELECT
      hc.atleta_id,
      SUM(public.comunidade_pico_forca_linha(hc.carga_maxima)) AS pico_mensal_kg
    FROM public.historico_cargas hc
    WHERE hc.data_registro >= v_inicio
      AND hc.data_registro < v_fim
    GROUP BY hc.atleta_id
  ),
  pico_superiores AS (
    SELECT
      hc.atleta_id,
      SUM(public.comunidade_pico_forca_linha(hc.carga_maxima)) AS pico_mensal_kg
    FROM public.historico_cargas hc
    WHERE hc.data_registro >= v_inicio
      AND hc.data_registro < v_fim
      AND hc.grupo_muscular IN (
        'PEITO'::public.grupo_muscular_evolucao,
        'OMBROS'::public.grupo_muscular_evolucao,
        'COSTAS'::public.grupo_muscular_evolucao
      )
    GROUP BY hc.atleta_id
  ),
  pico_inferiores AS (
    SELECT
      hc.atleta_id,
      SUM(public.comunidade_pico_forca_linha(hc.carga_maxima)) AS pico_mensal_kg
    FROM public.historico_cargas hc
    WHERE hc.data_registro >= v_inicio
      AND hc.data_registro < v_fim
      AND hc.grupo_muscular = 'PERNAS'::public.grupo_muscular_evolucao
    GROUP BY hc.atleta_id
  ),
  rei_sup AS (
    SELECT atleta_id
    FROM pico_superiores
    WHERE pico_mensal_kg > 0
    ORDER BY pico_mensal_kg DESC
    LIMIT 1
  ),
  rei_inf AS (
    SELECT atleta_id
    FROM pico_inferiores
    WHERE pico_mensal_kg > 0
    ORDER BY pico_mensal_kg DESC
    LIMIT 1
  ),
  pilares AS (
    SELECT atleta_id
    FROM pico_global
    WHERE pico_mensal_kg > 0
    ORDER BY pico_mensal_kg DESC
    LIMIT 3
  )
  INSERT INTO public.planos_atletas (atleta_id)
  SELECT atleta_id FROM pico_global
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

CREATE OR REPLACE FUNCTION public.get_perfil_publico_atleta(p_atleta_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid;
  v_duelos bigint;
  v_plutus record;
BEGIN
  v_caller := auth.uid();
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('error', 'unauthorized', 'code', 401);
  END IF;

  SELECT COUNT(*)::bigint INTO v_duelos
  FROM public.duelos_supergrupos d
  WHERE d.vencedor_id = p_atleta_id
    AND d.status = 'FINALIZADO'::public.status_duelo_supergrupo;

  SELECT
    pa.tem_cinturao_duelo,
    pa.tem_cinturao_superiores,
    pa.tem_cinturao_inferiores,
    pa.is_rei_das_chamas,
    pa.is_rei_chamas_superiores,
    pa.is_rei_chamas_inferiores,
    pa.is_pilar_cooperativo
  INTO v_plutus
  FROM public.planos_atletas pa
  WHERE pa.atleta_id = p_atleta_id;

  RETURN jsonb_build_object(
    'atleta_id', p_atleta_id,
    'indice_ignicao', public.comunidade_calc_indice_ignicao(p_atleta_id),
    'duelos_vencidos', COALESCE(v_duelos, 0),
    'grupo_supremo', public.comunidade_grupo_supremo(p_atleta_id),
    'tem_cinturao_duelo', COALESCE(v_plutus.tem_cinturao_duelo, false),
    'tem_cinturao_superiores', COALESCE(v_plutus.tem_cinturao_superiores, false),
    'tem_cinturao_inferiores', COALESCE(v_plutus.tem_cinturao_inferiores, false),
    'is_rei_das_chamas', COALESCE(v_plutus.is_rei_das_chamas, false),
    'is_rei_chamas_superiores', COALESCE(v_plutus.is_rei_chamas_superiores, false),
    'is_rei_chamas_inferiores', COALESCE(v_plutus.is_rei_chamas_inferiores, false),
    'is_pilar_cooperativo', COALESCE(v_plutus.is_pilar_cooperativo, false)
  );
END;
$$;

DROP FUNCTION IF EXISTS public.argos_fetch_mural_comunidade(integer);
DROP FUNCTION IF EXISTS public.argos_fetch_forum_brasa_viva(integer);

CREATE FUNCTION public.argos_fetch_mural_comunidade(p_limit integer DEFAULT 48)
RETURNS TABLE (
  id bigint,
  exercicio_nome text,
  peso numeric,
  series integer,
  registrado_em timestamptz,
  atleta_nome text,
  nome_linhagem text,
  author_id uuid,
  tem_cinturao_duelo boolean,
  is_rei_das_chamas boolean,
  is_rei_chamas_superiores boolean,
  is_rei_chamas_inferiores boolean,
  is_pilar_cooperativo boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    h.id,
    h.exercicio_nome,
    COALESCE(h.peso, h.peso_atual) AS peso,
    GREATEST(COALESCE(h.series, 1), 1) AS series,
    COALESCE(h.registrado_em, h.updated_at, NOW()) AS registrado_em,
    COALESCE(NULLIF(BTRIM(p.full_name), ''), 'Membro da Linhagem') AS atleta_nome,
    COALESCE(NULLIF(BTRIM(p.nome_linhagem), ''), 'Linhagem Meccafit') AS nome_linhagem,
    h.cliente_id AS author_id,
    COALESCE(pa.tem_cinturao_duelo, false),
    COALESCE(pa.is_rei_das_chamas, false),
    COALESCE(pa.is_rei_chamas_superiores, false),
    COALESCE(pa.is_rei_chamas_inferiores, false),
    COALESCE(pa.is_pilar_cooperativo, false)
  FROM public.historico_treinos h
  INNER JOIN public.profiles p ON p.id = h.cliente_id
  LEFT JOIN public.planos_atletas pa ON pa.atleta_id = h.cliente_id
  WHERE h.status = 'SUPERAÇÃO'
    AND p.role IS DISTINCT FROM 'forjador_soberano'::public.user_role
    AND (SELECT auth.uid()) IS NOT NULL
  ORDER BY COALESCE(h.registrado_em, h.updated_at, NOW()) DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 48), 1), 100);
$$;

CREATE FUNCTION public.argos_fetch_forum_brasa_viva(p_limit integer DEFAULT 48)
RETURNS TABLE (
  id bigint,
  topic_title text,
  topic_body text,
  author_name text,
  author_lineage text,
  author_id uuid,
  tem_cinturao_duelo boolean,
  is_rei_das_chamas boolean,
  is_rei_chamas_superiores boolean,
  is_rei_chamas_inferiores boolean,
  is_pilar_cooperativo boolean,
  peso numeric,
  series integer,
  registrado_em timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    h.id,
    COALESCE(NULLIF(BTRIM(h.exercicio_nome), ''), 'Ascensão no altar') AS topic_title,
    'Superação registrada no Fórum Brasa-Viva — volume validado por ARGOS.' AS topic_body,
    COALESCE(NULLIF(BTRIM(p.full_name), ''), 'Membro da Linhagem') AS author_name,
    COALESCE(NULLIF(BTRIM(p.nome_linhagem), ''), 'Linhagem Meccafit') AS author_lineage,
    h.cliente_id AS author_id,
    COALESCE(pa.tem_cinturao_duelo, false),
    COALESCE(pa.is_rei_das_chamas, false),
    COALESCE(pa.is_rei_chamas_superiores, false),
    COALESCE(pa.is_rei_chamas_inferiores, false),
    COALESCE(pa.is_pilar_cooperativo, false),
    COALESCE(h.peso, h.peso_atual) AS peso,
    GREATEST(COALESCE(h.series, 1), 1) AS series,
    COALESCE(h.registrado_em, h.updated_at, NOW()) AS registrado_em
  FROM public.historico_treinos h
  INNER JOIN public.profiles p ON p.id = h.cliente_id
  LEFT JOIN public.planos_atletas pa ON pa.atleta_id = h.cliente_id
  WHERE h.status = 'SUPERAÇÃO'
    AND p.role IS DISTINCT FROM 'forjador_soberano'::public.user_role
    AND (SELECT auth.uid()) IS NOT NULL
  ORDER BY COALESCE(h.registrado_em, h.updated_at, NOW()) DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 48), 1), 100);
$$;

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
  v_grupo public.grupo_muscular_evolucao;
  v_rows jsonb;
  v_inicio timestamptz;
BEGIN
  v_caller := auth.uid();
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('error', 'unauthorized', 'code', 401);
  END IF;

  v_inicio := public.comunidade_vtc_window_start();

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

  RETURN jsonb_build_object(
    'janela_dias', 14,
    'janela_inicio', v_inicio,
    'vtc_global', v_global,
    'vtc_por_membro', v_por_membro
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_comunidade_arena_snapshot()
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid;
  v_mes date;
  v_meta record;
  v_cinturao_superiores uuid;
  v_cinturao_inferiores uuid;
  v_rei_superiores uuid;
  v_rei_inferiores uuid;
  v_pilares jsonb;
  v_duelos jsonb;
  v_rankings jsonb;
BEGIN
  v_caller := auth.uid();
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('error', 'unauthorized', 'code', 401);
  END IF;

  v_mes := public.comunidade_mes_atual_sp();
  PERFORM public.comunidade_ensure_meta_mes(v_mes);
  PERFORM public.comunidade_processar_duelos_expirados();

  SELECT m.* INTO v_meta FROM public.metas_coletivas_academia m WHERE m.mes_referencia = v_mes;

  SELECT pa.atleta_id INTO v_cinturao_superiores
  FROM public.planos_atletas pa WHERE pa.tem_cinturao_superiores = true LIMIT 1;

  SELECT pa.atleta_id INTO v_cinturao_inferiores
  FROM public.planos_atletas pa WHERE pa.tem_cinturao_inferiores = true LIMIT 1;

  SELECT pa.atleta_id INTO v_rei_superiores
  FROM public.planos_atletas pa WHERE pa.is_rei_chamas_superiores = true LIMIT 1;

  SELECT pa.atleta_id INTO v_rei_inferiores
  FROM public.planos_atletas pa WHERE pa.is_rei_chamas_inferiores = true LIMIT 1;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('atleta_id', pa.atleta_id)), '[]'::jsonb)
  INTO v_pilares FROM public.planos_atletas pa WHERE pa.is_pilar_cooperativo = true;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', d.id, 'tipo_confronto', d.tipo_confronto, 'status', d.status,
      'vtc_desafiante', d.vtc_desafiante, 'vtc_desafiado', d.vtc_desafiado,
      'atleta_desafiante_id', d.atleta_desafiante_id, 'atleta_desafiado_id', d.atleta_desafiado_id,
      'fim_em', d.fim_em, 'inicio_em', d.inicio_em
    ) ORDER BY d.inicio_em DESC
  ), '[]'::jsonb) INTO v_duelos
  FROM public.duelos_supergrupos d
  WHERE d.status = 'EM_ANDAMENTO'::public.status_duelo_supergrupo;

  v_rankings := public.get_rankings_thoth();

  RETURN jsonb_build_object(
    'mes_referencia', v_mes,
    'meta', jsonb_build_object(
      'tonelagem_alvo_kg', COALESCE(v_meta.tonelagem_alvo_kg, 100000),
      'tonelagem_atual_acumulada', COALESCE(v_meta.tonelagem_atual_acumulada, 0),
      'progresso_pct', CASE
        WHEN COALESCE(v_meta.tonelagem_alvo_kg, 0) <= 0 THEN 0
        ELSE LEAST(100, ROUND((COALESCE(v_meta.tonelagem_atual_acumulada, 0) / v_meta.tonelagem_alvo_kg) * 100.0, 2))
      END,
      'formula', 'pico_forca_sum_carga_maxima_kg'
    ),
    'campeao_cinturao_id', COALESCE(v_cinturao_superiores, v_cinturao_inferiores),
    'campeoes_cinturao', jsonb_build_object(
      'SUPERIORES', v_cinturao_superiores,
      'INFERIORES', v_cinturao_inferiores
    ),
    'reis_chamas', jsonb_build_object(
      'SUPERIORES', v_rei_superiores,
      'INFERIORES', v_rei_inferiores
    ),
    'reis_das_chamas', (
      SELECT COALESCE(jsonb_agg(row_data), '[]'::jsonb)
      FROM (
        SELECT jsonb_build_object('atleta_id', v_rei_superiores, 'faixa', 'SUPERIORES') AS row_data
        WHERE v_rei_superiores IS NOT NULL
        UNION ALL
        SELECT jsonb_build_object('atleta_id', v_rei_inferiores, 'faixa', 'INFERIORES')
        WHERE v_rei_inferiores IS NOT NULL
      ) legacy_reis
    ),
    'pilares_cooperativos', v_pilares,
    'duelos_ativos', v_duelos,
    'rankings_thoth', v_rankings,
    'rankings_por_membro', v_rankings
  );
END;
$$;

DROP FUNCTION IF EXISTS public.comunidade_apply_demo_titulos(uuid, uuid, uuid, uuid, uuid);

CREATE OR REPLACE FUNCTION public.comunidade_apply_demo_titulos(
  p_cinturao_superiores_id uuid,
  p_cinturao_inferiores_id uuid,
  p_rei_superiores_id uuid,
  p_rei_inferiores_id uuid,
  p_pilar_id uuid,
  p_todos_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('comunidade.system_mutation', 'on', true);

  UPDATE public.planos_atletas
  SET tem_cinturao_duelo = false,
      tem_cinturao_superiores = false,
      tem_cinturao_inferiores = false,
      is_rei_das_chamas = false,
      is_rei_chamas_superiores = false,
      is_rei_chamas_inferiores = false,
      is_pilar_cooperativo = false
  WHERE atleta_id IN (
    p_cinturao_superiores_id,
    p_cinturao_inferiores_id,
    p_rei_superiores_id,
    p_rei_inferiores_id,
    p_pilar_id,
    p_todos_id
  );

  INSERT INTO public.planos_atletas (atleta_id)
  SELECT unnest(ARRAY[
    p_cinturao_superiores_id,
    p_cinturao_inferiores_id,
    p_rei_superiores_id,
    p_rei_inferiores_id,
    p_pilar_id,
    p_todos_id
  ])
  ON CONFLICT (atleta_id) DO NOTHING;

  UPDATE public.planos_atletas SET tem_cinturao_superiores = true WHERE atleta_id = p_cinturao_superiores_id;
  UPDATE public.planos_atletas SET tem_cinturao_inferiores = true WHERE atleta_id = p_cinturao_inferiores_id;
  UPDATE public.planos_atletas SET is_rei_chamas_superiores = true WHERE atleta_id = p_rei_superiores_id;
  UPDATE public.planos_atletas SET is_rei_chamas_inferiores = true WHERE atleta_id = p_rei_inferiores_id;
  UPDATE public.planos_atletas SET is_pilar_cooperativo = true WHERE atleta_id = p_pilar_id;

  UPDATE public.planos_atletas
  SET tem_cinturao_superiores = true,
      tem_cinturao_inferiores = true,
      is_rei_chamas_superiores = true,
      is_rei_chamas_inferiores = true,
      is_pilar_cooperativo = true
  WHERE atleta_id = p_todos_id;

  UPDATE public.planos_atletas
  SET tem_cinturao_duelo = (tem_cinturao_superiores OR tem_cinturao_inferiores),
      is_rei_das_chamas = (is_rei_chamas_superiores OR is_rei_chamas_inferiores)
  WHERE atleta_id IN (
    p_cinturao_superiores_id,
    p_cinturao_inferiores_id,
    p_rei_superiores_id,
    p_rei_inferiores_id,
    p_pilar_id,
    p_todos_id
  );

  PERFORM set_config('comunidade.system_mutation', 'off', true);
END;
$$;

REVOKE ALL ON FUNCTION public.comunidade_apply_demo_titulos(uuid, uuid, uuid, uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.comunidade_apply_demo_titulos(uuid, uuid, uuid, uuid, uuid, uuid) TO service_role;

REVOKE ALL ON FUNCTION public.argos_fetch_mural_comunidade(integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.argos_fetch_forum_brasa_viva(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.argos_fetch_mural_comunidade(integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.argos_fetch_forum_brasa_viva(integer) TO authenticated, service_role;

COMMIT;
