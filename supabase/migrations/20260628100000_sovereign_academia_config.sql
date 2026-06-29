-- FENYXIA · Configuração da academia (Forjador Soberano) · meta coletiva + limiares de fase
-- Custo zero: leituras via RPC STABLE; escritas via SECURITY DEFINER soberano

CREATE TABLE IF NOT EXISTS public.argos_academia_config (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  meta_coletiva_alvo_kg numeric(16, 2) NOT NULL DEFAULT 100000,
  phase_vtc_faisca numeric(16, 2) NOT NULL DEFAULT 5000,
  phase_vtc_brasa numeric(16, 2) NOT NULL DEFAULT 20000,
  phase_vtc_labareda numeric(16, 2) NOT NULL DEFAULT 50000,
  phase_vtc_fogo_cosmico numeric(16, 2) NOT NULL DEFAULT 100000,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT argos_academia_meta_pos CHECK (meta_coletiva_alvo_kg > 0),
  CONSTRAINT argos_academia_phase_order CHECK (
    phase_vtc_faisca > 0
    AND phase_vtc_brasa > phase_vtc_faisca
    AND phase_vtc_labareda > phase_vtc_brasa
    AND phase_vtc_fogo_cosmico > phase_vtc_labareda
  )
);

INSERT INTO public.argos_academia_config (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.argos_academia_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ARGOS academia config select autenticado" ON public.argos_academia_config;
CREATE POLICY "ARGOS academia config select autenticado"
ON public.argos_academia_config FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "ARGOS academia config write bloqueado" ON public.argos_academia_config;
CREATE POLICY "ARGOS academia config write bloqueado"
ON public.argos_academia_config FOR ALL TO authenticated
USING (false)
WITH CHECK (false);

-- Rastreio de sincronização mensal da meta de treino (Perfil)
ALTER TABLE public.planos_atletas
  ADD COLUMN IF NOT EXISTS meta_sync_mes date;

COMMENT ON COLUMN public.planos_atletas.meta_sync_mes IS
  'Mês civil (1º dia) em que o atleta sincronizou a meta de treino pela última vez.';

-- Feedback / suporte (Perfil)
CREATE TABLE IF NOT EXISTS public.cliente_suporte_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  categoria text NOT NULL DEFAULT 'geral',
  mensagem text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cliente_suporte_mensagem_len CHECK (char_length(btrim(mensagem)) BETWEEN 4 AND 4000)
);

CREATE INDEX IF NOT EXISTS idx_cliente_suporte_feedback_user_created
  ON public.cliente_suporte_feedback (user_id, created_at DESC);

ALTER TABLE public.cliente_suporte_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ARGOS suporte select proprio" ON public.cliente_suporte_feedback;
CREATE POLICY "ARGOS suporte select proprio"
ON public.cliente_suporte_feedback FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "ARGOS suporte insert bloqueado" ON public.cliente_suporte_feedback;
CREATE POLICY "ARGOS suporte insert bloqueado"
ON public.cliente_suporte_feedback FOR INSERT TO authenticated
WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.argos_read_academia_config_row()
RETURNS public.argos_academia_config
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.argos_academia_config WHERE id = 1;
$$;

CREATE OR REPLACE FUNCTION public.argos_phase_tier_from_vtc_30d(p_vtc_30d numeric)
RETURNS smallint
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cfg public.argos_academia_config;
  v_v numeric := COALESCE(p_vtc_30d, 0);
