-- FENYXIA · Aba 3 · Flexibilidade mensal + remoção do Frozen State (MIDAS)
-- Substitui dias_treino_semana → total_treinos_mensais_planejados
-- Refatora get_muscular_evolution() · ignição mensal · sem CONGELADO/is_frozen

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. planos_atletas — meta mensal (1–31 sessões) + grupos_obrigatorios
-- ---------------------------------------------------------------------------

ALTER TABLE public.planos_atletas
  ADD COLUMN IF NOT EXISTS total_treinos_mensais_planejados integer;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'planos_atletas'
      AND column_name = 'dias_treino_semana'
  ) THEN
    EXECUTE $sql$
      UPDATE public.planos_atletas
      SET total_treinos_mensais_planejados = LEAST(
        31,
        GREATEST(1, ROUND(dias_treino_semana::numeric * 30.0 / 7.0)::integer)
      )
      WHERE total_treinos_mensais_planejados IS NULL
    $sql$;
  END IF;
END $$;

UPDATE public.planos_atletas
SET total_treinos_mensais_planejados = 16
WHERE total_treinos_mensais_planejados IS NULL;

ALTER TABLE public.planos_atletas
  ALTER COLUMN total_treinos_mensais_planejados SET DEFAULT 16;

ALTER TABLE public.planos_atletas
  ALTER COLUMN total_treinos_mensais_planejados SET NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'planos_atletas'
      AND column_name = 'dias_treino_semana'
  ) THEN
    ALTER TABLE public.planos_atletas DROP COLUMN dias_treino_semana;
  END IF;
END $$;

ALTER TABLE public.planos_atletas
  DROP CONSTRAINT IF EXISTS planos_atletas_dias_check;

ALTER TABLE public.planos_atletas
  DROP CONSTRAINT IF EXISTS planos_atletas_mensal_check;

ALTER TABLE public.planos_atletas
  ADD CONSTRAINT planos_atletas_mensal_check
  CHECK (total_treinos_mensais_planejados BETWEEN 1 AND 31);

DROP INDEX IF EXISTS public.idx_planos_atletas_dias;

CREATE INDEX IF NOT EXISTS idx_planos_atletas_mensal
  ON public.planos_atletas (total_treinos_mensais_planejados);

COMMENT ON TABLE public.planos_atletas IS
  'Plano individual: sessões mensais planeadas (1–31) e grupos musculares obrigatórios.';

COMMENT ON COLUMN public.planos_atletas.total_treinos_mensais_planejados IS
  'Meta mensal de treinos · base do Índice de Ignição (janela rolante 30d).';

-- Seed / backfill para atletas sem linha
INSERT INTO public.planos_atletas (atleta_id, total_treinos_mensais_planejados, grupos_obrigatorios)
SELECT
  p.id,
  LEAST(31, GREATEST(1, ROUND(COALESCE(p.target_days_per_week, 3)::numeric * 30.0 / 7.0)::integer)),
  '{}'::text[]
FROM public.profiles p
ON CONFLICT (atleta_id) DO UPDATE
SET
  total_treinos_mensais_planejados = COALESCE(
    public.planos_atletas.total_treinos_mensais_planejados,
    EXCLUDED.total_treinos_mensais_planejados
  ),
  updated_at = now()
WHERE public.planos_atletas.total_treinos_mensais_planejados IS NULL;

-- ---------------------------------------------------------------------------
-- 2. Remover helper do Frozen State (banido)
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.midas_grupo_obrigatorio(uuid, public.grupo_muscular_evolucao);

-- ---------------------------------------------------------------------------
-- 3. RPC · get_muscular_evolution() — ignição mensal · sem frozen
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_muscular_evolution()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_atleta_id uuid;
  v_meta_mensal integer;
  v_dias_unicos bigint;
  v_ignicao numeric;
  v_degradacao boolean;
  v_window_start timestamptz;
  v_window_ignicao_start date;
  v_grupo public.grupo_muscular_evolucao;
  v_grupos public.grupo_muscular_evolucao[] := ARRAY[
    'PEITO'::public.grupo_muscular_evolucao,
    'COSTAS'::public.grupo_muscular_evolucao,
    'PERNAS'::public.grupo_muscular_evolucao,
    'OMBROS'::public.grupo_muscular_evolucao,
    'BRACOS'::public.grupo_muscular_evolucao,
    'ABDOMEN'::public.grupo_muscular_evolucao
  ];
  v_metric_raw numeric;
  v_metric_final numeric;
  v_vtc numeric;
  v_vra numeric;
  v_level text;
  v_muscles jsonb := '{}'::jsonb;
  v_today date;
