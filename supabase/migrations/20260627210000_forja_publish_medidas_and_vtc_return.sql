-- RPC medidas VIP (schema cache) + VTC adjust devolve totais actualizados

CREATE OR REPLACE FUNCTION public.argos_forja_publish_vip_medidas(
  p_client_id uuid,
  p_payload jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_operator uuid := auth.uid();
  v_forger_id uuid;
BEGIN
  IF v_operator IS NULL THEN
    RAISE EXCEPTION 'session required' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.forger_client_bonds b
    WHERE b.client_id = p_client_id
  ) THEN
    RAISE EXCEPTION 'cliente sem vínculo VIP activo'
      USING ERRCODE = '42501';
  END IF;

  IF public.argos_is_forjador_soberano() THEN
    SELECT b.forger_id INTO v_forger_id
    FROM public.forger_client_bonds b
    WHERE b.client_id = p_client_id
    LIMIT 1;
  ELSE
    IF NOT public.argos_is_forger_bonded_to_client(p_client_id) THEN
      RAISE EXCEPTION 'permission denied for medidas publish'
        USING ERRCODE = '42501';
    END IF;
    v_forger_id := v_operator;
  END IF;

  SELECT id INTO v_id
  FROM public.vip_medidas_corporais
  WHERE client_id = p_client_id AND activo = true
  LIMIT 1;

  IF v_id IS NOT NULL THEN
    UPDATE public.vip_medidas_corporais
    SET
      forger_id = v_forger_id,
      peso_kg = (p_payload->>'peso_kg')::numeric,
      altura_cm = (p_payload->>'altura_cm')::numeric,
      perimetros = COALESCE(p_payload->'perimetros', '{}'::jsonb),
      medido_em = COALESCE((p_payload->>'medido_em')::timestamptz, now()),
      atualizado_em = now()
    WHERE id = v_id;
  ELSE
    INSERT INTO public.vip_medidas_corporais (
      client_id,
      forger_id,
      peso_kg,
      altura_cm,
      perimetros,
      medido_em,
      activo
    )
    VALUES (
      p_client_id,
      v_forger_id,
      (p_payload->>'peso_kg')::numeric,
      (p_payload->>'altura_cm')::numeric,
      COALESCE(p_payload->'perimetros', '{}'::jsonb),
      COALESCE((p_payload->>'medido_em')::timestamptz, now()),
      true
    )
    RETURNING id INTO v_id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'id', v_id);
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
  v_vtc_today numeric := 0;
  v_vtc_30d numeric := 0;
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

  SELECT COALESCE(b.vtc_total, 0) INTO v_vtc_today
  FROM public.balanco_termico_diario b
  WHERE b.user_id = p_target_id AND b.data_treino = v_today;

  SELECT COALESCE(SUM(bd.vtc_total), 0) INTO v_vtc_30d
  FROM public.balanco_termico_diario bd
  WHERE bd.user_id = p_target_id AND bd.data_treino >= (v_today - 30);

  INSERT INTO public.argos_forja_audit_log (sovereign_id, target_id, action, payload)
  VALUES (auth.uid(), p_target_id, 'forja_adjust_vtc', p_patch);

  RETURN jsonb_build_object(
    'ok', true,
    'patch', p_patch,
    'vtc_today', v_vtc_today,
    'vtc_30d', v_vtc_30d
  );
END;
$$;

REVOKE ALL ON FUNCTION public.argos_forja_publish_vip_medidas(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.argos_forja_publish_vip_medidas(uuid, jsonb) TO authenticated;

REVOKE ALL ON FUNCTION public.argos_forja_adjust_client_vtc(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.argos_forja_adjust_client_vtc(uuid, jsonb) TO authenticated;
