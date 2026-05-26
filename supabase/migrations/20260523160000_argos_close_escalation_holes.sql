-- ARGOS fase 3: fechar escalada de privilégio (RPC + profiles)

CREATE OR REPLACE FUNCTION public.registrar_treino_com_status(
  p_exercicio_id integer,
  p_exercicio_nome text,
  p_musculo text,
  p_peso_atual numeric,
  p_repeticoes integer,
  p_series integer,
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT auth.uid()) IS NULL OR (SELECT auth.uid()) <> p_user_id THEN
    RAISE EXCEPTION 'permission denied for registrar_treino_com_status'
      USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.historico_treinos (
    user_id,
    cliente_id,
    exercicio_id,
    exercicio_nome,
    musculo,
    peso_atual,
    peso,
    repeticoes,
    series,
    updated_at
  )
  VALUES (
    p_user_id,
    p_user_id,
    p_exercicio_id,
    p_exercicio_nome,
    p_musculo,
    p_peso_atual,
    p_peso_atual,
    p_repeticoes,
    p_series,
    NOW()
  )
  ON CONFLICT (cliente_id, exercicio_id) WHERE cliente_id IS NOT NULL
  DO UPDATE SET
    peso_atual = EXCLUDED.peso_atual,
    peso = EXCLUDED.peso_atual,
    repeticoes = EXCLUDED.repeticoes,
    series = EXCLUDED.series,
    updated_at = NOW();
END;
$$;

CREATE OR REPLACE FUNCTION public.argos_profiles_guard_sensitive_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.role IS DISTINCT FROM 'cliente'::public.user_role
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

DROP TRIGGER IF EXISTS trg_argos_profiles_guard ON public.profiles;
CREATE TRIGGER trg_argos_profiles_guard
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.argos_profiles_guard_sensitive_fields();

DROP POLICY IF EXISTS "Profiles: Auto-atualização" ON public.profiles;
CREATE POLICY "ARGOS profiles update self"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

REVOKE ALL ON FUNCTION public.argos_profiles_guard_sensitive_fields() FROM PUBLIC, anon, authenticated;
