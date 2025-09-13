import { useState, useEffect, useCallback, useRef } from 'react';

interface TimerState {
  startAt: number | null;
  endAt: number | null;
  durationMs: number;
  isRunning: boolean;
  sessionId?: string;
}

interface UseDeadlineTimerOptions {
  onTimeUp?: () => void;
  onStateChange?: (state: TimerState) => void;
}

export function useDeadlineTimer(options: UseDeadlineTimerOptions = {}) {
  const { onTimeUp, onStateChange } = options;
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const [state, setState] = useState<TimerState>({
    startAt: null,
    endAt: null,
    durationMs: 45 * 60 * 1000, // 45 minutes par défaut
    isRunning: false,
  });

  const [remainingMs, setRemainingMs] = useState(0);

  // Calculer le temps restant
  const calculateRemaining = useCallback((endAt: number): number => {
    const now = Date.now();
    return Math.max(0, endAt - now);
  }, []);

  // Persister l'état dans localStorage avec protection
  const persistState = useCallback(async (newState: TimerState) => {
    if (typeof window === 'undefined') return;
    
    try {
      const stateToStore = {
        ...newState,
        timestamp: Date.now()
      };
      localStorage.setItem('timer_state', JSON.stringify(stateToStore));
    } catch (error) {
      console.warn('Erreur lors de la sauvegarde de l\'état du timer:', error);
    }
  }, []);

  // Charger l'état depuis le stockage avec protection
  const loadPersistedState = useCallback(async (): Promise<TimerState | null> => {
    if (typeof window === 'undefined') return null;
    
    try {
      const stored = localStorage.getItem('timer_state');
      if (stored) {
        const parsedState = JSON.parse(stored);
        // Vérifier si l'état est encore valide (pas trop ancien)
        const ageMs = Date.now() - (parsedState.timestamp || 0);
        if (ageMs < 24 * 60 * 60 * 1000) { // 24h max
          return {
            startAt: parsedState.startAt,
            endAt: parsedState.endAt,
            durationMs: parsedState.durationMs || 45 * 60 * 1000,
            isRunning: parsedState.isRunning,
            sessionId: parsedState.sessionId
          };
        }
      }
    } catch (error) {
      console.warn('Erreur lors du chargement de l\'état du timer:', error);
    }
    return null;
  }, []);

  // Charger l'état au montage du composant
  useEffect(() => {
    const loadState = async () => {
      const persistedState = await loadPersistedState();
      if (persistedState && persistedState.endAt) {
        const remaining = calculateRemaining(persistedState.endAt);
        
        if (remaining > 0 && persistedState.isRunning) {
          // Le timer était en cours, continuer
          setState(persistedState);
          setRemainingMs(remaining);
        } else if (remaining <= 0 && persistedState.isRunning) {
          // Le timer est terminé, déclencher onTimeUp
          setState(prev => ({ ...persistedState, isRunning: false }));
          setRemainingMs(0);
          onTimeUp?.();
        } else {
          // Timer en pause ou arrêté
          setState(persistedState);
          setRemainingMs(remaining);
        }
      }
    };

    loadState();
  }, [loadPersistedState, calculateRemaining, onTimeUp]);

  // Gestion de la visibilité de la page
  useEffect(() => {
    if (typeof document === 'undefined') return;
    
    const handleVisibilityChange = async () => {
      if (!document.hidden && state.endAt && state.isRunning) {
        const remaining = calculateRemaining(state.endAt);
        setRemainingMs(remaining);
        
        if (remaining <= 0) {
          setState(prev => ({ ...prev, isRunning: false }));
          onTimeUp?.();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [state.endAt, state.isRunning, calculateRemaining, onTimeUp]);

  // Timer principal pour mettre à jour l'affichage (throttlé)
  useEffect(() => {
    if (state.isRunning && state.endAt) {
      intervalRef.current = setInterval(() => {
        // Ne mettre à jour que si la page est visible
        if (typeof document !== 'undefined' && document.hidden) return;
        
        const remaining = calculateRemaining(state.endAt!);
        setRemainingMs(remaining);

        if (remaining <= 0) {
          setState(prev => ({ ...prev, isRunning: false }));
          onTimeUp?.();
        }
      }, 500); // 500ms au lieu de 1s pour plus de fluidité
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
  }, [state.isRunning, state.endAt, calculateRemaining, onTimeUp]);

  // Persister l'état à chaque changement
  useEffect(() => {
    persistState(state);
    onStateChange?.(state);
  }, [state, persistState, onStateChange]);

  // Nettoyage au unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  // Fonctions de contrôle
  const start = useCallback((durationMs?: number, sessionId?: string) => {
    const now = Date.now();
    const duration = durationMs || state.durationMs;
    
    // Protection contre les valeurs invalides
    if (!duration || isNaN(duration) || duration <= 0) {
      console.warn('Durée invalide pour le timer:', duration);
      return;
    }
    
    const endAt = now + duration;

    const newState: TimerState = {
      startAt: now,
      endAt,
      durationMs: duration,
      isRunning: true,
      sessionId
    };

    setState(newState);
    setRemainingMs(duration);
  }, [state.durationMs]);

  const pause = useCallback(() => {
    setState(prev => ({ ...prev, isRunning: false }));
  }, []);

  const resume = useCallback(() => {
    if (state.endAt) {
      const remaining = calculateRemaining(state.endAt);
      if (remaining > 0) {
        setState(prev => ({ ...prev, isRunning: true }));
        setRemainingMs(remaining);
      }
    }
  }, [state.endAt, calculateRemaining]);

  const reset = useCallback((newDurationMs?: number) => {
    const duration = newDurationMs || state.durationMs;
    
    setState({
      startAt: null,
      endAt: null,
      durationMs: duration,
      isRunning: false,
    });
    setRemainingMs(duration);
  }, [state.durationMs]);

  const setDuration = useCallback((durationMs: number) => {
    if (isNaN(durationMs) || durationMs <= 0) {
      console.warn('Durée invalide:', durationMs);
      return;
    }
    
    setState(prev => ({ ...prev, durationMs }));
    if (!state.isRunning) {
      setRemainingMs(durationMs);
    }
  }, [state.isRunning]);

  return {
    // État
    remainingMs,
    isRunning: state.isRunning,
    durationMs: state.durationMs,
    endAt: state.endAt,
    sessionId: state.sessionId,
    
    // Actions
    start,
    pause,
    resume,
    reset,
    setDuration,
    
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