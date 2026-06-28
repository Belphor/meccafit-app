-- Acesso forjador via vínculo VIP + sincronização profiles.forjador_id

-- ---------------------------------------------------------------------------
-- 1. Forjador reconhece cliente por bond OU profiles.forjador_id
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.argos_is_forjador_of_cliente(p_cliente_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.argos_is_forjador_linhagem()
    AND (
      EXISTS (
        SELECT 1
        FROM public.profiles cliente
        WHERE cliente.id = p_cliente_id
          AND cliente.forjador_id = (SELECT auth.uid())
      )
      OR EXISTS (
        SELECT 1
        FROM public.forger_client_bonds b
        WHERE b.client_id = p_cliente_id
          AND b.forger_id = (SELECT auth.uid())
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.argos_can_read_profile(p_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_profile_id = (SELECT auth.uid())
    OR public.argos_is_forjador_soberano()
    OR (
      public.argos_is_forjador_linhagem()
      AND (
        EXISTS (
          SELECT 1
          FROM public.profiles cliente
          WHERE cliente.id = p_profile_id
            AND cliente.forjador_id = (SELECT auth.uid())
        )
        OR EXISTS (
          SELECT 1
          FROM public.forger_client_bonds b
          WHERE b.client_id = p_profile_id
            AND b.forger_id = (SELECT auth.uid())
        )
      )
    );
$$;

-- ---------------------------------------------------------------------------
-- 2. Ao criar vínculo VIP, alinhar profiles.forjador_id (com bypass do guard)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.argos_profiles_guard_sensitive_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('meccafit.bootstrap_profile', true) = 'true'
     OR current_setting('meccafit.phase_rpc_update', true) = 'true'
     OR current_setting('meccafit.bond_sync_update', true) = 'true' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.role := 'cliente'::public.user_role;
    NEW.phase_tier := LEAST(GREATEST(COALESCE(NEW.phase_tier, 1), 1), 5);
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.role IS DISTINCT FROM OLD.role
       OR NEW.forjador_id IS DISTINCT FROM OLD.forjador_id THEN
      IF NOT public.argos_is_forjador_soberano() THEN
        RAISE EXCEPTION 'permission denied for profile privilege change'
          USING ERRCODE = '42501';
      END IF;
    END IF;

    IF NEW.phase_tier IS DISTINCT FROM OLD.phase_tier
       OR NEW.phase_setup_at IS DISTINCT FROM OLD.phase_setup_at
       OR NEW.custom_preferences IS DISTINCT FROM OLD.custom_preferences THEN
      RAISE EXCEPTION 'permission denied for profile phase or cosmetics change'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.forger_client_bonds_sync_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('meccafit.bond_sync_update', 'true', true);

  UPDATE public.profiles
  SET forjador_id = NEW.forger_id, updated_at = now()
  WHERE id = NEW.client_id
    AND role = 'cliente'::public.user_role
    AND (forjador_id IS DISTINCT FROM NEW.forger_id);

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.forger_client_bonds_backfill_profiles()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('meccafit.bond_sync_update', 'true', true);

  UPDATE public.profiles p
  SET forjador_id = b.forger_id, updated_at = now()
  FROM public.forger_client_bonds b
  WHERE b.client_id = p.id
    AND p.role = 'cliente'::public.user_role
    AND p.forjador_id IS DISTINCT FROM b.forger_id;
END;
$$;

DROP TRIGGER IF EXISTS trg_forger_client_bonds_sync_profile ON public.forger_client_bonds;
CREATE TRIGGER trg_forger_client_bonds_sync_profile
AFTER INSERT OR UPDATE OF forger_id, client_id ON public.forger_client_bonds
FOR EACH ROW
EXECUTE FUNCTION public.forger_client_bonds_sync_profile();

SELECT public.forger_client_bonds_backfill_profiles();

REVOKE ALL ON FUNCTION public.forger_client_bonds_backfill_profiles() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.forger_client_bonds_backfill_profiles() TO service_role;

-- ---------------------------------------------------------------------------
-- 3. Medidas VIP — personal vinculado pode actualizar snapshot activo
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "ARGOS vip_medidas_corporais update forger bonded" ON public.vip_medidas_corporais;
CREATE POLICY "ARGOS vip_medidas_corporais update forger bonded"
ON public.vip_medidas_corporais
FOR UPDATE
TO authenticated
USING (
  public.argos_is_forjador_soberano()
  OR (
    public.argos_is_forger_bonded_to_client(client_id)
    AND public.argos_is_forger_personal((SELECT auth.uid()))
  )
)
WITH CHECK (
  public.argos_is_forjador_soberano()
  OR (
    forger_id = (SELECT auth.uid())
    AND public.argos_is_forger_bonded_to_client(client_id)
  )
);

-- ---------------------------------------------------------------------------
-- 4. RPC · upsert prescrição de treino (forjador + soberano)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.argos_forja_upsert_prescricao_treino(
  p_atleta_id uuid,
  p_payload jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dia smallint;
  v_grupo text;
  v_exercicio_id text;
  v_series smallint;
  v_reps smallint;
  v_descanso smallint;
  v_ordem smallint;
  v_id uuid;
  v_operator uuid := auth.uid();
BEGIN
  IF v_operator IS NULL THEN
    RAISE EXCEPTION 'session required' USING ERRCODE = '42501';
  END IF;

  IF NOT public.argos_can_access_cliente(p_atleta_id) THEN
    RAISE EXCEPTION 'permission denied for prescription upsert'
      USING ERRCODE = '42501';
  END IF;

  v_dia := (p_payload->>'dia_semana')::smallint;
  v_grupo := upper(btrim(p_payload->>'grupo_muscular'));
  v_exercicio_id := btrim(p_payload->>'exercicio_id');
  v_series := (p_payload->>'series_alvo')::smallint;
  v_reps := (p_payload->>'repeticoes_alvo')::smallint;
  v_descanso := NULLIF((p_payload->>'descanso_segundos')::smallint, 0);
  v_ordem := COALESCE((p_payload->>'ordem')::smallint, 1);

  IF v_dia IS NULL OR v_dia < 1 OR v_dia > 6 THEN
    RAISE EXCEPTION 'invalid dia_semana' USING ERRCODE = '22023';
  END IF;

  IF v_grupo NOT IN ('PEITO', 'COSTAS', 'PERNAS', 'OMBROS', 'BRACOS', 'ABDOMEN') THEN
    RAISE EXCEPTION 'invalid grupo_muscular' USING ERRCODE = '22023';
  END IF;

  IF v_exercicio_id IS NULL OR char_length(v_exercicio_id) = 0 THEN
    RAISE EXCEPTION 'invalid exercicio_id' USING ERRCODE = '22023';
  END IF;

  SELECT id INTO v_id
  FROM public.prescricoes_treino_forjador
  WHERE atleta_id = p_atleta_id
    AND dia_semana = v_dia
    AND grupo_muscular = v_grupo
    AND exercicio_id = v_exercicio_id
  LIMIT 1;

  IF v_id IS NOT NULL THEN
    UPDATE public.prescricoes_treino_forjador
    SET
      forjador_id = v_operator,
      series_alvo = v_series,
      repeticoes_alvo = v_reps,
      descanso_segundos = v_descanso,
      progressao_alternativas = COALESCE(p_payload->'progressao_alternativas', '[]'::jsonb),
      repeticoes_por_serie = COALESCE(p_payload->'repeticoes_por_serie', '[]'::jsonb),
      observacoes = NULLIF(btrim(p_payload->>'observacoes'), ''),
      ordem = v_ordem,
      updated_at = now()
    WHERE id = v_id;
  ELSE
    INSERT INTO public.prescricoes_treino_forjador (
      atleta_id,
      forjador_id,
      dia_semana,
      grupo_muscular,
      exercicio_id,
      ordem,
      series_alvo,
      repeticoes_alvo,
      descanso_segundos,
      progressao_alternativas,
      repeticoes_por_serie,
      observacoes
    )
    VALUES (
      p_atleta_id,
      v_operator,
      v_dia,
      v_grupo,
      v_exercicio_id,
      v_ordem,
      v_series,
      v_reps,
      v_descanso,
      COALESCE(p_payload->'progressao_alternativas', '[]'::jsonb),
      COALESCE(p_payload->'repeticoes_por_serie', '[]'::jsonb),
      NULLIF(btrim(p_payload->>'observacoes'), '')
    )
    RETURNING id INTO v_id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'id', v_id);
END;
$$;

REVOKE ALL ON FUNCTION public.argos_forja_upsert_prescricao_treino(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.argos_forja_upsert_prescricao_treino(uuid, jsonb) TO authenticated;

-- ---------------------------------------------------------------------------
-- 5. RPC · publicar medidas VIP
-- ---------------------------------------------------------------------------

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

REVOKE ALL ON FUNCTION public.argos_forja_publish_vip_medidas(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.argos_forja_publish_vip_medidas(uuid, jsonb) TO authenticated;
