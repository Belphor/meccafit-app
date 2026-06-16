-- Fix · Supabase safe-update exige WHERE em UPDATE global
-- comunidade_apply_demo_titulos + comunidade_fechar_titulos_mes

BEGIN;

CREATE OR REPLACE FUNCTION public.comunidade_fechar_titulos_mes(p_mes date)
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

  SELECT j.inicio, j.fim INTO v_inicio, v_fim
  FROM public.comunidade_janela_mes_sp(p_mes) j;

  UPDATE public.metas_coletivas_academia
  SET fechado_em = now(), updated_at = now()
  WHERE mes_referencia = p_mes AND fechado_em IS NULL;

  PERFORM set_config('comunidade.system_mutation', 'on', true);

  UPDATE public.planos_atletas
  SET is_rei_das_chamas = false,
      is_pilar_cooperativo = false
  WHERE true;

  WITH pico_por_atleta AS (
    SELECT
      hc.atleta_id,
      SUM(public.comunidade_pico_forca_linha(hc.carga_maxima)) AS pico_mensal_kg
    FROM public.historico_cargas hc
    WHERE hc.data_registro >= v_inicio
      AND hc.data_registro < v_fim
    GROUP BY hc.atleta_id
  ),
  rei AS (
    SELECT atleta_id
    FROM pico_por_atleta
    ORDER BY pico_mensal_kg DESC
    LIMIT 1
  ),
  pilares AS (
    SELECT atleta_id
    FROM pico_por_atleta
    ORDER BY pico_mensal_kg DESC
    LIMIT 3
  )
  INSERT INTO public.planos_atletas (atleta_id)
  SELECT atleta_id FROM pico_por_atleta
  ON CONFLICT (atleta_id) DO NOTHING;

  UPDATE public.planos_atletas pa
  SET is_rei_das_chamas = true
  FROM rei r
  WHERE pa.atleta_id = r.atleta_id;

  UPDATE public.planos_atletas pa
  SET is_pilar_cooperativo = true
  FROM pilares p
  WHERE pa.atleta_id = p.atleta_id;

  PERFORM set_config('comunidade.system_mutation', 'off', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.comunidade_apply_demo_titulos(
  p_cinturao_superiores_id uuid,
  p_cinturao_inferiores_id uuid,
  p_pilar_id uuid,
  p_rei_id uuid,
  p_todos_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('comunidade.system_mutation', 'on', true);

  UPDATE public.planos_atletas
  SET tem_cinturao_duelo = false,
      tem_cinturao_superiores = false,
      tem_cinturao_inferiores = false,
      is_rei_das_chamas = false,
      is_pilar_cooperativo = false
  WHERE atleta_id IN (
    p_cinturao_superiores_id,
    p_cinturao_inferiores_id,
    p_pilar_id,
    p_rei_id,
    p_todos_id
  );

  INSERT INTO public.planos_atletas (atleta_id)
  SELECT unnest(ARRAY[
    p_cinturao_superiores_id,
    p_cinturao_inferiores_id,
    p_pilar_id,
    p_rei_id,
    p_todos_id
  ])
  ON CONFLICT (atleta_id) DO NOTHING;

  UPDATE public.planos_atletas SET tem_cinturao_superiores = true WHERE atleta_id = p_cinturao_superiores_id;
  UPDATE public.planos_atletas SET tem_cinturao_inferiores = true WHERE atleta_id = p_cinturao_inferiores_id;
  UPDATE public.planos_atletas SET is_pilar_cooperativo = true WHERE atleta_id = p_pilar_id;
  UPDATE public.planos_atletas SET is_rei_das_chamas = true WHERE atleta_id = p_rei_id;

  UPDATE public.planos_atletas
  SET tem_cinturao_superiores = true,
      tem_cinturao_inferiores = true,
      is_rei_das_chamas = true,
      is_pilar_cooperativo = true
  WHERE atleta_id = p_todos_id;

  UPDATE public.planos_atletas
  SET tem_cinturao_duelo = (tem_cinturao_superiores OR tem_cinturao_inferiores)
  WHERE atleta_id IN (
    p_cinturao_superiores_id,
    p_cinturao_inferiores_id,
    p_pilar_id,
    p_rei_id,
    p_todos_id
  );

  PERFORM set_config('comunidade.system_mutation', 'off', true);
END;
$$;

COMMIT;
