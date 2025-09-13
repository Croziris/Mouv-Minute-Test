-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON public.profiles;

-- Créer de nouvelles politiques plus sécurisées
-- 1. Politique SELECT : seulement pour les utilisateurs authentifiés, seulement leur propre profil
CREATE POLICY "Authenticated users can view only their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 2. Politique UPDATE : seulement pour les utilisateurs authentifiés, seulement leur propre profil
CREATE POLICY "Authenticated users can update only their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 3. Politique INSERT : seulement pour les utilisateurs authentifiés, seulement leur propre profil
CREATE POLICY "Authenticated users can create only their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 4. Politique DELETE : permettre aux utilisateurs de supprimer leur propre profil
CREATE POLICY "Authenticated users can delete only their own profile"
ON public.profiles
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Aucune politique pour les utilisateurs anonymes - ils n'ont aucun accès