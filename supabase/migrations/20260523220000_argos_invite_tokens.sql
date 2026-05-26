  -- ARGOS: convites de primeiro acesso (QR / link assinado)

  CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

  CREATE TABLE IF NOT EXISTS public.invite_tokens (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    token_hash text NOT NULL UNIQUE,
    forjador_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
    expires_at timestamptz NOT NULL,
    used_at timestamptz,
    used_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  );

  CREATE INDEX IF NOT EXISTS idx_invite_tokens_hash ON public.invite_tokens (token_hash);
  CREATE INDEX IF NOT EXISTS idx_invite_tokens_expires ON public.invite_tokens (expires_at);

  ALTER TABLE public.invite_tokens ENABLE ROW LEVEL SECURITY;

  -- Somente service_role / RPC consomem tokens; clientes não leem a tabela diretamente.
  REVOKE ALL ON public.invite_tokens FROM PUBLIC, anon, authenticated;
  GRANT SELECT, INSERT, UPDATE ON public.invite_tokens TO service_role;

  CREATE OR REPLACE FUNCTION public.argos_hash_invite_token(p_token text)
  RETURNS text
  LANGUAGE sql
  IMMUTABLE
  SET search_path = public, extensions
  AS $$
    SELECT encode(
      extensions.digest(BTRIM(COALESCE(p_token, '')), 'sha256'::text),
      'hex'
    );
  $$;

  REVOKE ALL ON FUNCTION public.argos_hash_invite_token(text) FROM PUBLIC, anon, authenticated;
  GRANT EXECUTE ON FUNCTION public.argos_hash_invite_token(text) TO service_role;

  CREATE OR REPLACE FUNCTION public.argos_validate_invite_token(p_token text)
  RETURNS boolean
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
  DECLARE
    v_hash text;
    v_row public.invite_tokens%ROWTYPE;
  BEGIN
    IF BTRIM(COALESCE(p_token, '')) = '' THEN
      RETURN false;
    END IF;

    v_hash := public.argos_hash_invite_token(p_token);

    SELECT *
    INTO v_row
    FROM public.invite_tokens it
    WHERE it.token_hash = v_hash
    LIMIT 1;

    IF NOT FOUND THEN
      RETURN false;
    END IF;

    IF v_row.used_at IS NOT NULL THEN
      RETURN false;
    END IF;

    IF v_row.expires_at <= now() THEN
      RETURN false;
    END IF;

    RETURN true;
  END;
  $$;

  REVOKE ALL ON FUNCTION public.argos_validate_invite_token(text) FROM PUBLIC, anon;
  GRANT EXECUTE ON FUNCTION public.argos_validate_invite_token(text) TO authenticated, service_role;

  CREATE OR REPLACE FUNCTION public.argos_consume_invite_token(p_token text)
  RETURNS boolean
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
  DECLARE
    v_uid uuid;
    v_hash text;
    v_updated integer;
  BEGIN
    v_uid := auth.uid();
    IF v_uid IS NULL THEN
      RAISE EXCEPTION 'permission denied for argos_consume_invite_token'
        USING ERRCODE = '42501';
    END IF;

    IF NOT public.argos_validate_invite_token(p_token) THEN
      RETURN false;
    END IF;

    v_hash := public.argos_hash_invite_token(p_token);

    UPDATE public.invite_tokens
    SET used_at = now(),
        used_by = v_uid
    WHERE token_hash = v_hash
      AND used_at IS NULL
      AND expires_at > now();

    GET DIAGNOSTICS v_updated = ROW_COUNT;
    RETURN v_updated = 1;
  END;
  $$;

  REVOKE ALL ON FUNCTION public.argos_consume_invite_token(text) FROM PUBLIC, anon;
  GRANT EXECUTE ON FUNCTION public.argos_consume_invite_token(text) TO authenticated, service_role;
