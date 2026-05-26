-- Phase evolution (Cinzas gating) + custom_preferences + bundle enrichment

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS phase_tier smallint NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS phase_setup_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS custom_preferences jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_phase_tier_range;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_phase_tier_range
  CHECK (phase_tier >= 1 AND phase_tier <= 5);

CREATE OR REPLACE FUNCTION public.argos_sanitize_custom_preferences(p_raw jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_theme jsonb := '{}'::jsonb;
  v_layout jsonb := '{}'::jsonb;
  v_magma text;
  v_solar text;
  v_glow numeric;
  v_blur numeric;
  v_pad numeric;
BEGIN
  IF p_raw IS NULL OR jsonb_typeof(p_raw) <> 'object' THEN
    RETURN '{}'::jsonb;
  END IF;

  IF p_raw ? 'theme' AND jsonb_typeof(p_raw -> 'theme') = 'object' THEN
    v_magma := nullif(trim(both from p_raw #>> '{theme,magmaCore}'), '');
    v_solar := nullif(trim(both from p_raw #>> '{theme,solarGold}'), '');

    IF v_magma IS NOT NULL AND v_magma ~ '^#[0-9A-Fa-f]{6}$' THEN
      v_theme := v_theme || jsonb_build_object('magmaCore', upper(v_magma));
    END IF;

    IF v_solar IS NOT NULL AND v_solar ~ '^#[0-9A-Fa-f]{6}$' THEN
      v_theme := v_theme || jsonb_build_object('solarGold', upper(v_solar));
    END IF;

    v_glow := NULLIF(p_raw #>> '{theme,ambientGlowOpacity}', '')::numeric;
    IF v_glow IS NOT NULL THEN
      v_theme := v_theme || jsonb_build_object(
        'ambientGlowOpacity', LEAST(1, GREATEST(0, v_glow))
      );
    END IF;

    v_blur := NULLIF(p_raw #>> '{theme,panelBlurPx}', '')::numeric;
    IF v_blur IS NOT NULL THEN
      v_theme := v_theme || jsonb_build_object(
        'panelBlurPx', LEAST(24, GREATEST(0, v_blur))
      );
    END IF;
  END IF;

  IF p_raw ? 'layout' AND jsonb_typeof(p_raw -> 'layout') = 'object' THEN
    v_pad := NULLIF(p_raw #>> '{layout,portalPaddingScale}', '')::numeric;
    IF v_pad IS NOT NULL THEN
      v_layout := jsonb_build_object(
        'portalPaddingScale', LEAST(1.25, GREATEST(0.75, v_pad))
      );
    END IF;
  END IF;

  RETURN jsonb_strip_nulls(
    jsonb_build_object(
      'theme', CASE WHEN v_theme = '{}'::jsonb THEN NULL ELSE v_theme END,
      'layout', CASE WHEN v_layout = '{}'::jsonb THEN NULL ELSE v_layout END
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.argos_compute_phase_one_progress(p_user_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH stats AS (
    SELECT
      p.phase_setup_at,
      (
        SELECT COUNT(*)::bigint
        FROM public.historico_treinos h
        WHERE h.cliente_id = p_user_id
      ) AS sessions,
      (
        SELECT COALESCE(SUM(m.vtc_total), 0)::numeric
        FROM public.matriz_forca m
        WHERE m.cliente_id = p_user_id
      ) AS vtc_cumulative
    FROM public.profiles p
    WHERE p.id = p_user_id
  )
  SELECT jsonb_build_object(
    'tier', 1,
    'days_elapsed', GREATEST(
      0,
      FLOOR(EXTRACT(EPOCH FROM (now() - s.phase_setup_at)) / 86400)::integer
    ),
    'days_required', 7,
    'hours_elapsed', GREATEST(
      0,
      FLOOR(EXTRACT(EPOCH FROM (now() - s.phase_setup_at)) / 3600)::integer
    ),
    'hours_required', 168,
    'sessions', COALESCE(s.sessions, 0),
    'sessions_required', 4,
    'vtc_cumulative', COALESCE(s.vtc_cumulative, 0),
    'vtc_required', 2000.00,
    'eligible',
      (now() - s.phase_setup_at) >= interval '168 hours'
      AND COALESCE(s.sessions, 0) >= 4
      AND COALESCE(s.vtc_cumulative, 0) >= 2000.00
  )
  FROM stats s;
$$;

CREATE OR REPLACE FUNCTION public.argos_advance_phase_if_eligible(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier smallint;
  v_progress jsonb;
  v_advanced boolean := false;
BEGIN
  IF p_user_id IS DISTINCT FROM auth.uid()
     AND NOT public.argos_is_forjador_soberano() THEN
    RAISE EXCEPTION 'permission denied for phase advance'
      USING ERRCODE = '42501';
  END IF;

  SELECT phase_tier INTO v_tier
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF v_tier IS NULL THEN
    RETURN jsonb_build_object('phase_tier', 1, 'advanced', false);
  END IF;

  IF v_tier = 1 THEN
    v_progress := public.argos_compute_phase_one_progress(p_user_id);
    IF COALESCE((v_progress ->> 'eligible')::boolean, false) THEN
      UPDATE public.profiles
      SET
        phase_tier = 2,
        phase_setup_at = now(),
        custom_preferences = public.argos_sanitize_custom_preferences(
          COALESCE(custom_preferences, '{}'::jsonb)
          || jsonb_build_object(
            'theme',
            jsonb_build_object(
              'magmaCore', '#FF6A00',
              'solarGold', '#FFC840',
              'ambientGlowOpacity', 0.09
            )
          )
        ),
        updated_at = now()
      WHERE id = p_user_id;

      v_tier := 2;
      v_advanced := true;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'phase_tier', v_tier,
    'advanced', v_advanced,
    'phase_one_progress', CASE WHEN v_tier = 1 THEN v_progress ELSE NULL END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.argos_sanitize_custom_preferences(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.argos_compute_phase_one_progress(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.argos_advance_phase_if_eligible(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.argos_compute_phase_one_progress(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.argos_advance_phase_if_eligible(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.fetch_dashboard_bundle(
  p_musculo public.subgrupo_muscular DEFAULT 'peito',
  p_mural_limit integer DEFAULT 48
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_phase jsonb;
  v_profile jsonb;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN NULL;
  END IF;

  v_phase := public.argos_advance_phase_if_eligible(v_uid);

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

  RETURN jsonb_build_object(
    'profile', v_profile,
    'phase', v_phase,
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
        LEAST(GREATEST(COALESCE(p_mural_limit, 48), 1), 100)
      ) AS m
    ), '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fetch_dashboard_bundle(public.subgrupo_muscular, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fetch_dashboard_bundle(public.subgrupo_muscular, integer) TO authenticated;
