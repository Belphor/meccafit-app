-- FENYXIA · Split Workout Architecture — duas vias IRIS (Membro Superior · Membro Inferior)
-- Requer: schema Meccafit base + registrar_treino_com_status (20260527241000)
--
-- Via A · Membro Superior — peito, costas, ombros, braços, abdômen
-- Via B · Membro Inferior — pernas
--
-- Escritas em workout_split_lane apenas via RPC (flag app.rpc_registrar_treino).

-- ---------------------------------------------------------------------------
-- 1. Enum canónico — duas vias de treino
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'workout_split_via') THEN
    CREATE TYPE public.workout_split_via AS ENUM (
      'via_a',
      'via_b'
    );
  END IF;
END $$;

COMMENT ON TYPE public.workout_split_via IS
  'Via A = Membro Superior (incl. abdômen) · Via B = Membro Inferior (split A/B Meccafit)';

-- Requer 20260528590000_add_abdomen_subgrupo_muscular.sql já aplicada (enum abdomen commitado).

-- ---------------------------------------------------------------------------
-- 1b. matriz_forca — linha abdômen para clientes existentes
-- ---------------------------------------------------------------------------

INSERT INTO public.matriz_forca (cliente_id, musculo)
SELECT p.id, 'abdomen'::public.subgrupo_muscular
FROM public.profiles p
WHERE p.role = 'cliente'::public.user_role
ON CONFLICT (cliente_id, musculo) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. Estado por via — VTC de sessão e última actividade (por cliente)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.workout_split_lane (
  cliente_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  workout_via public.workout_split_via NOT NULL,
  session_vtc_today numeric(12, 2) NOT NULL DEFAULT 0,
  exercises_logged_today integer NOT NULL DEFAULT 0,
  last_session_date date,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (cliente_id, workout_via),
  CONSTRAINT workout_split_lane_session_vtc_nonneg CHECK (session_vtc_today >= 0),
  CONSTRAINT workout_split_lane_exercises_nonneg CHECK (exercises_logged_today >= 0)
);

CREATE INDEX IF NOT EXISTS idx_workout_split_lane_cliente_updated
  ON public.workout_split_lane (cliente_id, updated_at DESC);

-- ---------------------------------------------------------------------------
-- 3. historico_treinos — coluna de via (backfill por músculo)
-- ---------------------------------------------------------------------------

ALTER TABLE public.historico_treinos
  ADD COLUMN IF NOT EXISTS workout_via public.workout_split_via;

CREATE INDEX IF NOT EXISTS idx_historico_treinos_cliente_workout_via
  ON public.historico_treinos (cliente_id, workout_via, registrado_em DESC);

-- ---------------------------------------------------------------------------
-- 4. Funções — resolução de via e métricas por lane
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.workout_resolve_split_via(p_musculo public.subgrupo_muscular)
RETURNS public.workout_split_via
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_musculo = 'pernas'::public.subgrupo_muscular THEN 'via_b'::public.workout_split_via
    ELSE 'via_a'::public.workout_split_via
  END;
$$;

CREATE OR REPLACE FUNCTION public.workout_split_via_label(p_via public.workout_split_via)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_via
    WHEN 'via_a'::public.workout_split_via THEN 'Membro Superior'
    WHEN 'via_b'::public.workout_split_via THEN 'Membro Inferior'
  END;
$$;

CREATE OR REPLACE FUNCTION public.workout_apply_lane_session_internal(
  p_cliente_id uuid,
  p_via public.workout_split_via,
  p_vtc_delta numeric
)
RETURNS public.workout_split_lane
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.workout_split_lane;
  v_today date := (timezone('America/Sao_Paulo', now()))::date;
BEGIN
  IF p_cliente_id IS NULL OR p_via IS NULL OR p_vtc_delta IS NULL OR p_vtc_delta <= 0 THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.workout_split_lane (
    cliente_id,
    workout_via,
    session_vtc_today,
    exercises_logged_today,
    last_session_date,
    updated_at
  )
  VALUES (
    p_cliente_id,
    p_via,
    p_vtc_delta,
    1,
    v_today,
    now()
  )
  ON CONFLICT (cliente_id, workout_via)
  DO UPDATE SET
    session_vtc_today = CASE
      WHEN public.workout_split_lane.last_session_date IS DISTINCT FROM v_today THEN EXCLUDED.session_vtc_today
      ELSE public.workout_split_lane.session_vtc_today + EXCLUDED.session_vtc_today
    END,
    exercises_logged_today = CASE
      WHEN public.workout_split_lane.last_session_date IS DISTINCT FROM v_today THEN 1
      ELSE public.workout_split_lane.exercises_logged_today + 1
    END,
    last_session_date = v_today,
    updated_at = now()
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.workout_apply_lane_session_internal(uuid, public.workout_split_via, numeric)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.argos_compute_session_vtc_by_via(
  p_user_id uuid,
  p_via public.workout_split_via
)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(wsl.session_vtc_today, 0)
  FROM public.workout_split_lane wsl
  WHERE wsl.cliente_id = p_user_id
    AND wsl.workout_via = p_via
    AND wsl.last_session_date = (timezone('America/Sao_Paulo', now()))::date;
