-- Duelo na semana civil (domingo SP) e encerra cedo quando ambos completam
-- todos os grupos da faixa. Placar = soma do melhor pico por grupo (anti-farm).

CREATE OR REPLACE FUNCTION public.comunidade_duelo_fim_semana(p_inicio timestamptz)
RETURNS timestamptz
LANGUAGE sql
STABLE
PARALLEL SAFE
AS $$
  WITH local_ts AS (
    SELECT (p_inicio AT TIME ZONE 'America/Sao_Paulo') AS ts
  ),
  local_day AS (
    SELECT (ts::date) AS dia,
           EXTRACT(DOW FROM ts::date)::integer AS dow
    FROM local_ts
  ),
  sunday AS (
    -- DOW 0 = domingo. Fecha no domingo da semana corrente (SP).
    SELECT (dia + ((7 - dow) % 7))::date AS domingo
    FROM local_day
  )
  SELECT ((domingo + TIME '23:59:59.999') AT TIME ZONE 'America/Sao_Paulo')
  FROM sunday;
$$;

COMMENT ON FUNCTION public.comunidade_duelo_fim_semana(timestamptz) IS
  'Fim do duelo no domingo 23:59:59.999 America/Sao_Paulo da semana do início.';

CREATE OR REPLACE FUNCTION public.comunidade_duelo_set_janela()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT'
     OR (TG_OP = 'UPDATE' AND NEW.inicio_em IS DISTINCT FROM OLD.inicio_em)
     OR NEW.fim_em IS NULL
     OR NEW.fim_em <= NEW.inicio_em THEN
    NEW.fim_em := public.comunidade_duelo_fim_semana(NEW.inicio_em);
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.comunidade_duelo_set_janela() IS
  'Janela do duelo até o domingo da semana (SP). Recalcula se inicio_em mudar.';

CREATE OR REPLACE FUNCTION public.comunidade_duelo_grupos_obrigatorios(
  p_tipo public.tipo_confronto_duelo
)
RETURNS integer
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT CASE
    WHEN p_tipo = 'SUPERIORES'::public.tipo_confronto_duelo THEN 4
    WHEN p_tipo = 'INFERIORES'::public.tipo_confronto_duelo THEN 1
    ELSE 0
  END;
$$;

-- Melhor pico por grupo muscular elegível, somados (impede farm de um só grupo).
CREATE OR REPLACE FUNCTION public.comunidade_duelo_vtc_atleta(
  p_duelo_id uuid,
  p_atleta_id uuid
)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(grupo_peak), 0)
  FROM (
    SELECT MAX(hc.carga_maxima) AS grupo_peak
    FROM public.duelos_supergrupos d
    JOIN public.historico_cargas hc
      ON hc.atleta_id = p_atleta_id
     AND hc.data_registro >= d.inicio_em
     AND hc.data_registro < d.fim_em
     AND public.comunidade_grupo_elegivel_duelo(d.tipo_confronto, hc.grupo_muscular)
    WHERE d.id = p_duelo_id
    GROUP BY hc.grupo_muscular
  ) peaks;
$$;

CREATE OR REPLACE FUNCTION public.comunidade_duelo_atleta_completo(
  p_duelo_id uuid,
  p_atleta_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.duelos_supergrupos d
    WHERE d.id = p_duelo_id
      AND (
        SELECT COUNT(DISTINCT hc.grupo_muscular)
        FROM public.historico_cargas hc
        WHERE hc.atleta_id = p_atleta_id
          AND hc.data_registro >= d.inicio_em
          AND hc.data_registro < d.fim_em
          AND public.comunidade_grupo_elegivel_duelo(d.tipo_confronto, hc.grupo_muscular)
          AND public.comunidade_pico_forca_linha(hc.carga_maxima) > 0
      ) >= public.comunidade_duelo_grupos_obrigatorios(d.tipo_confronto)
  );
$$;

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
    UPDATE public.duelos_supergrupos
    SET
      vtc_desafiante = public.comunidade_duelo_vtc_atleta(v_duelo.id, v_duelo.atleta_desafiante_id),
      vtc_desafiado = public.comunidade_duelo_vtc_atleta(v_duelo.id, v_duelo.atleta_desafiado_id),
      updated_at = now()
    WHERE id = v_duelo.id;

    IF public.comunidade_duelo_atleta_completo(v_duelo.id, v_duelo.atleta_desafiante_id)
       AND public.comunidade_duelo_atleta_completo(v_duelo.id, v_duelo.atleta_desafiado_id) THEN
      PERFORM public.comunidade_finalizar_duelo(v_duelo.id);
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.comunidade_on_historico_carga() IS
  'Termómetro em pico. Duelo = soma do melhor VTC por grupo. Encerra quando ambos completam a faixa ou no domingo.';

-- Recalcula placar aberto e finaliza quem já completou a faixa.
DO $$
DECLARE
  v_row record;
BEGIN
  FOR v_row IN
    SELECT id, atleta_desafiante_id, atleta_desafiado_id
    FROM public.duelos_supergrupos
    WHERE status = 'EM_ANDAMENTO'::public.status_duelo_supergrupo
  LOOP
    UPDATE public.duelos_supergrupos
    SET
      vtc_desafiante = public.comunidade_duelo_vtc_atleta(v_row.id, v_row.atleta_desafiante_id),
      vtc_desafiado = public.comunidade_duelo_vtc_atleta(v_row.id, v_row.atleta_desafiado_id),
      updated_at = now()
    WHERE id = v_row.id;

    IF public.comunidade_duelo_atleta_completo(v_row.id, v_row.atleta_desafiante_id)
       AND public.comunidade_duelo_atleta_completo(v_row.id, v_row.atleta_desafiado_id) THEN
      PERFORM public.comunidade_finalizar_duelo(v_row.id);
    END IF;
  END LOOP;

  -- Reaplica fim_em dos duelos abertos para o domingo da semana do início.
  UPDATE public.duelos_supergrupos
  SET fim_em = public.comunidade_duelo_fim_semana(inicio_em),
      updated_at = now()
  WHERE status = 'EM_ANDAMENTO'::public.status_duelo_supergrupo;
END;
$$;
