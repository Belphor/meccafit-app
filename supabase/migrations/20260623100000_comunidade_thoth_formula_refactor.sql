-- FENYXIA · Comunidade THOTH — segregação de fórmulas + 3 títulos IRIS
-- Workload (duelos): carga × reps | Peak force (meta/rankings): SUM(carga_maxima)
-- Evolução de detem_cinturao_duelo / is_pilar_fogo_cosmico → tem_cinturao_duelo / is_rei_das_chamas / is_pilar_cooperativo

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. PLUTUS — três flags independentes em planos_atletas
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'planos_atletas' AND column_name = 'detem_cinturao_duelo'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'planos_atletas' AND column_name = 'tem_cinturao_duelo'
  ) THEN
    ALTER TABLE public.planos_atletas RENAME COLUMN detem_cinturao_duelo TO tem_cinturao_duelo;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'planos_atletas' AND column_name = 'is_pilar_fogo_cosmico'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'planos_atletas' AND column_name = 'is_pilar_cooperativo'
  ) THEN
    ALTER TABLE public.planos_atletas RENAME COLUMN is_pilar_fogo_cosmico TO is_pilar_cooperativo;
  END IF;
END $$;

ALTER TABLE public.planos_atletas
  ADD COLUMN IF NOT EXISTS tem_cinturao_duelo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_rei_das_chamas boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_pilar_cooperativo boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.planos_atletas.tem_cinturao_duelo IS
  'IRIS inner · Neon Magenta — vencedor duelo supergrupos até ser derrotado.';

COMMENT ON COLUMN public.planos_atletas.is_rei_das_chamas IS
  'IRIS middle · Violeta cósmico — Top 1 pico de força mensal (mês seguinte).';

COMMENT ON COLUMN public.planos_atletas.is_pilar_cooperativo IS
  'IRIS outer · Ouro pulsante — Top 3 contributores pico ao termómetro (mês seguinte).';

DROP INDEX IF EXISTS public.idx_planos_atletas_cinturao_ativo;
DROP INDEX IF EXISTS public.idx_planos_atletas_pilar_ativo;
DROP INDEX IF EXISTS public.idx_planos_atletas_plutus_feed;

CREATE INDEX IF NOT EXISTS idx_planos_atletas_cinturao_ativo
  ON public.planos_atletas (atleta_id)
  WHERE tem_cinturao_duelo = true;

CREATE INDEX IF NOT EXISTS idx_planos_atletas_rei_chamas_ativo
  ON public.planos_atletas (atleta_id)
  WHERE is_rei_das_chamas = true;

CREATE INDEX IF NOT EXISTS idx_planos_atletas_pilar_coop_ativo
  ON public.planos_atletas (atleta_id)
  WHERE is_pilar_cooperativo = true;

CREATE INDEX IF NOT EXISTS idx_planos_atletas_titulos_feed
  ON public.planos_atletas (tem_cinturao_duelo, is_rei_das_chamas, is_pilar_cooperativo)
  WHERE tem_cinturao_duelo OR is_rei_das_chamas OR is_pilar_cooperativo;

CREATE OR REPLACE FUNCTION public.comunidade_protect_titulos_flags()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_setting('comunidade.system_mutation', true) IS DISTINCT FROM 'on' THEN
    NEW.tem_cinturao_duelo := OLD.tem_cinturao_duelo;
    NEW.is_rei_das_chamas := OLD.is_rei_das_chamas;
    NEW.is_pilar_cooperativo := OLD.is_pilar_cooperativo;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_planos_atletas_protect_plutus ON public.planos_atletas;
DROP TRIGGER IF EXISTS trg_planos_atletas_protect_titulos ON public.planos_atletas;
CREATE TRIGGER trg_planos_atletas_protect_titulos
  BEFORE UPDATE ON public.planos_atletas
  FOR EACH ROW
  EXECUTE FUNCTION public.comunidade_protect_titulos_flags();

-- ---------------------------------------------------------------------------
-- 2. Fórmulas segregadas
-- ---------------------------------------------------------------------------

