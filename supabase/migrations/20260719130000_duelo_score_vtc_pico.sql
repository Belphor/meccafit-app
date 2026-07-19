-- Duelos passam a somar VTC (pico de carga), não workload (peso × reps).
-- SUPERIORES = PEITO+OMBROS+BRACOS+COSTAS · INFERIORES = PERNAS · sem ABDOMEN.
-- Alinha o placar do duelo à definição canônica de VTC (midas / rankings).

CREATE OR REPLACE FUNCTION public.comunidade_on_historico_carga()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pico numeric;
  v_duelo record;
  v_mes date;
BEGIN
  v_pico := public.comunidade_pico_forca_linha(NEW.carga_maxima);

  IF v_pico <= 0 THEN
    RETURN NEW;
  END IF;

  v_mes := public.comunidade_mes_atual_sp();
  PERFORM public.comunidade_ensure_meta_mes(v_mes);

  UPDATE public.metas_coletivas_academia
  SET tonelagem_atual_acumulada = tonelagem_atual_acumulada + v_pico,
      updated_at = now()
  WHERE mes_referencia = v_mes
    AND fechado_em IS NULL;

  PERFORM public.comunidade_processar_duelos_expirados();

  FOR v_duelo IN
    SELECT d.*
    FROM public.duelos_supergrupos d
    WHERE d.status = 'EM_ANDAMENTO'::public.status_duelo_supergrupo
      AND NEW.data_registro >= d.inicio_em
      AND NEW.data_registro < d.fim_em
      AND NEW.atleta_id IN (d.atleta_desafiante_id, d.atleta_desafiado_id)
      AND public.comunidade_grupo_elegivel_duelo(d.tipo_confronto, NEW.grupo_muscular)
    FOR UPDATE
  LOOP
    IF NEW.atleta_id = v_duelo.atleta_desafiante_id THEN
      UPDATE public.duelos_supergrupos
      SET vtc_desafiante = vtc_desafiante + v_pico, updated_at = now()
      WHERE id = v_duelo.id;
    ELSE
      UPDATE public.duelos_supergrupos
      SET vtc_desafiado = vtc_desafiado + v_pico, updated_at = now()
      WHERE id = v_duelo.id;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.comunidade_on_historico_carga() IS
  'Termómetro + duelos em VTC (pico de carga). SUPERIORES=peito/ombros/braços/costas · INFERIORES=pernas.';

-- Recalcula duelos abertos: soma dos picos diários por exercício (mesma lógica MIDAS).
WITH peaks AS (
  SELECT
    d.id AS duelo_id,
    hc.atleta_id,
    (hc.data_registro AT TIME ZONE 'America/Sao_Paulo')::date AS dia,
    hc.exercicio_id,
    MAX(hc.carga_maxima) AS day_peak
  FROM public.duelos_supergrupos d
  JOIN public.historico_cargas hc
    ON hc.atleta_id IN (d.atleta_desafiante_id, d.atleta_desafiado_id)
   AND hc.data_registro >= d.inicio_em
   AND hc.data_registro < d.fim_em
   AND public.comunidade_grupo_elegivel_duelo(d.tipo_confronto, hc.grupo_muscular)
  WHERE d.status = 'EM_ANDAMENTO'::public.status_duelo_supergrupo
  GROUP BY d.id, hc.atleta_id, 3, hc.exercicio_id
),
totals AS (
  SELECT
    duelo_id,
    atleta_id,
    COALESCE(SUM(day_peak), 0) AS vtc_total
  FROM peaks
  GROUP BY duelo_id, atleta_id
)
UPDATE public.duelos_supergrupos d
SET
  vtc_desafiante = COALESCE((
    SELECT t.vtc_total FROM totals t
    WHERE t.duelo_id = d.id AND t.atleta_id = d.atleta_desafiante_id
  ), 0),
  vtc_desafiado = COALESCE((
    SELECT t.vtc_total FROM totals t
    WHERE t.duelo_id = d.id AND t.atleta_id = d.atleta_desafiado_id
  ), 0),
  updated_at = now()
WHERE d.status = 'EM_ANDAMENTO'::public.status_duelo_supergrupo;
