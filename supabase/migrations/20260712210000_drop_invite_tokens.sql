-- Remove invite token system (cadastro público sem convite).
-- Drop RPCs and table; historical migrations remain for audit.

DROP FUNCTION IF EXISTS public.argos_consume_invite_for_user(text, uuid);
DROP FUNCTION IF EXISTS public.argos_consume_invite_token(text);
DROP FUNCTION IF EXISTS public.argos_validate_invite_token(text);
DROP FUNCTION IF EXISTS public.argos_hash_invite_token(text);

DROP TABLE IF EXISTS public.invite_tokens CASCADE;
