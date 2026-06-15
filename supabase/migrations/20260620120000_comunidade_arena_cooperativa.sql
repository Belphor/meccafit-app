-- FENYXIA · Comunidade — Arena Cooperativa (PLUTUS · MIDAS · ARGOS)
-- Duelos supergrupos · meta colectiva mensal · cache PLUTUS em planos_atletas

BEGIN;

-- ---------------------------------------------------------------------------
-- 0. Tipos enumerados
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_confronto_duelo') THEN
    CREATE TYPE public.tipo_confronto_duelo AS ENUM ('SUPERIORES', 'INFERIORES');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_duelo_supergrupo') THEN
    CREATE TYPE public.status_duelo_supergrupo AS ENUM ('EM_ANDAMENTO', 'FINALIZADO', 'CANCELADO');
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1. PLUTUS — flags de estado em planos_atletas
-- ---------------------------------------------------------------------------

ALTER TABLE public.planos_atletas
  ADD COLUMN IF NOT EXISTS detem_cinturao_duelo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_pilar_fogo_cosmico boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.planos_atletas.detem_cinturao_duelo IS
  'PLUTUS · King-of-the-Hill — detém o cinturão do duelo de supergrupos.';

COMMENT ON COLUMN public.planos_atletas.is_pilar_fogo_cosmico IS
  'PLUTUS · Top 3 VTC mensal — pilar de fogo cósmico no mês seguinte.';

CREATE INDEX IF NOT EXISTS idx_planos_atletas_cinturao_ativo
  ON public.planos_atletas (atleta_id)
  WHERE detem_cinturao_duelo = true;

CREATE INDEX IF NOT EXISTS idx_planos_atletas_pilar_ativo
  ON public.planos_atletas (atleta_id)
  WHERE is_pilar_fogo_cosmico = true;

CREATE INDEX IF NOT EXISTS idx_planos_atletas_plutus_feed
  ON public.planos_atletas (detem_cinturao_duelo, is_pilar_fogo_cosmico)
  WHERE detem_cinturao_duelo OR is_pilar_fogo_cosmico;

-- Impede que o cliente altere flags PLUTUS directamente (somente triggers internas)
CREATE OR REPLACE FUNCTION public.comunidade_protect_plutus_flags()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_setting('comunidade.system_mutation', true) IS DISTINCT FROM 'on' THEN
    NEW.detem_cinturao_duelo := OLD.detem_cinturao_duelo;
    NEW.is_pilar_fogo_cosmico := OLD.is_pilar_fogo_cosmico;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_planos_atletas_protect_plutus ON public.planos_atletas;
CREATE TRIGGER trg_planos_atletas_protect_plutus
  BEFORE UPDATE ON public.planos_atletas
  FOR EACH ROW
  EXECUTE FUNCTION public.comunidade_protect_plutus_flags();

-- Leitura pública autenticada das flags (feed · avatares IRIS)
DROP POLICY IF EXISTS "ARGOS planos_atletas select plutus flags" ON public.planos_atletas;
CREATE POLICY "ARGOS planos_atletas select plutus flags"
ON public.planos_atletas FOR SELECT TO authenticated
USING (true);

-- ---------------------------------------------------------------------------
-- 2. Duelos de supergrupos (MIDAS physiology)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.duelos_supergrupos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  atleta_desafiante_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  atleta_desafiado_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  tipo_confronto public.tipo_confronto_duelo NOT NULL,
  vtc_desafiante numeric(14, 2) NOT NULL DEFAULT 0,
  vtc_desafiado numeric(14, 2) NOT NULL DEFAULT 0,
  status public.status_duelo_supergrupo NOT NULL DEFAULT 'EM_ANDAMENTO',
  inicio_em timestamptz NOT NULL DEFAULT now(),
  fim_em timestamptz NOT NULL,
  vencedor_id uuid NULL REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT duelos_supergrupos_atletas_distintos CHECK (atleta_desafiante_id <> atleta_desafiado_id),
  CONSTRAINT duelos_supergrupos_vtc_nonneg CHECK (vtc_desafiante >= 0 AND vtc_desafiado >= 0)
);

