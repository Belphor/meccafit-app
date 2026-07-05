-- Perfil · sexo, identidade confirmada, nomes únicos
-- Comunidade · rankings e Reis das Chamas por gênero (masculino / feminino)

BEGIN;

CREATE TYPE public.profile_sexo AS ENUM ('masculino', 'feminino');

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS sexo public.profile_sexo,
  ADD COLUMN IF NOT EXISTS perfil_identidade_confirmada boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS anima_portal_visto boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.sexo IS
  'Gênero declarado no perfil · filtra rankings mensais e títulos Rei/Rainha das Chamas.';

COMMENT ON COLUMN public.profiles.perfil_identidade_confirmada IS
  'True após confirmar nome único e sexo na aba Perfil.';

COMMENT ON COLUMN public.profiles.anima_portal_visto IS
  'True após acender a linhagem no Portal de Brasa · libera skip da introdução.';

CREATE UNIQUE INDEX IF NOT EXISTS profiles_cliente_full_name_unique_ci
  ON public.profiles (lower(btrim(full_name)))
  WHERE role = 'cliente'::public.user_role
    AND perfil_identidade_confirmada = true
    AND full_name IS NOT NULL
    AND btrim(full_name) <> '';

ALTER TABLE public.planos_atletas
  ADD COLUMN IF NOT EXISTS is_rei_chamas_sup_masc boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_rei_chamas_sup_fem boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_rei_chamas_inf_masc boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_rei_chamas_inf_fem boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.planos_atletas.is_rei_chamas_sup_masc IS
  'Rei das Chamas · faixa Superiores · masculino · mês corrente após fecho.';
COMMENT ON COLUMN public.planos_atletas.is_rei_chamas_sup_fem IS
  'Rainha das Chamas · faixa Superiores · feminino · mês corrente após fecho.';
COMMENT ON COLUMN public.planos_atletas.is_rei_chamas_inf_masc IS
  'Rei das Chamas · faixa Inferiores · masculino · mês corrente após fecho.';
COMMENT ON COLUMN public.planos_atletas.is_rei_chamas_inf_fem IS
  'Rainha das Chamas · faixa Inferiores · feminino · mês corrente após fecho.';

CREATE OR REPLACE FUNCTION public.sync_rei_das_chamas_flags()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.is_rei_chamas_superiores := (NEW.is_rei_chamas_sup_masc OR NEW.is_rei_chamas_sup_fem);
  NEW.is_rei_chamas_inferiores := (NEW.is_rei_chamas_inf_masc OR NEW.is_rei_chamas_inf_fem);
  NEW.is_rei_das_chamas := (
    NEW.is_rei_chamas_superiores OR NEW.is_rei_chamas_inferiores
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_planos_atletas_sync_rei_chamas ON public.planos_atletas;

DROP TRIGGER IF EXISTS trg_sync_rei_das_chamas_flags ON public.planos_atletas;
CREATE TRIGGER trg_sync_rei_das_chamas_flags
  BEFORE INSERT OR UPDATE OF
    is_rei_chamas_sup_masc,
    is_rei_chamas_sup_fem,
    is_rei_chamas_inf_masc,
    is_rei_chamas_inf_fem,
    is_rei_chamas_superiores,
    is_rei_chamas_inferiores
  ON public.planos_atletas
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_rei_das_chamas_flags();

CREATE OR REPLACE FUNCTION public.comunidade_protect_titulos_flags()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_setting('comunidade.system_mutation', true) IS DISTINCT FROM 'on' THEN
    NEW.tem_cinturao_duelo := OLD.tem_cinturao_duelo;
    NEW.tem_cinturao_superiores := OLD.tem_cinturao_superiores;
    NEW.tem_cinturao_inferiores := OLD.tem_cinturao_inferiores;
    NEW.is_rei_das_chamas := OLD.is_rei_das_chamas;
    NEW.is_rei_chamas_superiores := OLD.is_rei_chamas_superiores;
    NEW.is_rei_chamas_inferiores := OLD.is_rei_chamas_inferiores;
    NEW.is_rei_chamas_sup_masc := OLD.is_rei_chamas_sup_masc;
    NEW.is_rei_chamas_sup_fem := OLD.is_rei_chamas_sup_fem;
    NEW.is_rei_chamas_inf_masc := OLD.is_rei_chamas_inf_masc;
    NEW.is_rei_chamas_inf_fem := OLD.is_rei_chamas_inf_fem;
    NEW.is_pilar_cooperativo := OLD.is_pilar_cooperativo;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.client_update_display_name(p_full_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid;
  v_trimmed text;
BEGIN
  v_caller := auth.uid();
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('error', 'unauthorized', 'code', 401);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = v_caller AND p.role = 'cliente'::public.user_role
  ) THEN
    RETURN jsonb_build_object('error', 'forbidden', 'code', 403, 'message', 'Apenas clientes podem atualizar o nome.');
  END IF;

  v_trimmed := NULLIF(BTRIM(COALESCE(p_full_name, '')), '');
  IF v_trimmed IS NULL OR char_length(v_trimmed) < 2 THEN
    RETURN jsonb_build_object('error', 'invalid_name', 'code', 400, 'message', 'Informe um nome com pelo menos 2 caracteres.');
  END IF;

  IF char_length(v_trimmed) > 48 THEN
    RETURN jsonb_build_object('error', 'invalid_name', 'code', 400, 'message', 'Nome muito longo (máx. 48 caracteres).');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id <> v_caller
      AND p.role = 'cliente'::public.user_role
      AND p.perfil_identidade_confirmada = true
      AND lower(btrim(p.full_name)) = lower(v_trimmed)
  ) THEN
    RETURN jsonb_build_object(
      'error', 'name_taken',
      'code', 409,
      'message', 'Este nome já pertence a outra chama da linhagem. Escolha outro.'
    );
  END IF;

  UPDATE public.profiles
  SET full_name = v_trimmed,
      updated_at = now()
  WHERE id = v_caller;

  RETURN jsonb_build_object('ok', true, 'full_name', v_trimmed);
