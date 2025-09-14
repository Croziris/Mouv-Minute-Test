import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

type TimerStatus = 'idle' | 'running' | 'paused' | 'finished';

interface UseResilientTimer {
  status: TimerStatus;
  durationMs: number;
  remainingMs: number;
  endAt?: number; // epoch ms
  start: (durationMs: number) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  reset: () => Promise<void>;
  refresh: () => Promise<void>; // recalcule depuis endAt / serveur
  setDuration: (durationMs: number) => void; // ajout pour le slider
}

const STORAGE_KEY = 'resilient-timer-state';

interface TimerState {
  endAt?: number;
  durationMs: number;
  startedAt?: number;
  status: TimerStatus;
}

export function useResilientTimer(): UseResilientTimer {
  const [state, setState] = useState<TimerState>({
    durationMs: 45 * 60 * 1000, // 45 minutes par défaut
    status: 'idle'
  });
  
  const [remainingMs, setRemainingMs] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Charger l'état depuis localStorage au montage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsedState = JSON.parse(stored) as TimerState;
        setState(parsedState);
        
        if (parsedState.endAt && parsedState.status === 'running') {
          const now = Date.now();
          const remaining = Math.max(0, parsedState.endAt - now);
          
          if (remaining > 0) {
            setRemainingMs(remaining);
          } else {
            // Timer expiré
            setState(prev => ({ ...prev, status: 'finished' }));
            setRemainingMs(0);
          }
        } else {
          setRemainingMs(parsedState.status === 'idle' ? parsedState.durationMs : 0);
        }
      } catch (error) {
        console.warn('Erreur lors du chargement du timer:', error);
      }
    } else {
      setRemainingMs(state.durationMs);
    }
  }, []);

  // Sauvegarder l'état dans localStorage
  const saveState = useCallback((newState: TimerState) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
  }, []);

  // Calculer le temps restant
  const updateRemaining = useCallback(() => {
    if (state.status === 'running' && state.endAt) {
      const now = Date.now();
      const remaining = Math.max(0, state.endAt - now);
      setRemainingMs(remaining);
      
      if (remaining === 0) {
        setState(prev => {
          const newState = { ...prev, status: 'finished' as TimerStatus };
          saveState(newState);
          return newState;
        });
        
        toast({
          title: "Session terminée !",
          description: "Il est temps de faire tes exercices.",
        });
      }
    } else if (state.status === 'idle') {
      setRemainingMs(state.durationMs);
    } else if (state.status === 'finished') {
      setRemainingMs(0);
    }
  }, [state.status, state.endAt, state.durationMs, saveState]);

  // Interval pour mettre à jour le temps restant
  useEffect(() => {
    if (state.status === 'running' && !document.hidden) {
      intervalRef.current = setInterval(updateRemaining, 500);
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
  }, [state.status, updateRemaining]);

  // Gérer la visibilité de la page
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && state.status === 'running') {
        // Page redevient visible, recalculer
        updateRemaining();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [state.status, updateRemaining]);

  // Synchroniser avec le serveur si disponible
  const syncWithServer = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_active_timer');
      
      if (error) {
        console.warn('Erreur de synchronisation serveur:', error);
        return;
      }

      const timerData = data as any;

      if (timerData?.active && state.status === 'running') {
        // Vérifier si le serveur et le client sont synchronisés
        const serverEndAt = new Date(timerData.end_at).getTime();
        const clientEndAt = state.endAt;
        
        // Si différence > 5 secondes, utiliser l'heure serveur
        if (clientEndAt && Math.abs(serverEndAt - clientEndAt) > 5000) {
          const newState = {
            ...state,
            endAt: serverEndAt
          };
          setState(newState);
          saveState(newState);
        }
      }
    } catch (error) {
      console.warn('Erreur de synchronisation:', error);
    }
  }, [state, saveState]);

  const start = useCallback(async (durationMs: number) => {
    const now = Date.now();
    const endAt = now + durationMs;
    
    const newState: TimerState = {
      durationMs,
      endAt,
      startedAt: now,
      status: 'running'
    };

    setState(newState);
    saveState(newState);
    setRemainingMs(durationMs);

    // Tenter de synchroniser avec le serveur
    try {
      await supabase.rpc('start_timer', {
        duration_ms: durationMs
      });
    } catch (error) {
      console.warn('Erreur serveur lors du démarrage:', error);
      // Continuer en mode local
    }

    toast({
      title: "Timer démarré",
      description: `Session de ${Math.round(durationMs / 60000)} minutes commencée.`,
    });
  }, [saveState]);

  const pause = useCallback(async () => {
    if (state.status !== 'running') return;

    const newState: TimerState = {
      ...state,
      status: 'paused'
    };

    setState(newState);
    saveState(newState);

    try {
      await supabase.rpc('pause_timer');
    } catch (error) {
      console.warn('Erreur serveur lors de la pause:', error);
    }

    toast({
      title: "Timer en pause",
      description: "Session mise en pause.",
    });
  }, [state, saveState]);

  const resume = useCallback(async () => {
    if (state.status !== 'paused' || !state.endAt) return;

    // Recalculer l'échéance basée sur le temps restant
    const now = Date.now();
    const newEndAt = now + remainingMs;
    
    const newState: TimerState = {
      ...state,
      endAt: newEndAt,
      status: 'running'
    };

    setState(newState);
    saveState(newState);

    try {
      await supabase.rpc('resume_timer');
    } catch (error) {
      console.warn('Erreur serveur lors de la reprise:', error);
    }

    toast({
      title: "Timer repris",
      description: "Session reprise.",
    });
  }, [state, remainingMs, saveState]);

  const reset = useCallback(async () => {
    const newState: TimerState = {
      durationMs: state.durationMs,
      status: 'idle'
    };

    setState(newState);
    saveState(newState);
    setRemainingMs(state.durationMs);

    try {
      await supabase.rpc('stop_timer');
    } catch (error) {
      console.warn('Erreur serveur lors de l\'arrêt:', error);
    }

    localStorage.removeItem(STORAGE_KEY);
  }, [state.durationMs, saveState]);

  const refresh = useCallback(async () => {
    await syncWithServer();
    updateRemaining();
  }, [syncWithServer, updateRemaining]);

  // Mise à jour initiale du temps restant
  useEffect(() => {
    updateRemaining();
  }, [updateRemaining]);

  const setDuration = useCallback((newDurationMs: number) => {
    if (state.status !== 'idle') return;
    
    const newState: TimerState = {
      ...state,
      durationMs: newDurationMs
    };
    
    setState(newState);
    saveState(newState);
    setRemainingMs(newDurationMs);
  }, [state, saveState]);

  return {
    status: state.status,
    durationMs: state.durationMs,
    remainingMs,
    endAt: state.endAt,
    start,
    pause,
    resume,
    reset,
    refresh,
    setDuration
  };
}