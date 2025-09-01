-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create exercises table
CREATE TABLE public.exercises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  zone TEXT NOT NULL CHECK (zone IN ('nuque', 'epaules', 'dos', 'trapezes', 'tronc', 'jambes')),
  duration_sec INTEGER NOT NULL DEFAULT 15,
  media_primary TEXT, -- URL MP4 from Supabase Storage
  thumb_url TEXT, -- URL WebP from Supabase Storage
  description_public TEXT,
  notes_kine TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for exercises (public read access)
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

-- Everyone can read exercises
CREATE POLICY "Anyone can view exercises" 
ON public.exercises 
FOR SELECT 
USING (true);

-- Create sessions table
CREATE TABLE public.sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  completed BOOLEAN NOT NULL DEFAULT false,
  duration_minutes INTEGER NOT NULL DEFAULT 45,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for sessions
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own sessions
CREATE POLICY "Users can view their own sessions" 
ON public.sessions 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create session_exercises table
CREATE TABLE public.session_exercises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for session_exercises
ALTER TABLE public.session_exercises ENABLE ROW LEVEL SECURITY;

-- Users can only access session exercises for their own sessions
CREATE POLICY "Users can access their session exercises" 
ON public.session_exercises 
FOR ALL 
USING (
  session_id IN (
    SELECT id FROM public.sessions WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  session_id IN (
    SELECT id FROM public.sessions WHERE user_id = auth.uid()
  )
);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_exercises_updated_at
BEFORE UPDATE ON public.exercises
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to auto-create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'display_name', NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert some sample exercises
INSERT INTO public.exercises (title, zone, duration_sec, description_public, notes_kine) VALUES
('Rotation de la nuque', 'nuque', 20, 'Effectuez de lentes rotations de la tête dans un sens puis dans l''autre pour détendre les muscles cervicaux.', 'Mouvement lent et contrôlé, éviter les mouvements brusques'),
('Étirement des épaules', 'epaules', 15, 'Levez une épaule vers l''oreille, maintenez 5 secondes, relâchez. Alternez.', 'Respiration profonde pendant l''étirement'),
('Extension du dos', 'dos', 25, 'Debout, placez vos mains sur vos hanches et penchez-vous légèrement vers l''arrière.', 'Mouvement progressif, ne pas forcer'),
('Relâchement des trapèzes', 'trapezes', 18, 'Hausser les épaules vers les oreilles, maintenir 3 secondes, relâcher complètement.', 'Excellent pour la tension accumulée'),
('Rotation du tronc', 'tronc', 22, 'Assis, tournez le buste vers la droite puis vers la gauche, sans bouger les hanches.', 'Garder le dos droit pendant la rotation'),
('Flexion des mollets', 'jambes', 15, 'Debout, montez sur la pointe des pieds, maintenez 3 secondes, redescendez.', 'Active la circulation sanguine');

-- Create storage buckets for media
INSERT INTO storage.buckets (id, name, public) VALUES 
('exercise-videos', 'exercise-videos', true),
('exercise-thumbs', 'exercise-thumbs', true);

-- Create policies for exercise videos
CREATE POLICY "Anyone can view exercise videos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'exercise-videos');

CREATE POLICY "Anyone can view exercise thumbnails" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'exercise-thumbs');