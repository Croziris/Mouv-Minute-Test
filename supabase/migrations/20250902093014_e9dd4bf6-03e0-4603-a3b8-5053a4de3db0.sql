-- Step 1: Create role-based access control function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- Step 2: Update RLS policies to use role-based access instead of email-based
-- Articles policies
DROP POLICY IF EXISTS "Admins can manage articles" ON public.articles;
CREATE POLICY "Admins can manage articles" 
ON public.articles 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));

-- Programs policies  
DROP POLICY IF EXISTS "Admins can manage programs" ON public.programs;
CREATE POLICY "Admins can manage programs"
ON public.programs
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Program exercises policies
DROP POLICY IF EXISTS "Admins can manage program exercises" ON public.program_exercises;
CREATE POLICY "Admins can manage program exercises"
ON public.program_exercises  
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- User roles policies
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Step 3: Lock down profiles table
-- Add unique constraint to prevent multiple profiles per user
ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);

-- Prevent email changes by users (keep email synced from auth.users)
CREATE OR REPLACE FUNCTION public.prevent_email_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Prevent users from changing email (except via auth system)
  IF OLD.email IS DISTINCT FROM NEW.email AND auth.uid() = NEW.user_id THEN
    NEW.email := OLD.email;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER prevent_profile_email_changes
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_email_changes();

-- Step 4: Create separate table for private exercise notes
CREATE TABLE IF NOT EXISTS public.exercise_private_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id uuid NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(exercise_id)
);

-- Enable RLS on private notes
ALTER TABLE public.exercise_private_notes ENABLE ROW LEVEL SECURITY;

-- Only admins can access private notes
CREATE POLICY "Admins can manage exercise private notes"
ON public.exercise_private_notes
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Migrate existing notes_kine data to private notes table (if column exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exercises' AND column_name = 'notes_kine') THEN
    INSERT INTO public.exercise_private_notes (exercise_id, notes, created_at, updated_at)
    SELECT id, notes_kine, created_at, updated_at 
    FROM public.exercises 
    WHERE notes_kine IS NOT NULL AND notes_kine != '';
    
    -- Remove notes_kine column from exercises
    ALTER TABLE public.exercises DROP COLUMN notes_kine;
  END IF;
END
$$;

-- Add trigger for updated_at on private notes
CREATE OR REPLACE TRIGGER update_exercise_private_notes_updated_at
  BEFORE UPDATE ON public.exercise_private_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Step 5: Add unique constraint to user_roles and bootstrap admin user
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_role_unique UNIQUE (user_id, role);

-- Bootstrap admin user safely
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users 
WHERE email = 'crz.pierre13@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Step 6: Add trigger to auto-set user_id for sessions (prevent client tampering)
CREATE OR REPLACE FUNCTION public.set_session_user_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  NEW.user_id := auth.uid();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER set_session_user_id_trigger
  BEFORE INSERT ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_session_user_id();