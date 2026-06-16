-- FENYXIA · Comunidade — cinturão por tipo (SUPERIORES + INFERIORES simultâneos)
-- THOTH · rankings VTC 14d: Top 10 global + Top 10 por membro (PEITO/OMBROS/COSTAS/PERNAS)

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Cinturão segregado por tipo de confronto
-- ---------------------------------------------------------------------------

ALTER TABLE public.planos_atletas
  ADD COLUMN IF NOT EXISTS tem_cinturao_superiores boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tem_cinturao_inferiores boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.planos_atletas.tem_cinturao_superiores IS
  'IRIS · Cinturão duelo SUPERIORES (peito/ombros/costas) — até perder nessa faixa.';

COMMENT ON COLUMN public.planos_atletas.tem_cinturao_inferiores IS
  'IRIS · Cinturão duelo INFERIORES (pernas) — até perder nessa faixa.';

-- Migra titular legado único → superiores (inferiores permanece livre)
UPDATE public.planos_atletas
SET tem_cinturao_superiores = true
WHERE tem_cinturao_duelo = true
  AND tem_cinturao_superiores = false
  AND tem_cinturao_inferiores = false;

UPDATE public.planos_atletas
SET tem_cinturao_duelo = (tem_cinturao_superiores OR tem_cinturao_inferiores);

CREATE INDEX IF NOT EXISTS idx_planos_atletas_cinturao_superiores
  ON public.planos_atletas (atleta_id)
  WHERE tem_cinturao_superiores = true;

CREATE INDEX IF NOT EXISTS idx_planos_atletas_cinturao_inferiores
  ON public.planos_atletas (atleta_id)
  WHERE tem_cinturao_inferiores = true;

CREATE OR REPLACE FUNCTION public.comunidade_sync_cinturao_duelo_flag()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.tem_cinturao_duelo := (NEW.tem_cinturao_superiores OR NEW.tem_cinturao_inferiores);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_planos_atletas_sync_cinturao ON public.planos_atletas;
CREATE TRIGGER trg_planos_atletas_sync_cinturao
  BEFORE INSERT OR UPDATE OF tem_cinturao_superiores, tem_cinturao_inferiores
  ON public.planos_atletas
  FOR EACH ROW
  EXECUTE FUNCTION public.comunidade_sync_cinturao_duelo_flag();

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
    NEW.is_pilar_cooperativo := OLD.is_pilar_cooperativo;
  END IF;
  RETURN NEW;
END;
$$;

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
    INSERT INTO public.planos_atletas (atleta_id)
    SELECT unnest(ARRAY[v_winner, v_loser])
    ON CONFLICT (atleta_id) DO NOTHING;

    IF v_duelo.tipo_confronto = 'SUPERIORES'::public.tipo_confronto_duelo THEN
      UPDATE public.planos_atletas
      SET tem_cinturao_superiores = false
      WHERE tem_cinturao_superiores = true;

      UPDATE public.planos_atletas
      SET tem_cinturao_superiores = true
      WHERE atleta_id = v_winner;

      UPDATE public.planos_atletas
      SET tem_cinturao_superiores = false
      WHERE atleta_id = v_loser;
    ELSE
      UPDATE public.planos_atletas
      SET tem_cinturao_inferiores = false
      WHERE tem_cinturao_inferiores = true;

      UPDATE public.planos_atletas
      SET tem_cinturao_inferiores = true
      WHERE atleta_id = v_winner;

      UPDATE public.planos_atletas
      SET tem_cinturao_inferiores = false
      WHERE atleta_id = v_loser;
    END IF;

    UPDATE public.planos_atletas
    SET tem_cinturao_duelo = (tem_cinturao_superiores OR tem_cinturao_inferiores)
    WHERE atleta_id IN (v_winner, v_loser);
  END IF;

  PERFORM set_config('comunidade.system_mutation', 'off', true);
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. THOTH · janela VTC (14d · alinhado MIDAS)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.comunidade_vtc_window_start()
RETURNS timestamptz
LANGUAGE sql
STABLE
AS $$
  SELECT (now() AT TIME ZONE 'America/Sao_Paulo' - INTERVAL '14 days') AT TIME ZONE 'America/Sao_Paulo';
