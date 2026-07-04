-- Comunidade · thumbnails no Storage + limites mural 10/dia · duelos 10/página

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS comunidade_avatar_path text;

COMMENT ON COLUMN public.profiles.comunidade_avatar_path IS
  'Path no bucket comunidade-avatars (thumbnail WebP ~64px) para mural, duelos e rankings.';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'comunidade-avatars',
  'comunidade-avatars',
  true,
  32768,
  ARRAY['image/webp', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS comunidade_avatars_public_read ON storage.objects;
CREATE POLICY comunidade_avatars_public_read
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'comunidade-avatars');

DROP POLICY IF EXISTS comunidade_avatars_owner_insert ON storage.objects;
CREATE POLICY comunidade_avatars_owner_insert
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'comunidade-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS comunidade_avatars_owner_update ON storage.objects;
CREATE POLICY comunidade_avatars_owner_update
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'comunidade-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'comunidade-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS comunidade_avatars_owner_delete ON storage.objects;
CREATE POLICY comunidade_avatars_owner_delete
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'comunidade-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE OR REPLACE FUNCTION public.argos_set_comunidade_avatar_path(p_path text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_trimmed text;
  v_prefix text;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('error', 'unauthorized', 'code', 401);
  END IF;

  v_trimmed := NULLIF(BTRIM(COALESCE(p_path, '')), '');
  IF v_trimmed IS NULL THEN
    UPDATE public.profiles
    SET comunidade_avatar_path = NULL, updated_at = NOW()
    WHERE id = v_uid;
    RETURN jsonb_build_object('ok', true, 'path', NULL);
  END IF;

  v_prefix := v_uid::text || '/';
  IF LEFT(v_trimmed, LENGTH(v_prefix)) <> v_prefix THEN
    RETURN jsonb_build_object(
      'error', 'invalid_path',
      'code', 400,
      'message', 'O path do avatar deve pertencer ao atleta autenticado.'
    );
  END IF;

  UPDATE public.profiles
  SET comunidade_avatar_path = v_trimmed, updated_at = NOW()
  WHERE id = v_uid;

  RETURN jsonb_build_object('ok', true, 'path', v_trimmed);
END;
$$;

REVOKE ALL ON FUNCTION public.argos_set_comunidade_avatar_path(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.argos_set_comunidade_avatar_path(text) TO authenticated;

DROP FUNCTION IF EXISTS public.argos_fetch_mural_comunidade(integer);
DROP FUNCTION IF EXISTS public.argos_fetch_forum_brasa_viva(integer);

CREATE FUNCTION public.argos_fetch_mural_comunidade(p_limit integer DEFAULT 10)
RETURNS TABLE (
  id bigint,
  exercicio_nome text,
  exercicio_id bigint,
  peso numeric,
  series integer,
  registrado_em timestamptz,
  atleta_nome text,
  nome_linhagem text,
  author_id uuid,
  author_avatar_path text,
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
    h.exercicio_id,
    COALESCE(h.peso, h.peso_atual) AS peso,
    GREATEST(COALESCE(h.series, 1), 1) AS series,
    COALESCE(h.registrado_em, h.updated_at, NOW()) AS registrado_em,
    COALESCE(NULLIF(BTRIM(p.full_name), ''), 'Membro da Linhagem') AS atleta_nome,
    COALESCE(NULLIF(BTRIM(p.nome_linhagem), ''), 'Linhagem Meccafit') AS nome_linhagem,
    h.cliente_id AS author_id,
    p.comunidade_avatar_path AS author_avatar_path,
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
    AND (timezone('America/Sao_Paulo', COALESCE(h.registrado_em, h.updated_at, NOW())))::date
      = (timezone('America/Sao_Paulo', now()))::date
  ORDER BY COALESCE(h.registrado_em, h.updated_at, NOW()) DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 10), 1), 10);
$$;

