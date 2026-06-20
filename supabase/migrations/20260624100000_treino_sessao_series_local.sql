-- FENYXIA · Treino — conclusão de séries 100% local (custo zero Supabase)
--
-- Modelo:
--   · Séries concluídas no dia → apenas localStorage (meccafit:altar-vtc:*)
--   · registrar_treino_com_status → somente PR / carga máxima / VTC / superação
--   · prescricoes_treino_forjador.series_alvo → fonte do número de séries propostas
--
-- Nenhuma tabela nova: evita writes por série e mantém o histórico enxuto.

BEGIN;

COMMENT ON COLUMN public.prescricoes_treino_forjador.series_alvo IS
  'Séries propostas pelo forjador · progresso diário fica no cliente (localStorage), sem escrita por série no Supabase.';

COMMENT ON FUNCTION public.registrar_treino_com_status(uuid, text, numeric, text, integer, integer, text) IS
  'Registra PR/carga máxima da sessão. Conclusão de séries individuais não passa por esta RPC — custo zero no banco.';

COMMIT;
