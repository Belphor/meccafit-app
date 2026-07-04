BEGIN;

DROP FUNCTION IF EXISTS public.client_sync_plano_meta(integer);
DROP FUNCTION IF EXISTS public.evolucao_resolve_meta_vtc_mensal(uuid);
DROP FUNCTION IF EXISTS public.evolucao_calcular_meta_vtc_por_treinos(integer);

COMMIT;
