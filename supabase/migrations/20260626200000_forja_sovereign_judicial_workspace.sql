-- FENYXIA · Forja · Painel Soberano · Anti-fraude · Planilhas batch · ARGOS judicial

-- ---------------------------------------------------------------------------
-- 1. Audit log (somente soberano escreve · forjador lê sinais agregados)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.argos_forja_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sovereign_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  target_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  action text NOT NULL CHECK (
    action IN (
      'purify_to_ashes',
      'deactivate_account',
      'reactivate_account',
      'modify_statistics',
      'batch_planilha'
    )
  ),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_argos_forja_audit_target_created
  ON public.argos_forja_audit_log (target_id, created_at DESC);

ALTER TABLE public.argos_forja_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ARGOS forja audit select sovereign" ON public.argos_forja_audit_log;
CREATE POLICY "ARGOS forja audit select sovereign"
ON public.argos_forja_audit_log FOR SELECT TO authenticated
USING (public.argos_is_forjador_soberano());

DROP POLICY IF EXISTS "ARGOS forja audit select forjador scoped" ON public.argos_forja_audit_log;
CREATE POLICY "ARGOS forja audit select forjador scoped"
ON public.argos_forja_audit_log FOR SELECT TO authenticated
USING (
  public.argos_is_forjador_linhagem()
  AND public.argos_can_access_cliente(target_id)
);

REVOKE ALL ON TABLE public.argos_forja_audit_log FROM PUBLIC, anon;
GRANT SELECT ON TABLE public.argos_forja_audit_log TO authenticated;
GRANT ALL ON TABLE public.argos_forja_audit_log TO service_role;

