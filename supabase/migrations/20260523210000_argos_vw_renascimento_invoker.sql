-- ARGOS: vw_renascimento_fenix — SECURITY INVOKER (privilégios de quem consulta, não do owner).
-- Recria a view preservando a definição atual e aplicando security_invoker = true.
-- Com invoker ativo, RLS das tabelas base (profiles, planos_semanais, etc.) passa a valer.

DO $$
DECLARE
  view_def text;
BEGIN
  IF to_regclass('public.vw_renascimento_fenix') IS NULL THEN
    RAISE NOTICE 'ARGOS: vw_renascimento_fenix não existe — nada a migrar';
    RETURN;
  END IF;

  SELECT pg_get_viewdef('public.vw_renascimento_fenix'::regclass, true) INTO view_def;

  IF view_def IS NULL OR length(trim(view_def)) = 0 THEN
    RAISE EXCEPTION 'ARGOS: definição vazia para vw_renascimento_fenix';
  END IF;

  EXECUTE 'DROP VIEW public.vw_renascimento_fenix';

  EXECUTE format(
    'CREATE VIEW public.vw_renascimento_fenix WITH (security_invoker = true) AS %s',
    view_def
  );
END $$;

REVOKE ALL ON public.vw_renascimento_fenix FROM PUBLIC, anon;
GRANT SELECT ON public.vw_renascimento_fenix TO authenticated;
