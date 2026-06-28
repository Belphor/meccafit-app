-- Mural / Fórum: superações só do dia (Brasília) + exercicio_id para métrica correta (prancha = tempo).

DROP FUNCTION IF EXISTS public.argos_fetch_mural_comunidade(integer);
DROP FUNCTION IF EXISTS public.argos_fetch_forum_brasa_viva(integer);

CREATE FUNCTION public.argos_fetch_mural_comunidade(p_limit integer DEFAULT 48)
RETURNS TABLE (
  id bigint,
  exercicio_nome text,
  exercicio_id bigint,
  peso numeric,
  series integer,
  registrado_em timestamptz,
  atleta_nome text,
  nome_linhagem text,
  author_id uuid,
  tem_cinturao_duelo boolean,
  is_rei_das_chamas boolean,
  is_rei_chamas_superiores boolean,
  is_rei_chamas_inferiores boolean,
  is_pilar_cooperativo boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    h.id,
    h.exercicio_nome,
    h.exercicio_id,
    COALESCE(h.peso, h.peso_atual) AS peso,
    GREATEST(COALESCE(h.series, 1), 1) AS series,
    COALESCE(h.registrado_em, h.updated_at, NOW()) AS registrado_em,
    COALESCE(NULLIF(BTRIM(p.full_name), ''), 'Membro da Linhagem') AS atleta_nome,
    COALESCE(NULLIF(BTRIM(p.nome_linhagem), ''), 'Linhagem Meccafit') AS nome_linhagem,
    h.cliente_id AS author_id,
    COALESCE(pa.tem_cinturao_duelo, false),
    COALESCE(pa.is_rei_das_chamas, false),
    COALESCE(pa.is_rei_chamas_superiores, false),
    COALESCE(pa.is_rei_chamas_inferiores, false),
    COALESCE(pa.is_pilar_cooperativo, false)
  FROM public.historico_treinos h
  INNER JOIN public.profiles p ON p.id = h.cliente_id
  LEFT JOIN public.planos_atletas pa ON pa.atleta_id = h.cliente_id
  WHERE h.status = 'SUPERAÇÃO'
    AND p.role IS DISTINCT FROM 'forjador_soberano'::public.user_role
    AND (SELECT auth.uid()) IS NOT NULL
    AND (timezone('America/Sao_Paulo', COALESCE(h.registrado_em, h.updated_at, NOW())))::date
      = (timezone('America/Sao_Paulo', now()))::date
  ORDER BY COALESCE(h.registrado_em, h.updated_at, NOW()) DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 48), 1), 100);
$$;

CREATE FUNCTION public.argos_fetch_forum_brasa_viva(p_limit integer DEFAULT 48)
RETURNS TABLE (
  id bigint,
  topic_title text,
  topic_body text,
  author_name text,
  author_lineage text,
  author_id uuid,
  tem_cinturao_duelo boolean,
  is_rei_das_chamas boolean,
  is_rei_chamas_superiores boolean,
  is_rei_chamas_inferiores boolean,
  is_pilar_cooperativo boolean,
  exercicio_id bigint,
  peso numeric,
  series integer,
  registrado_em timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    h.id,
    COALESCE(NULLIF(BTRIM(h.exercicio_nome), ''), 'Ascensão no altar') AS topic_title,
    'Superação registrada no Fórum Brasa-Viva — volume validado por ARGOS.' AS topic_body,
    COALESCE(NULLIF(BTRIM(p.full_name), ''), 'Membro da Linhagem') AS author_name,
    COALESCE(NULLIF(BTRIM(p.nome_linhagem), ''), 'Linhagem Meccafit') AS author_lineage,
    h.cliente_id AS author_id,
    COALESCE(pa.tem_cinturao_duelo, false),
    COALESCE(pa.is_rei_das_chamas, false),
    COALESCE(pa.is_rei_chamas_superiores, false),
    COALESCE(pa.is_rei_chamas_inferiores, false),
    COALESCE(pa.is_pilar_cooperativo, false),
    h.exercicio_id,
    COALESCE(h.peso, h.peso_atual) AS peso,
    GREATEST(COALESCE(h.series, 1), 1) AS series,
    COALESCE(h.registrado_em, h.updated_at, NOW()) AS registrado_em
  FROM public.historico_treinos h
  INNER JOIN public.profiles p ON p.id = h.cliente_id
  LEFT JOIN public.planos_atletas pa ON pa.atleta_id = h.cliente_id
  WHERE h.status = 'SUPERAÇÃO'
    AND p.role IS DISTINCT FROM 'forjador_soberano'::public.user_role
    AND (SELECT auth.uid()) IS NOT NULL
    AND (timezone('America/Sao_Paulo', COALESCE(h.registrado_em, h.updated_at, NOW())))::date
      = (timezone('America/Sao_Paulo', now()))::date
  ORDER BY COALESCE(h.registrado_em, h.updated_at, NOW()) DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 48), 1), 100);
$$;

REVOKE ALL ON FUNCTION public.argos_fetch_mural_comunidade(integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.argos_fetch_forum_brasa_viva(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.argos_fetch_mural_comunidade(integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.argos_fetch_forum_brasa_viva(integer) TO authenticated, service_role;