BEGIN
  SELECT * INTO v_cfg FROM public.argos_academia_config WHERE id = 1;

  IF v_cfg IS NULL THEN
    IF v_v >= 100000 THEN RETURN 5; END IF;
    IF v_v >= 50000 THEN RETURN 4; END IF;
    IF v_v >= 20000 THEN RETURN 3; END IF;
    IF v_v >= 5000 THEN RETURN 2; END IF;
    RETURN 1;
  END IF;

  IF v_v >= v_cfg.phase_vtc_fogo_cosmico THEN RETURN 5; END IF;
  IF v_v >= v_cfg.phase_vtc_labareda THEN RETURN 4; END IF;
  IF v_v >= v_cfg.phase_vtc_brasa THEN RETURN 3; END IF;
  IF v_v >= v_cfg.phase_vtc_faisca THEN RETURN 2; END IF;
  RETURN 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.comunidade_ensure_meta_mes(p_mes date DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mes date := COALESCE(p_mes, public.comunidade_mes_atual_sp());
  v_id uuid;
  v_prev date;
  v_alvo numeric(16, 2);
BEGIN
  v_prev := (v_mes - INTERVAL '1 month')::date;

  SELECT COALESCE(meta_coletiva_alvo_kg, 100000)
  INTO v_alvo
  FROM public.argos_academia_config
  WHERE id = 1;

  IF v_alvo IS NULL OR v_alvo <= 0 THEN
    v_alvo := 100000;
  END IF;

  INSERT INTO public.metas_coletivas_academia (mes_referencia, tonelagem_alvo_kg)
  VALUES (v_mes, v_alvo)
  ON CONFLICT (mes_referencia) DO NOTHING
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    SELECT id INTO v_id
    FROM public.metas_coletivas_academia
    WHERE mes_referencia = v_mes;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.metas_coletivas_academia WHERE mes_referencia = v_prev AND fechado_em IS NOT NULL
  ) AND EXISTS (
    SELECT 1 FROM public.metas_coletivas_academia WHERE mes_referencia = v_prev
  ) THEN
    PERFORM public.comunidade_fechar_pilares_mes(v_prev);
  END IF;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.argos_get_academia_config()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
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
  v_before public.argos_academia_config;
  v_after public.argos_academia_config;
BEGIN
  IF NOT public.argos_is_forjador_soberano() THEN
    RAISE EXCEPTION 'permission denied: sovereign only' USING ERRCODE = '42501';
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

  INSERT INTO public.argos_forja_audit_log (sovereign_id, target_id, action, payload)
  VALUES (
    auth.uid(),
    NULL,
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
  v_mes date := COALESCE(p_mes, public.comunidade_mes_atual_sp());
  v_alvo numeric(16, 2) := COALESCE(p_alvo_kg, 0);
BEGIN
  IF NOT public.argos_is_forjador_soberano() THEN
    RAISE EXCEPTION 'permission denied: sovereign only' USING ERRCODE = '42501';
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
    auth.uid(),
    NULL,
    'set_meta_coletiva_alvo',
    jsonb_build_object('mes_referencia', v_mes, 'tonelagem_alvo_kg', v_alvo)
  );

  RETURN jsonb_build_object('ok', true, 'mes_referencia', v_mes, 'tonelagem_alvo_kg', v_alvo);
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

CREATE OR REPLACE FUNCTION public.client_submit_feedback(
  p_categoria text,
  p_mensagem text
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_msg text := btrim(COALESCE(p_mensagem, ''));
  v_cat text := btrim(COALESCE(p_categoria, 'geral'));
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'permission denied' USING ERRCODE = '42501';
  END IF;

  IF char_length(v_msg) < 4 THEN
    RAISE EXCEPTION 'mensagem muito curta' USING ERRCODE = '22023';
  END IF;

  IF v_cat = '' THEN
    v_cat := 'geral';
  END IF;

  INSERT INTO public.cliente_suporte_feedback (user_id, categoria, mensagem)
  VALUES (v_uid, v_cat, v_msg);

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.argos_read_academia_config_row() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.argos_get_academia_config() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.argos_sovereign_update_academia_config(jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.argos_sovereign_set_meta_coletiva_alvo(numeric, date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.client_sync_plano_meta(integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.client_submit_feedback(text, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.argos_get_academia_config() TO authenticated;
GRANT EXECUTE ON FUNCTION public.argos_sovereign_update_academia_config(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.argos_sovereign_set_meta_coletiva_alvo(numeric, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.client_sync_plano_meta(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.client_submit_feedback(text, text) TO authenticated;
