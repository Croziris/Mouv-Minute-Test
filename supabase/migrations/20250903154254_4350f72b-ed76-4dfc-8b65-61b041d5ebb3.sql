-- Create daily_tips table
CREATE TABLE public.daily_tips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  organisation INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.daily_tips ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view daily tips" 
ON public.daily_tips 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage daily tips" 
ON public.daily_tips 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::text));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_daily_tips_updated_at
BEFORE UPDATE ON public.daily_tips
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert a default daily tip
INSERT INTO public.daily_tips (title, content, organisation) VALUES 
('Bougez 3 minutes toutes les 45-60 minutes', 'Des études montrent que prendre des pauses actives régulières améliore la concentration, réduit les tensions musculaires et booste la productivité.', 0);