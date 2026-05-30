-- FENYXIA · HOTFIX — workout_resolve_split_via após DROP muscle_canonical_groups
-- Região: sa-east-1 · Idempotente
--
-- Sintoma ARGOS:
--   relation "public.muscle_canonical_groups" does not exist
--   em registrar_treino_com_status → workout_resolve_split_via
--
-- Causa: migration IRIS substituiu a função para ler muscle_canonical_groups;
--        patch Evolução removeu a tabela sem restaurar a função original.

CREATE OR REPLACE FUNCTION public.workout_resolve_split_via(p_musculo public.subgrupo_muscular)
RETURNS public.workout_split_via
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_musculo = 'pernas'::public.subgrupo_muscular THEN 'via_b'::public.workout_split_via
    ELSE 'via_a'::public.workout_split_via
  END;
$$;

COMMENT ON FUNCTION public.workout_resolve_split_via(public.subgrupo_muscular) IS
  'Via A = Membro Superior · Via B = Pernas — restaurado pós-remoção catálogo IRIS.';

GRANT EXECUTE ON FUNCTION public.workout_resolve_split_via(public.subgrupo_muscular)
  TO authenticated, service_role;