-- DUEL · workload = carga_maxima_kg × repeticoes_brutas
CREATE OR REPLACE FUNCTION public.comunidade_workload_linha(
  p_carga_maxima_kg numeric,
  p_repeticoes_brutas integer
)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT GREATEST(COALESCE(p_carga_maxima_kg, 0), 0)
       * GREATEST(COALESCE(p_repeticoes_brutas, 1), 1);
$$;

-- META / RANKINGS · peak force = soma apenas carga_maxima_kg (ignora reps)
CREATE OR REPLACE FUNCTION public.comunidade_pico_forca_linha(p_carga_maxima_kg numeric)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT GREATEST(COALESCE(p_carga_maxima_kg, 0), 0);
$$;

CREATE OR REPLACE FUNCTION public.comunidade_janela_mes_sp(p_mes date)
RETURNS TABLE (inicio timestamptz, fim timestamptz)
LANGUAGE sql
STABLE
AS $$
  SELECT
    p_mes::timestamp AT TIME ZONE 'America/Sao_Paulo',
    ((p_mes + INTERVAL '1 month')::date)::timestamp AT TIME ZONE 'America/Sao_Paulo';
$$;

-- ---------------------------------------------------------------------------
-- 3. Duelo · finalização cinturão
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.comunidade_finalizar_duelo(p_duelo_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_duelo public.duelos_supergrupos;
  v_winner uuid;
  v_loser uuid;
BEGIN
  SELECT * INTO v_duelo
  FROM public.duelos_supergrupos
  WHERE id = p_duelo_id
  FOR UPDATE;

  IF NOT FOUND OR v_duelo.status <> 'EM_ANDAMENTO'::public.status_duelo_supergrupo THEN
    RETURN;
  END IF;

  IF v_duelo.vtc_desafiante > v_duelo.vtc_desafiado THEN
    v_winner := v_duelo.atleta_desafiante_id;
    v_loser := v_duelo.atleta_desafiado_id;
  ELSIF v_duelo.vtc_desafiado > v_duelo.vtc_desafiante THEN
    v_winner := v_duelo.atleta_desafiado_id;
    v_loser := v_duelo.atleta_desafiante_id;
  ELSE
    v_winner := NULL;
  END IF;

  UPDATE public.duelos_supergrupos
  SET status = 'FINALIZADO'::public.status_duelo_supergrupo,
      vencedor_id = v_winner,
      updated_at = now()
  WHERE id = p_duelo_id;

  PERFORM set_config('comunidade.system_mutation', 'on', true);

  IF v_winner IS NOT NULL THEN
    UPDATE public.planos_atletas SET tem_cinturao_duelo = false WHERE tem_cinturao_duelo = true;
    INSERT INTO public.planos_atletas (atleta_id) VALUES (v_winner) ON CONFLICT (atleta_id) DO NOTHING;
    UPDATE public.planos_atletas SET tem_cinturao_duelo = true WHERE atleta_id = v_winner;
    UPDATE public.planos_atletas SET tem_cinturao_duelo = false WHERE atleta_id = v_loser;
  END IF;

  PERFORM set_config('comunidade.system_mutation', 'off', true);
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. Fecho mensal · Rei das Chamas (Top 1 pico) + Pilares (Top 3 contributores pico)
-- ---------------------------------------------------------------------------

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
      is_pilar_cooperativo = false
  WHERE true;

  WITH pico_por_atleta AS (
    SELECT
      hc.atleta_id,
      SUM(public.comunidade_pico_forca_linha(hc.carga_maxima)) AS pico_mensal_kg
    FROM public.historico_cargas hc
    WHERE hc.data_registro >= v_inicio
      AND hc.data_registro < v_fim
    GROUP BY hc.atleta_id
  ),
  rei AS (
    SELECT atleta_id
    FROM pico_por_atleta
    ORDER BY pico_mensal_kg DESC
    LIMIT 1
  ),
  pilares AS (
    SELECT atleta_id
    FROM pico_por_atleta
    ORDER BY pico_mensal_kg DESC
    LIMIT 3
  )
  INSERT INTO public.planos_atletas (atleta_id)
  SELECT atleta_id FROM pico_por_atleta
  ON CONFLICT (atleta_id) DO NOTHING;

  UPDATE public.planos_atletas pa
  SET is_rei_das_chamas = true
  FROM rei r
  WHERE pa.atleta_id = r.atleta_id;

  UPDATE public.planos_atletas pa
  SET is_pilar_cooperativo = true
  FROM pilares p
  WHERE pa.atleta_id = p.atleta_id;

  PERFORM set_config('comunidade.system_mutation', 'off', true);
END;
$$;

-- Substitui legado
CREATE OR REPLACE FUNCTION public.comunidade_fechar_pilares_mes(p_mes date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.comunidade_fechar_titulos_mes(p_mes);
END;
$$;

CREATE OR REPLACE FUNCTION public.comunidade_ensure_meta_mes(p_mes date DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mes date := COALESCE(p_mes, public.comunidade_mes_atual_sp());
  v_id uuid;
  v_prev date;
BEGIN
  v_prev := (v_mes - INTERVAL '1 month')::date;

  INSERT INTO public.metas_coletivas_academia (mes_referencia, tonelagem_alvo_kg)
  VALUES (v_mes, 100000)
  ON CONFLICT (mes_referencia) DO NOTHING
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    SELECT id INTO v_id FROM public.metas_coletivas_academia WHERE mes_referencia = v_mes;
  END IF;

  IF EXISTS (SELECT 1 FROM public.metas_coletivas_academia WHERE mes_referencia = v_prev)
     AND NOT EXISTS (
       SELECT 1 FROM public.metas_coletivas_academia
       WHERE mes_referencia = v_prev AND fechado_em IS NOT NULL
     ) THEN
    PERFORM public.comunidade_fechar_titulos_mes(v_prev);
  END IF;

  RETURN v_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. Trigger historico_cargas · workload (duelo) + pico (termómetro)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.comunidade_on_historico_carga()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workload numeric;
  v_pico numeric;
  v_duelo record;
  v_mes date;
BEGIN
  v_workload := public.comunidade_workload_linha(NEW.carga_maxima, NEW.repeticoes_acumuladas);
  v_pico := public.comunidade_pico_forca_linha(NEW.carga_maxima);

  IF v_workload <= 0 AND v_pico <= 0 THEN
    RETURN NEW;
  END IF;

  v_mes := public.comunidade_mes_atual_sp();
  PERFORM public.comunidade_ensure_meta_mes(v_mes);

  IF v_pico > 0 THEN
    UPDATE public.metas_coletivas_academia
    SET tonelagem_atual_acumulada = tonelagem_atual_acumulada + v_pico,
        updated_at = now()
    WHERE mes_referencia = v_mes
      AND fechado_em IS NULL;
  END IF;

  PERFORM public.comunidade_processar_duelos_expirados();

  IF v_workload > 0 THEN
    FOR v_duelo IN
      SELECT d.*
      FROM public.duelos_supergrupos d
      WHERE d.status = 'EM_ANDAMENTO'::public.status_duelo_supergrupo
        AND NEW.data_registro >= d.inicio_em
        AND NEW.data_registro < d.fim_em
        AND NEW.atleta_id IN (d.atleta_desafiante_id, d.atleta_desafiado_id)
        AND public.comunidade_grupo_elegivel_duelo(d.tipo_confronto, NEW.grupo_muscular)
      FOR UPDATE
    LOOP
      IF NEW.atleta_id = v_duelo.atleta_desafiante_id THEN
        UPDATE public.duelos_supergrupos
        SET vtc_desafiante = vtc_desafiante + v_workload, updated_at = now()
        WHERE id = v_duelo.id;
      ELSE
        UPDATE public.duelos_supergrupos
        SET vtc_desafiado = vtc_desafiado + v_workload, updated_at = now()
        WHERE id = v_duelo.id;
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 6. THOTH · view rankings por membro (Top 10 · pico mensal)
-- ---------------------------------------------------------------------------

DROP VIEW IF EXISTS public.view_rankings_por_membro;

CREATE VIEW public.view_rankings_por_membro
WITH (security_invoker = false)
AS
WITH janela AS (
  SELECT public.comunidade_mes_atual_sp() AS mes_ref
),
limites AS (
  SELECT
    mes_ref,
    mes_ref::timestamp AT TIME ZONE 'America/Sao_Paulo' AS inicio,
    ((mes_ref + INTERVAL '1 month')::date)::timestamp AT TIME ZONE 'America/Sao_Paulo' AS fim
  FROM janela
),
agg AS (
  SELECT
    hc.atleta_id,
    hc.grupo_muscular,
    SUM(public.comunidade_pico_forca_linha(hc.carga_maxima)) AS pico_forca_mensal_kg
  FROM public.historico_cargas hc
  CROSS JOIN limites l
  WHERE hc.grupo_muscular IN (
    'PEITO'::public.grupo_muscular_evolucao,
    'OMBROS'::public.grupo_muscular_evolucao,
    'COSTAS'::public.grupo_muscular_evolucao,
    'PERNAS'::public.grupo_muscular_evolucao
  )
    AND hc.data_registro >= l.inicio
    AND hc.data_registro < l.fim
  GROUP BY hc.atleta_id, hc.grupo_muscular
),
ranked AS (
  SELECT
    a.*,
    ROW_NUMBER() OVER (
      PARTITION BY a.grupo_muscular
      ORDER BY a.pico_forca_mensal_kg DESC, a.atleta_id
    ) AS posicao
  FROM agg a
)
SELECT
  r.grupo_muscular,
  r.posicao,
  r.atleta_id,
  COALESCE(NULLIF(BTRIM(p.full_name), ''), 'Membro da Linhagem') AS atleta_nome,
  r.pico_forca_mensal_kg,
  l.mes_ref
FROM ranked r
CROSS JOIN limites l
LEFT JOIN public.profiles p ON p.id = r.atleta_id
WHERE r.posicao <= 10;

COMMENT ON VIEW public.view_rankings_por_membro IS
  'THOTH · Top 10 mensal por membro · fórmula pico SUM(carga_maxima_kg).';

CREATE INDEX IF NOT EXISTS idx_historico_cargas_rank_mes_grupo
  ON public.historico_cargas (grupo_muscular, data_registro DESC, atleta_id)
  WHERE grupo_muscular IN ('PEITO', 'OMBROS', 'COSTAS', 'PERNAS');

GRANT SELECT ON public.view_rankings_por_membro TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 7. RPCs atualizados
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_rankings_por_membro()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid;
  v_result jsonb := '{}'::jsonb;
  v_grupo public.grupo_muscular_evolucao;
  v_rows jsonb;
BEGIN
  v_caller := auth.uid();
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('error', 'unauthorized', 'code', 401);
  END IF;

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
        'pico_forca_mensal_kg', v.pico_forca_mensal_kg,
        'tem_cinturao_duelo', COALESCE(pa.tem_cinturao_duelo, false),
        'is_rei_das_chamas', COALESCE(pa.is_rei_das_chamas, false),
        'is_pilar_cooperativo', COALESCE(pa.is_pilar_cooperativo, false)
      )
      ORDER BY v.posicao
    ), '[]'::jsonb)
    INTO v_rows
    FROM public.view_rankings_por_membro v
    LEFT JOIN public.planos_atletas pa ON pa.atleta_id = v.atleta_id
    WHERE v.grupo_muscular = v_grupo;

    v_result := v_result || jsonb_build_object(lower(v_grupo::text), v_rows);
  END LOOP;

  SELECT jsonb_build_object(
    'mes_referencia', mes_ref,
    'rankings', v_result
  )
  INTO v_result
  FROM public.view_rankings_por_membro
  LIMIT 1;

  IF v_result IS NULL OR v_result = '{}'::jsonb THEN
    v_result := jsonb_build_object(
      'mes_referencia', public.comunidade_mes_atual_sp(),
      'rankings', jsonb_build_object('peito', '[]'::jsonb, 'ombros', '[]'::jsonb, 'costas', '[]'::jsonb, 'pernas', '[]'::jsonb)
    );
  END IF;

  RETURN v_result;
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

  SELECT pa.tem_cinturao_duelo, pa.is_rei_das_chamas, pa.is_pilar_cooperativo
  INTO v_plutus
  FROM public.planos_atletas pa
  WHERE pa.atleta_id = p_atleta_id;

  RETURN jsonb_build_object(
    'atleta_id', p_atleta_id,
    'indice_ignicao', public.comunidade_calc_indice_ignicao(p_atleta_id),
    'duelos_vencidos', COALESCE(v_duelos, 0),
    'grupo_supremo', public.comunidade_grupo_supremo(p_atleta_id),
    'tem_cinturao_duelo', COALESCE(v_plutus.tem_cinturao_duelo, false),
    'is_rei_das_chamas', COALESCE(v_plutus.is_rei_das_chamas, false),
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
  v_cinturao record;
  v_pilares jsonb;
  v_reis jsonb;
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

  SELECT pa.atleta_id, pa.tem_cinturao_duelo INTO v_cinturao
  FROM public.planos_atletas pa WHERE pa.tem_cinturao_duelo = true LIMIT 1;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('atleta_id', pa.atleta_id)), '[]'::jsonb)
  INTO v_pilares FROM public.planos_atletas pa WHERE pa.is_pilar_cooperativo = true;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('atleta_id', pa.atleta_id)), '[]'::jsonb)
  INTO v_reis FROM public.planos_atletas pa WHERE pa.is_rei_das_chamas = true;

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

  v_rankings := public.get_rankings_por_membro();

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
    'campeao_cinturao_id', v_cinturao.atleta_id,
    'reis_das_chamas', v_reis,
    'pilares_cooperativos', v_pilares,
    'duelos_ativos', v_duelos,
    'rankings_por_membro', v_rankings
  );
