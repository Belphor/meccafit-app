-- Prescrições: permitir ABDOMEN + planilha RPC aceitar ABDOMEN

ALTER TABLE public.prescricoes_treino_forjador
  DROP CONSTRAINT IF EXISTS prescricoes_treino_forjador_grupo_muscular_check;

ALTER TABLE public.prescricoes_treino_forjador
  ADD CONSTRAINT prescricoes_treino_forjador_grupo_muscular_check
  CHECK (grupo_muscular IN ('PEITO', 'COSTAS', 'PERNAS', 'OMBROS', 'BRACOS', 'ABDOMEN'));

CREATE OR REPLACE FUNCTION public.argos_batch_upsert_planilhas_forjador(
  p_atleta_id uuid,
  p_rows jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row jsonb;
  v_dia smallint;
  v_grupo text;
  v_ordem smallint;
  v_inserted integer := 0;
BEGIN
  IF NOT public.argos_can_access_cliente(p_atleta_id) THEN
    RAISE EXCEPTION 'permission denied for planilha upsert'
      USING ERRCODE = '42501';
  END IF;

  IF NOT public.argos_is_forjador_linhagem()
     AND NOT public.argos_is_forjador_soberano() THEN
    RAISE EXCEPTION 'permission denied: forjador only'
      USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.planilhas_forjador WHERE atleta_id = p_atleta_id;

  FOR v_row IN SELECT value FROM jsonb_array_elements(p_rows)
  LOOP
    v_dia := (v_row->>'dia_semana')::smallint;
    v_grupo := upper(btrim(v_row->>'grupo_muscular'));
    v_ordem := COALESCE((v_row->>'ordem')::smallint, 1);

    IF v_dia IS NULL OR v_dia < 1 OR v_dia > 6 THEN
      CONTINUE;
    END IF;
    IF v_grupo NOT IN ('PEITO', 'COSTAS', 'PERNAS', 'OMBROS', 'BRACOS', 'ABDOMEN') THEN
      CONTINUE;
    END IF;
    IF v_ordem < 1 OR v_ordem > 5 THEN
      v_ordem := 1;
    END IF;

    INSERT INTO public.planilhas_forjador (atleta_id, dia_semana, grupo_muscular, ordem)
    VALUES (p_atleta_id, v_dia, v_grupo, v_ordem)
    ON CONFLICT (atleta_id, dia_semana, ordem)
    DO UPDATE SET grupo_muscular = EXCLUDED.grupo_muscular, updated_at = now();

    v_inserted := v_inserted + 1;
  END LOOP;

  IF public.argos_is_forjador_soberano() THEN
    INSERT INTO public.argos_forja_audit_log (sovereign_id, target_id, action, payload)
    VALUES (
      auth.uid(),
      p_atleta_id,
      'planilha_batch_upsert',
      jsonb_build_object('rows_upserted', v_inserted)
    );
  END IF;

  RETURN jsonb_build_object('rows_upserted', v_inserted);
END;
$$;
