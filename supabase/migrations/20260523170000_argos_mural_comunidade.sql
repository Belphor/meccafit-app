-- ARGOS: Mural da Ascensão = feed comunitário (SUPERAÇÃO de todos os atletas).
-- Leitura via RPC SECURITY DEFINER com colunas sanitizadas; escrita continua RLS por dono.

CREATE OR REPLACE FUNCTION public.argos_fetch_mural_comunidade(p_limit integer DEFAULT 48)
RETURNS TABLE (
  id bigint,
  exercicio_nome text,
  peso numeric,
  series integer,
  registrado_em timestamptz,
  atleta_nome text,
  nome_linhagem text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    h.id,
    h.exercicio_nome,
    COALESCE(h.peso, h.peso_atual) AS peso,
    GREATEST(COALESCE(h.series, 1), 1) AS series,
    COALESCE(h.registrado_em, h.updated_at, NOW()) AS registrado_em,
    COALESCE(NULLIF(BTRIM(p.full_name), ''), 'Membro da Linhagem') AS atleta_nome,
    COALESCE(NULLIF(BTRIM(p.nome_linhagem), ''), 'Linhagem Meccafit') AS nome_linhagem
  FROM public.historico_treinos h
  INNER JOIN public.profiles p ON p.id = h.cliente_id
  WHERE h.status = 'SUPERAÇÃO'
    AND p.role IS DISTINCT FROM 'forjador_soberano'::public.user_role
    AND (SELECT auth.uid()) IS NOT NULL
  ORDER BY COALESCE(h.registrado_em, h.updated_at, NOW()) DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 48), 1), 100);
$$;

REVOKE ALL ON FUNCTION public.argos_fetch_mural_comunidade(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.argos_fetch_mural_comunidade(integer) TO authenticated;