$$;

CREATE OR REPLACE FUNCTION public.comunidade_vtc_grupo_atleta(
  p_atleta_id uuid,
  p_grupo public.grupo_muscular_evolucao
)
RETURNS numeric
LANGUAGE sql
STABLE
AS $$
  SELECT public.midas_calc_vtc_grupo(
    p_atleta_id,
    p_grupo,
    public.comunidade_vtc_window_start()
  );
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

-- ---------------------------------------------------------------------------
-- 3. Views THOTH · Top 10 VTC global + por membro
-- ---------------------------------------------------------------------------

DROP VIEW IF EXISTS public.view_rankings_por_membro;
DROP VIEW IF EXISTS public.view_rankings_vtc_global;
DROP VIEW IF EXISTS public.view_rankings_vtc_por_membro;

CREATE VIEW public.view_rankings_vtc_global
WITH (security_invoker = false)
AS
WITH janela AS (
  SELECT public.comunidade_vtc_window_start() AS inicio
),
atletas AS (
  SELECT DISTINCT hc.atleta_id
  FROM public.historico_cargas hc
  CROSS JOIN janela j
  WHERE hc.data_registro >= j.inicio
    AND hc.grupo_muscular IN (
      'PEITO'::public.grupo_muscular_evolucao,
      'OMBROS'::public.grupo_muscular_evolucao,
      'COSTAS'::public.grupo_muscular_evolucao,
      'PERNAS'::public.grupo_muscular_evolucao
    )
),
agg AS (
  SELECT
    a.atleta_id,
    public.comunidade_vtc_total_atleta(a.atleta_id) AS vtc_total
  FROM atletas a
  WHERE public.comunidade_vtc_total_atleta(a.atleta_id) > 0
),
ranked AS (
  SELECT
    a.*,
    ROW_NUMBER() OVER (ORDER BY a.vtc_total DESC, a.atleta_id) AS posicao
  FROM agg a
)
SELECT
  r.posicao,
  r.atleta_id,
  COALESCE(NULLIF(BTRIM(p.full_name), ''), 'Membro da Linhagem') AS atleta_nome,
  r.vtc_total,
  j.inicio AS janela_inicio
FROM ranked r
CROSS JOIN janela j
LEFT JOIN public.profiles p ON p.id = r.atleta_id
WHERE r.posicao <= 10;

CREATE VIEW public.view_rankings_vtc_por_membro
WITH (security_invoker = false)
AS
WITH janela AS (
  SELECT public.comunidade_vtc_window_start() AS inicio
),
grupos AS (
  SELECT unnest(ARRAY[
    'PEITO'::public.grupo_muscular_evolucao,
    'OMBROS'::public.grupo_muscular_evolucao,
    'COSTAS'::public.grupo_muscular_evolucao,
    'PERNAS'::public.grupo_muscular_evolucao
  ]) AS grupo_muscular
),
atletas AS (
  SELECT DISTINCT hc.atleta_id, hc.grupo_muscular
  FROM public.historico_cargas hc
  CROSS JOIN janela j
  WHERE hc.data_registro >= j.inicio
    AND hc.grupo_muscular IN (
      'PEITO'::public.grupo_muscular_evolucao,
      'OMBROS'::public.grupo_muscular_evolucao,
      'COSTAS'::public.grupo_muscular_evolucao,
      'PERNAS'::public.grupo_muscular_evolucao
    )
),
agg AS (
  SELECT
    a.atleta_id,
    a.grupo_muscular,
    public.comunidade_vtc_grupo_atleta(a.atleta_id, a.grupo_muscular) AS vtc_grupo
  FROM atletas a
  WHERE public.comunidade_vtc_grupo_atleta(a.atleta_id, a.grupo_muscular) > 0
),
ranked AS (
  SELECT
    a.*,
    ROW_NUMBER() OVER (
      PARTITION BY a.grupo_muscular
      ORDER BY a.vtc_grupo DESC, a.atleta_id
    ) AS posicao
  FROM agg a
)
SELECT
  r.grupo_muscular,
  r.posicao,
  r.atleta_id,
  COALESCE(NULLIF(BTRIM(p.full_name), ''), 'Membro da Linhagem') AS atleta_nome,
  r.vtc_grupo,
  j.inicio AS janela_inicio
