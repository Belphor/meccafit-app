-- Permite criar usuários pelo Dashboard (sem metadata) e roles via trigger auth.

CREATE OR REPLACE FUNCTION public.on_auth_user_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.user_role;
  v_musculo public.subgrupo_muscular;
  v_birth date;
BEGIN
  v_birth := COALESCE(
    nullif(NEW.raw_user_meta_data ->> 'data_nascimento', '')::date,
    '1990-01-01'::date
  );

  v_role := CASE
    WHEN NEW.raw_user_meta_data ->> 'role' = 'forjador_soberano' THEN 'forjador_soberano'::public.user_role
    WHEN NEW.raw_user_meta_data ->> 'role' = 'forjador_linhagem' THEN 'forjador_linhagem'::public.user_role
    WHEN NEW.raw_user_meta_data ->> 'role' = 'forjador' THEN 'forjador'::public.user_role
    ELSE 'cliente'::public.user_role
  END;

  INSERT INTO public.profiles (
    id,
    full_name,
    nome_linhagem,
    data_nascimento,
    role,
    status_altar
  )
  VALUES (
    NEW.id,
    coalesce(
      nullif(NEW.raw_user_meta_data ->> 'full_name', ''),
      nullif(NEW.raw_user_meta_data ->> 'name', ''),
      split_part(NEW.email, '@', 1)
    ),
    nullif(NEW.raw_user_meta_data ->> 'nome_linhagem', ''),
    v_birth,
    v_role,
    coalesce(nullif(NEW.raw_user_meta_data ->> 'status_altar', ''), 'Ativo')
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = coalesce(EXCLUDED.full_name, public.profiles.full_name),
    data_nascimento = EXCLUDED.data_nascimento,
    role = EXCLUDED.role,
    updated_at = now();

  FOREACH v_musculo IN ARRAY enum_range(NULL::public.subgrupo_muscular)
  LOOP
    INSERT INTO public.matriz_forca (cliente_id, musculo)
    VALUES (NEW.id, v_musculo)
    ON CONFLICT (cliente_id, musculo) DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.argos_profiles_guard_sensitive_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('meccafit.bootstrap_profile', true) = 'true' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Só bloqueia escalação quando há sessão autenticada (signup malicioso).
    -- Dashboard / trigger auth: auth.uid() IS NULL → respeita metadata do trigger.
    IF auth.uid() IS NOT NULL
       AND NEW.role IS DISTINCT FROM 'cliente'::public.user_role
       AND NOT public.argos_is_forjador_soberano() THEN
      NEW.role := 'cliente'::public.user_role;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.role IS DISTINCT FROM OLD.role
       OR NEW.forjador_id IS DISTINCT FROM OLD.forjador_id THEN
      IF NOT public.argos_is_forjador_soberano() THEN
        RAISE EXCEPTION 'permission denied for profile privilege change'
          USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Promove o primeiro master (SQL Editor ou seed script). Só service_role.
CREATE OR REPLACE FUNCTION public.argos_bootstrap_soberano(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('meccafit.bootstrap_profile', 'true', true);
  UPDATE public.profiles
  SET role = 'forjador_soberano'::public.user_role
  WHERE id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.argos_bootstrap_soberano(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.argos_bootstrap_soberano(uuid) TO service_role;
