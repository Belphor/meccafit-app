-- ARGOS Latency: índices, RPC bundle único, mural otimizado, RLS fast-path, lockdown INSERT

-- Índice composto para dashboard (cliente + músculo + ordenação)
CREATE INDEX IF NOT EXISTS idx_historico_treinos_cliente_musculo_registrado
  ON public.historico_treinos (cliente_id, musculo, registrado_em DESC);

-- Feed mural: partial index em SUPERAÇÃO
CREATE INDEX IF NOT EXISTS idx_historico_treinos_mural_superacao_registrado
  ON public.historico_treinos (registrado_em DESC)
  WHERE status = 'SUPERAÇÃO';

-- Mural: ORDER BY simplificado (usa registrado_em indexável)
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
  ORDER BY h.registrado_em DESC NULLS LAST
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 48), 1), 100);
$$;

REVOKE ALL ON FUNCTION public.argos_fetch_mural_comunidade(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.argos_fetch_mural_comunidade(integer) TO authenticated;

-- Um round-trip para profile + histórico + mural
CREATE OR REPLACE FUNCTION public.fetch_dashboard_bundle(
  p_musculo public.subgrupo_muscular DEFAULT 'peito',
  p_mural_limit integer DEFAULT 48
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN (SELECT auth.uid()) IS NULL THEN NULL
    ELSE jsonb_build_object(
      'profile', (
        SELECT to_jsonb(row_p)
        FROM (
          SELECT
            full_name,
            nome_linhagem,
            status_altar,
            data_nascimento,
            role
          FROM public.profiles
          WHERE id = (SELECT auth.uid())
        ) AS row_p
      ),
      'historico', COALESCE((
        SELECT jsonb_agg(to_jsonb(row_h) ORDER BY row_h.registrado_em DESC)
        FROM (
          SELECT
            id,
            exercicio_id,
            exercicio_nome,
            musculo,
            peso,
            peso_atual,
            series,
            repeticoes,
            status,
            registrado_em
          FROM public.historico_treinos
          WHERE cliente_id = (SELECT auth.uid())
            AND musculo = p_musculo::text
        ) AS row_h
      ), '[]'::jsonb),
      'mural', COALESCE((
        SELECT jsonb_agg(to_jsonb(m))
        FROM public.argos_fetch_mural_comunidade(
          LEAST(GREATEST(COALESCE(p_mural_limit, 48), 1), 100)
        ) AS m
      ), '[]'::jsonb)
    )
  END;
$$;

REVOKE ALL ON FUNCTION public.fetch_dashboard_bundle(public.subgrupo_muscular, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fetch_dashboard_bundle(public.subgrupo_muscular, integer) TO authenticated;

-- RLS SELECT: fast-path para linhas próprias (evita JOIN forjador em 99% dos reads)
DROP POLICY IF EXISTS "ARGOS historico_treinos select self or forjador" ON public.historico_treinos;
CREATE POLICY "ARGOS historico_treinos select self or forjador"
ON public.historico_treinos
FOR SELECT
TO authenticated
USING (
  cliente_id = (SELECT auth.uid())
  OR public.argos_is_self_or_forjador(cliente_id)
);

-- Lockdown INSERT direto (re-aplica se migration anterior não rodou)
DROP POLICY IF EXISTS "ARGOS historico_treinos insert own" ON public.historico_treinos;

DROP TRIGGER IF EXISTS trg_argos_historico_block_client_status ON public.historico_treinos;
CREATE TRIGGER trg_argos_historico_block_client_status
BEFORE INSERT OR UPDATE ON public.historico_treinos
FOR EACH ROW
EXECUTE FUNCTION public.argos_historico_treinos_block_client_status();
