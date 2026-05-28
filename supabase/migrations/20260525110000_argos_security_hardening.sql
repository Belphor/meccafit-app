-- ARGOS · Security hardening — phase_tier lockdown + invite RPC server-only

-- ---------------------------------------------------------------------------
-- 1. Profiles guard — block self-service phase_tier / cosmetics tampering
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.argos_profiles_guard_sensitive_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('meccafit.bootstrap_profile', true) = 'true'
     OR current_setting('meccafit.phase_rpc_update', true) = 'true' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.role := 'cliente'::public.user_role;
    NEW.phase_tier := LEAST(GREATEST(COALESCE(NEW.phase_tier, 1), 1), 5);
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.role IS DISTINCT FROM OLD.role
       OR NEW.forjador_id IS DISTINCT FROM OLD.forjador_id THEN
      IF NOT public.argos_is_forjador_soberano() THEN
        RAISE EXCEPTION 'permission denied for profile privilege change'
          USING ERRCODE = '42501';
      END IF;
    END IF;

    -- Fase e cosméticos: só o motor ARGOS (flag phase_rpc_update) pode alterar — ninguém à mão.
    IF NEW.phase_tier IS DISTINCT FROM OLD.phase_tier
       OR NEW.phase_setup_at IS DISTINCT FROM OLD.phase_setup_at
       OR NEW.custom_preferences IS DISTINCT FROM OLD.custom_preferences THEN
      RAISE EXCEPTION 'permission denied for profile phase or cosmetics change'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Allow approved RPC to advance phase tier
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
BEGIN
  IF p_user_id IS DISTINCT FROM auth.uid()
     AND NOT public.argos_is_forjador_soberano() THEN
    RAISE EXCEPTION 'permission denied for phase advance'
      USING ERRCODE = '42501';
  END IF;

  SELECT phase_tier, role INTO v_tier, v_role
  FROM public.profiles
  WHERE id = p_user_id;

  -- Gamificação de fases: apenas clientes (forjadores ficam de fora).
  IF v_role IS DISTINCT FROM 'cliente'::public.user_role THEN
    RETURN jsonb_build_object(
      'phase_tier', COALESCE(v_tier, 1),
      'advanced', false,
      'gamification_excluded', true
    );
  END IF;

  IF v_tier IS NULL THEN
    RETURN jsonb_build_object('phase_tier', 1, 'advanced', false);
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

  RETURN jsonb_build_object(
    'phase_tier', v_tier,
    'advanced', v_advanced,
    'phase_one_progress', CASE WHEN v_tier = 1 THEN v_progress ELSE NULL END
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. Invite tokens — validate/consume somente server-side (service_role)
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.argos_validate_invite_token(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.argos_validate_invite_token(text) TO service_role;

REVOKE ALL ON FUNCTION public.argos_consume_invite_token(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.argos_consume_invite_for_user(
  p_token text,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hash text;
  v_updated integer;
BEGIN
  IF p_user_id IS NULL OR BTRIM(COALESCE(p_token, '')) = '' THEN
    RETURN false;
  END IF;

  IF NOT public.argos_validate_invite_token(p_token) THEN
    RETURN false;
  END IF;

  v_hash := public.argos_hash_invite_token(p_token);

  UPDATE public.invite_tokens
  SET used_at = now(),
      used_by = p_user_id
  WHERE token_hash = v_hash
    AND used_at IS NULL
    AND expires_at > now();

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated = 1;
END;
$$;

REVOKE ALL ON FUNCTION public.argos_consume_invite_for_user(text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.argos_consume_invite_for_user(text, uuid) TO service_role;

-- ---------------------------------------------------------------------------
-- 3. Fórum Brasa-Viva — só clientes no feed (forjadores fora da gamificação)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.argos_fetch_forum_brasa_viva(p_limit integer DEFAULT 48)
RETURNS TABLE (
  id bigint,
  topic_title text,
  topic_body text,
  author_name text,
  author_lineage text,
  author_phase_tier smallint,
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
    LEAST(GREATEST(COALESCE(p.phase_tier, 1), 1), 5)::smallint AS author_phase_tier,
    COALESCE(h.peso, h.peso_atual) AS peso,
    GREATEST(COALESCE(h.series, 1), 1) AS series,
    COALESCE(h.registrado_em, h.updated_at, NOW()) AS registrado_em
  FROM public.historico_treinos h
  INNER JOIN public.profiles p ON p.id = h.cliente_id
  WHERE h.status = 'SUPERAÇÃO'
    AND p.role = 'cliente'::public.user_role
    AND (SELECT auth.uid()) IS NOT NULL
  ORDER BY COALESCE(h.registrado_em, h.updated_at, NOW()) DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 48), 1), 100);
$$;
