-- 1. Ajouter le champ notes_kine aux exercices s'il n'existe pas déjà
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'exercises' AND column_name = 'notes_kine') THEN
        ALTER TABLE public.exercises ADD COLUMN notes_kine TEXT;
    END IF;
END $$;

-- 2. Trigger pour attribuer automatiquement le rôle "user" aux nouveaux utilisateurs
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Attribuer automatiquement le rôle "user" sauf si c'est l'admin
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE 
    WHEN NEW.email = 'crz.pierre13@gmail.com' THEN 'admin'
    ELSE 'user'
  END);
  RETURN NEW;
END;
$$;

-- Créer le trigger s'il n'existe pas
DROP TRIGGER IF EXISTS on_auth_user_created_role ON auth.users;
CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

-- 3. S'assurer que crz.pierre13@gmail.com a le rôle admin
INSERT INTO public.user_roles (user_id, role)
SELECT p.user_id, 'admin'
FROM public.profiles p
WHERE p.email = 'crz.pierre13@gmail.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = p.user_id AND ur.role = 'admin'
  );