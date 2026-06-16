-- Fix: snapshot faz INSERT/UPDATE auxiliar — não pode ser STABLE (read-only)

BEGIN;

CREATE OR REPLACE FUNCTION public.get_comunidade_arena_snapshot()
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
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

GRANT EXECUTE ON FUNCTION public.get_comunidade_arena_snapshot() TO authenticated, service_role;

COMMIT;