COMMENT ON TABLE public.duelos_supergrupos IS
  'Duelos 3d (SUPERIORES: peito/ombros/costas) ou 2d (INFERIORES: pernas). VTC agregado via historico_cargas.';

CREATE INDEX IF NOT EXISTS idx_duelos_supergrupos_status_fim
  ON public.duelos_supergrupos (status, fim_em)
  WHERE status = 'EM_ANDAMENTO';

CREATE UNIQUE INDEX IF NOT EXISTS idx_duelos_ativo_desafiante
  ON public.duelos_supergrupos (atleta_desafiante_id)
  WHERE status = 'EM_ANDAMENTO';

CREATE UNIQUE INDEX IF NOT EXISTS idx_duelos_ativo_desafiado
  ON public.duelos_supergrupos (atleta_desafiado_id)
  WHERE status = 'EM_ANDAMENTO';

-- Duração automática: 3d superiores · 2d inferiores
CREATE OR REPLACE FUNCTION public.comunidade_duelo_set_janela()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.fim_em IS NULL OR NEW.fim_em <= NEW.inicio_em THEN
    IF NEW.tipo_confronto = 'SUPERIORES'::public.tipo_confronto_duelo THEN
      NEW.fim_em := NEW.inicio_em + INTERVAL '3 days';
    ELSE
      NEW.fim_em := NEW.inicio_em + INTERVAL '2 days';
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_duelos_supergrupos_janela ON public.duelos_supergrupos;
CREATE TRIGGER trg_duelos_supergrupos_janela
  BEFORE INSERT OR UPDATE ON public.duelos_supergrupos
  FOR EACH ROW
  EXECUTE FUNCTION public.comunidade_duelo_set_janela();

-- Tonelagem de uma linha historico_cargas (kg · peso × reps)
CREATE OR REPLACE FUNCTION public.comunidade_tonelagem_linha(
  p_carga numeric,
  p_reps integer
)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT GREATEST(COALESCE(p_carga, 0), 0) * GREATEST(COALESCE(p_reps, 1), 1);
$$;

