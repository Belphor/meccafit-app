-- Patch: hasVipBond no feed VTC global

CREATE OR REPLACE FUNCTION public.argos_forja_vtc_feed(p_limit integer DEFAULT 64)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date := (timezone('America/Sao_Paulo', now()))::date;
  v_lim integer := LEAST(GREATEST(COALESCE(p_limit, 64), 1), 128);
BEGIN
  IF NOT public.argos_is_forjador_panel() THEN
    RAISE EXCEPTION 'permission denied'
      USING ERRCODE = '42501';
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(row ORDER BY (row->>'vtcToday')::numeric DESC, row->>'displayName')
    FROM (
      SELECT jsonb_build_object(
        'clientId', p.id,
        'displayName', COALESCE(NULLIF(btrim(p.full_name), ''), NULLIF(btrim(p.nome_linhagem), ''), 'Atleta ' || left(p.id::text, 8)),
        'forgerName', COALESCE(
          NULLIF(btrim(fj.full_name), ''),
          NULLIF(btrim(fj.nome_linhagem), ''),
          '—'
        ),
        'phaseTier', LEAST(GREATEST(COALESCE(p.phase_tier, 1), 1), 5),
        'statusAltar', COALESCE(p.status_altar, 'ativo'),
        'vtcToday', COALESCE(b.vtc_total, 0),
        'vtcAvg7d', COALESCE((
          SELECT AVG(sub.vtc_total)
          FROM (
            SELECT bd.vtc_total
            FROM public.balanco_termico_diario bd
            WHERE bd.user_id = p.id
              AND bd.data_treino >= (v_today - 7)
              AND bd.data_treino < v_today
          ) sub
        ), 0),
        'vtc30d', COALESCE((
          SELECT SUM(bd.vtc_total)
          FROM public.balanco_termico_diario bd
          WHERE bd.user_id = p.id AND bd.data_treino >= (v_today - 30)
        ), 0),
        'updatedAt', COALESCE(b.updated_at, p.updated_at),
        'isOwnClient', (p.forjador_id = auth.uid()),
        'hasVipBond', EXISTS (
          SELECT 1 FROM public.forger_client_bonds fcb
          WHERE fcb.client_id = p.id
        ),
        'alertSpike',
          COALESCE(b.vtc_total, 0) > 0
          AND COALESCE((
            SELECT AVG(sub.vtc_total)
            FROM (
              SELECT bd.vtc_total
              FROM public.balanco_termico_diario bd
              WHERE bd.user_id = p.id
                AND bd.data_treino >= (v_today - 7)
                AND bd.data_treino < v_today
            ) sub
          ), 0) > 0
          AND COALESCE(b.vtc_total, 0) > (
            COALESCE((
              SELECT AVG(sub.vtc_total)
              FROM (
                SELECT bd.vtc_total
                FROM public.balanco_termico_diario bd
                WHERE bd.user_id = p.id
                  AND bd.data_treino >= (v_today - 7)
                  AND bd.data_treino < v_today
              ) sub
            ), 0) * 4
          )
      ) AS row
      FROM public.profiles p
      LEFT JOIN public.balanco_termico_diario b
        ON b.user_id = p.id AND b.data_treino = v_today
      LEFT JOIN public.profiles fj ON fj.id = p.forjador_id
      WHERE p.role = 'cliente'::public.user_role
      ORDER BY COALESCE(b.vtc_total, 0) DESC, p.full_name NULLS LAST
      LIMIT v_lim
    ) sub
  ), '[]'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.argos_forja_vtc_feed(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.argos_forja_vtc_feed(integer) TO authenticated;
