import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface TimerState {
  id?: string;
  sessionId?: string;
  startAt: Date | null;
  endAt: Date | null;
  durationMs: number;
  isRunning: boolean;
  serverNow: Date;
}

interface UseResilientTimerOptions {
  onTimeUp?: () => void;
  onStateChange?: (state: TimerState) => void;
}

export function useResilientTimer(options: UseResilientTimerOptions = {}) {
  const { onTimeUp, onStateChange } = options;
  
  const [state, setState] = useState<TimerState>({
    startAt: null,
    endAt: null,
    durationMs: 45 * 60 * 1000, // 45 minutes par défaut
    isRunning: false,
    serverNow: new Date()
  });

  const [remainingMs, setRemainingMs] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const visibilityChangeTimeRef = useRef<number | null>(null);

  // Calculer le temps restant basé sur l'échéance côté serveur
  const calculateRemaining = useCallback((endAt: Date, serverNow: Date): number => {
    const clientNow = new Date();
    const serverOffset = clientNow.getTime() - serverNow.getTime();
    const adjustedEndAt = new Date(endAt.getTime() + serverOffset);
    
    return Math.max(0, adjustedEndAt.getTime() - clientNow.getTime());
  }, []);

  // Récupérer l'état du timer depuis le serveur
  const syncWithServer = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_active_timer');
      
      if (error) {
        console.error('Erreur lors de la synchronisation:', error);
        return;
      }

      const timerData = data as any;

      if (timerData?.active) {
        const serverState = {
          id: timerData.id,
          sessionId: timerData.session_id,
          startAt: new Date(timerData.start_at),
          endAt: new Date(timerData.end_at),
          durationMs: timerData.duration_ms,
          isRunning: true,
          serverNow: new Date(timerData.server_now)
        };

        setState(serverState);
        
        const remaining = calculateRemaining(serverState.endAt!, serverState.serverNow);
        setRemainingMs(remaining);
        
        if (remaining <= 0) {
          onTimeUp?.();
        }
      } else {
        setState(prev => ({
          ...prev,
          startAt: null,
          endAt: null,
          isRunning: false,
          serverNow: new Date(timerData?.server_now || new Date())
        }));
        setRemainingMs(0);
        
        if (timerData?.expired) {
          onTimeUp?.();
        }
      }
    } catch (error) {
      console.error('Erreur de synchronisation serveur:', error);
    }
  }, [calculateRemaining, onTimeUp]);

  // Synchroniser au montage et à chaque reprise de focus
  useEffect(() => {
    syncWithServer();
  }, [syncWithServer]);

  // Gestion de la visibilité de la page pour économiser la batterie
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page cachée - noter le moment
        visibilityChangeTimeRef.current = Date.now();
        
        // Arrêter le timer visuel pour économiser la batterie
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } else {
        // Page visible - resynchroniser avec le serveur
        visibilityChangeTimeRef.current = null;
        syncWithServer();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [syncWithServer]);

  // Timer visuel (uniquement quand visible)
  useEffect(() => {
    if (state.isRunning && state.endAt && !document.hidden) {
      intervalRef.current = setInterval(() => {
        const remaining = calculateRemaining(state.endAt!, state.serverNow);
        setRemainingMs(remaining);

        if (remaining <= 0) {
          setState(prev => ({ ...prev, isRunning: false }));
          onTimeUp?.();
        }
      }, 500); // 500ms pour la fluidité
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [state.isRunning, state.endAt, state.serverNow, calculateRemaining, onTimeUp]);

  // Notifier les changements d'état
  useEffect(() => {
    onStateChange?.(state);
  }, [state, onStateChange]);

  // Fonctions de contrôle
  const start = useCallback(async (durationMs?: number, sessionId?: string) => {
    try {
      const { data, error } = await supabase.rpc('start_timer', {
        duration_ms: durationMs || state.durationMs,
        session_id_param: sessionId
      });

      if (error) throw error;

      const timerData = data as any;

      const newState = {
        id: timerData.id,
        sessionId: sessionId,
        startAt: new Date(timerData.start_at),
        endAt: new Date(timerData.end_at),
        durationMs: timerData.duration_ms,
        isRunning: true,
        serverNow: new Date(timerData.server_now)
      };

      setState(newState);
      setRemainingMs(timerData.duration_ms);

      toast({
        title: "Timer démarré",
        description: `Session de ${Math.round(timerData.duration_ms / 60000)} minutes commencée.`,
      });

    } catch (error) {
      console.error('Erreur lors du démarrage du timer:', error);
      toast({
        title: "Erreur",
        description: "Impossible de démarrer le timer.",
        variant: "destructive",
      });
    }
  }, [state.durationMs]);

  const stop = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('stop_timer');

      if (error) throw error;

      const timerData = data as any;

      setState(prev => ({
        ...prev,
        startAt: null,
        endAt: null,
        isRunning: false,
        serverNow: new Date(timerData?.server_now || new Date())
      }));
      setRemainingMs(0);

      toast({
        title: "Timer arrêté",
        description: "La session a été interrompue.",
      });

    } catch (error) {
      console.error('Erreur lors de l\'arrêt du timer:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'arrêter le timer.",
        variant: "destructive",
      });
    }
  }, []);

  const setDuration = useCallback((durationMs: number) => {
    if (state.isRunning) {
      console.warn('Impossible de changer la durée pendant que le timer fonctionne');
      return;
    }
    
    setState(prev => ({ ...prev, durationMs }));
    setRemainingMs(durationMs);
  }, [state.isRunning]);

  return {
    // État
    remainingMs,
    isRunning: state.isRunning,
    durationMs: state.durationMs,
    endAt: state.endAt,
    sessionId: state.sessionId,
    serverId: state.id,
    
    // Actions
    start,
    stop,
    setDuration,
    syncWithServer,
    
    // Utilitaires
    formatTime: (ms: number) => {
      if (isNaN(ms) || ms < 0) return '00:00';
      const totalSeconds = Math.ceil(ms / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    },
    
    progress: state.durationMs > 0 ? ((state.durationMs - remainingMs) / state.durationMs) * 100 : 0
  };
}