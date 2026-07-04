-- FENYXIA · Ritmo da Fênix: dias planejados definem a meta mensal de VTC.
-- Regra: 16 treinos equivalem ao limiar Faisca da academia.
-- A meta escala com o plano mensal, sem ficar abaixo de 50% do limiar.

BEGIN;

CREATE OR REPLACE FUNCTION public.evolucao_calcular_meta_vtc_por_treinos(p_total_treinos integer)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total integer;
  v_base numeric;
  v_meta numeric;
BEGIN
  v_total := LEAST(28, GREATEST(4, COALESCE(p_total_treinos, 16)));

  SELECT COALESCE(NULLIF(cfg.phase_vtc_faisca, 0), 5000)
  INTO v_base
  FROM public.argos_academia_config cfg
  WHERE cfg.id = 1;

  v_base := COALESCE(NULLIF(v_base, 0), 5000);
  v_meta := ROUND(v_base * (v_total::numeric / 16.0), 2);

  RETURN GREATEST(ROUND(v_base * 0.50, 2), v_meta);
END;
$$;

COMMENT ON FUNCTION public.evolucao_calcular_meta_vtc_por_treinos(integer) IS
  'MIDAS · Calcula a meta mensal de VTC do Ritmo da Fenix a partir dos dias de treino planejados.';

CREATE OR REPLACE FUNCTION public.evolucao_resolve_meta_vtc_mensal(p_atleta_id uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_personal numeric;
  v_total_treinos integer;
BEGIN
  SELECT pa.meta_vtc_mensal_kg, pa.total_treinos_mensais_planejados
  INTO v_personal, v_total_treinos
  FROM public.planos_atletas pa
  WHERE pa.atleta_id = p_atleta_id;

  IF v_personal IS NOT NULL AND v_personal > 0 THEN
    RETURN v_personal;
  END IF;

  RETURN public.evolucao_calcular_meta_vtc_por_treinos(COALESCE(v_total_treinos, 16));
END;
$$;

CREATE OR REPLACE FUNCTION public.client_sync_plano_meta(p_total_treinos integer)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_total integer;
  v_days integer;
  v_meta_vtc numeric;
  v_mes date := date_trunc('month', (now() AT TIME ZONE 'America/Sao_Paulo')::date)::date;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'permission denied' USING ERRCODE = '42501';
  END IF;

  v_total := LEAST(28, GREATEST(4, COALESCE(p_total_treinos, 16)));
  v_days := LEAST(7, GREATEST(1, ROUND((v_total::numeric * 7) / 30)));
  v_meta_vtc := public.evolucao_calcular_meta_vtc_por_treinos(v_total);

  INSERT INTO public.planos_atletas (
    atleta_id,
    total_treinos_mensais_planejados,
    grupos_obrigatorios,
    meta_vtc_mensal_kg,
    meta_sync_mes,
    updated_at
  )
  VALUES (v_uid, v_total, '{}'::text[], v_meta_vtc, v_mes, now())
  ON CONFLICT (atleta_id) DO UPDATE
  SET
    total_treinos_mensais_planejados = EXCLUDED.total_treinos_mensais_planejados,
    meta_vtc_mensal_kg = EXCLUDED.meta_vtc_mensal_kg,
    meta_sync_mes = EXCLUDED.meta_sync_mes,
    updated_at = EXCLUDED.updated_at;

  UPDATE public.profiles
  SET target_days_per_week = v_days, updated_at = now()
  WHERE id = v_uid;

  RETURN jsonb_build_object(
    'ok', true,
    'total_treinos_mensais_planejados', v_total,
    'meta_vtc_mensal_kg', v_meta_vtc,
    'meta_sync_mes', v_mes,
    'target_days_per_week', v_days
  );
END;
$$;

REVOKE ALL ON FUNCTION public.evolucao_calcular_meta_vtc_por_treinos(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.evolucao_calcular_meta_vtc_por_treinos(integer) TO authenticated;

COMMIT;