-- ---------------------------------------------------------------------------
-- 2. Helper · registo audit (interno)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.argos_forja_audit_write(
  p_target_id uuid,
  p_action text,
  p_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.argos_forja_audit_log (sovereign_id, target_id, action, payload)
  VALUES (auth.uid(), p_target_id, p_action, COALESCE(p_payload, '{}'::jsonb));
END;
$$;

REVOKE ALL ON FUNCTION public.argos_forja_audit_write(uuid, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.argos_forja_audit_write(uuid, text, jsonb) TO service_role;

-- ---------------------------------------------------------------------------
-- 3. Purify to Ashes · reset mensal VTC/VRA · layout CINZAS instantâneo
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.argos_sovereign_purify_to_ashes(p_target_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month_start date := date_trunc('month', timezone('America/Sao_Paulo', now()))::date;
  v_deleted_balanco integer := 0;
  v_deleted_cargas integer := 0;
BEGIN
  IF NOT public.argos_is_forjador_soberano() THEN
    RAISE EXCEPTION 'permission denied: sovereign only'
      USING ERRCODE = '42501';
  END IF;

  IF p_target_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = p_target_id AND role = 'cliente'::public.user_role
  ) THEN
    RAISE EXCEPTION 'invalid target athlete'
      USING ERRCODE = '22023';
  END IF;

  DELETE FROM public.balanco_termico_diario b
  WHERE b.user_id = p_target_id
    AND b.data_treino >= v_month_start;
  GET DIAGNOSTICS v_deleted_balanco = ROW_COUNT;

  DELETE FROM public.historico_cargas hc
  WHERE hc.atleta_id = p_target_id
    AND hc.data_registro >= v_month_start;
  GET DIAGNOSTICS v_deleted_cargas = ROW_COUNT;

  UPDATE public.matriz_forca
  SET
    vtc_atual = 0,
    estagio = 'cinzas'::public.estagio_forca,
    updated_at = now()
  WHERE cliente_id = p_target_id;

  UPDATE public.evolucao_membro_estase
  SET
    nivel_calculado = 'CINZAS',
    metrica_bruta = 0,
    updated_at = now()
  WHERE user_id = p_target_id;

  PERFORM set_config('meccafit.phase_rpc_update', 'true', true);
  UPDATE public.profiles
  SET
    phase_tier = 1,
    status_altar = 'Purificado',
    updated_at = now()
  WHERE id = p_target_id;

  INSERT INTO public.argos_forja_audit_log (sovereign_id, target_id, action, payload)
  VALUES (
    auth.uid(),
    p_target_id,
    'purify_to_ashes',
    jsonb_build_object(
      'month_start', v_month_start,
      'deleted_balanco_rows', v_deleted_balanco,
      'deleted_cargas_rows', v_deleted_cargas,
      'layout', 'CINZAS'
    )
  );

  RETURN jsonb_build_object(
    'ok', true,
    'layout', 'CINZAS',
    'phase_tier', 1,
    'deleted_balanco_rows', v_deleted_balanco,
    'deleted_cargas_rows', v_deleted_cargas
  );
END;
$$;

REVOKE ALL ON FUNCTION public.argos_sovereign_purify_to_ashes(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.argos_sovereign_purify_to_ashes(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. Deactivate / Reactivate account
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.argos_sovereign_deactivate_account(
  p_target_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.argos_is_forjador_soberano() THEN
    RAISE EXCEPTION 'permission denied: sovereign only'
      USING ERRCODE = '42501';
  END IF;

  IF p_target_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = p_target_id AND role = 'cliente'::public.user_role
  ) THEN
    RAISE EXCEPTION 'invalid target athlete'
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.profiles
  SET status_altar = 'Suspenso', updated_at = now()
  WHERE id = p_target_id;

  INSERT INTO public.argos_forja_audit_log (sovereign_id, target_id, action, payload)
  VALUES (
    auth.uid(),
    p_target_id,
    'deactivate_account',
    jsonb_build_object('reason', NULLIF(btrim(COALESCE(p_reason, '')), ''))
  );

  RETURN jsonb_build_object('ok', true, 'status_altar', 'Suspenso');
END;
$$;

CREATE OR REPLACE FUNCTION public.argos_sovereign_reactivate_account(p_target_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.argos_is_forjador_soberano() THEN
    RAISE EXCEPTION 'permission denied: sovereign only'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.profiles
  SET status_altar = 'Ativo', updated_at = now()
  WHERE id = p_target_id AND role = 'cliente'::public.user_role;

  INSERT INTO public.argos_forja_audit_log (sovereign_id, target_id, action, payload)
  VALUES (auth.uid(), p_target_id, 'reactivate_account', '{}'::jsonb);

  RETURN jsonb_build_object('ok', true, 'status_altar', 'Ativo');
END;
$$;

REVOKE ALL ON FUNCTION public.argos_sovereign_deactivate_account(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.argos_sovereign_reactivate_account(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.argos_sovereign_deactivate_account(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.argos_sovereign_reactivate_account(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 5. Modify statistics (sovereign override)
-- ---------------------------------------------------------------------------

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

  IF p_patch ? 'vtc_today_delta' THEN
    v_vtc_delta := GREATEST(COALESCE((p_patch->>'vtc_today_delta')::numeric, 0), 0);
    IF v_vtc_delta > 0 THEN
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

REVOKE ALL ON FUNCTION public.argos_sovereign_modify_statistics(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.argos_sovereign_modify_statistics(uuid, jsonb) TO authenticated;

-- ---------------------------------------------------------------------------
-- 6. Batch UPSERT planilhas_forjador (forjador bonded · soberano global)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.argos_batch_upsert_planilhas_forjador(
  p_atleta_id uuid,
  p_rows jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted integer := 0;
  v_row jsonb;
  v_dia smallint;
  v_grupo text;
  v_ordem smallint;
BEGIN
  IF p_atleta_id IS NULL OR p_rows IS NULL OR jsonb_typeof(p_rows) <> 'array' THEN
    RAISE EXCEPTION 'invalid planilha payload'
      USING ERRCODE = '22023';
  END IF;

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
    IF v_grupo NOT IN ('PEITO', 'COSTAS', 'PERNAS', 'OMBROS', 'BRACOS') THEN
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
      'batch_planilha',
      jsonb_build_object('rows', v_inserted)
    );
  END IF;

  RETURN jsonb_build_object('ok', true, 'rows_upserted', v_inserted);
END;
$$;

REVOKE ALL ON FUNCTION public.argos_batch_upsert_planilhas_forjador(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.argos_batch_upsert_planilhas_forjador(uuid, jsonb) TO authenticated;

-- ---------------------------------------------------------------------------
-- 7. Anti-fraud signals (monitoramento · leitura forjador)
-- ---------------------------------------------------------------------------

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
  v_today date := (timezone('America/Sao_Paulo', now()))::date;
BEGIN
  IF NOT public.argos_is_forjador_linhagem()
     AND NOT public.argos_is_forjador_soberano() THEN
    RAISE EXCEPTION 'permission denied'
      USING ERRCODE = '42501';
  END IF;

  FOR v_row IN
    SELECT
      p.id AS atleta_id,
      COALESCE(NULLIF(btrim(p.full_name), ''), NULLIF(btrim(p.nome_linhagem), ''), p.id::text) AS display_name,
      p.status_altar,
      p.phase_tier,
      COALESCE((
        SELECT SUM(b.vtc_total)
        FROM public.balanco_termico_diario b
        WHERE b.user_id = p.id AND b.data_treino >= (v_today - 30)
      ), 0) AS vtc_30d,
      COALESCE((
        SELECT b.vtc_total
        FROM public.balanco_termico_diario b
        WHERE b.user_id = p.id AND b.data_treino = v_today
      ), 0) AS vtc_today,
      COALESCE((
        SELECT AVG(sub.vtc_total)
        FROM (
          SELECT b.vtc_total
          FROM public.balanco_termico_diario b
          WHERE b.user_id = p.id
            AND b.data_treino >= (v_today - 7)
            AND b.data_treino < v_today
        ) sub
      ), 0) AS vtc_avg_7d,
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
      AND (
        public.argos_is_forjador_soberano()
        OR public.argos_can_access_cliente(p.id)
      )
    ORDER BY p.full_name NULLS LAST, p.nome_linhagem NULLS LAST
    LIMIT CASE WHEN p_cliente_id IS NULL THEN 128 ELSE 1 END
  LOOP
    IF lower(COALESCE(v_row.status_altar, 'ativo')) NOT IN ('ativo', 'purificado')
       AND v_row.treinos_7d > 0 THEN
      v_signals := v_signals || jsonb_build_array(jsonb_build_object(
        'severity', 'critical',
        'code', 'SUSPENDED_ACTIVE_TRAINING',
        'atleta_id', v_row.atleta_id,
        'display_name', v_row.display_name,
        'message', 'Conta suspensa com treinos registados nos últimos 7 dias.'
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
        'message', format('VTC hoje (%.0f kg) excede 4× média 7d (%.0f kg).', v_row.vtc_today, v_row.vtc_avg_7d)
      ));
    END IF;

    IF v_row.cargas_24h > 30 THEN
      v_signals := v_signals || jsonb_build_array(jsonb_build_object(
        'severity', 'critical',
        'code', 'CARGA_FLOOD',
        'atleta_id', v_row.atleta_id,
        'display_name', v_row.display_name,
        'message', format('%s registos em historico_cargas nas últimas 24h.', v_row.cargas_24h)
      ));
    END IF;

    IF v_row.phase_tier >= 3 AND v_row.vtc_30d < 1000 THEN
      v_signals := v_signals || jsonb_build_array(jsonb_build_object(
        'severity', 'warn',
        'code', 'TIER_VTC_MISMATCH',
        'atleta_id', v_row.atleta_id,
        'display_name', v_row.display_name,
        'message', format('Fase %s com VTC 30d baixo (%.0f kg).', v_row.phase_tier, v_row.vtc_30d)
      ));
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'signals', v_signals,
    'count', jsonb_array_length(v_signals)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.argos_forja_fraud_signals(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.argos_forja_fraud_signals(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 8. Planilhas · soberano pode escrever qualquer atleta
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "ARGOS planilhas_forjador insert forjador" ON public.planilhas_forjador;
CREATE POLICY "ARGOS planilhas_forjador insert forjador"
ON public.planilhas_forjador FOR INSERT TO authenticated
WITH CHECK (
  public.argos_is_forjador_soberano()
  OR (
    public.argos_is_forjador_linhagem()
    AND public.argos_is_forjador_of_cliente(atleta_id)
  )
);

DROP POLICY IF EXISTS "ARGOS planilhas_forjador update forjador" ON public.planilhas_forjador;
CREATE POLICY "ARGOS planilhas_forjador update forjador"
ON public.planilhas_forjador FOR UPDATE TO authenticated
USING (
  public.argos_is_forjador_soberano()
  OR (
    public.argos_is_forjador_linhagem()
    AND public.argos_is_forjador_of_cliente(atleta_id)
  )
)
WITH CHECK (
  public.argos_is_forjador_soberano()
  OR (
    public.argos_is_forjador_linhagem()
    AND public.argos_is_forjador_of_cliente(atleta_id)
  )
);

DROP POLICY IF EXISTS "ARGOS planilhas_forjador delete forjador" ON public.planilhas_forjador;
CREATE POLICY "ARGOS planilhas_forjador delete forjador"
ON public.planilhas_forjador FOR DELETE TO authenticated
USING (
  public.argos_is_forjador_soberano()
  OR (
    public.argos_is_forjador_linhagem()
    AND public.argos_is_forjador_of_cliente(atleta_id)
  )
);

DROP POLICY IF EXISTS "ARGOS planilhas_forjador select forjador bonded" ON public.planilhas_forjador;
CREATE POLICY "ARGOS planilhas_forjador select forjador scoped"
ON public.planilhas_forjador FOR SELECT TO authenticated
USING (
  atleta_id = auth.uid()
  OR public.argos_is_forjador_soberano()
  OR public.argos_is_forjador_of_cliente(atleta_id)
);