CREATE FUNCTION public.argos_fetch_forum_brasa_viva(p_limit integer DEFAULT 10)
RETURNS TABLE (
  id bigint,
  topic_title text,
  topic_body text,
  author_name text,
  author_lineage text,
  author_id uuid,
  author_avatar_path text,
  tem_cinturao_duelo boolean,
  is_rei_das_chamas boolean,
  is_rei_chamas_superiores boolean,
  is_rei_chamas_inferiores boolean,
  is_pilar_cooperativo boolean,
  exercicio_id bigint,
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
    m.id,
    COALESCE(NULLIF(BTRIM(m.exercicio_nome), ''), 'Ascensão no altar') AS topic_title,
    'Superação registrada no Fórum Brasa-Viva — volume validado por ARGOS.' AS topic_body,
    m.atleta_nome AS author_name,
    m.nome_linhagem AS author_lineage,
    m.author_id,
    m.author_avatar_path,
    m.tem_cinturao_duelo,
    m.is_rei_das_chamas,
    m.is_rei_chamas_superiores,
    m.is_rei_chamas_inferiores,
    m.is_pilar_cooperativo,
    m.exercicio_id,
    m.peso,
    m.series,
    m.registrado_em
  FROM public.argos_fetch_mural_comunidade(
    LEAST(GREATEST(COALESCE(p_limit, 10), 1), 10)
  ) AS m;
$$;

DROP FUNCTION IF EXISTS public.list_clientes_duelo(text, integer, integer);

CREATE OR REPLACE FUNCTION public.list_clientes_duelo(
  p_search text DEFAULT NULL,
  p_offset integer DEFAULT 0,
  p_limit integer DEFAULT 10
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid;
  v_rows jsonb;
  v_total integer;
  v_search text;
  v_offset integer;
  v_limit integer;
BEGIN
  v_caller := auth.uid();
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('error', 'unauthorized', 'code', 401);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = v_caller AND p.role = 'cliente'::public.user_role
  ) THEN
    RETURN jsonb_build_object('error', 'forbidden', 'code', 403, 'message', 'Apenas clientes podem desafiar.');
  END IF;

  v_search := NULLIF(BTRIM(COALESCE(p_search, '')), '');
  v_offset := GREATEST(COALESCE(p_offset, 0), 0);
  v_limit := LEAST(GREATEST(COALESCE(p_limit, 10), 1), 10);

  SELECT COUNT(*)::integer
  INTO v_total
  FROM public.profiles p
  WHERE p.role = 'cliente'::public.user_role
    AND p.id <> v_caller
    AND (
      v_search IS NULL
      OR COALESCE(NULLIF(BTRIM(p.full_name), ''), NULLIF(BTRIM(p.nome_linhagem), ''), 'Membro da Linhagem')
        ILIKE '%' || v_search || '%'
    );

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', s.id,
        'nome', s.nome,
        'is_vip', s.is_vip,
        'avatar_path', s.avatar_path
      )
    ),
    '[]'::jsonb
  )
  INTO v_rows
  FROM (
    SELECT
      p.id,
      COALESCE(
        NULLIF(BTRIM(p.full_name), ''),
        NULLIF(BTRIM(p.nome_linhagem), ''),
        'Membro da Linhagem'
      ) AS nome,
      EXISTS (
        SELECT 1
        FROM public.forger_client_bonds b
        WHERE b.client_id = p.id
      ) AS is_vip,
      p.comunidade_avatar_path AS avatar_path
    FROM public.profiles p
    WHERE p.role = 'cliente'::public.user_role
      AND p.id <> v_caller
      AND (
        v_search IS NULL
        OR COALESCE(NULLIF(BTRIM(p.full_name), ''), NULLIF(BTRIM(p.nome_linhagem), ''), 'Membro da Linhagem')
          ILIKE '%' || v_search || '%'
      )
    ORDER BY nome, p.id
    OFFSET v_offset
    LIMIT v_limit
  ) s;

  RETURN jsonb_build_object(
    'clientes', v_rows,
    'total', v_total,
    'offset', v_offset,
    'limit', v_limit
  );
