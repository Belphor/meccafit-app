-- ARGOS · Fórum Brasa-Viva — feed comunitário com fase do autor (Aba 6)
-- Estende o mural de superações com phase_tier para cards dinâmicos IRIS.

CREATE OR REPLACE FUNCTION public.argos_fetch_forum_brasa_viva(p_limit integer DEFAULT 48)
RETURNS TABLE (
  id bigint,
  topic_title text,
  topic_body text,
  author_name text,
  author_lineage text,
  author_phase_tier smallint,
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
    LEAST(GREATEST(COALESCE(p.phase_tier, 1), 1), 5)::smallint AS author_phase_tier,
    COALESCE(h.peso, h.peso_atual) AS peso,
    GREATEST(COALESCE(h.series, 1), 1) AS series,
    COALESCE(h.registrado_em, h.updated_at, NOW()) AS registrado_em
  FROM public.historico_treinos h
  INNER JOIN public.profiles p ON p.id = h.cliente_id
  WHERE h.status = 'SUPERAÇÃO'
    AND p.role IS DISTINCT FROM 'forjador_soberano'::public.user_role
    AND (SELECT auth.uid()) IS NOT NULL
  ORDER BY COALESCE(h.registrado_em, h.updated_at, NOW()) DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 48), 1), 100);
$$;

REVOKE ALL ON FUNCTION public.argos_fetch_forum_brasa_viva(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.argos_fetch_forum_brasa_viva(integer) TO authenticated;
