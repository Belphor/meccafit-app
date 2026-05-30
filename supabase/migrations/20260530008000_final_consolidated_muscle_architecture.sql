-- FENYXIA · Final Consolidated Muscle Architecture (IRIS)
--
-- Consolidação idempotente pós:
--   · 20260528590000_add_abdomen_subgrupo_muscular.sql
--   · 20260529000000_split_workout_architecture.sql
--
-- Objetivo:
--   · Catálogo canónico DB ↔ UI (subgrupo_muscular · workout_split_via · rotas altar)
--   · Funções únicas de normalização (aliases PT → enum)
--   · Backfill matriz_forca + workout_via em historico_treinos
--
-- Seguro re-correr em projectos já migrados.

-- ---------------------------------------------------------------------------
-- 1. Enums — garantir valores finais
-- ---------------------------------------------------------------------------

ALTER TYPE public.subgrupo_muscular ADD VALUE IF NOT EXISTS 'abdomen';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'workout_split_via') THEN
    CREATE TYPE public.workout_split_via AS ENUM ('via_a', 'via_b');
  END IF;
END $$;

COMMENT ON TYPE public.subgrupo_muscular IS
  'Grupos musculares canónicos Meccafit — matriz_forca · historico_treinos · bundle RPC.';

COMMENT ON TYPE public.workout_split_via IS
  'Via A = Membro Superior (peito, costas, ombros, braços, abdômen) · Via B = Membro Inferior (pernas).';

-- ---------------------------------------------------------------------------
-- 2. Catálogo canónico — 6 grupos DB (matriz_forca)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.muscle_canonical_groups (
  musculo public.subgrupo_muscular PRIMARY KEY,
  workout_via public.workout_split_via NOT NULL,
  label_pt text NOT NULL,
  sort_order smallint NOT NULL,
  CONSTRAINT muscle_canonical_groups_label_nonempty CHECK (char_length(btrim(label_pt)) > 0)
);

COMMENT ON TABLE public.muscle_canonical_groups IS
  'Referência IRIS — um registo por valor de subgrupo_muscular (evolução matriz_forca).';

INSERT INTO public.muscle_canonical_groups (musculo, workout_via, label_pt, sort_order)
VALUES
  ('peito'::public.subgrupo_muscular, 'via_a'::public.workout_split_via, 'Peito', 1),
  ('costas'::public.subgrupo_muscular, 'via_a'::public.workout_split_via, 'Costas', 2),
  ('ombros'::public.subgrupo_muscular, 'via_a'::public.workout_split_via, 'Ombros', 3),
  ('bracos'::public.subgrupo_muscular, 'via_a'::public.workout_split_via, 'Braços', 4),
  ('abdomen'::public.subgrupo_muscular, 'via_a'::public.workout_split_via, 'Abdômen', 5),
  ('pernas'::public.subgrupo_muscular, 'via_b'::public.workout_split_via, 'Pernas', 6)
ON CONFLICT (musculo) DO UPDATE SET
  workout_via = EXCLUDED.workout_via,
  label_pt = EXCLUDED.label_pt,
  sort_order = EXCLUDED.sort_order;

-- ---------------------------------------------------------------------------
-- 3. Catálogo UI — rotas do altar (mock-data subgroupsCatalog)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.muscle_ui_routes (
  slug text PRIMARY KEY,
  route_id integer NOT NULL UNIQUE,
  musculo public.subgrupo_muscular NOT NULL REFERENCES public.muscle_canonical_groups (musculo),
  subgroup_name text NOT NULL,
  monumental_title text NOT NULL,
  body_region text NOT NULL,
  sort_order smallint NOT NULL,
  CONSTRAINT muscle_ui_routes_slug_nonempty CHECK (char_length(btrim(slug)) > 0),
  CONSTRAINT muscle_ui_routes_body_region_check CHECK (
    body_region IN ('Membro Superior', 'Membro Inferior', 'Core')
  )
);

COMMENT ON TABLE public.muscle_ui_routes IS
  'Rotas monumentais do dashboard (?subgrupo=) — alinhado a src/lib/mock-data.ts subgroupsCatalog.';