END;
$$;

CREATE OR REPLACE FUNCTION public.client_confirm_profile_identity(
  p_full_name text,
  p_sexo public.profile_sexo
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid;
  v_trimmed text;
BEGIN
  v_caller := auth.uid();
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('error', 'unauthorized', 'code', 401);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = v_caller AND p.role = 'cliente'::public.user_role
  ) THEN
    RETURN jsonb_build_object('error', 'forbidden', 'code', 403, 'message', 'Apenas clientes podem confirmar a identidade.');
  END IF;

  v_trimmed := NULLIF(BTRIM(COALESCE(p_full_name, '')), '');
  IF v_trimmed IS NULL OR char_length(v_trimmed) < 2 THEN
    RETURN jsonb_build_object('error', 'invalid_name', 'code', 400, 'message', 'Informe um nome com pelo menos 2 caracteres.');
  END IF;

  IF char_length(v_trimmed) > 48 THEN
    RETURN jsonb_build_object('error', 'invalid_name', 'code', 400, 'message', 'Nome muito longo (máx. 48 caracteres).');
  END IF;

  IF p_sexo IS NULL THEN
    RETURN jsonb_build_object('error', 'invalid_sexo', 'code', 400, 'message', 'Selecione masculino ou feminino.');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id <> v_caller
      AND p.role = 'cliente'::public.user_role
      AND p.perfil_identidade_confirmada = true
      AND lower(btrim(p.full_name)) = lower(v_trimmed)
  ) THEN
    RETURN jsonb_build_object(
      'error', 'name_taken',
      'code', 409,
      'message', 'Este nome já pertence a outra chama da linhagem. Escolha outro.'
    );
  END IF;

  UPDATE public.profiles
  SET full_name = v_trimmed,
      sexo = p_sexo,
      perfil_identidade_confirmada = true,
      updated_at = now()
  WHERE id = v_caller;

  RETURN jsonb_build_object(
    'ok', true,
    'full_name', v_trimmed,
    'sexo', p_sexo::text,
    'perfil_identidade_confirmada', true
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.client_mark_anima_portal_visto()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid;
BEGIN
  v_caller := auth.uid();
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('error', 'unauthorized', 'code', 401);
  END IF;

  UPDATE public.profiles
  SET anima_portal_visto = true,
      updated_at = now()
  WHERE id = v_caller
    AND role = 'cliente'::public.user_role;

  RETURN jsonb_build_object('ok', true, 'anima_portal_visto', true);
END;
$$;

REVOKE ALL ON FUNCTION public.client_confirm_profile_identity(text, public.profile_sexo) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.client_confirm_profile_identity(text, public.profile_sexo) TO authenticated;

REVOKE ALL ON FUNCTION public.client_mark_anima_portal_visto() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.client_mark_anima_portal_visto() TO authenticated;

CREATE OR REPLACE FUNCTION public.comunidade_ranking_slice_por_sexo(p_sexo public.profile_sexo)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_global jsonb;
  v_por_membro jsonb := '{}'::jsonb;
  v_faixa jsonb;
  v_grupo public.grupo_muscular_evolucao;
  v_rows jsonb;
  v_janela record;
BEGIN
  SELECT * INTO v_janela FROM public.comunidade_vtc_ranking_janela();

  WITH janela AS (
    SELECT r.mes_referencia, r.inicio, r.fim
    FROM public.comunidade_vtc_ranking_janela() r
  ),
  peaks AS (
    SELECT
      hc.atleta_id,
      hc.grupo_muscular,
      (hc.data_registro AT TIME ZONE 'America/Sao_Paulo')::date AS dia,
      hc.exercicio_id,
      MAX(hc.carga_maxima) AS day_peak
    FROM public.historico_cargas hc
    CROSS JOIN janela j
    INNER JOIN public.profiles p ON p.id = hc.atleta_id
    WHERE hc.data_registro >= j.inicio
      AND hc.data_registro < j.fim
      AND p.sexo = p_sexo
      AND p.perfil_identidade_confirmada = true
      AND hc.grupo_muscular IN (
        'PEITO'::public.grupo_muscular_evolucao,
        'OMBROS'::public.grupo_muscular_evolucao,
        'COSTAS'::public.grupo_muscular_evolucao,
        'PERNAS'::public.grupo_muscular_evolucao
      )
    GROUP BY 1, 2, 3, 4
  ),
  agg AS (
    SELECT peaks.atleta_id, SUM(peaks.day_peak) AS vtc_total
    FROM peaks
    GROUP BY 1
    HAVING SUM(peaks.day_peak) > 0
  ),
  ranked AS (
    SELECT agg.*, ROW_NUMBER() OVER (ORDER BY agg.vtc_total DESC, agg.atleta_id) AS posicao
    FROM agg
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'posicao', r.posicao,
      'atleta_id', r.atleta_id,
      'atleta_nome', COALESCE(NULLIF(BTRIM(p.full_name), ''), 'Membro da Linhagem'),
      'vtc_total', r.vtc_total,
      'tem_cinturao_duelo', COALESCE(pa.tem_cinturao_duelo, false),
      'tem_cinturao_superiores', COALESCE(pa.tem_cinturao_superiores, false),
      'tem_cinturao_inferiores', COALESCE(pa.tem_cinturao_inferiores, false),
      'is_rei_das_chamas', COALESCE(pa.is_rei_das_chamas, false),
      'is_rei_chamas_superiores', COALESCE(pa.is_rei_chamas_superiores, false),
      'is_rei_chamas_inferiores', COALESCE(pa.is_rei_chamas_inferiores, false),
      'is_pilar_cooperativo', COALESCE(pa.is_pilar_cooperativo, false)
    ) ORDER BY r.posicao
  ), '[]'::jsonb)
  INTO v_global
  FROM ranked r
  LEFT JOIN public.profiles p ON p.id = r.atleta_id
  LEFT JOIN public.planos_atletas pa ON pa.atleta_id = r.atleta_id
  WHERE r.posicao <= 10;

  FOREACH v_grupo IN ARRAY ARRAY[
    'PEITO'::public.grupo_muscular_evolucao,
    'OMBROS'::public.grupo_muscular_evolucao,
    'COSTAS'::public.grupo_muscular_evolucao,
    'PERNAS'::public.grupo_muscular_evolucao
  ] LOOP
    WITH janela AS (
      SELECT r.inicio, r.fim FROM public.comunidade_vtc_ranking_janela() r
    ),
    peaks AS (
      SELECT
        hc.atleta_id,
        hc.grupo_muscular,
        (hc.data_registro AT TIME ZONE 'America/Sao_Paulo')::date AS dia,
        hc.exercicio_id,
        MAX(hc.carga_maxima) AS day_peak
      FROM public.historico_cargas hc
      CROSS JOIN janela j
      INNER JOIN public.profiles p ON p.id = hc.atleta_id
      WHERE hc.data_registro >= j.inicio
        AND hc.data_registro < j.fim
        AND p.sexo = p_sexo
        AND p.perfil_identidade_confirmada = true
        AND hc.grupo_muscular = v_grupo
      GROUP BY 1, 2, 3, 4
    ),
    agg AS (
      SELECT peaks.atleta_id, SUM(peaks.day_peak) AS vtc_grupo
      FROM peaks
      GROUP BY 1
      HAVING SUM(peaks.day_peak) > 0
    ),
    ranked AS (
      SELECT agg.*, ROW_NUMBER() OVER (ORDER BY agg.vtc_grupo DESC, agg.atleta_id) AS posicao
      FROM agg
    )
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'posicao', r.posicao,
        'atleta_id', r.atleta_id,
        'atleta_nome', COALESCE(NULLIF(BTRIM(p.full_name), ''), 'Membro da Linhagem'),
        'vtc_grupo', r.vtc_grupo,
        'vtc_total', r.vtc_grupo,
        'tem_cinturao_duelo', COALESCE(pa.tem_cinturao_duelo, false),
        'tem_cinturao_superiores', COALESCE(pa.tem_cinturao_superiores, false),
        'tem_cinturao_inferiores', COALESCE(pa.tem_cinturao_inferiores, false),
        'is_rei_das_chamas', COALESCE(pa.is_rei_das_chamas, false),
        'is_rei_chamas_superiores', COALESCE(pa.is_rei_chamas_superiores, false),
        'is_rei_chamas_inferiores', COALESCE(pa.is_rei_chamas_inferiores, false),
        'is_pilar_cooperativo', COALESCE(pa.is_pilar_cooperativo, false)
      ) ORDER BY r.posicao
    ), '[]'::jsonb)
    INTO v_rows
    FROM ranked r
    LEFT JOIN public.profiles p ON p.id = r.atleta_id
    LEFT JOIN public.planos_atletas pa ON pa.atleta_id = r.atleta_id
    WHERE r.posicao <= 10;

    v_por_membro := v_por_membro || jsonb_build_object(lower(v_grupo::text), v_rows);
  END LOOP;

  WITH janela AS (
    SELECT r.inicio, r.fim FROM public.comunidade_vtc_ranking_janela() r
  ),
  peaks AS (
    SELECT
      hc.atleta_id,
      (hc.data_registro AT TIME ZONE 'America/Sao_Paulo')::date AS dia,
      hc.exercicio_id,
      MAX(hc.carga_maxima) AS day_peak
    FROM public.historico_cargas hc
    CROSS JOIN janela j
    INNER JOIN public.profiles p ON p.id = hc.atleta_id
    WHERE hc.data_registro >= j.inicio
      AND hc.data_registro < j.fim
      AND p.sexo = p_sexo
      AND p.perfil_identidade_confirmada = true
      AND hc.grupo_muscular IN (
        'PEITO'::public.grupo_muscular_evolucao,
        'OMBROS'::public.grupo_muscular_evolucao,
        'COSTAS'::public.grupo_muscular_evolucao
      )
    GROUP BY 1, 2, 3
  ),
  agg AS (
    SELECT peaks.atleta_id, SUM(peaks.day_peak) AS vtc_grupo
    FROM peaks
    GROUP BY 1
    HAVING SUM(peaks.day_peak) > 0
  ),
  ranked AS (
    SELECT agg.*, ROW_NUMBER() OVER (ORDER BY agg.vtc_grupo DESC, agg.atleta_id) AS posicao
    FROM agg
  )
  SELECT jsonb_build_object(
    'superiores', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'posicao', r.posicao,
          'atleta_id', r.atleta_id,
          'atleta_nome', COALESCE(NULLIF(BTRIM(p.full_name), ''), 'Membro da Linhagem'),
          'vtc_grupo', r.vtc_grupo,
          'vtc_total', r.vtc_grupo,
          'tem_cinturao_duelo', COALESCE(pa.tem_cinturao_duelo, false),
          'tem_cinturao_superiores', COALESCE(pa.tem_cinturao_superiores, false),
          'tem_cinturao_inferiores', COALESCE(pa.tem_cinturao_inferiores, false),
          'is_rei_das_chamas', COALESCE(pa.is_rei_das_chamas, false),
          'is_rei_chamas_superiores', COALESCE(pa.is_rei_chamas_superiores, false),
          'is_rei_chamas_inferiores', COALESCE(pa.is_rei_chamas_inferiores, false),
          'is_pilar_cooperativo', COALESCE(pa.is_pilar_cooperativo, false)
        ) ORDER BY r.posicao
      )
      FROM ranked r
      LEFT JOIN public.profiles p ON p.id = r.atleta_id
      LEFT JOIN public.planos_atletas pa ON pa.atleta_id = r.atleta_id
      WHERE r.posicao <= 10
    ), '[]'::jsonb),
    'inferiores', COALESCE(v_por_membro -> 'pernas', '[]'::jsonb)
  )
  INTO v_faixa;

  RETURN jsonb_build_object(
    'janela_tipo', 'mensal',
    'mes_referencia', v_janela.mes_referencia,
    'janela_inicio', v_janela.inicio,
    'janela_fim', v_janela.fim,
    'sexo', p_sexo::text,
    'vtc_global', v_global,
    'vtc_faixa', v_faixa,
    'vtc_por_membro', v_por_membro
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_rankings_thoth()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid;
  v_janela record;
  v_masc jsonb;
  v_fem jsonb;
BEGIN
  v_caller := auth.uid();
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('error', 'unauthorized', 'code', 401);
  END IF;

  SELECT * INTO v_janela FROM public.comunidade_vtc_ranking_janela();
  v_masc := public.comunidade_ranking_slice_por_sexo('masculino'::public.profile_sexo);
  v_fem := public.comunidade_ranking_slice_por_sexo('feminino'::public.profile_sexo);

  RETURN jsonb_build_object(
    'janela_tipo', 'mensal',
    'mes_referencia', v_janela.mes_referencia,
    'janela_inicio', v_janela.inicio,
    'janela_fim', v_janela.fim,
    'por_genero', jsonb_build_object(
      'masculino', v_masc,
      'feminino', v_fem
    ),
    'vtc_global', v_masc -> 'vtc_global',
    'vtc_faixa', v_masc -> 'vtc_faixa',
    'vtc_por_membro', v_masc -> 'vtc_por_membro'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.comunidade_fechar_titulos_mes(p_mes date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inicio timestamptz;
  v_fim timestamptz;
BEGIN
  IF p_mes IS NULL OR p_mes <> date_trunc('month', p_mes)::date THEN
    RAISE EXCEPTION 'p_mes deve ser o primeiro dia do mês';
  END IF;

  SELECT j.inicio, j.fim INTO v_inicio, v_fim
  FROM public.comunidade_janela_mes_sp(p_mes) j;

  UPDATE public.metas_coletivas_academia
  SET fechado_em = now(), updated_at = now()
  WHERE mes_referencia = p_mes AND fechado_em IS NULL;

  PERFORM set_config('comunidade.system_mutation', 'on', true);

  UPDATE public.planos_atletas
  SET is_rei_das_chamas = false,
      is_rei_chamas_superiores = false,
      is_rei_chamas_inferiores = false,
      is_rei_chamas_sup_masc = false,
      is_rei_chamas_sup_fem = false,
      is_rei_chamas_inf_masc = false,
      is_rei_chamas_inf_fem = false,
      is_pilar_cooperativo = false
  WHERE true;

  INSERT INTO public.planos_atletas (atleta_id)
  SELECT DISTINCT hc.atleta_id
  FROM public.historico_cargas hc
  WHERE hc.data_registro >= v_inicio
    AND hc.data_registro < v_fim
    AND hc.grupo_muscular IN (
      'PEITO'::public.grupo_muscular_evolucao,
      'OMBROS'::public.grupo_muscular_evolucao,
      'COSTAS'::public.grupo_muscular_evolucao,
      'PERNAS'::public.grupo_muscular_evolucao
    )
  ON CONFLICT (atleta_id) DO NOTHING;

  UPDATE public.planos_atletas pa
  SET is_rei_chamas_sup_masc = true
  WHERE pa.atleta_id = (
    SELECT sub.atleta_id FROM (
      SELECT vtc_por_atleta_grupo.atleta_id, SUM(vtc_por_atleta_grupo.vtc_grupo) AS vtc_mensal_kg
      FROM (
        SELECT peaks.atleta_id, peaks.grupo_muscular, SUM(peaks.day_peak) AS vtc_grupo
        FROM (
          SELECT hc.atleta_id, hc.grupo_muscular,
            (hc.data_registro AT TIME ZONE 'America/Sao_Paulo')::date AS dia,
            hc.exercicio_id, MAX(hc.carga_maxima) AS day_peak
          FROM public.historico_cargas hc
          INNER JOIN public.profiles p ON p.id = hc.atleta_id
          WHERE hc.data_registro >= v_inicio AND hc.data_registro < v_fim
            AND p.sexo = 'masculino'::public.profile_sexo
            AND p.perfil_identidade_confirmada = true
            AND hc.grupo_muscular IN ('PEITO'::public.grupo_muscular_evolucao, 'OMBROS'::public.grupo_muscular_evolucao, 'COSTAS'::public.grupo_muscular_evolucao)
          GROUP BY 1, 2, 3, 4
        ) peaks GROUP BY 1, 2
      ) vtc_por_atleta_grupo GROUP BY 1
      HAVING SUM(vtc_por_atleta_grupo.vtc_grupo) > 0
      ORDER BY SUM(vtc_por_atleta_grupo.vtc_grupo) DESC, vtc_por_atleta_grupo.atleta_id LIMIT 1
    ) sub
  );

  UPDATE public.planos_atletas pa
  SET is_rei_chamas_sup_fem = true
  WHERE pa.atleta_id = (
    SELECT sub.atleta_id FROM (
      SELECT vtc_por_atleta_grupo.atleta_id, SUM(vtc_por_atleta_grupo.vtc_grupo) AS vtc_mensal_kg
      FROM (
        SELECT peaks.atleta_id, peaks.grupo_muscular, SUM(peaks.day_peak) AS vtc_grupo
        FROM (
          SELECT hc.atleta_id, hc.grupo_muscular,
            (hc.data_registro AT TIME ZONE 'America/Sao_Paulo')::date AS dia,
            hc.exercicio_id, MAX(hc.carga_maxima) AS day_peak
          FROM public.historico_cargas hc
          INNER JOIN public.profiles p ON p.id = hc.atleta_id
          WHERE hc.data_registro >= v_inicio AND hc.data_registro < v_fim
            AND p.sexo = 'feminino'::public.profile_sexo
            AND p.perfil_identidade_confirmada = true
            AND hc.grupo_muscular IN ('PEITO'::public.grupo_muscular_evolucao, 'OMBROS'::public.grupo_muscular_evolucao, 'COSTAS'::public.grupo_muscular_evolucao)
          GROUP BY 1, 2, 3, 4
        ) peaks GROUP BY 1, 2
      ) vtc_por_atleta_grupo GROUP BY 1
      HAVING SUM(vtc_por_atleta_grupo.vtc_grupo) > 0
      ORDER BY SUM(vtc_por_atleta_grupo.vtc_grupo) DESC, vtc_por_atleta_grupo.atleta_id LIMIT 1
    ) sub
  );

  UPDATE public.planos_atletas pa
  SET is_rei_chamas_inf_masc = true
  WHERE pa.atleta_id = (
    SELECT sub.atleta_id FROM (
      SELECT vtc_por_atleta_grupo.atleta_id, vtc_por_atleta_grupo.vtc_grupo AS vtc_mensal_kg
      FROM (
        SELECT peaks.atleta_id, peaks.grupo_muscular, SUM(peaks.day_peak) AS vtc_grupo
        FROM (
          SELECT hc.atleta_id, hc.grupo_muscular,
            (hc.data_registro AT TIME ZONE 'America/Sao_Paulo')::date AS dia,
            hc.exercicio_id, MAX(hc.carga_maxima) AS day_peak
          FROM public.historico_cargas hc
          INNER JOIN public.profiles p ON p.id = hc.atleta_id
          WHERE hc.data_registro >= v_inicio AND hc.data_registro < v_fim
            AND p.sexo = 'masculino'::public.profile_sexo
            AND p.perfil_identidade_confirmada = true
            AND hc.grupo_muscular = 'PERNAS'::public.grupo_muscular_evolucao
          GROUP BY 1, 2, 3, 4
        ) peaks GROUP BY 1, 2
      ) vtc_por_atleta_grupo
      WHERE vtc_por_atleta_grupo.vtc_grupo > 0
      ORDER BY vtc_por_atleta_grupo.vtc_grupo DESC, vtc_por_atleta_grupo.atleta_id LIMIT 1
    ) sub
  );

  UPDATE public.planos_atletas pa
  SET is_rei_chamas_inf_fem = true
  WHERE pa.atleta_id = (
    SELECT sub.atleta_id FROM (
      SELECT vtc_por_atleta_grupo.atleta_id, vtc_por_atleta_grupo.vtc_grupo AS vtc_mensal_kg
      FROM (
        SELECT peaks.atleta_id, peaks.grupo_muscular, SUM(peaks.day_peak) AS vtc_grupo
        FROM (
          SELECT hc.atleta_id, hc.grupo_muscular,
            (hc.data_registro AT TIME ZONE 'America/Sao_Paulo')::date AS dia,
            hc.exercicio_id, MAX(hc.carga_maxima) AS day_peak
          FROM public.historico_cargas hc
          INNER JOIN public.profiles p ON p.id = hc.atleta_id
          WHERE hc.data_registro >= v_inicio AND hc.data_registro < v_fim
            AND p.sexo = 'feminino'::public.profile_sexo
            AND p.perfil_identidade_confirmada = true
            AND hc.grupo_muscular = 'PERNAS'::public.grupo_muscular_evolucao
          GROUP BY 1, 2, 3, 4
        ) peaks GROUP BY 1, 2
      ) vtc_por_atleta_grupo
      WHERE vtc_por_atleta_grupo.vtc_grupo > 0
      ORDER BY vtc_por_atleta_grupo.vtc_grupo DESC, vtc_por_atleta_grupo.atleta_id LIMIT 1
    ) sub
  );

  UPDATE public.planos_atletas pa
  SET is_pilar_cooperativo = true
  WHERE pa.atleta_id IN (
    SELECT sub.atleta_id FROM (
      SELECT hc.atleta_id,
        SUM(public.comunidade_pico_forca_linha(hc.carga_maxima)) AS pico_mensal_kg
      FROM public.historico_cargas hc
      WHERE hc.data_registro >= v_inicio AND hc.data_registro < v_fim
      GROUP BY hc.atleta_id
      HAVING SUM(public.comunidade_pico_forca_linha(hc.carga_maxima)) > 0
      ORDER BY SUM(public.comunidade_pico_forca_linha(hc.carga_maxima)) DESC, hc.atleta_id
      LIMIT 3
    ) sub
  );

  PERFORM set_config('comunidade.system_mutation', 'off', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_comunidade_arena_snapshot(
  p_skip_side_effects boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mes date;
  v_meta record;
  v_cinturao_superiores uuid;
  v_cinturao_inferiores uuid;
  v_rei_sup_masc uuid;
  v_rei_sup_fem uuid;
  v_rei_inf_masc uuid;
  v_rei_inf_fem uuid;
  v_pilares jsonb;
  v_duelos jsonb;
  v_rankings jsonb;
BEGIN
  v_mes := public.comunidade_mes_atual_sp();

  SELECT * INTO v_meta
  FROM public.metas_coletivas_academia m
  WHERE m.mes_referencia = v_mes;

  SELECT pa.atleta_id INTO v_cinturao_superiores
  FROM public.planos_atletas pa WHERE pa.tem_cinturao_superiores = true LIMIT 1;

  SELECT pa.atleta_id INTO v_cinturao_inferiores
  FROM public.planos_atletas pa WHERE pa.tem_cinturao_inferiores = true LIMIT 1;

  SELECT pa.atleta_id INTO v_rei_sup_masc
  FROM public.planos_atletas pa WHERE pa.is_rei_chamas_sup_masc = true LIMIT 1;

  SELECT pa.atleta_id INTO v_rei_sup_fem
  FROM public.planos_atletas pa WHERE pa.is_rei_chamas_sup_fem = true LIMIT 1;

  SELECT pa.atleta_id INTO v_rei_inf_masc
  FROM public.planos_atletas pa WHERE pa.is_rei_chamas_inf_masc = true LIMIT 1;

  SELECT pa.atleta_id INTO v_rei_inf_fem
  FROM public.planos_atletas pa WHERE pa.is_rei_chamas_inf_fem = true LIMIT 1;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('atleta_id', pa.atleta_id)), '[]'::jsonb)
  INTO v_pilares FROM public.planos_atletas pa WHERE pa.is_pilar_cooperativo = true;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', d.id, 'tipo_confronto', d.tipo_confronto, 'status', d.status,
      'vtc_desafiante', d.vtc_desafiante, 'vtc_desafiado', d.vtc_desafiado,
      'atleta_desafiante_id', d.atleta_desafiante_id, 'atleta_desafiado_id', d.atleta_desafiado_id,
      'fim_em', d.fim_em, 'inicio_em', d.inicio_em
    ) ORDER BY d.inicio_em DESC
  ), '[]'::jsonb) INTO v_duelos
  FROM public.duelos_supergrupos d
  WHERE d.status = 'EM_ANDAMENTO'::public.status_duelo_supergrupo;

  v_rankings := public.get_rankings_thoth();

  RETURN jsonb_build_object(
    'mes_referencia', v_mes,
    'meta', jsonb_build_object(
      'tonelagem_alvo_kg', COALESCE(v_meta.tonelagem_alvo_kg, 100000),
      'tonelagem_atual_acumulada', COALESCE(v_meta.tonelagem_atual_acumulada, 0),
      'progresso_pct', CASE
        WHEN COALESCE(v_meta.tonelagem_alvo_kg, 0) <= 0 THEN 0
        ELSE LEAST(100, ROUND((COALESCE(v_meta.tonelagem_atual_acumulada, 0) / v_meta.tonelagem_alvo_kg) * 100.0, 2))
      END,
      'formula', 'pico_forca_sum_carga_maxima_kg'
    ),
    'campeao_cinturao_id', COALESCE(v_cinturao_superiores, v_cinturao_inferiores),
    'campeoes_cinturao', jsonb_build_object(
      'SUPERIORES', v_cinturao_superiores,
      'INFERIORES', v_cinturao_inferiores
    ),
    'reis_chamas', jsonb_build_object(
      'SUPERIORES_MASCULINO', v_rei_sup_masc,
      'SUPERIORES_FEMININO', v_rei_sup_fem,
      'INFERIORES_MASCULINO', v_rei_inf_masc,
      'INFERIORES_FEMININO', v_rei_inf_fem,
      'SUPERIORES', COALESCE(v_rei_sup_masc, v_rei_sup_fem),
      'INFERIORES', COALESCE(v_rei_inf_masc, v_rei_inf_fem)
    ),
    'reis_das_chamas', (
      SELECT COALESCE(jsonb_agg(row_data), '[]'::jsonb)
      FROM (
        SELECT jsonb_build_object('atleta_id', v_rei_sup_masc, 'faixa', 'SUPERIORES_MASCULINO') AS row_data WHERE v_rei_sup_masc IS NOT NULL
        UNION ALL SELECT jsonb_build_object('atleta_id', v_rei_sup_fem, 'faixa', 'SUPERIORES_FEMININO') WHERE v_rei_sup_fem IS NOT NULL
        UNION ALL SELECT jsonb_build_object('atleta_id', v_rei_inf_masc, 'faixa', 'INFERIORES_MASCULINO') WHERE v_rei_inf_masc IS NOT NULL
        UNION ALL SELECT jsonb_build_object('atleta_id', v_rei_inf_fem, 'faixa', 'INFERIORES_FEMININO') WHERE v_rei_inf_fem IS NOT NULL
      ) legacy_reis
    ),
    'pilares_cooperativos', v_pilares,
    'duelos_ativos', v_duelos,
    'rankings_thoth', v_rankings,
    'rankings_por_membro', v_rankings
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.comunidade_ranking_slice_por_sexo(public.profile_sexo) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.fetch_dashboard_bundle(
  p_musculo public.subgrupo_muscular DEFAULT 'peito',
  p_mural_limit integer DEFAULT 10
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_phase jsonb;
  v_profile jsonb;
  v_vtc_month numeric;
  v_vtc_30d numeric;
  v_session_vtc numeric;
  v_inactivity jsonb;
  v_thermal_settle jsonb;
  v_phase_tier smallint;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN NULL;
  END IF;

  v_thermal_settle := public.argos_settle_thermal_gravity_monthly();
  v_inactivity := public.argos_sync_linhagem_presence();

  BEGIN
    v_phase := public.argos_advance_phase_if_eligible(v_uid);
  EXCEPTION
    WHEN others THEN
      v_phase := jsonb_build_object('phase_tier', 1, 'advanced', false, 'advance_error', SQLERRM);
  END;

  SELECT COALESCE(p.phase_tier, 1)::smallint
  INTO v_phase_tier
  FROM public.profiles p
  WHERE p.id = v_uid;

  SELECT to_jsonb(row_p)
  INTO v_profile
  FROM (
    SELECT
      full_name,
      nome_linhagem,
      status_altar,
      data_nascimento,
      role,
      sexo,
      perfil_identidade_confirmada,
      anima_portal_visto,
      v_phase_tier AS phase_tier,
      phase_setup_at,
      public.argos_sanitize_custom_preferences(custom_preferences) AS custom_preferences,
      CASE
        WHEN v_phase_tier = 1 THEN public.argos_compute_phase_one_progress(v_uid)
        ELSE NULL
      END AS phase_progress
    FROM public.profiles
    WHERE id = v_uid
  ) AS row_p;

  v_vtc_month := public.argos_compute_vtc_month_sp(v_uid);
  v_vtc_30d := public.argos_compute_vtc_30d(v_uid);
  v_session_vtc := public.argos_compute_session_vtc_today(v_uid);

  RETURN jsonb_build_object(
    'profile', v_profile,
    'phase', v_phase,
    'thermal_gravity_settlement', v_thermal_settle,
    'linhagem_inactivity', v_inactivity,
    'thermal_gravity', jsonb_build_object(
      'vtc_month', v_vtc_month,
      'vtc_30d', v_vtc_30d,
      'session_vtc_today', v_session_vtc
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
        WHERE cliente_id = v_uid
          AND musculo = p_musculo::text
      ) AS row_h
    ), '[]'::jsonb),
    'mural', COALESCE((
      SELECT jsonb_agg(to_jsonb(m))
      FROM public.argos_fetch_mural_comunidade(
        LEAST(GREATEST(COALESCE(p_mural_limit, 10), 1), 10)
      ) AS m
    ), '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fetch_dashboard_bundle(public.subgrupo_muscular, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fetch_dashboard_bundle(public.subgrupo_muscular, integer) TO authenticated;

COMMIT;
