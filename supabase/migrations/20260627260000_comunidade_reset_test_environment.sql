-- RPC · limpeza completa da arena cooperativa para testes reais
-- Zera duelos, cargas VTC, termómetro colectivo e títulos PLUTUS (bypass trigger)

BEGIN;

CREATE OR REPLACE FUNCTION public.comunidade_reset_test_environment()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_duelos bigint := 0;
  v_cargas bigint := 0;
  v_metas bigint := 0;
  v_planos bigint := 0;
BEGIN
  DELETE FROM public.duelos_supergrupos WHERE true;
  GET DIAGNOSTICS v_duelos = ROW_COUNT;

  DELETE FROM public.historico_cargas WHERE true;
  GET DIAGNOSTICS v_cargas = ROW_COUNT;

  IF to_regclass('public.comunidade_titulos') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.comunidade_titulos';
  END IF;

  UPDATE public.metas_coletivas_academia
  SET tonelagem_atual_acumulada = 0,
      updated_at = now()
  WHERE tonelagem_atual_acumulada IS DISTINCT FROM 0;
  GET DIAGNOSTICS v_metas = ROW_COUNT;

  PERFORM set_config('comunidade.system_mutation', 'on', true);

  UPDATE public.planos_atletas
  SET tem_cinturao_duelo = false,
      tem_cinturao_superiores = false,
      tem_cinturao_inferiores = false,
      is_rei_das_chamas = false,
      is_rei_chamas_superiores = false,
      is_rei_chamas_inferiores = false,
      is_pilar_cooperativo = false,
      grupos_obrigatorios = '{}'::text[];
  GET DIAGNOSTICS v_planos = ROW_COUNT;

  PERFORM set_config('comunidade.system_mutation', 'off', true);

  RETURN jsonb_build_object(
    'duelos_removidos', v_duelos,
    'cargas_removidas', v_cargas,
    'metas_zeradas', v_metas,
    'planos_atualizados', v_planos
  );
END;
$$;

COMMENT ON FUNCTION public.comunidade_reset_test_environment() IS
  'Testes · zera duelos, historico_cargas, termómetro colectivo e flags PLUTUS em planos_atletas.';

REVOKE ALL ON FUNCTION public.comunidade_reset_test_environment() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.comunidade_reset_test_environment() TO service_role;

COMMIT;
