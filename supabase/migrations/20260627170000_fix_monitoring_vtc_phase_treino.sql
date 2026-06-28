-- Correções: format() nos alertas, fase pelo VTC 30d, reajuste de VTC pelo painel forjador

CREATE OR REPLACE FUNCTION public.argos_phase_tier_from_vtc_30d(p_vtc_30d numeric)
RETURNS smallint
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN COALESCE(p_vtc_30d, 0) >= 100000 THEN 5::smallint
    WHEN COALESCE(p_vtc_30d, 0) >= 50000 THEN 4::smallint
    WHEN COALESCE(p_vtc_30d, 0) >= 20000 THEN 3::smallint
    WHEN COALESCE(p_vtc_30d, 0) >= 5000 THEN 2::smallint
    ELSE 1::smallint
  END;
$$;

CREATE OR REPLACE FUNCTION public.argos_advance_phase_if_eligible(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier smallint;
  v_role public.user_role;
  v_progress jsonb;
  v_advanced boolean := false;
  v_vtc_30d numeric;
  v_expected smallint;
BEGIN
  IF p_user_id IS DISTINCT FROM auth.uid()
     AND NOT public.argos_is_forjador_soberano() THEN
    RAISE EXCEPTION 'permission denied for phase advance'
      USING ERRCODE = '42501';
  END IF;

  SELECT phase_tier, role INTO v_tier, v_role
  FROM public.profiles
  WHERE id = p_user_id;

  IF v_role IS DISTINCT FROM 'cliente'::public.user_role THEN
    RETURN jsonb_build_object(
      'phase_tier', COALESCE(v_tier, 1),
      'advanced', false,
      'gamification_excluded', true
    );
  END IF;

  IF v_tier IS NULL THEN
    v_tier := 1;
  END IF;

  IF v_tier = 1 THEN
    v_progress := public.argos_compute_phase_one_progress(p_user_id);
    IF COALESCE((v_progress ->> 'eligible')::boolean, false) THEN
      PERFORM set_config('meccafit.phase_rpc_update', 'true', true);
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

  v_vtc_30d := public.argos_compute_vtc_30d(p_user_id);
  v_expected := public.argos_phase_tier_from_vtc_30d(v_vtc_30d);

  IF v_expected > v_tier THEN
    PERFORM set_config('meccafit.phase_rpc_update', 'true', true);
    UPDATE public.profiles
    SET phase_tier = v_expected, updated_at = now()
    WHERE id = p_user_id;
    v_tier := v_expected;
    v_advanced := true;
  END IF;

  RETURN jsonb_build_object(
    'phase_tier', v_tier,
    'advanced', v_advanced,
    'expected_phase_tier', v_expected,
    'vtc_30d', v_vtc_30d,
    'phase_one_progress', CASE WHEN v_tier = 1 THEN v_progress ELSE NULL END
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.argos_forja_fraud_signals(p_cliente_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_signals jsonb := '[]'::jsonb;
  v_row record;
  v_expected smallint;
BEGIN
  IF NOT public.argos_is_forjador_panel() THEN
    RAISE EXCEPTION 'permission denied for forja fraud signals'
      USING ERRCODE = '42501';
  END IF;

  FOR v_row IN
    SELECT
      p.id AS atleta_id,
      COALESCE(NULLIF(trim(p.full_name), ''), NULLIF(trim(p.nome_linhagem), ''), 'Cliente') AS display_name,
      LEAST(GREATEST(COALESCE(p.phase_tier, 1), 1), 5) AS phase_tier,
      lower(COALESCE(p.status_altar, 'ativo')) AS status_altar,
      COALESCE((
        SELECT btd.vtc_total
        FROM public.balanco_termico_diario btd
        WHERE btd.user_id = p.id
          AND btd.data_treino = (timezone('America/Sao_Paulo', now()))::date
      ), 0) AS vtc_today,
      COALESCE((
        SELECT AVG(btd.vtc_total)
        FROM public.balanco_termico_diario btd
        WHERE btd.user_id = p.id
          AND btd.data_treino >= ((timezone('America/Sao_Paulo', now()))::date - 7)
          AND btd.data_treino < (timezone('America/Sao_Paulo', now()))::date
      ), 0) AS vtc_avg_7d,
      COALESCE((
        SELECT SUM(btd.vtc_total)
        FROM public.balanco_termico_diario btd
        WHERE btd.user_id = p.id
          AND btd.data_treino >= ((timezone('America/Sao_Paulo', now()))::date - 30)
      ), 0) AS vtc_30d,
      COALESCE((
        SELECT COUNT(*)
        FROM public.historico_cargas hc
        WHERE hc.atleta_id = p.id
          AND hc.data_registro >= (now() - interval '24 hours')
      ), 0) AS cargas_24h,
      COALESCE((
        SELECT COUNT(*)
        FROM public.historico_treinos ht
        WHERE ht.cliente_id = p.id
          AND ht.registrado_em >= (now() - interval '7 days')
      ), 0) AS treinos_7d
    FROM public.profiles p
    WHERE p.role = 'cliente'::public.user_role
      AND (
        p_cliente_id IS NULL
        OR p.id = p_cliente_id
      )
    ORDER BY p.full_name NULLS LAST, p.nome_linhagem NULLS LAST
    LIMIT CASE WHEN p_cliente_id IS NULL THEN 128 ELSE 1 END
  LOOP
    v_expected := public.argos_phase_tier_from_vtc_30d(v_row.vtc_30d);

    IF lower(COALESCE(v_row.status_altar, 'ativo')) NOT IN ('ativo', 'purificado')
       AND v_row.treinos_7d > 0 THEN
      v_signals := v_signals || jsonb_build_array(jsonb_build_object(
        'severity', 'critical',
        'code', 'SUSPENDED_ACTIVE_TRAINING',
        'atleta_id', v_row.atleta_id,
        'display_name', v_row.display_name,
        'message', 'Conta suspensa com treinos registrados nos últimos 7 dias.'
      ));
    END IF;

    IF v_row.vtc_today > 0
       AND v_row.vtc_avg_7d > 0
       AND v_row.vtc_today > (v_row.vtc_avg_7d * 4) THEN
      v_signals := v_signals || jsonb_build_array(jsonb_build_object(
        'severity', 'warn',
        'code', 'VTC_SPIKE',
        'atleta_id', v_row.atleta_id,
        'display_name', v_row.display_name,
        'message', format(
          'VTC hoje (%s kg) excede 4× média 7d (%s kg).',
          round(v_row.vtc_today)::text,
          round(v_row.vtc_avg_7d)::text
        )
      ));
    END IF;

    IF v_row.cargas_24h > 30 THEN
      v_signals := v_signals || jsonb_build_array(jsonb_build_object(
        'severity', 'critical',
        'code', 'CARGA_FLOOD',
        'atleta_id', v_row.atleta_id,
        'display_name', v_row.display_name,
        'message', format('%s registros em historico_cargas nas últimas 24h.', v_row.cargas_24h)
      ));
    END IF;

    IF v_expected > v_row.phase_tier THEN
      v_signals := v_signals || jsonb_build_array(jsonb_build_object(
        'severity', 'warn',
        'code', 'TIER_VTC_MISMATCH',
        'atleta_id', v_row.atleta_id,
        'display_name', v_row.display_name,
        'message', format(
          'Fase registrada (%s) abaixo do volume 30d (%s kg → fase %s).',
          v_row.phase_tier,
          round(v_row.vtc_30d)::text,
          v_expected
        )
      ));
    ELSIF v_row.phase_tier >= 3 AND v_row.vtc_30d < 1000 THEN
      v_signals := v_signals || jsonb_build_array(jsonb_build_object(
        'severity', 'warn',
        'code', 'TIER_VTC_LOW',
        'atleta_id', v_row.atleta_id,
        'display_name', v_row.display_name,
        'message', format(
          'Fase %s com VTC 30d baixo (%s kg).',
          v_row.phase_tier,
          round(v_row.vtc_30d)::text
        )
      ));
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'signals', v_signals,
    'count', jsonb_array_length(v_signals)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.argos_sovereign_modify_statistics(
  p_target_id uuid,
  p_patch jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phase smallint;
  v_vtc_delta numeric;
  v_vtc_set numeric;
  v_today date := (timezone('America/Sao_Paulo', now()))::date;
BEGIN
  IF NOT public.argos_is_forjador_soberano() THEN
    RAISE EXCEPTION 'permission denied: sovereign only'
      USING ERRCODE = '42501';
  END IF;

  IF p_target_id IS NULL OR p_patch IS NULL OR p_patch = '{}'::jsonb THEN
    RAISE EXCEPTION 'invalid patch payload'
      USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = p_target_id AND role = 'cliente'::public.user_role
  ) THEN
    RAISE EXCEPTION 'invalid target athlete'
      USING ERRCODE = '22023';
  END IF;

  IF p_patch ? 'phase_tier' THEN
    v_phase := LEAST(GREATEST((p_patch->>'phase_tier')::smallint, 1), 5);
    PERFORM set_config('meccafit.phase_rpc_update', 'true', true);
    UPDATE public.profiles
    SET phase_tier = v_phase, updated_at = now()
    WHERE id = p_target_id;
  END IF;

  IF p_patch ? 'vtc_today_set' THEN
    v_vtc_set := GREATEST(COALESCE((p_patch->>'vtc_today_set')::numeric, 0), 0);
    INSERT INTO public.balanco_termico_diario (user_id, data_treino, vtc_total)
    VALUES (p_target_id, v_today, v_vtc_set)
    ON CONFLICT (user_id, data_treino)
    DO UPDATE SET vtc_total = EXCLUDED.vtc_total, updated_at = now();
  ELSIF p_patch ? 'vtc_today_delta' THEN
    v_vtc_delta := COALESCE((p_patch->>'vtc_today_delta')::numeric, 0);
    IF v_vtc_delta <> 0 THEN
      PERFORM public.argos_upsert_balanco_termico_diario(p_target_id, v_vtc_delta, v_today);
    END IF;
  END IF;

  IF p_patch ? 'reset_vtc_today' AND (p_patch->>'reset_vtc_today')::boolean IS TRUE THEN
    UPDATE public.balanco_termico_diario
    SET vtc_total = 0, updated_at = now()
    WHERE user_id = p_target_id AND data_treino = v_today;
  END IF;

  INSERT INTO public.argos_forja_audit_log (sovereign_id, target_id, action, payload)
  VALUES (auth.uid(), p_target_id, 'modify_statistics', p_patch);

  RETURN jsonb_build_object('ok', true, 'patch', p_patch);
END;
$$;

CREATE OR REPLACE FUNCTION public.argos_forja_adjust_client_vtc(
  p_target_id uuid,
  p_patch jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vtc_set numeric;
  v_vtc_delta numeric;
  v_today date := (timezone('America/Sao_Paulo', now()))::date;
BEGIN
  IF NOT public.argos_is_forjador_panel() THEN
    RAISE EXCEPTION 'permission denied for forja panel'
      USING ERRCODE = '42501';
  END IF;

  IF p_target_id IS NULL OR p_patch IS NULL OR p_patch = '{}'::jsonb THEN
    RAISE EXCEPTION 'invalid patch payload'
      USING ERRCODE = '22023';
  END IF;

  IF NOT public.argos_is_forjador_soberano()
     AND NOT public.argos_is_forjador_of_cliente(p_target_id) THEN
    RAISE EXCEPTION 'permission denied: not your client'
      USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = p_target_id AND role = 'cliente'::public.user_role
  ) THEN
    RAISE EXCEPTION 'invalid target athlete'
      USING ERRCODE = '22023';
  END IF;

  IF p_patch ? 'vtc_today_set' THEN
    v_vtc_set := GREATEST(COALESCE((p_patch->>'vtc_today_set')::numeric, 0), 0);
    INSERT INTO public.balanco_termico_diario (user_id, data_treino, vtc_total)
    VALUES (p_target_id, v_today, v_vtc_set)
    ON CONFLICT (user_id, data_treino)
    DO UPDATE SET vtc_total = EXCLUDED.vtc_total, updated_at = now();
  ELSIF p_patch ? 'vtc_today_delta' THEN
    v_vtc_delta := COALESCE((p_patch->>'vtc_today_delta')::numeric, 0);
    IF v_vtc_delta <> 0 THEN
      INSERT INTO public.balanco_termico_diario (user_id, data_treino, vtc_total)
      VALUES (p_target_id, v_today, GREATEST(v_vtc_delta, 0))
      ON CONFLICT (user_id, data_treino)
      DO UPDATE SET
        vtc_total = GREATEST(public.balanco_termico_diario.vtc_total + v_vtc_delta, 0),
        updated_at = now();
    END IF;
  END IF;

  IF p_patch ? 'reset_vtc_today' AND (p_patch->>'reset_vtc_today')::boolean IS TRUE THEN
    UPDATE public.balanco_termico_diario
    SET vtc_total = 0, updated_at = now()
    WHERE user_id = p_target_id AND data_treino = v_today;
  END IF;

  INSERT INTO public.argos_forja_audit_log (sovereign_id, target_id, action, payload)
  VALUES (auth.uid(), p_target_id, 'forja_adjust_vtc', p_patch);

  RETURN jsonb_build_object('ok', true, 'patch', p_patch);
END;
$$;

REVOKE ALL ON FUNCTION public.argos_phase_tier_from_vtc_30d(numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.argos_phase_tier_from_vtc_30d(numeric) TO authenticated;

REVOKE ALL ON FUNCTION public.argos_forja_adjust_client_vtc(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.argos_forja_adjust_client_vtc(uuid, jsonb) TO authenticated;
