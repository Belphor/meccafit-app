-- Academia: argos_get_academia_config VOLATILE (evita INSERT em transação read-only)
-- Audit log: ações de academia com target_id válido e constraint atualizada

ALTER TABLE public.argos_forja_audit_log
  DROP CONSTRAINT IF EXISTS argos_forja_audit_log_action_check;

ALTER TABLE public.argos_forja_audit_log
  ADD CONSTRAINT argos_forja_audit_log_action_check CHECK (
    action IN (
      'purify_to_ashes',
      'deactivate_account',
      'reactivate_account',
      'modify_statistics',
      'batch_planilha',
      'forja_adjust_vtc',
      'update_academia_config',
      'set_meta_coletiva_alvo'
    )
  );

CREATE OR REPLACE FUNCTION public.argos_get_academia_config()
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cfg public.argos_academia_config;
  v_mes date := public.comunidade_mes_atual_sp();
  v_meta record;
BEGIN
  SELECT * INTO v_cfg FROM public.argos_academia_config WHERE id = 1;

  PERFORM public.comunidade_ensure_meta_mes(v_mes);

  SELECT tonelagem_alvo_kg, tonelagem_atual_acumulada, mes_referencia
  INTO v_meta
  FROM public.metas_coletivas_academia
  WHERE mes_referencia = v_mes;

  RETURN jsonb_build_object(
    'meta_coletiva_alvo_kg', COALESCE(v_cfg.meta_coletiva_alvo_kg, 100000),
    'phase_vtc_faisca', COALESCE(v_cfg.phase_vtc_faisca, 5000),
    'phase_vtc_brasa', COALESCE(v_cfg.phase_vtc_brasa, 20000),
    'phase_vtc_labareda', COALESCE(v_cfg.phase_vtc_labareda, 50000),
    'phase_vtc_fogo_cosmico', COALESCE(v_cfg.phase_vtc_fogo_cosmico, 100000),
    'updated_at', v_cfg.updated_at,
    'mes_referencia', COALESCE(v_meta.mes_referencia, v_mes),
    'tonelagem_alvo_mes', COALESCE(v_meta.tonelagem_alvo_kg, v_cfg.meta_coletiva_alvo_kg, 100000),
    'tonelagem_atual_mes', COALESCE(v_meta.tonelagem_atual_acumulada, 0),
    'progresso_pct', CASE
      WHEN COALESCE(v_meta.tonelagem_alvo_kg, v_cfg.meta_coletiva_alvo_kg, 0) <= 0 THEN 0
      ELSE LEAST(
        100,
        ROUND(
          (COALESCE(v_meta.tonelagem_atual_acumulada, 0) / v_meta.tonelagem_alvo_kg) * 100.0,
          2
        )
      )
    END
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.argos_sovereign_update_academia_config(p_patch jsonb)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_before public.argos_academia_config;
  v_after public.argos_academia_config;
BEGIN
  IF NOT public.argos_is_forjador_soberano() THEN
    RAISE EXCEPTION 'permission denied: sovereign only' USING ERRCODE = '42501';
  END IF;

  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'permission denied' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_before FROM public.argos_academia_config WHERE id = 1 FOR UPDATE;

  UPDATE public.argos_academia_config
  SET
    meta_coletiva_alvo_kg = COALESCE(
      NULLIF((p_patch->>'meta_coletiva_alvo_kg')::numeric, 0),
      meta_coletiva_alvo_kg
    ),
    phase_vtc_faisca = COALESCE(
      NULLIF((p_patch->>'phase_vtc_faisca')::numeric, 0),
      phase_vtc_faisca
    ),
    phase_vtc_brasa = COALESCE(
      NULLIF((p_patch->>'phase_vtc_brasa')::numeric, 0),
      phase_vtc_brasa
    ),
    phase_vtc_labareda = COALESCE(
      NULLIF((p_patch->>'phase_vtc_labareda')::numeric, 0),
      phase_vtc_labareda
    ),
    phase_vtc_fogo_cosmico = COALESCE(
      NULLIF((p_patch->>'phase_vtc_fogo_cosmico')::numeric, 0),
      phase_vtc_fogo_cosmico
    ),
    updated_at = now()
  WHERE id = 1
  RETURNING * INTO v_after;

  IF v_after.phase_vtc_faisca >= v_after.phase_vtc_brasa
     OR v_after.phase_vtc_brasa >= v_after.phase_vtc_labareda
     OR v_after.phase_vtc_labareda >= v_after.phase_vtc_fogo_cosmico THEN
    RAISE EXCEPTION 'limiares de fase devem crescer: Faísca < Brasa < Labareda < Fogo Cósmico'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.argos_forja_audit_log (sovereign_id, target_id, action, payload)
  VALUES (
    v_uid,
    v_uid,
    'update_academia_config',
    jsonb_build_object('before', to_jsonb(v_before), 'after', to_jsonb(v_after), 'patch', p_patch)
  );

  RETURN jsonb_build_object('ok', true, 'config', to_jsonb(v_after));
END;
$$;

CREATE OR REPLACE FUNCTION public.argos_sovereign_set_meta_coletiva_alvo(
  p_alvo_kg numeric,
  p_mes date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_mes date := COALESCE(p_mes, public.comunidade_mes_atual_sp());
  v_alvo numeric(16, 2) := COALESCE(p_alvo_kg, 0);
BEGIN
  IF NOT public.argos_is_forjador_soberano() THEN
    RAISE EXCEPTION 'permission denied: sovereign only' USING ERRCODE = '42501';
  END IF;

  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'permission denied' USING ERRCODE = '42501';
  END IF;

  IF v_alvo <= 0 THEN
    RAISE EXCEPTION 'meta deve ser maior que zero' USING ERRCODE = '22023';
  END IF;

  PERFORM public.comunidade_ensure_meta_mes(v_mes);

  UPDATE public.metas_coletivas_academia
  SET tonelagem_alvo_kg = v_alvo, updated_at = now()
  WHERE mes_referencia = v_mes;

  UPDATE public.argos_academia_config
  SET meta_coletiva_alvo_kg = v_alvo, updated_at = now()
  WHERE id = 1;

  INSERT INTO public.argos_forja_audit_log (sovereign_id, target_id, action, payload)
  VALUES (
    v_uid,
    v_uid,
    'set_meta_coletiva_alvo',
    jsonb_build_object('mes_referencia', v_mes, 'tonelagem_alvo_kg', v_alvo)
  );

  RETURN jsonb_build_object('ok', true, 'mes_referencia', v_mes, 'tonelagem_alvo_kg', v_alvo);
END;
$$;

REVOKE ALL ON FUNCTION public.argos_get_academia_config() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.argos_get_academia_config() TO authenticated;
