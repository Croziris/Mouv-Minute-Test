import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type TimerState = 'stopped' | 'running' | 'paused' | 'break';

interface TimerData {
  id: string;
  start_at: string;
  end_at: string;
  duration_ms: number;
  server_now: string;
  remaining_ms?: number;
}

interface UseResilientTimerReturn {
  state: TimerState;
  timeLeft: number; // en secondes
  progress: number; // 0-100
  startTimer: (durationMs: number, sessionId?: string) => Promise<void>;
  pauseTimer: () => Promise<void>;
  resumeTimer: () => Promise<void>;
  stopTimer: () => Promise<void>;
  formatTime: (seconds: number) => string;
}

const STORAGE_KEY = 'mouv_minute_timer';

interface LocalTimerData {
  endAt: number;
  durationMs: number;
  storedAt: number;
  sessionId?: string;
}

export function useResilientTimer(onTimeUp?: () => void): UseResilientTimerReturn {
  const { user } = useAuth();
  const [state, setState] = useState<TimerState>('stopped');
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [lastServerSync, setLastServerSync] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isOnlineRef = useRef(navigator.onLine);

  // Sauvegarder dans localStorage
  const saveToLocal = (data: LocalTimerData) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  };

  // Charger depuis localStorage
  const loadFromLocal = (): LocalTimerData | null => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  };

  // Nettoyer localStorage
  const clearLocal = () => {
    localStorage.removeItem(STORAGE_KEY);
  };

  // Formater le temps
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculer le progress
  const progress = totalDuration > 0 ? ((totalDuration - timeLeft) / totalDuration) * 100 : 0;

  // Synchroniser avec le serveur
  const syncWithServer = useCallback(async () => {
    if (!user || !isOnlineRef.current) return false;

    try {
      const { data, error } = await supabase.rpc('get_active_timer');
      
      if (error) {
        console.error('Error syncing with server:', error);
        return false;
      }

      const serverData = data as any;
      setLastServerSync(Date.now());

      if (!serverData.active) {
        // Pas de timer actif côté serveur
        if (state !== 'stopped' && state !== 'break') {
          setState('stopped');
          setTimeLeft(0);
          setTotalDuration(0);
          clearLocal();
        }
        return true;
      }

      if (serverData.expired) {
        // Timer expiré
        setState('break');
        setTimeLeft(0);
        clearLocal();
        onTimeUp?.();
        return true;
      }

      // Timer actif - synchroniser
      const remainingMs = Math.max(0, serverData.remaining_ms || 0);
      const remainingSec = Math.floor(remainingMs / 1000);
      const totalMs = serverData.duration_ms || 0;
      const totalSec = Math.floor(totalMs / 1000);

      setTimeLeft(remainingSec);
      setTotalDuration(totalSec);
      setState('running');

      // Sauvegarder localement
      const endAt = Date.now() + remainingMs;
      saveToLocal({
        endAt,
        durationMs: totalMs,
        storedAt: Date.now(),
        sessionId: serverData.session_id
      });

      return true;
    } catch (error) {
      console.error('Sync error:', error);
      return false;
    }
  }, [user, state, onTimeUp]);

  // Démarrer un timer
  const startTimer = useCallback(async (durationMs: number, sessionId?: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('start_timer', {
        duration_ms: durationMs,
        session_id_param: sessionId || null
      });

      if (error) throw error;

      const timerData = data as unknown as TimerData;
      const durationSec = Math.floor(durationMs / 1000);
      
      setTimeLeft(durationSec);
      setTotalDuration(durationSec);
      setState('running');

      // Sauvegarder localement
      const endAt = new Date(timerData.end_at).getTime();
      saveToLocal({
        endAt,
        durationMs,
        storedAt: Date.now(),
        sessionId
      });

    } catch (error) {
      console.error('Error starting timer:', error);
      throw error;
    }
  }, [user]);

  // Pause timer
  const pauseTimer = useCallback(async () => {
    if (!user) return;

    try {
      await supabase.rpc('pause_timer');
      setState('paused');
      clearLocal();
    } catch (error) {
      console.error('Error pausing timer:', error);
    }
  }, [user]);

  // Reprendre timer
  const resumeTimer = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('resume_timer');
      if (error) throw error;

      const timerData = data as unknown as TimerData;
      const endAt = new Date(timerData.end_at).getTime();
      const remainingMs = Math.max(0, endAt - Date.now());
      const remainingSec = Math.floor(remainingMs / 1000);

      setTimeLeft(remainingSec);
      setState('running');

      // Sauvegarder localement
      saveToLocal({
        endAt,
        durationMs: timerData.duration_ms,
        storedAt: Date.now()
      });

    } catch (error) {
      console.error('Error resuming timer:', error);
    }
  }, [user]);

  // Arrêter timer
  const stopTimer = useCallback(async () => {
    if (!user) return;

    try {
      await supabase.rpc('stop_timer');
      setState('stopped');
      setTimeLeft(0);
      setTotalDuration(0);
      clearLocal();
    } catch  (error) {
      console.error('Error stopping timer:', error);
    }
  }, [user]);

  // Gestion de la visibilité de la page
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && state !== 'stopped') {
        // Page redevient visible - synchroniser
        syncWithServer();
      }
    };

    const handleOnlineStatusChange = () => {
      isOnlineRef.current = navigator.onLine;
      if (navigator.onLine && state !== 'stopped') {
        // Revenu en ligne - synchroniser
        syncWithServer(); 
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnlineStatusChange);
    window.addEventListener('offline', handleOnlineStatusChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnlineStatusChange);
      window.removeEventListener('offline', handleOnlineStatusChange);
    };
  }, [state, syncWithServer]);

  // Timer principal
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    if (state === 'running' && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            // Timer terminé
            setState('break');
            clearLocal();
            onTimeUp?.();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [state, timeLeft, onTimeUp]);

  // Synchronisation périodique (toutes les 30 secondes si en ligne)
  useEffect(() => {
    if (state === 'stopped') return;

    const syncInterval = setInterval(() => {
      if (isOnlineRef.current && !document.hidden) {
        syncWithServer();
      }
    }, 30000);

    return () => clearInterval(syncInterval);
  }, [state, syncWithServer]);

  // Récupération initiale au montage
  useEffect(() => {
    if (!user) return;

    const initializeTimer = async () => {
      // Essayer de synchroniser avec le serveur
      const synced = await syncWithServer();
      
      if (!synced) {
        // Pas de connexion - utiliser les données locales
        const localData = loadFromLocal();
        if (localData) {
          const now = Date.now();
          const remainingMs = Math.max(0, localData.endAt - now);
          
          if (remainingMs > 0) {
            const remainingSec = Math.floor(remainingMs / 1000);
            const totalSec = Math.floor(localData.durationMs / 1000);
            
            setTimeLeft(remainingSec);
            setTotalDuration(totalSec);
            setState('running');
          } else {
            // Timer local expiré
            setState('break');
            clearLocal();
            onTimeUp?.();
          }
        }
      }
    };

    initializeTimer();
  }, [user, syncWithServer, onTimeUp]);

  return {
    state,
    timeLeft,
    progress,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    formatTime
  };
}