BEGIN
  v_atleta_id := auth.uid();

  IF v_atleta_id IS NULL THEN
    RETURN jsonb_build_object(
      'error', 'unauthorized',
      'code', 401,
      'message', 'Sessão inválida — auth.uid() ausente.'
    );
  END IF;

  v_today := public.evolucao_sp_today();
  v_window_start := (v_today - 13)::timestamp AT TIME ZONE 'America/Sao_Paulo';
  v_window_ignicao_start := (v_today - INTERVAL '30 days')::date;

  SELECT COALESCE(pa.total_treinos_mensais_planejados, 16)
  INTO v_meta_mensal
  FROM public.planos_atletas pa
  WHERE pa.atleta_id = v_atleta_id;

  IF v_meta_mensal IS NULL THEN
    v_meta_mensal := 16;
    INSERT INTO public.planos_atletas (atleta_id, total_treinos_mensais_planejados)
    VALUES (v_atleta_id, v_meta_mensal)
    ON CONFLICT (atleta_id) DO NOTHING;
  END IF;

  SELECT COUNT(DISTINCT ci.data_registro)::bigint
  INTO v_dias_unicos
  FROM public.calendario_ignicao ci
  WHERE ci.atleta_id = v_atleta_id
    AND ci.data_registro >= v_window_ignicao_start
    AND ci.data_registro <= v_today;

  IF v_meta_mensal <= 0 THEN
    v_ignicao := 0;
  ELSE
    v_ignicao := LEAST(
      100.0,
      GREATEST(0, ROUND((v_dias_unicos::numeric / v_meta_mensal::numeric) * 100.0, 2))
    );
  END IF;

  v_degradacao := v_ignicao < 50.0;

  FOREACH v_grupo IN ARRAY v_grupos LOOP
    v_level := 'CINZAS';
    v_vtc := 0;
    v_vra := 0;
    v_metric_raw := 0;
    v_metric_final := 0;

    IF v_grupo = 'ABDOMEN'::public.grupo_muscular_evolucao THEN
      v_vra := public.midas_calc_vra_abdomen(v_atleta_id, v_window_start);
      v_metric_raw := COALESCE(v_vra, 0);
    ELSE
      v_vtc := public.midas_calc_vtc_grupo(v_atleta_id, v_grupo, v_window_start);
      v_metric_raw := COALESCE(v_vtc, 0);
    END IF;

    v_metric_final := v_metric_raw;

    IF v_degradacao AND v_metric_final > 0 THEN
      v_metric_final := v_metric_final * 0.60;
    END IF;

    IF v_metric_final <= 0 THEN
      v_level := 'CINZAS';
    ELSE
      v_level := public.midas_classificar_nivel(v_grupo, v_metric_final);
    END IF;

    v_muscles := v_muscles || jsonb_build_object(
      lower(v_grupo::text),
      jsonb_build_object(
        'grupo', v_grupo::text,
        'vtc', COALESCE(v_vtc, 0),
        'vra', COALESCE(v_vra, 0),
        'metric_raw', COALESCE(v_metric_raw, 0),
        'metric_final', COALESCE(v_metric_final, 0),
        'thermal_level', v_level
      )
    );
  END LOOP;

  RETURN jsonb_build_object(
    'athlete_id', v_atleta_id,
    'ignition_index', v_ignicao,
    'passive_degradation_active', v_degradacao,
    'total_treinos_mensais_planejados', v_meta_mensal,
    'unique_training_days_30d', v_dias_unicos,
    'timestamp', now(),
    'muscles', v_muscles
  );
END;
$$;

COMMENT ON FUNCTION public.get_muscular_evolution() IS
  'MIDAS · Evolução muscular JSONB · auth.uid · ignição mensal flexível (30d) · VTC/VRA 14d · sem frozen.';

COMMIT;