$$;

REVOKE ALL ON FUNCTION public.argos_compute_session_vtc_by_via(uuid, public.workout_split_via)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.argos_compute_session_vtc_by_via(uuid, public.workout_split_via)
  TO authenticated, service_role;

-- Backfill historico existente
UPDATE public.historico_treinos ht
SET workout_via = public.workout_resolve_split_via(
  CASE
    WHEN LOWER(BTRIM(ht.musculo)) IN ('costas', 'peito', 'ombros', 'bracos', 'pernas', 'abdomen')
      THEN LOWER(BTRIM(ht.musculo))::public.subgrupo_muscular
    WHEN LOWER(BTRIM(ht.musculo)) LIKE '%perna%' THEN 'pernas'::public.subgrupo_muscular
    WHEN LOWER(BTRIM(ht.musculo)) IN ('abdome', 'abdômen', 'core', 'abdomen')
      THEN 'abdomen'::public.subgrupo_muscular
    ELSE 'peito'::public.subgrupo_muscular
  END
)
WHERE ht.workout_via IS NULL
  AND ht.cliente_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 5. RLS — workout_split_lane (leitura scoped · escrita só RPC)
-- ---------------------------------------------------------------------------

ALTER TABLE public.workout_split_lane ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ARGOS workout_split_lane select self or forjador" ON public.workout_split_lane;
CREATE POLICY "ARGOS workout_split_lane select self or forjador"
ON public.workout_split_lane
FOR SELECT
TO authenticated
USING (public.argos_is_self_or_forjador(cliente_id));

