-- Tour do ecossistema FENYXIA · apresentação gradual das abas após identidade

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ecossistema_tour_concluido boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.ecossistema_tour_concluido IS
  'True após concluir o tour Perfil → Treino → Evolução → Comunidade.';

UPDATE public.profiles
SET ecossistema_tour_concluido = true
WHERE perfil_identidade_confirmada = true
  AND ecossistema_tour_concluido = false;

CREATE OR REPLACE FUNCTION public.client_complete_ecossistema_tour()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid;
BEGIN
  v_caller := auth.uid();
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('error', 'unauthorized', 'code', 401);
  END IF;

  UPDATE public.profiles
  SET ecossistema_tour_concluido = true,
      updated_at = now()
  WHERE id = v_caller
    AND role = 'cliente'::public.user_role;

  RETURN jsonb_build_object('ok', true, 'ecossistema_tour_concluido', true);
END;
$$;

REVOKE ALL ON FUNCTION public.client_complete_ecossistema_tour() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.client_complete_ecossistema_tour() TO authenticated;

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
      sexo,
      perfil_identidade_confirmada,
      anima_portal_visto,
      ecossistema_tour_concluido,
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

COMMIT;
