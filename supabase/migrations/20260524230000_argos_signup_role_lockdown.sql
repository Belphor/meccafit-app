-- Signup sempre cria profile como cliente. Promoções só via bootstrap (service_role).

CREATE OR REPLACE FUNCTION public.on_auth_user_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_musculo public.subgrupo_muscular;
  v_birth date;
BEGIN
  v_birth := COALESCE(
    nullif(NEW.raw_user_meta_data ->> 'data_nascimento', '')::date,
    '1990-01-01'::date
  );

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
    'cliente'::public.user_role,
    coalesce(nullif(NEW.raw_user_meta_data ->> 'status_altar', ''), 'Ativo')
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = coalesce(EXCLUDED.full_name, public.profiles.full_name),
    data_nascimento = EXCLUDED.data_nascimento,
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
    NEW.role := 'cliente'::public.user_role;
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

CREATE OR REPLACE FUNCTION public.argos_bootstrap_forjador(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('meccafit.bootstrap_profile', 'true', true);
  UPDATE public.profiles
  SET role = 'forjador'::public.user_role
  WHERE id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.argos_bootstrap_forjador(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.argos_bootstrap_forjador(uuid) TO service_role;
