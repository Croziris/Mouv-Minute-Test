-- Fonction pour mettre en pause un timer actif
CREATE OR REPLACE FUNCTION public.pause_timer()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  timer_record active_timers;
  remaining_ms integer;
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
    RAISE EXCEPTION 'No active timer found';
  END IF;

  -- Calculer le temps restant
  remaining_ms := EXTRACT(EPOCH FROM (timer_record.end_at - NOW())) * 1000;
  remaining_ms := GREATEST(0, remaining_ms);

  -- Marquer comme en pause et sauvegarder le temps restant
  UPDATE active_timers 
  SET 
    is_active = false,
    paused_remaining_ms = remaining_ms,
    updated_at = NOW()
  WHERE id = timer_record.id;

  -- Annuler les notifications programmées
  DELETE FROM session_notifications
  WHERE user_id = auth.uid() AND status = 'scheduled' AND end_at > NOW();

  SELECT json_build_object(
    'success', true,
    'remaining_ms', remaining_ms,
    'server_now', NOW()
  ) INTO result;

  RETURN result;
END;
$$;

-- Fonction pour reprendre un timer en pause
CREATE OR REPLACE FUNCTION public.resume_timer()
RETURNS json
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

  -- Récupérer le dernier timer de cet utilisateur
  SELECT * INTO timer_record
  FROM active_timers
  WHERE user_id = auth.uid() AND paused_remaining_ms IS NOT NULL
  ORDER BY updated_at DESC
  LIMIT 1;

  IF timer_record IS NULL OR timer_record.paused_remaining_ms IS NULL THEN
    RAISE EXCEPTION 'No paused timer found';
  END IF;

  -- Calculer la nouvelle échéance
  UPDATE active_timers 
  SET 
    start_at = NOW(),
    end_at = NOW() + (paused_remaining_ms || ' milliseconds')::INTERVAL,
    is_active = true,
    paused_remaining_ms = NULL,
    updated_at = NOW()
  WHERE id = timer_record.id
  RETURNING * INTO timer_record;

  -- Programmer la nouvelle notification
  INSERT INTO session_notifications (user_id, session_id, end_at, title, body)
  VALUES (
    auth.uid(),
    timer_record.session_id,
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

-- Ajouter la colonne paused_remaining_ms si elle n'existe pas
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'active_timers' 
    AND column_name = 'paused_remaining_ms'
  ) THEN
    ALTER TABLE active_timers ADD COLUMN paused_remaining_ms integer;
  END IF;
END $$;