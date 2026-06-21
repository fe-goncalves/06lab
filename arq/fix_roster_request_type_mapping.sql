-- Corrige rep_create_roster_request: a RPC valida new_member/add_existing/removal,
-- mas o check constraint da tabela só aceita new_athlete/existing_athlete/removal.
-- Execute no SQL Editor do Supabase quando puder aplicar a correção definitiva no banco.

CREATE OR REPLACE FUNCTION public.map_roster_request_type(p_request_type text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  CASE p_request_type
    WHEN 'new_member' THEN RETURN 'new_athlete';
    WHEN 'add_existing' THEN RETURN 'existing_athlete';
    WHEN 'removal' THEN RETURN 'removal';
    ELSE RETURN NULL;
  END CASE;
END;
$$;

CREATE OR REPLACE FUNCTION public.roster_requests_normalize_request_type()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.request_type IS NOT NULL THEN
    NEW.request_type := COALESCE(public.map_roster_request_type(NEW.request_type), NEW.request_type);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_roster_requests_normalize_request_type ON public.roster_requests;

CREATE TRIGGER trg_roster_requests_normalize_request_type
  BEFORE INSERT OR UPDATE OF request_type ON public.roster_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.roster_requests_normalize_request_type();
