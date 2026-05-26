-- Fix: fetch_dashboard_bundle falhava em STABLE + FOR UPDATE (profile vinha null → overlay nunca disparava)

CREATE OR REPLACE FUNCTION public.argos_advance_phase_if_eligible(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
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
  WHERE id = p_user_id;

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

CREATE OR REPLACE FUNCTION public.fetch_dashboard_bundle(
  p_musculo public.subgrupo_muscular DEFAULT 'peito',
  p_mural_limit integer DEFAULT 48
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
