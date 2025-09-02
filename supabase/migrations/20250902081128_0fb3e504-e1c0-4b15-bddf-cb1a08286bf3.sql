-- Create articles table
CREATE TABLE public.articles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  summary text,
  content text NOT NULL,
  image_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create programs table for workout sessions
CREATE TABLE public.programs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  order_index integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create program_exercises junction table
CREATE TABLE public.program_exercises (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id uuid NOT NULL,
  exercise_id uuid NOT NULL,
  order_index integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create user_roles table for admin management
CREATE TABLE public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'user',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for articles (public read, admin write)
CREATE POLICY "Anyone can view articles" 
ON public.articles 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage articles" 
ON public.articles 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.email = 'crz.pierre13@gmail.com'
  )
);

-- RLS Policies for programs (public read, admin write)
CREATE POLICY "Anyone can view programs" 
ON public.programs 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage programs" 
ON public.programs 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.email = 'crz.pierre13@gmail.com'
  )
);

-- RLS Policies for program_exercises (public read, admin write)
CREATE POLICY "Anyone can view program exercises" 
ON public.program_exercises 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage program exercises" 
ON public.program_exercises 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.email = 'crz.pierre13@gmail.com'
  )
);

-- RLS Policies for user_roles (users can view their own, admin can manage all)
CREATE POLICY "Users can view their own roles" 
ON public.user_roles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles" 
ON public.user_roles 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.email = 'crz.pierre13@gmail.com'
  )
);

-- Add foreign key constraints
ALTER TABLE public.program_exercises 
ADD CONSTRAINT fk_program_exercises_program 
FOREIGN KEY (program_id) REFERENCES public.programs(id) ON DELETE CASCADE;

ALTER TABLE public.program_exercises 
ADD CONSTRAINT fk_program_exercises_exercise 
FOREIGN KEY (exercise_id) REFERENCES public.exercises(id) ON DELETE CASCADE;

ALTER TABLE public.user_roles 
ADD CONSTRAINT fk_user_roles_user 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add triggers for updated_at
CREATE TRIGGER update_articles_updated_at
BEFORE UPDATE ON public.articles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_programs_updated_at
BEFORE UPDATE ON public.programs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample articles
INSERT INTO public.articles (title, summary, content) VALUES 
('Pourquoi bouger au travail ?', 'Découvrez les bienfaits du mouvement pendant votre journée de travail', 'Le travail sédentaire peut causer de nombreux problèmes de santé. Il est essentiel de bouger régulièrement pour maintenir une bonne circulation sanguine, renforcer les muscles et améliorer la concentration. Des études montrent que prendre des pauses actives toutes les 45-60 minutes peut considérablement réduire les risques de troubles musculosquelettiques.'),
('Les gestes contre les TMS', 'Apprenez les bons gestes pour prévenir les troubles musculosquelettiques', 'Les troubles musculosquelettiques (TMS) représentent 87% des maladies professionnelles. Pour les prévenir, il est important d''adopter une bonne posture, de faire des étirements réguliers et d''aménager correctement son poste de travail. Nos exercices ciblés vous aideront à soulager les tensions et à renforcer les zones fragiles.'),
('Ergonomie du poste de travail', 'Optimisez votre espace de travail pour votre santé', 'Un poste de travail mal aménagé peut causer des douleurs chroniques. La hauteur de l''écran, la position du clavier, l''inclinaison du siège : chaque détail compte. Découvrez nos conseils pour créer un environnement de travail sain et confortable.'),
('Sommeil et récupération', 'L''importance du sommeil pour les travailleurs', 'Un bon sommeil est essentiel pour maintenir sa productivité et sa santé. La fatigue accumulée peut augmenter les risques de blessures et diminuer la concentration. Apprenez à améliorer la qualité de votre sommeil et à optimiser votre récupération.'),
('Hydratation et nutrition', 'Bien s''alimenter au bureau', 'L''alimentation joue un rôle crucial dans votre bien-être au travail. Une bonne hydratation et des collations équilibrées vous aideront à maintenir votre énergie tout au long de la journée. Découvrez nos conseils nutritionnels adaptés au travail de bureau.');

-- Insert sample programs (10 workout sessions)
INSERT INTO public.programs (title, description, order_index) VALUES 
('Séance 1 - Réveil musculaire', 'Exercices doux pour commencer la journée', 1),
('Séance 2 - Anti-tension nuque', 'Exercices ciblés pour soulager les tensions cervicales', 2),
('Séance 3 - Épaules libres', 'Mobilisation et étirements des épaules', 3),
('Séance 4 - Dos fort', 'Renforcement et assouplissement du dos', 4),
('Séance 5 - Jambes actives', 'Activation de la circulation des membres inférieurs', 5),
('Séance 6 - Focus yeux', 'Exercices pour reposer la vue et détendre le visage', 6),
('Séance 7 - Énergie globale', 'Séance complète pour booster l''énergie', 7),
('Séance 8 - Posture parfaite', 'Exercices pour améliorer la posture', 8),
('Séance 9 - Respiration active', 'Techniques de respiration et relaxation', 9),
('Séance 10 - Détente totale', 'Séance de fin de journée pour se détendre', 10);