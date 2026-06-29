-- Fix: grupos_obrigatorios é text[], não jsonb (client_sync_plano_meta)

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
  v_mes date := date_trunc('month', (now() AT TIME ZONE 'America/Sao_Paulo')::date)::date;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'permission denied' USING ERRCODE = '42501';
  END IF;

  v_total := LEAST(28, GREATEST(4, COALESCE(p_total_treinos, 16)));
  v_days := LEAST(7, GREATEST(1, ROUND((v_total::numeric * 7) / 30)));

  INSERT INTO public.planos_atletas (
    atleta_id,
    total_treinos_mensais_planejados,
    grupos_obrigatorios,
    meta_sync_mes,
    updated_at
  )
  VALUES (v_uid, v_total, '{}'::text[], v_mes, now())
  ON CONFLICT (atleta_id) DO UPDATE
  SET
    total_treinos_mensais_planejados = EXCLUDED.total_treinos_mensais_planejados,
    meta_sync_mes = EXCLUDED.meta_sync_mes,
    updated_at = EXCLUDED.updated_at;

  UPDATE public.profiles
  SET target_days_per_week = v_days, updated_at = now()
  WHERE id = v_uid;

  RETURN jsonb_build_object(
    'ok', true,
    'total_treinos_mensais_planejados', v_total,
    'meta_sync_mes', v_mes,
    'target_days_per_week', v_days
  );
END;
$$;
