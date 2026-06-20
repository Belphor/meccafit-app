-- FENYXIA · Performance zero-cost — bundle thermal inline + arena snapshot read path
-- Meta: ≤200 utilizadores simultâneos no free tier (menos round-trips HTTP/RPC)

BEGIN;

CREATE OR REPLACE FUNCTION public.fetch_dashboard_bundle(
  p_musculo public.subgrupo_muscular DEFAULT 'peito',
  p_mural_limit integer DEFAULT 24
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
  v_vtc_30d numeric;
  v_session_vtc numeric;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN NULL;
  END IF;

  BEGIN
    v_phase := public.argos_advance_phase_if_eligible(v_uid);
  EXCEPTION
    WHEN others THEN
      v_phase := jsonb_build_object('phase_tier', 1, 'advanced', false, 'advance_error', SQLERRM);
  END;

  SELECT to_jsonb(row_p)
  INTO v_profile
  FROM (
    SELECT
      full_name,
      nome_linhagem,
      status_altar,
      data_nascimento,
      role,
      phase_tier,
      phase_setup_at,
      public.argos_sanitize_custom_preferences(custom_preferences) AS custom_preferences,
      CASE
        WHEN phase_tier = 1 THEN public.argos_compute_phase_one_progress(v_uid)
        ELSE NULL
      END AS phase_progress
    FROM public.profiles
    WHERE id = v_uid
  ) AS row_p;

  v_vtc_30d := public.argos_compute_vtc_30d(v_uid);
  v_session_vtc := public.argos_compute_session_vtc_today(v_uid);

  RETURN jsonb_build_object(
    'profile', v_profile,
    'phase', v_phase,
    'thermal_gravity', jsonb_build_object(
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
        LEAST(GREATEST(COALESCE(p_mural_limit, 24), 1), 100)
      ) AS m
    ), '[]'::jsonb)
  );
END;
$$;

DROP FUNCTION IF EXISTS public.get_comunidade_arena_snapshot();

CREATE OR REPLACE FUNCTION public.get_comunidade_arena_snapshot(
  p_skip_side_effects boolean DEFAULT true
)
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

  IF NOT COALESCE(p_skip_side_effects, true) THEN
    PERFORM public.comunidade_ensure_meta_mes(v_mes);
    PERFORM public.comunidade_processar_duelos_expirados();
  END IF;

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

REVOKE ALL ON FUNCTION public.fetch_dashboard_bundle(public.subgrupo_muscular, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fetch_dashboard_bundle(public.subgrupo_muscular, integer) TO authenticated;

REVOKE ALL ON FUNCTION public.get_comunidade_arena_snapshot(boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_comunidade_arena_snapshot(boolean) TO authenticated, service_role;

COMMIT;
