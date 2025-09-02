-- Fix search_path for security functions
CREATE OR REPLACE FUNCTION public.prevent_email_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Prevent users from changing email (except via auth system)
  IF OLD.email IS DISTINCT FROM NEW.email AND auth.uid() = NEW.user_id THEN
    NEW.email := OLD.email;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_session_user_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.user_id := auth.uid();
  RETURN NEW;
END;
$$;