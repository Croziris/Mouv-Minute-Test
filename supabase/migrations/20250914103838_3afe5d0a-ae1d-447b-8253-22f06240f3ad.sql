-- Ajouter colonnes device_type et user_agent à push_subscriptions
ALTER TABLE push_subscriptions 
ADD COLUMN IF NOT EXISTS device_type TEXT DEFAULT 'desktop',
ADD COLUMN IF NOT EXISTS user_agent TEXT,
ADD COLUMN IF NOT EXISTS subscription_id TEXT;

-- Créer table pour les timers résilients
CREATE TABLE IF NOT EXISTS active_timers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  start_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_at TIMESTAMPTZ NOT NULL,
  duration_ms INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS pour active_timers
ALTER TABLE active_timers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own timers" ON active_timers
FOR ALL USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Fonction pour créer/démarrer un timer
CREATE OR REPLACE FUNCTION start_timer(duration_ms INTEGER, session_id_param UUID DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  timer_record active_timers;
  result JSON;
BEGIN
  -- Validation
  IF duration_ms <= 0 THEN
    RAISE EXCEPTION 'Duration must be positive';
  END IF;
  
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated';
  END IF;

  -- Désactiver les anciens timers de cet utilisateur
  UPDATE active_timers 
  SET is_active = false, updated_at = NOW()
  WHERE user_id = auth.uid() AND is_active = true;

  -- Créer le nouveau timer
  INSERT INTO active_timers (user_id, session_id, start_at, end_at, duration_ms, is_active)
  VALUES (
    auth.uid(),
    session_id_param,
    NOW(),
    NOW() + (duration_ms || ' milliseconds')::INTERVAL,
    duration_ms,
    true
  )
  RETURNING * INTO timer_record;

  -- Programmer la notification
  INSERT INTO session_notifications (user_id, session_id, end_at, title, body)
  VALUES (
    auth.uid(),
    session_id_param,
    timer_record.end_at,
    'Session terminée 🎉',
    'Il est temps de faire tes exercices.'
  );

  -- Retourner le résultat
  SELECT json_build_object(
    'id', timer_record.id,
    'start_at', timer_record.start_at,
    'end_at', timer_record.end_at,
    'duration_ms', timer_record.duration_ms,
    'server_now', NOW()
  ) INTO result;

  RETURN result;
END;
$$;

-- Fonction pour récupérer le timer actif
CREATE OR REPLACE FUNCTION get_active_timer()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  timer_record active_timers;
  result JSON;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated';
  END IF;

  -- Récupérer le timer actif
  SELECT * INTO timer_record
  FROM active_timers
  WHERE user_id = auth.uid() AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1;

  IF timer_record IS NULL THEN
    RETURN json_build_object(
      'active', false,
      'server_now', NOW()
    );
  END IF;

  -- Vérifier si le timer est encore valide
  IF NOW() > timer_record.end_at THEN
    -- Timer expiré, le désactiver
    UPDATE active_timers 
    SET is_active = false, updated_at = NOW()
    WHERE id = timer_record.id;
    
    RETURN json_build_object(
      'active', false,
      'expired', true,
      'server_now', NOW()
    );
  END IF;

  -- Timer toujours actif
  SELECT json_build_object(
    'active', true,
    'id', timer_record.id,
    'session_id', timer_record.session_id,
    'start_at', timer_record.start_at,
    'end_at', timer_record.end_at,
    'duration_ms', timer_record.duration_ms,
    'server_now', NOW(),
    'remaining_ms', EXTRACT(EPOCH FROM (timer_record.end_at - NOW())) * 1000
  ) INTO result;

  RETURN result;
END;
$$;

-- Fonction pour arrêter le timer
CREATE OR REPLACE FUNCTION stop_timer()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated';
  END IF;

  -- Désactiver le timer actif
  UPDATE active_timers 
  SET is_active = false, updated_at = NOW()
  WHERE user_id = auth.uid() AND is_active = true;

  -- Annuler les notifications planifiées
  DELETE FROM session_notifications
  WHERE user_id = auth.uid() AND status = 'scheduled' AND end_at > NOW();

  RETURN json_build_object(
    'success', true,
    'server_now', NOW()
  );
END;
$$;