END;
$$;

REVOKE ALL ON FUNCTION public.argos_fetch_mural_comunidade(integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.argos_fetch_forum_brasa_viva(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.argos_fetch_mural_comunidade(integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.argos_fetch_forum_brasa_viva(integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_rankings_por_membro() TO authenticated, service_role;

-- Helper · seed/demo de títulos (service_role apenas)
CREATE OR REPLACE FUNCTION public.comunidade_apply_demo_titulos(
  p_cinturao_id uuid,
  p_pilar_id uuid,
  p_rei_id uuid,
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
      is_rei_das_chamas = false,
      is_pilar_cooperativo = false
  WHERE true;

  INSERT INTO public.planos_atletas (atleta_id)
  SELECT unnest(ARRAY[p_cinturao_id, p_pilar_id, p_rei_id, p_todos_id])
  ON CONFLICT (atleta_id) DO NOTHING;

  UPDATE public.planos_atletas SET tem_cinturao_duelo = true WHERE atleta_id = p_cinturao_id;
  UPDATE public.planos_atletas SET is_pilar_cooperativo = true WHERE atleta_id = p_pilar_id;
  UPDATE public.planos_atletas SET is_rei_das_chamas = true WHERE atleta_id = p_rei_id;

  UPDATE public.planos_atletas
  SET tem_cinturao_duelo = true,
      is_rei_das_chamas = true,
      is_pilar_cooperativo = true
  WHERE atleta_id = p_todos_id;

  PERFORM set_config('comunidade.system_mutation', 'off', true);
END;
$$;

REVOKE ALL ON FUNCTION public.comunidade_apply_demo_titulos(uuid, uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.comunidade_apply_demo_titulos(uuid, uuid, uuid, uuid) TO service_role;

COMMIT;
