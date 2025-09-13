-- Table pour les abonnements aux notifications push
CREATE TABLE public.push_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

-- Enable RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS policies pour push_subscriptions
CREATE POLICY "Users can manage their own push subscriptions" 
ON public.push_subscriptions 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Table pour les notifications de session programmées
CREATE TABLE public.session_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  session_id uuid,
  end_at timestamp with time zone NOT NULL,
  status text NOT NULL DEFAULT 'scheduled',
  title text NOT NULL DEFAULT 'Session terminée 🎉',
  body text NOT NULL DEFAULT 'Il est temps de faire tes exercices.',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  sent_at timestamp with time zone,
  CHECK (status IN ('scheduled', 'sent', 'cancelled'))
);

-- Enable RLS
ALTER TABLE public.session_notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies pour session_notifications
CREATE POLICY "Users can manage their own session notifications" 
ON public.session_notifications 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Trigger pour updated_at sur push_subscriptions
CREATE TRIGGER update_push_subscriptions_updated_at
BEFORE UPDATE ON public.push_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index pour optimiser les requêtes de notifications dues
CREATE INDEX idx_session_notifications_due 
ON public.session_notifications (end_at, status) 
WHERE status = 'scheduled';