-- Grupo muscular elegível para o tipo de confronto
CREATE OR REPLACE FUNCTION public.comunidade_grupo_elegivel_duelo(
  p_tipo public.tipo_confronto_duelo,
  p_grupo public.grupo_muscular_evolucao
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT CASE
    WHEN p_tipo = 'SUPERIORES'::public.tipo_confronto_duelo THEN
      p_grupo IN (
        'PEITO'::public.grupo_muscular_evolucao,
        'OMBROS'::public.grupo_muscular_evolucao,
        'COSTAS'::public.grupo_muscular_evolucao
      )
    WHEN p_tipo = 'INFERIORES'::public.tipo_confronto_duelo THEN
      p_grupo = 'PERNAS'::public.grupo_muscular_evolucao
    ELSE false
  END;
$$;

-- Finaliza duelo · King-of-the-Hill global (um cinturão)
CREATE OR REPLACE FUNCTION public.comunidade_finalizar_duelo(p_duelo_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_duelo public.duelos_supergrupos;
  v_winner uuid;
  v_loser uuid;
BEGIN
  SELECT * INTO v_duelo
  FROM public.duelos_supergrupos
  WHERE id = p_duelo_id
  FOR UPDATE;

  IF NOT FOUND OR v_duelo.status <> 'EM_ANDAMENTO'::public.status_duelo_supergrupo THEN
    RETURN;
  END IF;

  IF v_duelo.vtc_desafiante > v_duelo.vtc_desafiado THEN
    v_winner := v_duelo.atleta_desafiante_id;
    v_loser := v_duelo.atleta_desafiado_id;
  ELSIF v_duelo.vtc_desafiado > v_duelo.vtc_desafiante THEN
    v_winner := v_duelo.atleta_desafiado_id;
    v_loser := v_duelo.atleta_desafiante_id;
  ELSE
    v_winner := NULL;
  END IF;

  UPDATE public.duelos_supergrupos
  SET
    status = 'FINALIZADO'::public.status_duelo_supergrupo,
    vencedor_id = v_winner,
    updated_at = now()
  WHERE id = p_duelo_id;

  PERFORM set_config('comunidade.system_mutation', 'on', true);

  IF v_winner IS NOT NULL THEN
    UPDATE public.planos_atletas SET detem_cinturao_duelo = false WHERE detem_cinturao_duelo = true;
    INSERT INTO public.planos_atletas (atleta_id)
    VALUES (v_winner)
    ON CONFLICT (atleta_id) DO NOTHING;
    UPDATE public.planos_atletas SET detem_cinturao_duelo = true WHERE atleta_id = v_winner;
    UPDATE public.planos_atletas SET detem_cinturao_duelo = false WHERE atleta_id = v_loser;
  END IF;

  PERFORM set_config('comunidade.system_mutation', 'off', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.comunidade_processar_duelos_expirados()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row record;
  v_count integer := 0;
BEGIN
  FOR v_row IN
    SELECT id
    FROM public.duelos_supergrupos
    WHERE status = 'EM_ANDAMENTO'::public.status_duelo_supergrupo
      AND fim_em <= now()
    FOR UPDATE SKIP LOCKED
  LOOP
    PERFORM public.comunidade_finalizar_duelo(v_row.id);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. Meta colectiva mensal da academia
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.metas_coletivas_academia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mes_referencia date NOT NULL,
  tonelagem_alvo_kg numeric(16, 2) NOT NULL DEFAULT 100000,
  tonelagem_atual_acumulada numeric(16, 2) NOT NULL DEFAULT 0,
  fechado_em timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT metas_coletivas_mes_unico UNIQUE (mes_referencia),
  CONSTRAINT metas_coletivas_mes_primeiro_dia CHECK (mes_referencia = date_trunc('month', mes_referencia)::date),
  CONSTRAINT metas_coletivas_alvo_pos CHECK (tonelagem_alvo_kg > 0),
  CONSTRAINT metas_coletivas_atual_nonneg CHECK (tonelagem_atual_acumulada >= 0)
);

COMMENT ON TABLE public.metas_coletivas_academia IS
  'Termómetro global mensal · dia 1 até último dia do mês calendário (America/Sao_Paulo).';

CREATE INDEX IF NOT EXISTS idx_metas_coletivas_mes_aberto
  ON public.metas_coletivas_academia (mes_referencia)
  WHERE fechado_em IS NULL;

CREATE OR REPLACE FUNCTION public.comunidade_mes_atual_sp()
RETURNS date
LANGUAGE sql
STABLE
AS $$
  SELECT date_trunc('month', (now() AT TIME ZONE 'America/Sao_Paulo')::date)::date;
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
BEGIN
  v_prev := (v_mes - INTERVAL '1 month')::date;

  INSERT INTO public.metas_coletivas_academia (mes_referencia, tonelagem_alvo_kg)
  VALUES (v_mes, 100000)
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

-- Top 3 VTC mensal → pilares do mês seguinte
CREATE OR REPLACE FUNCTION public.comunidade_fechar_pilares_mes(p_mes date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inicio timestamptz;
  v_fim timestamptz;
BEGIN
  IF p_mes IS NULL OR p_mes <> date_trunc('month', p_mes)::date THEN
    RAISE EXCEPTION 'p_mes deve ser o primeiro dia do mês';
  END IF;

  v_inicio := p_mes::timestamp AT TIME ZONE 'America/Sao_Paulo';
  v_fim := ((p_mes + INTERVAL '1 month')::date)::timestamp AT TIME ZONE 'America/Sao_Paulo';

  UPDATE public.metas_coletivas_academia
  SET fechado_em = now(), updated_at = now()
  WHERE mes_referencia = p_mes AND fechado_em IS NULL;

  PERFORM set_config('comunidade.system_mutation', 'on', true);

  UPDATE public.planos_atletas SET is_pilar_fogo_cosmico = false;

  WITH ranking AS (
    SELECT
      hc.atleta_id,
      SUM(public.comunidade_tonelagem_linha(hc.carga_maxima, hc.repeticoes_acumuladas)) AS vtc_mes
    FROM public.historico_cargas hc
    WHERE hc.data_registro >= v_inicio
      AND hc.data_registro < v_fim
    GROUP BY hc.atleta_id
    ORDER BY vtc_mes DESC
    LIMIT 3
  ),
  upserted AS (
    INSERT INTO public.planos_atletas (atleta_id)
    SELECT r.atleta_id FROM ranking r
    ON CONFLICT (atleta_id) DO NOTHING
    RETURNING atleta_id
  )
  UPDATE public.planos_atletas pa
  SET is_pilar_fogo_cosmico = true
  FROM ranking r
  WHERE pa.atleta_id = r.atleta_id;

  PERFORM set_config('comunidade.system_mutation', 'off', true);
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. Trigger único · historico_cargas → duelos + meta colectiva
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.comunidade_on_historico_carga()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tonelagem numeric;
  v_duelo record;
  v_mes date;
BEGIN
  v_tonelagem := public.comunidade_tonelagem_linha(NEW.carga_maxima, NEW.repeticoes_acumuladas);
  IF v_tonelagem <= 0 THEN
    RETURN NEW;
  END IF;

  v_mes := public.comunidade_mes_atual_sp();
  PERFORM public.comunidade_ensure_meta_mes(v_mes);

  UPDATE public.metas_coletivas_academia
  SET
    tonelagem_atual_acumulada = tonelagem_atual_acumulada + v_tonelagem,
    updated_at = now()
  WHERE mes_referencia = v_mes
    AND fechado_em IS NULL;

  PERFORM public.comunidade_processar_duelos_expirados();

  FOR v_duelo IN
    SELECT d.*
    FROM public.duelos_supergrupos d
    WHERE d.status = 'EM_ANDAMENTO'::public.status_duelo_supergrupo
      AND NEW.data_registro >= d.inicio_em
      AND NEW.data_registro < d.fim_em
      AND (
        NEW.atleta_id IN (d.atleta_desafiante_id, d.atleta_desafiado_id)
      )
      AND public.comunidade_grupo_elegivel_duelo(d.tipo_confronto, NEW.grupo_muscular)
    FOR UPDATE
  LOOP
    IF NEW.atleta_id = v_duelo.atleta_desafiante_id THEN
      UPDATE public.duelos_supergrupos
      SET vtc_desafiante = vtc_desafiante + v_tonelagem, updated_at = now()
      WHERE id = v_duelo.id;
    ELSE
      UPDATE public.duelos_supergrupos
      SET vtc_desafiado = vtc_desafiado + v_tonelagem, updated_at = now()
      WHERE id = v_duelo.id;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_historico_cargas_comunidade ON public.historico_cargas;
CREATE TRIGGER trg_historico_cargas_comunidade
  AFTER INSERT ON public.historico_cargas
  FOR EACH ROW
  EXECUTE FUNCTION public.comunidade_on_historico_carga();

-- ---------------------------------------------------------------------------
-- 5. RPCs · perfil público + snapshot arena (sem expor historico raw)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.comunidade_calc_indice_ignicao(p_atleta_id uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_meta integer;
  v_dias bigint;
  v_today date;
  v_window_start date;
BEGIN
  v_today := public.evolucao_sp_today();

  SELECT COALESCE(pa.total_treinos_mensais_planejados, 16)
  INTO v_meta
  FROM public.planos_atletas pa
  WHERE pa.atleta_id = p_atleta_id;

  v_meta := COALESCE(v_meta, 16);
  v_window_start := (v_today - INTERVAL '30 days')::date;

  SELECT COUNT(DISTINCT ci.data_registro)::bigint
  INTO v_dias
  FROM public.calendario_ignicao ci
  WHERE ci.atleta_id = p_atleta_id
    AND ci.data_registro >= v_window_start
    AND ci.data_registro <= v_today;

  IF v_meta <= 0 THEN
    RETURN 0;
  END IF;

  RETURN LEAST(100.0, GREATEST(0, ROUND((v_dias::numeric / v_meta::numeric) * 100.0, 2)));
END;
$$;

CREATE OR REPLACE FUNCTION public.comunidade_grupo_supremo(p_atleta_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date;
  v_window_start timestamptz;
  v_grupo public.grupo_muscular_evolucao;
  v_best_grupo text := 'CINZAS';
  v_best_vtc numeric := 0;
  v_vtc numeric;
BEGIN
  v_today := public.evolucao_sp_today();
  v_window_start := (v_today - 13)::timestamp AT TIME ZONE 'America/Sao_Paulo';

  FOREACH v_grupo IN ARRAY ARRAY[
    'PEITO'::public.grupo_muscular_evolucao,
    'COSTAS'::public.grupo_muscular_evolucao,
    'PERNAS'::public.grupo_muscular_evolucao,
    'OMBROS'::public.grupo_muscular_evolucao,
    'BRACOS'::public.grupo_muscular_evolucao,
    'ABDOMEN'::public.grupo_muscular_evolucao
  ] LOOP
    v_vtc := public.midas_calc_vtc_grupo(p_atleta_id, v_grupo, v_window_start);
    IF v_vtc > v_best_vtc THEN
      v_best_vtc := v_vtc;
      v_best_grupo := v_grupo::text;
    END IF;
  END LOOP;

  RETURN v_best_grupo;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_perfil_publico_atleta(p_atleta_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid;
  v_duelos bigint;
  v_plutus record;
BEGIN
  v_caller := auth.uid();
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('error', 'unauthorized', 'code', 401);
  END IF;

  IF p_atleta_id IS NULL THEN
    RETURN jsonb_build_object('error', 'invalid_atleta', 'code', 400);
  END IF;

  SELECT COUNT(*)::bigint
  INTO v_duelos
  FROM public.duelos_supergrupos d
  WHERE d.vencedor_id = p_atleta_id
    AND d.status = 'FINALIZADO'::public.status_duelo_supergrupo;

  SELECT pa.detem_cinturao_duelo, pa.is_pilar_fogo_cosmico
  INTO v_plutus
  FROM public.planos_atletas pa
  WHERE pa.atleta_id = p_atleta_id;

  RETURN jsonb_build_object(
    'atleta_id', p_atleta_id,
    'indice_ignicao', public.comunidade_calc_indice_ignicao(p_atleta_id),
    'duelos_vencidos', COALESCE(v_duelos, 0),
    'grupo_supremo', public.comunidade_grupo_supremo(p_atleta_id),
    'detem_cinturao_duelo', COALESCE(v_plutus.detem_cinturao_duelo, false),
    'is_pilar_fogo_cosmico', COALESCE(v_plutus.is_pilar_fogo_cosmico, false)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_comunidade_arena_snapshot()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid;
  v_mes date;
  v_meta record;
  v_cinturao record;
  v_pilares jsonb;
  v_duelos jsonb;
BEGIN
  v_caller := auth.uid();
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('error', 'unauthorized', 'code', 401);
  END IF;

  v_mes := public.comunidade_mes_atual_sp();
  PERFORM public.comunidade_ensure_meta_mes(v_mes);
  PERFORM public.comunidade_processar_duelos_expirados();

  SELECT m.*
  INTO v_meta
  FROM public.metas_coletivas_academia m
  WHERE m.mes_referencia = v_mes;

  SELECT pa.atleta_id, pa.detem_cinturao_duelo
  INTO v_cinturao
  FROM public.planos_atletas pa
  WHERE pa.detem_cinturao_duelo = true
  LIMIT 1;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'atleta_id', pa.atleta_id,
      'is_pilar_fogo_cosmico', pa.is_pilar_fogo_cosmico
    )
  ), '[]'::jsonb)
  INTO v_pilares
  FROM public.planos_atletas pa
  WHERE pa.is_pilar_fogo_cosmico = true;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', d.id,
      'tipo_confronto', d.tipo_confronto,
      'status', d.status,
      'vtc_desafiante', d.vtc_desafiante,
      'vtc_desafiado', d.vtc_desafiado,
      'atleta_desafiante_id', d.atleta_desafiante_id,
      'atleta_desafiado_id', d.atleta_desafiado_id,
      'fim_em', d.fim_em,
      'inicio_em', d.inicio_em
    )
    ORDER BY d.inicio_em DESC
  ), '[]'::jsonb)
  INTO v_duelos
  FROM public.duelos_supergrupos d
  WHERE d.status = 'EM_ANDAMENTO'::public.status_duelo_supergrupo;

  RETURN jsonb_build_object(
    'mes_referencia', v_mes,
    'meta', jsonb_build_object(
      'tonelagem_alvo_kg', COALESCE(v_meta.tonelagem_alvo_kg, 100000),
      'tonelagem_atual_acumulada', COALESCE(v_meta.tonelagem_atual_acumulada, 0),
      'progresso_pct', CASE
        WHEN COALESCE(v_meta.tonelagem_alvo_kg, 0) <= 0 THEN 0
        ELSE LEAST(100, ROUND(
          (COALESCE(v_meta.tonelagem_atual_acumulada, 0) / v_meta.tonelagem_alvo_kg) * 100.0, 2
        ))
      END
    ),
    'campeao_cinturao_id', v_cinturao.atleta_id,
    'pilares_fogo_cosmico', v_pilares,
    'duelos_ativos', v_duelos
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 6. ARGOS RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.duelos_supergrupos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metas_coletivas_academia ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ARGOS duelos select participantes" ON public.duelos_supergrupos;
CREATE POLICY "ARGOS duelos select participantes"
ON public.duelos_supergrupos FOR SELECT TO authenticated
USING (
  atleta_desafiante_id = (SELECT auth.uid())
  OR atleta_desafiado_id = (SELECT auth.uid())
  OR status = 'EM_ANDAMENTO'::public.status_duelo_supergrupo
);

DROP POLICY IF EXISTS "ARGOS duelos insert desafiante" ON public.duelos_supergrupos;
CREATE POLICY "ARGOS duelos insert desafiante"
ON public.duelos_supergrupos FOR INSERT TO authenticated
WITH CHECK (
  atleta_desafiante_id = (SELECT auth.uid())
  AND atleta_desafiado_id <> (SELECT auth.uid())
  AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = atleta_desafiado_id)
  AND status = 'EM_ANDAMENTO'::public.status_duelo_supergrupo
);

DROP POLICY IF EXISTS "ARGOS duelos update bloqueado" ON public.duelos_supergrupos;
CREATE POLICY "ARGOS duelos update bloqueado"
ON public.duelos_supergrupos FOR UPDATE TO authenticated
USING (false);

DROP POLICY IF EXISTS "ARGOS duelos delete bloqueado" ON public.duelos_supergrupos;
CREATE POLICY "ARGOS duelos delete bloqueado"
ON public.duelos_supergrupos FOR DELETE TO authenticated
USING (false);

DROP POLICY IF EXISTS "ARGOS metas select autenticado" ON public.metas_coletivas_academia;
CREATE POLICY "ARGOS metas select autenticado"
ON public.metas_coletivas_academia FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "ARGOS metas write bloqueado" ON public.metas_coletivas_academia;
CREATE POLICY "ARGOS metas write bloqueado"
ON public.metas_coletivas_academia FOR INSERT TO authenticated
WITH CHECK (false);

DROP POLICY IF EXISTS "ARGOS metas update bloqueado" ON public.metas_coletivas_academia;
CREATE POLICY "ARGOS metas update bloqueado"
ON public.metas_coletivas_academia FOR UPDATE TO authenticated
USING (false);

DROP POLICY IF EXISTS "ARGOS metas delete bloqueado" ON public.metas_coletivas_academia;
CREATE POLICY "ARGOS metas delete bloqueado"
ON public.metas_coletivas_academia FOR DELETE TO authenticated
USING (false);

-- ---------------------------------------------------------------------------
-- 7. Grants
-- ---------------------------------------------------------------------------

GRANT SELECT ON public.duelos_supergrupos TO authenticated;
GRANT INSERT ON public.duelos_supergrupos TO authenticated;
GRANT SELECT ON public.metas_coletivas_academia TO authenticated;

REVOKE ALL ON FUNCTION public.comunidade_finalizar_duelo(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.comunidade_processar_duelos_expirados() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.comunidade_fechar_pilares_mes(date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.comunidade_ensure_meta_mes(date) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_perfil_publico_atleta(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_comunidade_arena_snapshot() TO authenticated, service_role;

COMMENT ON FUNCTION public.get_perfil_publico_atleta(uuid) IS
  'IRIS · Perfil público agregado — ignição, duelos, grupo supremo, flags PLUTUS.';

COMMENT ON FUNCTION public.get_comunidade_arena_snapshot() IS
  'Comunidade · termómetro mensal, duelos activos, cinturão e pilares.';

-- Meta inicial do mês corrente
SELECT public.comunidade_ensure_meta_mes(public.comunidade_mes_atual_sp());

COMMIT;
