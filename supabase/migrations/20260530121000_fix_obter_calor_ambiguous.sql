-- FENYXIA · HOTFIX — obter_calor_muscular_atleta · membro_principal ambiguous
-- Idempotente · Aplicar após 20260530120000_restore_estase_gatilho_muscular.sql

CREATE OR REPLACE FUNCTION public.obter_calor_muscular_atleta(p_user_id uuid)
RETURNS TABLE (
  membro_principal text,
  nivel_calculado text,
  is_frozen boolean
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  v_membro public.membro_principal_soberano;
  v_tem_bond boolean;
  v_tem_ficha boolean;
  v_prescrito boolean;
  v_is_frozen boolean;
  v_metric numeric;
  v_metric_final numeric;
  v_nivel text;
  v_ignicao integer;
  v_membros constant public.membro_principal_soberano[] := ARRAY[
    'PEITO'::public.membro_principal_soberano,
    'BRACOS'::public.membro_principal_soberano,
    'ABDOMEN'::public.membro_principal_soberano,
    'PERNAS'::public.membro_principal_soberano
  ];
BEGIN
  IF p_user_id IS NULL THEN
    RETURN;
  END IF;

  IF (SELECT auth.uid()) IS NOT NULL
    AND (SELECT auth.uid()) <> p_user_id
    AND NOT public.argos_is_self_or_forjador(p_user_id)
  THEN
    RAISE EXCEPTION 'permission denied for obter_calor_muscular_atleta'
      USING ERRCODE = '42501';
  END IF;

  v_ignicao := public.calcular_indice_ignicao_atleta(p_user_id);
  v_tem_bond := public.argos_has_forger_bond(p_user_id);

  SELECT EXISTS (
    SELECT 1
    FROM public.historico_treinos_personais htp
    WHERE htp.client_id = p_user_id
  )
  INTO v_tem_ficha;

  FOREACH v_membro IN ARRAY v_membros LOOP
    v_is_frozen := false;

    IF v_tem_bond AND v_tem_ficha THEN
      SELECT EXISTS (
        SELECT 1
        FROM public.evolucao_membros_prescritos_ativos(p_user_id) m
        WHERE m = v_membro
      )
      INTO v_prescrito;

      v_is_frozen := NOT COALESCE(v_prescrito, false);
    END IF;

    IF v_is_frozen THEN
      RETURN QUERY
      SELECT
        v_membro::text,
        COALESCE(
          (
            SELECT e.nivel_calculado
            FROM public.evolucao_membro_estase e
            WHERE e.user_id = p_user_id
              AND e.membro_principal = v_membro
          ),
          'CINZAS'
        ),
        true;
      CONTINUE;
    END IF;

    v_metric := public.evolucao_calcular_metrica_membro(p_user_id, v_membro);
    v_metric_final := v_metric;

    IF v_ignicao < 50 THEN
      v_metric_final := v_metric_final * 0.6;
    END IF;

    v_nivel := public.evolucao_classificar_nivel(v_membro, v_metric_final);

    INSERT INTO public.evolucao_membro_estase AS eme (
      user_id,
      membro_principal,
      nivel_calculado,
      metrica_bruta,
      updated_at
    )
    VALUES (
      p_user_id,
      v_membro,
      v_nivel,
      COALESCE(v_metric_final, 0),
      now()
    )
    ON CONFLICT (user_id, membro_principal)
    DO UPDATE SET
      nivel_calculado = EXCLUDED.nivel_calculado,
      metrica_bruta = EXCLUDED.metrica_bruta,
      updated_at = now();

    RETURN QUERY SELECT v_membro::text, v_nivel, false;
  END LOOP;
END;
$$;