INSERT INTO public.muscle_ui_routes (
  slug,
  route_id,
  musculo,
  subgroup_name,
  monumental_title,
  body_region,
  sort_order
)
VALUES
  (
    'peitoral-superior',
    1,
    'peito'::public.subgrupo_muscular,
    'Peitoral Superior',
    'Peito',
    'Membro Superior',
    1
  ),
  (
    'membro-inferior',
    2,
    'pernas'::public.subgrupo_muscular,
    'Pernas',
    'Pernas',
    'Membro Inferior',
    2
  ),
  (
    'core',
    3,
    'abdomen'::public.subgrupo_muscular,
    'Abdômen',
    'Abdômen',
    'Membro Superior',
    3
  )
ON CONFLICT (slug) DO UPDATE SET
  route_id = EXCLUDED.route_id,
  musculo = EXCLUDED.musculo,
  subgroup_name = EXCLUDED.subgroup_name,
  monumental_title = EXCLUDED.monumental_title,
  body_region = EXCLUDED.body_region,
  sort_order = EXCLUDED.sort_order;

-- ---------------------------------------------------------------------------
-- 4. Funções canónicas — normalização · resolução · catálogo JSON
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.muscle_normalize_subgrupo(p_label text)
RETURNS public.subgrupo_muscular
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_label IS NULL OR BTRIM(p_label) = '' THEN 'peito'::public.subgrupo_muscular
    WHEN LOWER(BTRIM(p_label)) IN ('costas', 'peito', 'ombros', 'bracos', 'pernas', 'abdomen')
      THEN LOWER(BTRIM(p_label))::public.subgrupo_muscular
    WHEN LOWER(BTRIM(p_label)) LIKE '%costa%' THEN 'costas'::public.subgrupo_muscular
    WHEN LOWER(BTRIM(p_label)) LIKE '%peit%' OR LOWER(BTRIM(p_label)) LIKE '%peitor%'
      THEN 'peito'::public.subgrupo_muscular
    WHEN LOWER(BTRIM(p_label)) LIKE '%ombro%' THEN 'ombros'::public.subgrupo_muscular
    WHEN LOWER(BTRIM(p_label)) LIKE '%brac%' OR LOWER(BTRIM(p_label)) LIKE '%braç%'
      THEN 'bracos'::public.subgrupo_muscular
    WHEN LOWER(BTRIM(p_label)) LIKE '%perna%' OR LOWER(BTRIM(p_label)) LIKE '%inferior%'
      THEN 'pernas'::public.subgrupo_muscular
    WHEN LOWER(BTRIM(p_label)) IN ('abdome', 'abdômen', 'core', 'abdomen')
      THEN 'abdomen'::public.subgrupo_muscular
    ELSE 'peito'::public.subgrupo_muscular
  END;
$$;

COMMENT ON FUNCTION public.muscle_normalize_subgrupo(text) IS
  'Normaliza rótulos PT/aliases → subgrupo_muscular (espelha subgroup-musculo.ts).';

CREATE OR REPLACE FUNCTION public.muscle_resolve_ui_route(p_param text)
RETURNS public.muscle_ui_routes
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.*
  FROM public.muscle_ui_routes r
  WHERE r.slug = LOWER(BTRIM(COALESCE(p_param, '')))
     OR r.route_id::text = BTRIM(COALESCE(p_param, ''))
  ORDER BY
    CASE WHEN r.slug = LOWER(BTRIM(COALESCE(p_param, ''))) THEN 0 ELSE 1 END,
    r.sort_order
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.muscle_resolve_ui_route(text) IS
  'Resolve ?subgrupo= slug ou route_id numérico → linha muscle_ui_routes.';

CREATE OR REPLACE FUNCTION public.workout_resolve_split_via(p_musculo public.subgrupo_muscular)
RETURNS public.workout_split_via
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (
      SELECT mcg.workout_via
      FROM public.muscle_canonical_groups mcg
      WHERE mcg.musculo = p_musculo
    ),
    CASE
      WHEN p_musculo = 'pernas'::public.subgrupo_muscular THEN 'via_b'::public.workout_split_via
      ELSE 'via_a'::public.workout_split_via
    END
  );