FROM ranked r
CROSS JOIN janela j
LEFT JOIN public.profiles p ON p.id = r.atleta_id
WHERE r.posicao <= 10;

COMMENT ON VIEW public.view_rankings_vtc_global IS
  'THOTH · Top 10 VTC total (14d) · soma PEITO+OMBROS+COSTAS+PERNAS via midas_calc_vtc_grupo.';

COMMENT ON VIEW public.view_rankings_vtc_por_membro IS
  'THOTH · Top 10 VTC por membro (14d) · midas_calc_vtc_grupo por grupo.';

GRANT SELECT ON public.view_rankings_vtc_global TO authenticated, service_role;
GRANT SELECT ON public.view_rankings_vtc_por_membro TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4. RPC THOTH
-- ---------------------------------------------------------------------------

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

CREATE OR REPLACE FUNCTION public.get_rankings_por_membro()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_rankings_thoth();
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

  SELECT pa.atleta_id INTO v_cinturao_superiores
  FROM public.planos_atletas pa
  WHERE pa.tem_cinturao_superiores = true
  LIMIT 1;

  SELECT pa.atleta_id INTO v_cinturao_inferiores
  FROM public.planos_atletas pa
  WHERE pa.tem_cinturao_inferiores = true
  LIMIT 1;

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
    'reis_das_chamas', v_reis,
    'pilares_cooperativos', v_pilares,
    'duelos_ativos', v_duelos,
    'rankings_thoth', v_rankings,
    'rankings_por_membro', v_rankings
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.comunidade_apply_demo_titulos(
  p_cinturao_superiores_id uuid,
  p_cinturao_inferiores_id uuid,
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
      tem_cinturao_superiores = false,
      tem_cinturao_inferiores = false,
      is_rei_das_chamas = false,
      is_pilar_cooperativo = false
  WHERE atleta_id IN (
    p_cinturao_superiores_id,
    p_cinturao_inferiores_id,
    p_pilar_id,
    p_rei_id,
    p_todos_id
  );

  INSERT INTO public.planos_atletas (atleta_id)
  SELECT unnest(ARRAY[
    p_cinturao_superiores_id,
    p_cinturao_inferiores_id,
    p_pilar_id,
    p_rei_id,
    p_todos_id
  ])
  ON CONFLICT (atleta_id) DO NOTHING;

  UPDATE public.planos_atletas SET tem_cinturao_superiores = true WHERE atleta_id = p_cinturao_superiores_id;
  UPDATE public.planos_atletas SET tem_cinturao_inferiores = true WHERE atleta_id = p_cinturao_inferiores_id;
  UPDATE public.planos_atletas SET is_pilar_cooperativo = true WHERE atleta_id = p_pilar_id;
  UPDATE public.planos_atletas SET is_rei_das_chamas = true WHERE atleta_id = p_rei_id;

  UPDATE public.planos_atletas
  SET tem_cinturao_superiores = true,
      tem_cinturao_inferiores = true,
      is_rei_das_chamas = true,
      is_pilar_cooperativo = true
  WHERE atleta_id = p_todos_id;

  UPDATE public.planos_atletas
  SET tem_cinturao_duelo = (tem_cinturao_superiores OR tem_cinturao_inferiores)
  WHERE atleta_id IN (
    p_cinturao_superiores_id,
    p_cinturao_inferiores_id,
    p_pilar_id,
    p_rei_id,
    p_todos_id
  );

  PERFORM set_config('comunidade.system_mutation', 'off', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_rankings_thoth() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.comunidade_vtc_window_start() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.comunidade_vtc_grupo_atleta(uuid, public.grupo_muscular_evolucao) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.comunidade_vtc_total_atleta(uuid) TO authenticated, service_role;

DROP FUNCTION IF EXISTS public.comunidade_apply_demo_titulos(uuid, uuid, uuid, uuid);

REVOKE ALL ON FUNCTION public.comunidade_apply_demo_titulos(uuid, uuid, uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.comunidade_apply_demo_titulos(uuid, uuid, uuid, uuid, uuid) TO service_role;

COMMIT;