-- ---------------------------------------------------------------------------
-- 6. registrar_treino_com_status — tag via + actualiza lane + payload
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.registrar_treino_com_status(
  p_user_id uuid,
  p_exercicio_id text DEFAULT NULL,
  p_peso_atual numeric DEFAULT NULL,
  p_musculo text DEFAULT 'costas',
  p_repeticoes integer DEFAULT 1,
  p_series integer DEFAULT 1,
  p_exercicio_nome text DEFAULT 'Treino geral'
)
RETURNS TABLE (
  status text,
  max_peso_atual numeric,
  peso_atual numeric,
  vtc_gerado numeric,
  payload jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exercicio_id integer;
  v_max_anterior numeric;
  v_max_atual numeric;
  v_vtc numeric;
  v_status text;
  v_musculo public.subgrupo_muscular;
  v_role public.user_role;
  v_mecca_kg bigint;
  v_mecca_metrics public.mecca_global_metrics;
  v_workout_via public.workout_split_via;
  v_lane public.workout_split_lane;
BEGIN
  PERFORM set_config('app.rpc_registrar_treino', '1', true);

  IF (SELECT auth.uid()) IS NULL OR (SELECT auth.uid()) <> p_user_id THEN
    RAISE EXCEPTION 'permission denied for registrar_treino_com_status'
      USING ERRCODE = '42501';
  END IF;

  IF p_peso_atual IS NULL OR p_peso_atual <= 0 OR p_peso_atual > 9999.99 THEN
    RAISE EXCEPTION 'peso inválido para historico_treinos'
      USING ERRCODE = '22023';
  END IF;

  IF p_repeticoes IS NULL OR p_repeticoes <= 0 OR p_series IS NULL OR p_series <= 0 THEN
    RAISE EXCEPTION 'repetições e séries devem ser maiores que zero'
      USING ERRCODE = '22023';
  END IF;

  BEGIN
    v_exercicio_id := NULLIF(BTRIM(COALESCE(p_exercicio_id, '')), '')::integer;
  EXCEPTION
    WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'exercicio_id inválido'
        USING ERRCODE = '22023';
  END;

  IF v_exercicio_id IS NULL OR v_exercicio_id <= 0 THEN
    RAISE EXCEPTION 'exercicio_id inválido'
      USING ERRCODE = '22023';
  END IF;

  BEGIN
    v_musculo := LOWER(BTRIM(COALESCE(p_musculo, 'costas')))::public.subgrupo_muscular;
  EXCEPTION
    WHEN invalid_text_representation THEN
      v_musculo := 'costas'::public.subgrupo_muscular;
  END;

  v_workout_via := public.workout_resolve_split_via(v_musculo);
  v_vtc := p_peso_atual * p_repeticoes * p_series;

  SELECT ht.peso_atual
  INTO v_max_anterior
  FROM public.historico_treinos ht
  WHERE ht.cliente_id = p_user_id
    AND ht.exercicio_id = v_exercicio_id;

  v_status := CASE
    WHEN v_max_anterior IS NULL OR p_peso_atual > v_max_anterior THEN 'SUPERAÇÃO'
    ELSE 'CONCLUÍDO'
  END;

  INSERT INTO public.historico_treinos (
    user_id,
    cliente_id,
    exercicio_id,
    exercicio_nome,
    musculo,
    workout_via,
    peso_atual,
    peso,
    repeticoes,
    series,
    status,
    registrado_em,
    updated_at
  )
  VALUES (
    p_user_id,
    p_user_id,
    v_exercicio_id,
    COALESCE(NULLIF(BTRIM(p_exercicio_nome), ''), 'Treino geral'),
    v_musculo::text,
    v_workout_via,
    p_peso_atual,
    p_peso_atual,
    p_repeticoes,
    p_series,
    v_status,
    NOW(),
    NOW()
  )
  ON CONFLICT (cliente_id, exercicio_id) WHERE cliente_id IS NOT NULL
  DO UPDATE SET
    peso_atual = GREATEST(public.historico_treinos.peso_atual, EXCLUDED.peso_atual),
    peso = GREATEST(COALESCE(public.historico_treinos.peso, 0), EXCLUDED.peso_atual),
    repeticoes = EXCLUDED.repeticoes,
    series = EXCLUDED.series,
    status = CASE
      WHEN EXCLUDED.peso_atual > COALESCE(public.historico_treinos.peso_atual, 0) THEN 'SUPERAÇÃO'
      ELSE COALESCE(public.historico_treinos.status, 'CONCLUÍDO')
    END,
    exercicio_nome = EXCLUDED.exercicio_nome,
    musculo = EXCLUDED.musculo,
    workout_via = EXCLUDED.workout_via,
    updated_at = NOW(),
    registrado_em = CASE
      WHEN EXCLUDED.peso_atual > COALESCE(public.historico_treinos.peso_atual, 0) THEN NOW()
      ELSE public.historico_treinos.registrado_em
    END;

  IF p_peso_atual > COALESCE(v_max_anterior, 0) THEN
    v_status := 'SUPERAÇÃO';
  ELSE
    v_status := 'CONCLUÍDO';
  END IF;

  SELECT ht.peso_atual
  INTO v_max_atual
  FROM public.historico_treinos ht
  WHERE ht.cliente_id = p_user_id
    AND ht.exercicio_id = v_exercicio_id;

  IF v_max_atual IS NULL THEN
    v_max_atual := p_peso_atual;
  END IF;

  INSERT INTO public.matriz_forca (
    cliente_id,
    musculo,
    vtc_atual,
    estagio
  )
  VALUES (
    p_user_id,
    v_musculo,
    v_vtc,
    'cinzas'::public.estagio_forca
  )
  ON CONFLICT (cliente_id, musculo)
  DO UPDATE SET
    vtc_atual = COALESCE(public.matriz_forca.vtc_atual, 0) + EXCLUDED.vtc_atual,
    updated_at = NOW();

  PERFORM public.argos_upsert_balanco_termico_diario(p_user_id, v_vtc);

  v_lane := public.workout_apply_lane_session_internal(p_user_id, v_workout_via, v_vtc);

  SELECT p.role INTO v_role
  FROM public.profiles p
  WHERE p.id = p_user_id;

  v_mecca_kg := NULL;
  v_mecca_metrics := NULL;

  IF v_role = 'cliente'::public.user_role THEN
    v_mecca_kg := LEAST(GREATEST(FLOOR(v_vtc)::bigint, 1), 99999);
    v_mecca_metrics := public.mecca_apply_contribution_internal(v_mecca_kg);
  END IF;

  status := v_status;
  max_peso_atual := v_max_atual;
  peso_atual := p_peso_atual;
  vtc_gerado := v_vtc;
  payload := jsonb_build_object(
    'evento', v_status,
    'mensagem', CASE
      WHEN v_status = 'SUPERAÇÃO' THEN 'SUPERAÇÃO registrada na MATRIX DA ALMA.'
      ELSE 'Treino concluído e registrado na MATRIX DA ALMA.'
    END,
    'cliente_id', p_user_id,
    'musculo', v_musculo,
    'exercicio_id', v_exercicio_id,
    'peso', p_peso_atual,
    'repeticoes', p_repeticoes,
    'series', p_series,
    'vtc_gerado', v_vtc,
    'max_peso_atual', v_max_atual,
    'session_vtc_today', public.argos_compute_session_vtc_today(p_user_id),
    'vtc_30d', public.argos_compute_vtc_30d(p_user_id),
    'workout_via', v_workout_via,
    'workout_via_label', public.workout_split_via_label(v_workout_via),
    'session_vtc_via_today', COALESCE(v_lane.session_vtc_today, 0),
    'exercises_logged_via_today', COALESCE(v_lane.exercises_logged_today, 0),
    'mecca_contribution_kg', v_mecca_kg,
    'mecca_furnace_temperature', CASE
      WHEN v_mecca_metrics IS NULL THEN NULL
      ELSE v_mecca_metrics.furnace_temperature
    END,
    'mecca_total_weight_lifted', CASE
      WHEN v_mecca_metrics IS NULL THEN NULL
      ELSE v_mecca_metrics.total_weight_lifted
    END
  );

  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.registrar_treino_com_status(uuid, text, numeric, text, integer, integer, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_treino_com_status(uuid, text, numeric, text, integer, integer, text)
  TO authenticated, service_role;
