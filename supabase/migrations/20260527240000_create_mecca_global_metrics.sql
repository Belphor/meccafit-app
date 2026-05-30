-- FENYXIA · Comunidade Mecca — métricas globais (singleton · custo zero · alta performance)
-- Uma única linha em mecca_global_metrics; mutações somente via increment_mecca_contribution.

-- ---------------------------------------------------------------------------
-- 1. Tabela singleton — tonelagem colectiva, streaks e temperatura do forno
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.mecca_global_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  total_weight_lifted bigint NOT NULL DEFAULT 0,
  active_streaks_count integer NOT NULL DEFAULT 0,
  furnace_temperature integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mecca_global_metrics_total_weight_nonneg CHECK (total_weight_lifted >= 0),
  CONSTRAINT mecca_global_metrics_streaks_nonneg CHECK (active_streaks_count >= 0),
  CONSTRAINT mecca_global_metrics_furnace_temp_range CHECK (
    furnace_temperature >= 0 AND furnace_temperature <= 100
  )
);

-- Garante no máximo 1 linha (padrão singleton — evita crescimento de storage)
CREATE UNIQUE INDEX IF NOT EXISTS mecca_global_metrics_singleton_idx
  ON public.mecca_global_metrics ((1));

-- ---------------------------------------------------------------------------
-- 2. Linha inicial única (ID fixo para updates atómicos sem scan)
-- ---------------------------------------------------------------------------

INSERT INTO public.mecca_global_metrics (
  id,
  total_weight_lifted,
  active_streaks_count,
  furnace_temperature,
  updated_at
)
VALUES (
  '00000000-0000-4000-8000-000000000001'::uuid,
  0,
  0,
  0,
  now()
)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. Função auxiliar — temperatura 0–100 derivada da tonelagem colectiva (kg)
--    Escala logarítmica suave: ~100 ° quando total >= 10M kg (performante, O(1))
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.mecca_compute_furnace_temperature(p_total_kg bigint)
RETURNS integer
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT LEAST(
    100,
    GREATEST(
      0,
      FLOOR(
        LN(GREATEST(p_total_kg, 1)::double precision)
        * (100.0 / LN(10000000.0))
      )::integer
    )
  );
$$;

-- ---------------------------------------------------------------------------
-- 4. RPC — incremento atómico (único UPDATE · row lock implícito · sem race)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.increment_mecca_contribution(p_weight_input integer)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_metrics public.mecca_global_metrics;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required for mecca contribution'
      USING ERRCODE = '42501';
  END IF;

  IF p_weight_input IS NULL OR p_weight_input <= 0 OR p_weight_input > 99999 THEN
    RAISE EXCEPTION 'invalid weight_input (expected 1..99999 kg)'
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.mecca_global_metrics
  SET
    total_weight_lifted = total_weight_lifted + p_weight_input,
    furnace_temperature = public.mecca_compute_furnace_temperature(
      total_weight_lifted + p_weight_input
    ),
    updated_at = now()
  WHERE id = '00000000-0000-4000-8000-000000000001'::uuid
  RETURNING * INTO v_metrics;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'mecca_global_metrics singleton row missing'
      USING ERRCODE = 'P0002';
  END IF;

  RETURN jsonb_build_object(
    'total_weight_lifted', v_metrics.total_weight_lifted,
    'active_streaks_count', v_metrics.active_streaks_count,
    'furnace_temperature', v_metrics.furnace_temperature,
    'updated_at', v_metrics.updated_at
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. RLS / GRANTS — leitura pública da métrica; escrita só via RPC
-- ---------------------------------------------------------------------------

ALTER TABLE public.mecca_global_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Mecca global metrics public read" ON public.mecca_global_metrics;
CREATE POLICY "Mecca global metrics public read"
ON public.mecca_global_metrics
FOR SELECT
TO anon, authenticated
USING (true);

-- Sem políticas INSERT/UPDATE/DELETE → bloqueio total para roles client-side

REVOKE ALL ON TABLE public.mecca_global_metrics FROM PUBLIC;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.mecca_global_metrics FROM anon, authenticated;
GRANT SELECT ON TABLE public.mecca_global_metrics TO anon, authenticated;
GRANT ALL ON TABLE public.mecca_global_metrics TO service_role;

REVOKE ALL ON FUNCTION public.mecca_compute_furnace_temperature(bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mecca_compute_furnace_temperature(bigint) TO authenticated;

REVOKE ALL ON FUNCTION public.increment_mecca_contribution(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.increment_mecca_contribution(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_mecca_contribution(integer) TO service_role;