END;
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
      'atleta_avatar_path', pr.comunidade_avatar_path,
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
  LEFT JOIN public.planos_atletas pa ON pa.atleta_id = v.atleta_id
  LEFT JOIN public.profiles pr ON pr.id = v.atleta_id;

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
        'atleta_avatar_path', pr.comunidade_avatar_path,
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
    LEFT JOIN public.profiles pr ON pr.id = v.atleta_id
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
          'atleta_avatar_path', pr.comunidade_avatar_path,
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
      LEFT JOIN public.profiles pr ON pr.id = v.atleta_id
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

CREATE OR REPLACE FUNCTION public.fetch_dashboard_bundle(
  p_musculo public.subgrupo_muscular DEFAULT 'peito',
  p_mural_limit integer DEFAULT 10
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_phase jsonb;
  v_profile jsonb;
  v_vtc_month numeric;
  v_vtc_30d numeric;
  v_session_vtc numeric;
  v_inactivity jsonb;
  v_thermal_settle jsonb;
  v_phase_tier smallint;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN NULL;
  END IF;

  v_thermal_settle := public.argos_settle_thermal_gravity_monthly();
  v_inactivity := public.argos_sync_linhagem_presence();

  BEGIN
    v_phase := public.argos_advance_phase_if_eligible(v_uid);
  EXCEPTION
    WHEN others THEN
      v_phase := jsonb_build_object('phase_tier', 1, 'advanced', false, 'advance_error', SQLERRM);
  END;

  SELECT COALESCE(p.phase_tier, 1)::smallint
  INTO v_phase_tier
  FROM public.profiles p
  WHERE p.id = v_uid;

  SELECT to_jsonb(row_p)
  INTO v_profile
  FROM (
    SELECT
      full_name,
      nome_linhagem,
      status_altar,
      data_nascimento,
      role,
      v_phase_tier AS phase_tier,
      phase_setup_at,
      public.argos_sanitize_custom_preferences(custom_preferences) AS custom_preferences,
      CASE
        WHEN v_phase_tier = 1 THEN public.argos_compute_phase_one_progress(v_uid)
        ELSE NULL
      END AS phase_progress
    FROM public.profiles
    WHERE id = v_uid
  ) AS row_p;

  v_vtc_month := public.argos_compute_vtc_month_sp(v_uid);
  v_vtc_30d := public.argos_compute_vtc_30d(v_uid);
  v_session_vtc := public.argos_compute_session_vtc_today(v_uid);

  RETURN jsonb_build_object(
    'profile', v_profile,
    'phase', v_phase,
    'thermal_gravity_settlement', v_thermal_settle,
    'linhagem_inactivity', v_inactivity,
    'thermal_gravity', jsonb_build_object(
      'vtc_month', v_vtc_month,
      'vtc_30d', v_vtc_30d,
      'session_vtc_today', v_session_vtc
    ),
    'historico', COALESCE((
      SELECT jsonb_agg(to_jsonb(row_h) ORDER BY row_h.registrado_em DESC)
      FROM (
        SELECT
          id,
          exercicio_id,
          exercicio_nome,
          musculo,
          peso,
          peso_atual,
          series,
          repeticoes,
          status,
          registrado_em
        FROM public.historico_treinos
        WHERE cliente_id = v_uid
          AND musculo = p_musculo::text
      ) AS row_h
    ), '[]'::jsonb),
    'mural', COALESCE((
      SELECT jsonb_agg(to_jsonb(m))
      FROM public.argos_fetch_mural_comunidade(
        LEAST(GREATEST(COALESCE(p_mural_limit, 10), 1), 10)
      ) AS m
    ), '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fetch_dashboard_bundle(public.subgrupo_muscular, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fetch_dashboard_bundle(public.subgrupo_muscular, integer) TO authenticated;

REVOKE ALL ON FUNCTION public.argos_fetch_mural_comunidade(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.argos_fetch_mural_comunidade(integer) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.argos_fetch_forum_brasa_viva(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.argos_fetch_forum_brasa_viva(integer) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.list_clientes_duelo(text, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_clientes_duelo(text, integer, integer) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_rankings_thoth() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_rankings_thoth() TO authenticated, service_role;

COMMIT;