$$;

CREATE OR REPLACE FUNCTION public.workout_split_via_label(p_via public.workout_split_via)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_via
    WHEN 'via_a'::public.workout_split_via THEN 'Membro Superior'
    WHEN 'via_b'::public.workout_split_via THEN 'Membro Inferior'
  END;
$$;

CREATE OR REPLACE FUNCTION public.muscle_fetch_architecture_catalog()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'canonical_groups',
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'musculo', mcg.musculo,
            'workout_via', mcg.workout_via,
            'workout_via_label', public.workout_split_via_label(mcg.workout_via),
            'label_pt', mcg.label_pt,
            'sort_order', mcg.sort_order
          )
          ORDER BY mcg.sort_order
        )
        FROM public.muscle_canonical_groups mcg
      ),
      '[]'::jsonb
    ),
    'ui_routes',
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'slug', r.slug,
            'route_id', r.route_id,
            'musculo', r.musculo,
            'subgroup_name', r.subgroup_name,
            'monumental_title', r.monumental_title,
            'body_region', r.body_region,
            'workout_via', mcg.workout_via,
            'workout_via_label', public.workout_split_via_label(mcg.workout_via),
            'sort_order', r.sort_order
          )
          ORDER BY r.sort_order
        )
        FROM public.muscle_ui_routes r
        JOIN public.muscle_canonical_groups mcg ON mcg.musculo = r.musculo
      ),
      '[]'::jsonb
    )
  );
$$;

COMMENT ON FUNCTION public.muscle_fetch_architecture_catalog() IS
  'Catálogo IRIS completo para BFF / ANIMA FENYXIA — grupos DB + rotas UI.';

-- ---------------------------------------------------------------------------
-- 5. Backfill — matriz_forca · historico_treinos.workout_via
-- ---------------------------------------------------------------------------

INSERT INTO public.matriz_forca (cliente_id, musculo)
SELECT p.id, mcg.musculo
FROM public.profiles p
CROSS JOIN public.muscle_canonical_groups mcg
WHERE p.role = 'cliente'::public.user_role
ON CONFLICT (cliente_id, musculo) DO NOTHING;

UPDATE public.historico_treinos ht
SET workout_via = public.workout_resolve_split_via(public.muscle_normalize_subgrupo(ht.musculo))
WHERE ht.workout_via IS NULL
  AND ht.cliente_id IS NOT NULL
  AND ht.musculo IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 6. RLS — catálogos read-only (referência)
-- ---------------------------------------------------------------------------

ALTER TABLE public.muscle_canonical_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.muscle_ui_routes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ARGOS muscle_canonical_groups select authenticated" ON public.muscle_canonical_groups;
CREATE POLICY "ARGOS muscle_canonical_groups select authenticated"
ON public.muscle_canonical_groups
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "ARGOS muscle_ui_routes select authenticated" ON public.muscle_ui_routes;
CREATE POLICY "ARGOS muscle_ui_routes select authenticated"
ON public.muscle_ui_routes
FOR SELECT
TO authenticated
USING (true);

REVOKE ALL ON TABLE public.muscle_canonical_groups FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.muscle_ui_routes FROM PUBLIC, anon;

GRANT SELECT ON TABLE public.muscle_canonical_groups TO authenticated, service_role;
GRANT SELECT ON TABLE public.muscle_ui_routes TO authenticated, service_role;
GRANT ALL ON TABLE public.muscle_canonical_groups TO service_role;
GRANT ALL ON TABLE public.muscle_ui_routes TO service_role;

REVOKE ALL ON FUNCTION public.muscle_normalize_subgrupo(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.muscle_resolve_ui_route(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.muscle_fetch_architecture_catalog() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.muscle_normalize_subgrupo(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.muscle_resolve_ui_route(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.muscle_fetch_architecture_catalog() TO authenticated, service_role;
