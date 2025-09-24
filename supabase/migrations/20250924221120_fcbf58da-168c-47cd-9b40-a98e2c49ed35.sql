-- Edge function pour traiter les notifications push programmées
CREATE OR REPLACE FUNCTION public.dispatch_due_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  notification_record session_notifications;
  subscription_record push_subscriptions;
  notification_payload jsonb;
BEGIN
  -- Traiter toutes les notifications dues
  FOR notification_record IN 
    SELECT * FROM session_notifications 
    WHERE end_at <= NOW() AND status = 'scheduled'
  LOOP
    -- Marquer la notification comme envoyée
    UPDATE session_notifications 
    SET status = 'sent', sent_at = NOW()
    WHERE id = notification_record.id;
    
    -- Marquer les timers comme terminés
    UPDATE active_timers 
    SET is_active = false, updated_at = NOW()
    WHERE session_id = notification_record.session_id AND is_active = true;
    
    -- Préparer le payload de notification
    notification_payload := jsonb_build_object(
      'title', notification_record.title,
      'body', notification_record.body,
      'icon', '/Logo.png',
      'badge', '/Logo.png',
      'tag', 'timer-end',
      'requireInteraction', true,
      'actions', jsonb_build_array(
        jsonb_build_object('action', 'open', 'title', 'Voir les exercices'),
        jsonb_build_object('action', 'dismiss', 'title', 'Plus tard')
      ),
      'data', jsonb_build_object(
        'url', '/timer',
        'session_id', notification_record.session_id
      )
    );
    
    -- Enregistrer les notifications à envoyer dans une table de queue
    INSERT INTO push_notification_queue (user_id, notification_data, created_at, status)
    VALUES (notification_record.user_id, notification_payload, NOW(), 'pending');
  END LOOP;
END;
$$;

-- Table pour queue des notifications push à envoyer
CREATE TABLE IF NOT EXISTS public.push_notification_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  notification_data jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  error_message text
);

-- RLS pour la queue
ALTER TABLE public.push_notification_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System can manage notification queue" ON public.push_notification_queue
FOR ALL USING (true);

-- Index pour performance
CREATE INDEX idx_push_notification_queue_status_created ON public.push_notification_queue(status, created_at) WHERE status = 'pending';