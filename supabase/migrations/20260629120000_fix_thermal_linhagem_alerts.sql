-- Gravidade Térmica: regressão na virada para qualquer fase com meta não cumprida.
-- Inatividade: reacendimento só dispensa o aviso (não restaura fase).

BEGIN;

CREATE OR REPLACE FUNCTION public.argos_settle_thermal_gravity_monthly()
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_today date;
  v_current_month text;
  v_prev_month text;
  v_settled text;
  v_tier smallint;
  v_goal numeric;
  v_vtc_month numeric;
  v_degraded boolean := false;
  v_previous_tier smallint;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('degraded', false);
  END IF;

  v_today := (timezone('America/Sao_Paulo', now()))::date;
  v_current_month := to_char(v_today, 'YYYY-MM');
  v_prev_month := to_char((date_trunc('month', v_today) - interval '1 day')::date, 'YYYY-MM');

  SELECT
    COALESCE(p.phase_tier, 1)::smallint,
    p.thermal_gravity_settled_month
  INTO v_tier, v_settled
  FROM public.profiles p
  WHERE p.id = v_uid;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('degraded', false);
  END IF;

  IF v_settled IS NULL THEN
    UPDATE public.profiles
    SET thermal_gravity_settled_month = v_prev_month, updated_at = now()
    WHERE id = v_uid;

    RETURN jsonb_build_object(
      'degraded', false,
      'phase_tier', v_tier,
      'settled_month', v_prev_month,
      'first_settlement', true
    );
  END IF;

  IF v_settled < v_prev_month THEN
    v_previous_tier := v_tier;
    v_goal := public.argos_resolve_monthly_levelup_goal_kg(v_tier);
    v_vtc_month := public.argos_compute_vtc_for_month_sp(v_uid, v_prev_month);

    IF v_vtc_month < v_goal THEN
      v_degraded := true;
      v_tier := GREATEST(1, v_tier - 1);
    END IF;

    UPDATE public.profiles
    SET
      phase_tier = v_tier,
      thermal_gravity_settled_month = v_prev_month,
      updated_at = now()
    WHERE id = v_uid;
  END IF;

  RETURN jsonb_build_object(
    'degraded', v_degraded,
    'phase_tier', v_tier,
    'previous_tier', CASE WHEN v_degraded THEN v_previous_tier ELSE NULL END,
    'settled_month', v_prev_month,
    'vtc_month_kg', v_vtc_month,
    'goal_kg', v_goal
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.argos_rekindle_linhagem_inactivity()
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_pending boolean;
  v_tier smallint;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('rekindled', false);
  END IF;

  SELECT
    COALESCE(p.linhagem_inactivity_pending, false),
    COALESCE(p.phase_tier, 1)::smallint
  INTO v_pending, v_tier
  FROM public.profiles p
  WHERE p.id = v_uid;

  IF NOT FOUND OR NOT v_pending THEN
    RETURN jsonb_build_object('rekindled', false, 'phase_tier', v_tier);
  END IF;

  UPDATE public.profiles
  SET
    linhagem_inactivity_pending = false,
    linhagem_inactivity_restore_tier = NULL,
    updated_at = now()
  WHERE id = v_uid;

  RETURN jsonb_build_object(
    'rekindled', true,
    'phase_tier', v_tier,
    'alert_cleared', true
  );
END;
$$;

COMMENT ON FUNCTION public.argos_rekindle_linhagem_inactivity() IS
  'Dispensa o aviso de inatividade após concluir uma série. Não restaura a fase rebaixada.';

COMMIT;
